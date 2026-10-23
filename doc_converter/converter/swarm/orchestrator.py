"""
Оркестратор роя конвертации: группирует файлы по разделам («ОКРБ 011-2009»,
«Факультеты», …), раздаёт разделы агентам-процессам, следит за ними,
перезапускает упавших и собирает итог и манифесты корпуса для LLM.

Большой раздел режется на части по CONVERTER_SWARM_SPLIT_SIZE файлов, чтобы его
тянули сразу несколько агентов, пока остальные разделы уже закончены.
"""

import logging
import math
import multiprocessing
import os
import queue
import threading
import time
from collections import Counter, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, Dict, Iterable, List, Optional

from converter.config import ConverterConfig
from converter.engine import DoclingEngine
from converter.manifest import MANIFEST_FILE, build_manifests
from converter.service import record_failure
from converter.swarm.agent import run_agent
from converter.tasks import ConversionTask, file_sha256

logger = logging.getLogger(__name__)

LogFn = Callable[[str, str], None]
_LOG_LEVELS = {"ERROR": logging.ERROR, "WARNING": logging.WARNING}


def _now():
    return datetime.now(timezone.utc).isoformat()


@dataclass
class WorkUnit:
    section: str
    part: int
    parts: int
    tasks: List[ConversionTask]

    @property
    def label(self) -> str:
        name = self.section.replace("_", " ")
        return f"{name} (часть {self.part}/{self.parts})" if self.parts > 1 else name


def plan_units(tasks: Iterable[ConversionTask], split_size: int) -> List[WorkUnit]:
    """
    Один раздел — одна единица работы, большой раздел — несколько. Порядок по кругу
    (первые части всех разделов, затем вторые…), чтобы каждый раздел сразу получил агента.
    """
    by_section: Dict[str, List[ConversionTask]] = {}
    for task in tasks:
        by_section.setdefault(task.section, []).append(task)

    per_section = []
    for section, items in by_section.items():
        parts = max(1, math.ceil(len(items) / split_size)) if split_size > 0 else 1
        bounds = [round(i * len(items) / parts) for i in range(parts + 1)]
        per_section.append([WorkUnit(section, i + 1, parts, items[bounds[i]:bounds[i + 1]])
                            for i in range(parts)])

    units = []
    for depth in range(max((len(p) for p in per_section), default=0)):
        units.extend(p[depth] for p in per_section if depth < len(p))
    return units


class SwarmAgent:
    WAITING = "waiting"
    RUNNING = "running"
    DONE = "done"
    STOPPED = "stopped"
    FAILED = "failed"
    RESTARTING = "restarting"

    def __init__(self, agent_id: int, unit: WorkUnit):
        self.agent_id = agent_id
        self.name = f"Агент-{agent_id}"
        self.unit = unit
        self.remaining = list(unit.tasks)
        self._by_source = {str(task.source): task for task in unit.tasks}
        self.state = self.WAITING
        self.process = None
        self.current: Optional[ConversionTask] = None
        self.current_since = 0.0
        self.restarts = 0
        self.error = None
        self.stats = Counter()
        self.started_at = None
        self.finished_at = None

    @property
    def log_prefix(self) -> str:
        return f"[{self.name} · {self.unit.label}]"

    def task_for(self, source: str) -> Optional[ConversionTask]:
        return self._by_source.get(source)

    def snapshot(self) -> dict:
        return {
            "id": self.agent_id,
            "name": self.name,
            "section": self.unit.label,
            "section_id": self.unit.section,
            "state": self.state,
            "current_file": self.current.source.name if self.current else None,
            "total": len(self.unit.tasks),
            "done": len(self.unit.tasks) - len(self.remaining),
            "stats": dict(self.stats),
            "error": self.error,
            "restarts": self.restarts,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
        }


class ConversionSwarm:
    def __init__(self, config: ConverterConfig, log: Optional[LogFn] = None):
        self.config = config
        self._log_cb = log
        self._ctx = multiprocessing.get_context("spawn")
        self._engine_info = DoclingEngine(config)
        self.agents: List[SwarmAgent] = []
        self.max_agents = 0

    def _log(self, message: str, level: str = "INFO"):
        logger.log(_LOG_LEVELS.get(level, logging.INFO), message)
        if self._log_cb:
            self._log_cb(message, level)

    def status(self) -> dict:
        return {"max_agents": self.max_agents, "agents": [agent.snapshot() for agent in self.agents]}

    def run(self, tasks: Iterable[ConversionTask], force: bool = False,
            stop_event: Optional[threading.Event] = None,
            on_progress: Optional[Callable[[dict], None]] = None,
            limit: Optional[int] = None) -> dict:
        stop_event = stop_event or threading.Event()
        tasks = list(tasks)
        summary = {"total": len(tasks), "done": 0, "success": 0, "partial": 0, "failed": 0,
                   "skipped": 0, "stopped": False, "current": None, "agents_running": 0}

        def report():
            current = [f"{a.name}: {a.unit.label}/{a.current.source.name}" for a in self.agents if a.current]
            summary["current"] = "; ".join(current) or None
            summary["agents_running"] = sum(a.state == SwarmAgent.RUNNING for a in self.agents)
            if on_progress:
                on_progress(dict(summary))

        self._log(f"Найдено файлов: {len(tasks)}. Проверяю, что уже сконвертировано...")
        report()
        pending = self._pending(tasks, force, summary, stop_event)
        if limit is not None and len(pending) > limit:
            pending = pending[:limit]
            summary["total"] = summary["skipped"] + limit
        units = plan_units(pending, self.config.swarm_split_size)
        self.agents = [SwarmAgent(i, unit) for i, unit in enumerate(units, start=1)]
        self.max_agents = self._max_agents(len(units))

        if units:
            self._log(f"К конвертации: {len(pending)} файлов, уже готовы: {summary['skipped']}. "
                      f"Агентов в рое: {len(self.agents)}, одновременно работают: {self.max_agents}")
            for agent in self.agents:
                self._log(f"{agent.name} → «{agent.unit.label}», файлов: {len(agent.unit.tasks)}")
            self._supervise(force, stop_event, summary, report)
        elif not stop_event.is_set():
            self._log("Новых файлов нет — всё уже сконвертировано")

        summary["stopped"] = stop_event.is_set()
        self._report_total(summary)
        report()
        return summary

    def _pending(self, tasks, force, summary, stop_event) -> List[ConversionTask]:
        if force:
            return tasks
        pending = []
        for task in tasks:
            if stop_event.is_set():
                return []
            if task.meta_path.exists() and task.is_done(file_sha256(task.source)):
                summary["skipped"] += 1
                summary["done"] += 1
            else:
                pending.append(task)
        return pending

    def _max_agents(self, units: int) -> int:
        if units == 0:
            return 0
        wanted = self.config.swarm_agents
        if wanted <= 0:
            # Каждый агент держит свои модели Docling (~1.5–3 ГБ) и DOCLING_THREADS потоков
            wanted = min(4, (os.cpu_count() or 1) // max(1, self.config.num_threads))
        return max(1, min(wanted, units))

    def _supervise(self, force, stop_event, summary, report):
        events = self._ctx.Queue()
        agents_stop = self._ctx.Event()
        by_id = {agent.agent_id: agent for agent in self.agents}
        waiting = deque(self.agents)
        running: List[SwarmAgent] = []

        while waiting or running:
            if stop_event.is_set():
                agents_stop.set()
            while waiting and len(running) < self.max_agents and not stop_event.is_set():
                agent = waiting.popleft()
                self._spawn(agent, force, events, agents_stop)
                running.append(agent)
            if not running:
                break

            self._drain(events, by_id, summary, timeout=0.5)
            for agent in list(running):
                self._check_timeout(agent)
                if agent.process.is_alive():
                    continue
                agent.process.join()
                self._drain(events, by_id, summary, timeout=0.1)
                if self._handle_exit(agent, force, events, agents_stop, summary):
                    running.remove(agent)
            report()

        for agent in waiting:
            agent.state = SwarmAgent.STOPPED

    def _spawn(self, agent: SwarmAgent, force, events, agents_stop):
        agent.process = self._ctx.Process(
            target=run_agent,
            args=(agent.agent_id, self.config, list(agent.remaining), force, events, agents_stop),
            name=f"converter-agent-{agent.agent_id}",
            daemon=True,
        )
        agent.state = SwarmAgent.RUNNING
        agent.error = None
        agent.current = None
        agent.started_at = agent.started_at or _now()
        agent.finished_at = None
        agent.process.start()

    def _drain(self, events, by_id, summary, timeout: float):
        try:
            event = events.get(timeout=timeout)
            while True:
                self._on_event(event, by_id, summary)
                event = events.get_nowait()
        except queue.Empty:
            pass

    def _on_event(self, event: dict, by_id: Dict[int, SwarmAgent], summary: dict):
        agent = by_id.get(event["agent"])
        if agent is None:
            return
        kind = event["type"]
        if kind == "file_started":
            agent.current = agent.task_for(event["source"])
            agent.current_since = time.monotonic()
        elif kind == "file_done":
            self._on_file_done(agent, event, summary)
        elif kind == "finished":
            agent.state = SwarmAgent.DONE if event["state"] == "done" else SwarmAgent.STOPPED
        elif kind == "error":
            agent.error = event["error"]

    def _on_file_done(self, agent: SwarmAgent, event: dict, summary: dict):
        task = agent.task_for(event["source"])
        if task in agent.remaining:
            agent.remaining.remove(task)
        agent.current = None
        status = event["status"]
        agent.stats[status] += 1
        agent.stats["pages"] += event["pages"]
        agent.stats["chunks"] += event["chunks"]
        summary[status] += 1
        summary["done"] += 1
        if status == "skipped" or task is None:
            return

        done = len(agent.unit.tasks) - len(agent.remaining)
        line = (f"{agent.log_prefix} [{done}/{len(agent.unit.tasks)}] {task.source.name}: {status}, "
                f"страниц {event['pages']}, чанков {event['chunks']}, {event['duration']} с")
        if event["reused"]:
            line += " (пересобран только слой для LLM)"
        level = "INFO"
        if status == "failed":
            line += f" — {'; '.join(event['errors'])[:300]}"
            level = "ERROR"
        elif event["warnings"]:
            line += f" — {'; '.join(event['warnings'])[:300]}"
            level = "WARNING"
        self._log(line, level)

    def _check_timeout(self, agent: SwarmAgent):
        limit = self.config.file_timeout_sec
        if (limit > 0 and agent.current is not None and agent.process.is_alive()
                and time.monotonic() - agent.current_since > limit):
            agent.error = f"файл обрабатывался дольше {limit:g} с — агент принудительно остановлен"
            agent.process.terminate()

    def _handle_exit(self, agent: SwarmAgent, force, events, agents_stop, summary) -> bool:
        """True — агент закончил работу, False — перезапущен и снова в строю."""
        if agent.state in (SwarmAgent.DONE, SwarmAgent.STOPPED):
            self._finish(agent)
            return True

        reason = agent.error or f"процесс агента завершился с кодом {agent.process.exitcode}"
        if agent.current is not None:
            # Иначе перезапущенный агент снова упадёт на том же файле
            task, agent.current = agent.current, None
            try:
                record_failure(task, self._engine_info, f"Агент упал на этом файле: {reason}")
            except Exception:
                logger.exception(f"Не удалось записать ошибку для {task.source}")
            agent.remaining.remove(task)
            agent.stats["failed"] += 1
            summary["failed"] += 1
            summary["done"] += 1
            self._log(f"{agent.log_prefix} {task.source.name}: failed — {reason}", "ERROR")

        if agents_stop.is_set() or not agent.remaining:
            agent.state = SwarmAgent.STOPPED if agents_stop.is_set() else SwarmAgent.DONE
            self._finish(agent)
            return True
        if agent.restarts >= self.config.agent_max_restarts:
            agent.state = SwarmAgent.FAILED
            agent.error = reason
            self._finish(agent)
            return True

        agent.restarts += 1
        agent.state = SwarmAgent.RESTARTING
        self._log(f"{agent.log_prefix} упал: {reason}. Перезапуск {agent.restarts}/"
                  f"{self.config.agent_max_restarts}, осталось файлов: {len(agent.remaining)}", "WARNING")
        self._spawn(agent, force, events, agents_stop)
        return False

    def _finish(self, agent: SwarmAgent):
        agent.finished_at = _now()
        stats = agent.stats
        details = (f"успешно: {stats['success']}, частично: {stats['partial']}, ошибок: {stats['failed']}, "
                   f"страниц: {stats['pages']}, чанков: {stats['chunks']}")
        if agent.restarts:
            details += f", перезапусков: {agent.restarts}"
        if agent.state == SwarmAgent.DONE:
            self._log(f"{agent.log_prefix} закончил: {details}", "SUCCESS")
        elif agent.state == SwarmAgent.STOPPED:
            self._log(f"{agent.log_prefix} остановлен: {details}, не тронуто файлов: {len(agent.remaining)}",
                      "WARNING")
        else:
            self._log(f"{agent.log_prefix} больше не перезапускаю ({agent.error}): {details}; "
                      f"{len(agent.remaining)} файлов останутся до следующего запуска", "ERROR")

    def _report_total(self, summary: dict):
        corpus = build_manifests(self.config)
        done_agents = sum(agent.state == SwarmAgent.DONE for agent in self.agents)
        text = (f"успешно {summary['success']}, частично {summary['partial']}, ошибок {summary['failed']}, "
                f"уже были готовы {summary['skipped']}")
        if self.agents:
            text += f"; агентов отработало без сбоев: {done_agents}/{len(self.agents)}"
        text += (f". Для LLM готово документов: {corpus['llm_ready']} из {corpus['documents']}, "
                 f"чанков: {corpus['chunks']} ({MANIFEST_FILE})")
        if summary["stopped"]:
            self._log(f"Конвертация остановлена пользователем: {text}", "WARNING")
        else:
            self._log(f"Конвертация завершена: {text}", "SUCCESS")
