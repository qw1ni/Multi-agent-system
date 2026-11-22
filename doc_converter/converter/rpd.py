"""
РПД → JSON schema 2.0.0 (эталон преподавателя: schemas/rpd.example.json).

Пайплайн: Docling/DOCX даёт текст, отсюда собирается rpd.json.
Если задан OPENROUTER_API_KEY — заполнение облачной моделью OpenRouter
(промпт prompts/rpd_pdf_to_json.md). Иначе эвристики по шаблону БРУ.
"""

from __future__ import annotations

import json
import os
import re
import zipfile
from pathlib import Path
from typing import List, Optional
from xml.etree import ElementTree as ET

from converter.enricher import COMPETENCE_RE, SPECIALTY_RE, extract_card
from converter.openrouter import chat_json, configured as openrouter_configured, provider as llm_provider

SCHEMA_VERSION = "2.0.0"
PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "rpd_pdf_to_json.md"

_OCR_GLUE = [
    (re.compile(r"(\d{2}\.\d{2}\.\d)\s+(\d)"), r"\1\2"),
    (re.compile(r"\b20\s*([1-9])\s*(\d)\b"), r"20\1\2"),
    (re.compile(r"(\d{5})\s+(\d)\s*[-–]\s*(\d)\.(\d)"), r"\1\2-\3.\4"),
    (re.compile(r"к\s*т\.н"), "к.т.н"),
    (re.compile(r"Л\.р\.№"), "Л.р. №"),
    (re.compile(r"Курсов\s+ой"), "Курсовой"),
]
LAB_RE = re.compile(
    r"Л\.?\s*р\.?\s*№?\s*№?\s*(\d+)\s*[.\-–:]?\s*(.+)",
    re.IGNORECASE,
)
TOPIC_RE = re.compile(r"^Тема\s+(\d+)\.?\s*(.+)$", re.IGNORECASE)
YEAR_RE = re.compile(r"\b(20\d{2})\b")
HOURS_PAIR_RE = re.compile(r"всего\s+часов\s*/\s*зачетн[^\d]{0,40}(\d{2,4})\s*/\s*(\d{1,2})", re.I)


def fix_ocr(text: str) -> str:
    text = (text or "").replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    for pattern, repl in _OCR_GLUE:
        text = pattern.sub(repl, text)
    return text.strip()


def _paras_from_docx(path: Path) -> List[str]:
    w = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    with zipfile.ZipFile(path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    paras = []
    for para in root.iter(f"{w}p"):
        t = "".join((n.text or "") for n in para.iter(f"{w}t"))
        t = fix_ocr(re.sub(r"\s+", " ", t))
        if t:
            paras.append(t)
    return paras


def _paras_from_markdown(text: str) -> List[str]:
    paras = []
    for raw in re.split(r"\n\s*\n", text or ""):
        line = fix_ocr(re.sub(r"^#+\s*", "", raw.replace("\n", " ")))
        line = re.sub(r"^\[.*?\]\s+", "", line)
        if line:
            paras.append(line)
    return paras


def load_paragraphs(source: Path | str) -> List[str]:
    if isinstance(source, Path) or (isinstance(source, str) and Path(source).exists()):
        path = Path(source)
        if path.suffix.lower() == ".docx":
            return _paras_from_docx(path)
        return _paras_from_markdown(path.read_text(encoding="utf-8"))
    return _paras_from_markdown(str(source))


def _slice(paras: List[str], start: str, end: Optional[str] = None) -> List[str]:
    start_re = re.compile(start, re.I)
    end_re = re.compile(end, re.I) if end else None
    i0 = next((i for i, p in enumerate(paras) if start_re.search(p)), None)
    if i0 is None:
        return []
    i1 = len(paras)
    if end_re:
        for j in range(i0 + 1, len(paras)):
            if end_re.search(paras[j]):
                i1 = j
                break
    return paras[i0:i1]


def _first(paras: List[str], pattern: str) -> Optional[re.Match]:
    rx = re.compile(pattern, re.I)
    for p in paras:
        m = rx.search(p)
        if m:
            return m
    return None


def _nums_after_label(paras: List[str], label: str) -> List[int]:
    rx = re.compile(label, re.I)
    for i, p in enumerate(paras[:100]):
        if not rx.search(p):
            continue
        inline = re.search(rf"{label}[^\d]{{0,80}}(\d{{1,3}}(?:\s*,\s*\d{{1,3}})*)", p, re.I)
        if inline:
            return [int(x) for x in re.findall(r"\d+", inline.group(1))]
        if i + 1 < len(paras) and re.fullmatch(r"[\d,\s]+", paras[i + 1]):
            return [int(x) for x in re.findall(r"\d+", paras[i + 1])]
    return []


def _int_near(paras: List[str], label: str) -> Optional[int]:
    nums = _nums_after_label(paras, label)
    return nums[0] if nums else None


def _unique_labs(paras: List[str]) -> List[dict]:
    by_num = {}
    for p in paras:
        m = LAB_RE.search(p)
        if not m:
            continue
        title = re.sub(r"\s+", " ", m.group(2)).strip(" .;")
        title = re.split(r"\s{2,}|\.{2,}", title, maxsplit=1)[0].strip(" .")
        if len(title) < 4 or title.isdigit():
            continue
        n = int(m.group(1))
        by_num.setdefault(n, {"lab_number": n, "title": title[:240], "hours": 0, "weeks": [], "max_points": 0})
    return [by_num[n] for n in sorted(by_num)]


def _topics(paras: List[str]) -> List[dict]:
    topics = []
    content = _slice(paras, r"^2\.1\b|содержание учебной дисциплины", r"^2\.2\b|учебно-методическая карта")
    for p in content:
        m = TOPIC_RE.match(p)
        if not m:
            continue
        title = m.group(2).strip(" .")
        topics.append({
            "semester": None,
            "topic_number": int(m.group(1)),
            "title": title,
            "content_raw": title,
            "content_items": [title],
            "competency_codes": [],
        })
    if topics:
        return topics
    by_num = {}
    for p in paras:
        m = TOPIC_RE.match(p)
        if m:
            by_num.setdefault(int(m.group(1)), m.group(2).strip(" ."))
    return [{
        "semester": None,
        "topic_number": n,
        "title": t,
        "content_raw": t,
        "content_items": [t],
        "competency_codes": [],
    } for n, t in sorted(by_num.items())]


def _list_block(text: str, verb: str) -> List[str]:
    m = re.search(rf"{verb}\s*[:\-–]?\s*(.+?)(?=(уметь|владеть|знать)\s*[:\-–]|$)", text, re.I | re.S)
    if not m:
        return []
    chunk = m.group(1)
    items = re.findall(r"[-–—•]\s*(.+?)(?=[-–—•]|$)", chunk)
    if not items:
        items = [x.strip() for x in re.split(r"[;•]", chunk) if 8 < len(x.strip()) < 240]
    return [re.sub(r"\s+", " ", x).strip(" .;") for x in items][:20]


def _competencies(text: str) -> List[dict]:
    found = []
    for m in re.finditer(
        r"((?:ИОПК|ОПК|ПК|УК)-\d+(?:\.\d+)?)\s*[–—:\-.]?\s*([А-ЯЁA-Z].{20,400}?)(?=(?:ИОПК|ОПК|ПК|УК)-\d+|$)",
        text,
        re.S,
    ):
        name = re.sub(r"\s+", " ", m.group(2)).strip(" .;")
        found.append({"code": m.group(1).upper(), "name": name[:400]})
    if found:
        uniq = {}
        for row in found:
            uniq.setdefault(row["code"], row)
        return list(uniq.values())
    return [{"code": c, "name": ""} for c in extract_card(text).get("competences") or []]


def _normalize_reg(raw: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    if not raw:
        return None, None
    raw = fix_ocr(raw)
    norm = raw
    norm = re.sub(r"5\.1\.0\.", "Б1.О.", norm)
    norm = re.sub(r"5\.1\.", "Б1.", norm)
    norm = re.sub(r"\s*гр\s*$", "/р", norm, flags=re.I)
    code = None
    m = re.search(r"(Б[12]\.[ОВ]\.\d+|ФД\.\d+)", norm)
    if m:
        code = m.group(1)
    return norm, code


def _title_page(paras: List[str], source_file: str, card: dict) -> dict:
    head = "\n".join(paras[:90])
    person = None
    m = _first(paras[:40], r"([А-ЯЁ]\.[А-ЯЁ]\.\s*[А-ЯЁ][а-яё]+)\s*$")
    mashin = re.search(r"([А-ЯЁ]\.[А-ЯЁ]\.\s*Машин)", head)
    if mashin:
        person = mashin.group(1).replace(" ", "")
        person = re.sub(r"([А-ЯЁ]\.[А-ЯЁ]\.)([А-ЯЁ])", r"\1 \2", person)
    year_m = YEAR_RE.search(head)
    year = int(year_m.group(1)) if year_m else None
    spec = (card.get("specialties") or SPECIALTY_RE.findall(head) or [None])[0]
    program = None
    pm = re.search(r"Направление подготовки\s+[\d.]+\s+(.+?)(?:Направленность|Квалификация|$)", head, re.S | re.I)
    if pm:
        program = re.sub(r"\s+", " ", pm.group(1)).strip(" .")
    profile = None
    pr = re.search(r"Направленность \(профиль\)\s+(.+?)(?:Квалификация|$)", head, re.S | re.I)
    if pr:
        profile = re.sub(r"\s+", " ", pr.group(1)).strip(" .")
    hours_pair = HOURS_PAIR_RE.search(head)
    raw_reg = None
    rm = re.search(r"Регистрационн\w+\s*№\s*([^\n]{4,80})", head, re.I)
    if rm:
        raw_reg = rm.group(1).strip()
    norm, disc_code = _normalize_reg(raw_reg)
    compilers = []
    for name in card.get("authors") or []:
        compilers.append({"name": name, "academic_degree": None, "academic_title": None})
    if not compilers:
        sm = re.search(r"Составител\w*:?\s*(.+)", head, re.I)
        if sm:
            for part in re.split(r";| и ", sm.group(1)):
                part = part.strip(" .")
                if len(part) > 5:
                    compilers.append({"name": part[:120], "academic_degree": None, "academic_title": None})
    semesters = []
    smm = re.search(r"Семестр\s+([\d,\s]+)", head, re.I)
    if smm:
        semesters = [int(x) for x in re.findall(r"\d+", smm.group(1))]
    return {
        "institution": "Межгосударственное образовательное учреждение высшего образования «Белорусско-Российский университет»",
        "approval_stamp": {
            "status": "УТВЕРЖДАЮ" if "УТВЕРЖДАЮ" in head else None,
            "position": "Первый проректор Белорусско-Российского университета" if "проректор" in head.casefold() else None,
            "person": person,
            "date": None,
        },
        "registration_number_raw": raw_reg,
        "registration_number_normalized": norm,
        "curriculum_discipline_code": disc_code,
        "discipline_name": None,
        "program_code": spec,
        "program_name": program,
        "profile": profile,
        "qualification": "Бакалавр" if re.search(r"Бакалавр", head) else None,
        "education_form": "Очная" if re.search(r"Очн", head) else None,
        "workload_summary_table": {
            "course": _int_near(paras, r"^Курс$") or _int_near(paras, r"^Курс\b"),
            "semesters": semesters,
            "lectures_hours": _int_near(paras, r"Лекции,\s*часы") or card.get("hours", {}).get("lectures"),
            "laboratory_hours": _int_near(paras, r"Лабораторные занятия,\s*часы") or card.get("hours", {}).get("labs"),
            "practical_hours": _int_near(paras, r"^Практическ") or 0,
            "course_project_semesters": _nums_after_label(paras, r"Курсовой проект,\s*семестр"),
            "course_work_semesters": [],
            "credit_semesters": _nums_after_label(paras, r"Зачет,\s*семестр"),
            "exam_semesters": _nums_after_label(paras, r"Экзамен,\s*семестр"),
            "contact_work_hours": _int_near(paras, r"Контактная работа по учебным занятиям, часы") or card.get("hours", {}).get("contact"),
            "independent_work_hours": _int_near(paras, r"Самостоятельная работа,\s*часы") or card.get("hours", {}).get("self_study"),
            "total_hours": int(hours_pair.group(1)) if hours_pair else card.get("hours", {}).get("total"),
            "credits_zet": int(hours_pair.group(2)) if hours_pair else card.get("hours", {}).get("credits"),
        },
        "department_developer": None,
        "compilers": compilers,
        "city": "Могилев" if re.search(r"Могил", head) else None,
        "year": year,
    }


def _audit(doc: dict) -> dict:
    w = doc["title_page"]["workload_summary_table"]
    total = w.get("total_hours") or 0
    contact = w.get("contact_work_hours") or 0
    indie = w.get("independent_work_hours") or 0
    zet = w.get("credits_zet") or 0
    lec = w.get("lectures_hours") or 0
    lab = w.get("laboratory_hours") or 0
    prac = w.get("practical_hours") or 0
    anomalies = []
    labs = doc["section_2_structure_and_content"]["subsection_2_2_schedule_map"]["aggregated_labs_and_practices"]
    n_labs = labs.get("total_laboratory_works_count") or 0
    hours_ok = bool(total and contact + indie == total)
    zet_ok = bool(zet and total == zet * 36)
    if hours_ok and not zet_ok:
        anomalies.append(f"Всего часов {total} ≠ ЗЕТ {zet}×36")
    if not hours_ok and total:
        anomalies.append(f"contact ({contact}) + СРС ({indie}) ≠ всего ({total})")
    auditory_ok = bool(contact and lec + lab + prac == contact)
    if contact and not auditory_ok:
        anomalies.append(f"лекции+лаб+практика ({lec}+{lab}+{prac}) ≠ контактные ({contact})")
    return {
        "is_total_hours_valid": bool(hours_ok and zet_ok),
        "is_auditory_hours_valid": auditory_ok,
        "is_schedule_map_balanced": False,
        "detected_anomalies": anomalies,
        "extracted_labs_count": n_labs,
    }


def extract_rpd(text_or_path, source_file: str = "") -> dict:
    if isinstance(text_or_path, Path):
        paras = load_paragraphs(text_or_path)
        source_file = source_file or text_or_path.name
        blob = "\n".join(paras)
    else:
        blob = fix_ocr(text_or_path or "")
        paras = _paras_from_markdown(blob)
        blob = "\n".join(paras)
    card = extract_card(blob)
    s1 = "\n".join(_slice(paras, r"^1(\s+|$)ПОЯСНИТЕЛЬН|^1\.1\b", r"^2(\s+|$)СТРУКТУРА|^2\.1\b"))
    labs = _unique_labs(paras)
    for lab in labs:
        lab["semester"] = None
        lab["module"] = None
    title_page = _title_page(paras, source_file, card)
    disc = None
    for p in paras[:40]:
        if re.fullmatch(r"[А-ЯЁA-Z][А-ЯЁA-Z \-]{6,80}", p) and "УНИВЕРСИТЕТ" not in p and "УТВЕРЖДАЮ" not in p:
            disc = p
            break
    if not disc:
        dm = re.search(r"([А-ЯЁ][А-ЯЁ \-]{6,80})\s*\(наименование дисциплины\)", "\n".join(paras[:50]))
        disc = dm.group(1).strip() if dm else card.get("title")
    title_page["discipline_name"] = disc
    dept = _first(paras[:90], r"Кафедра-разработчик программы:\s*(.+)")
    if dept:
        title_page["department_developer"] = dept.group(1).strip()

    goal = None
    gm = re.search(r"1\.1[^\n]{0,80}\n?(.+?)(?=1\.2|\Z)", s1, re.S)
    if gm:
        goal = re.sub(r"\s+", " ", gm.group(1)).strip()
        goal = re.sub(r"^Цель учебной дисциплины\s*", "", goal, flags=re.I)

    lit_main = []
    lit_block = _slice(paras, r"7\.1\s+Основная литература", r"7\.2\s+Дополнительн")
    n = 0
    for p in lit_block[1:]:
        if re.match(r"^\d+$", p) or len(p) < 30:
            continue
        n += 1
        lit_main.append({"number": n, "bibliographic_description": p, "approval_stamp": None, "copies_or_url": None})

    s8 = "\n".join(_slice(paras, r"^8\b.*МАТЕРИАЛЬНО", r"Дополнен|Лист"))
    rooms = []
    for m in re.finditer(r"а\.\s*([\d/]+)[^\n]{0,80}№\s*([А-ЯЁA-Z0-9 \-/]+)", s8):
        rooms.append({"room": m.group(1), "passport_registration_number": m.group(2).strip()})

    doc = {
        "schema_version": SCHEMA_VERSION,
        "document_type": "RPD",
        "source_file": source_file,
        "extraction": llm_provider() or "heuristic",
        "title_page": title_page,
        "approval_page": {
            "fgos_reference": {
                "direction_code": title_page.get("program_code"),
                "direction_name": title_page.get("program_name"),
                "level": "бакалавриат" if title_page.get("qualification") == "Бакалавр" else None,
                "order_number": None,
                "order_date": None,
            },
            "curriculum_reference": {"registration_number": None, "approval_date": None},
            "department_approval": {
                "department_name": title_page.get("department_developer"),
                "date": None,
                "protocol_number": None,
                "head_of_department": None,
            },
            "methodological_council_approval": {
                "council_name": None, "date": None, "protocol_number": None, "deputy_chairman": None,
            },
            "reviewer": {"name": None, "position": None, "academic_degree": None, "academic_title": None},
            "agreements": [],
        },
        "section_1_explanatory_note": {
            "section_number": "1",
            "section_title": "ПОЯСНИТЕЛЬНАЯ ЗАПИСКА",
            "subsection_1_1_goal": {"number": "1.1", "title": "Цель учебной дисциплины", "text": goal},
            "subsection_1_2_planned_results": {
                "number": "1.2",
                "title": "Планируемые результаты изучения дисциплины",
                "know": card.get("know") or _list_block(s1, "знать"),
                "can": card.get("can") or _list_block(s1, "уметь"),
                "master": card.get("own") or _list_block(s1, "владеть"),
            },
            "subsection_1_3_place_in_curriculum": {
                "number": "1.3",
                "title": "Место учебной дисциплины в системе подготовки студента",
                "block": None,
                "prerequisite_disciplines": [],
                "subsequent_disciplines": [],
                "practices_and_final_attestation": [],
            },
            "subsection_1_4_competency_requirements": {
                "number": "1.4",
                "title": "Требования к освоению учебной дисциплины",
                "competencies": _competencies(s1 or blob[:12000]),
            },
        },
        "section_2_structure_and_content": {
            "section_number": "2",
            "section_title": "СТРУКТУРА И СОДЕРЖАНИЕ ДИСЦИПЛИНЫ",
            "subsection_2_1_content": {
                "number": "2.1",
                "title": "Содержание учебной дисциплины",
                "topics": _topics(paras),
            },
            "subsection_2_2_schedule_map": {
                "number": "2.2",
                "title": "Учебно-методическая карта учебной дисциплины",
                "semesters": [],
                "aggregated_labs_and_practices": {
                    "total_laboratory_works_count": len(labs),
                    "total_laboratory_hours": title_page["workload_summary_table"].get("laboratory_hours") or 0,
                    "total_practical_works_count": 0,
                    "total_practical_hours": 0,
                    "laboratory_works_registry": labs,
                    "practical_works_registry": [],
                },
            },
            "subsection_2_3_course_project_or_work_requirements": {
                "number": "2.3",
                "title": "Требования к курсовому проекту (курсовой работе)",
                "type": "курсовой проект" if title_page["workload_summary_table"].get("course_project_semesters") else "не предусмотрено",
            },
        },
        "section_3_educational_technologies": {
            "section_number": "3",
            "section_title": "ОБРАЗОВАТЕЛЬНЫЕ ТЕХНОЛОГИИ",
            "technologies_table": [],
        },
        "section_4_evaluation_means": {
            "section_number": "4",
            "section_title": "ОЦЕНОЧНЫЕ СРЕДСТВА",
            "items": [],
        },
        "section_5_evaluation_methodology": {
            "section_number": "5",
            "section_title": "МЕТОДИКА И КРИТЕРИИ ОЦЕНКИ КОМПЕТЕНЦИЙ СТУДЕНТОВ",
        },
        "section_6_independent_work": {
            "section_number": "6",
            "section_title": "МЕТОДИЧЕСКИЕ РЕКОМЕНДАЦИИ ПО ОРГАНИЗАЦИИ И ВЫПОЛНЕНИЮ САМОСТОЯТЕЛЬНОЙ РАБОТЫ СТУДЕНТОВ ПО УЧЕБНОЙ ДИСЦИПЛИНЕ",
            "text_raw": "\n".join(_slice(paras, r"^6\b.*МЕТОДИЧЕСКИЕ РЕКОМЕНДАЦИИ", r"^7\b"))[:4000],
        },
        "section_7_methodological_support": {
            "section_number": "7",
            "section_title": "УЧЕБНО-МЕТОДИЧЕСКОЕ И ИНФОРМАЦИОННОЕ ОБЕСПЕЧЕНИЕ УЧЕБНОЙ ДИСЦИПЛИНЫ",
            "subsection_7_1_main_literature": lit_main,
            "subsection_7_2_additional_literature": [],
            "subsection_7_3_internet_resources": [],
            "subsection_7_4_1_methodological_guidelines": [],
        },
        "section_8_material_technical_support": {
            "section_number": "8",
            "section_title": "МАТЕРИАЛЬНО-ТЕХНИЧЕСКОЕ ОБЕСПЕЧЕНИЕ УЧЕБНОЙ ДИСЦИПЛИНЫ",
            "text_raw": s8[:2000],
            "laboratories": rooms,
        },
        "addenda_and_changes": [],
    }
    appr = "\n".join(paras[20:90])
    om = re.search(r"приказом\s*№\s*(\d+)\s*от\s*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{4})", appr, re.I)
    if om:
        doc["approval_page"]["fgos_reference"]["order_number"] = om.group(1)
        doc["approval_page"]["fgos_reference"]["order_date"] = f"{om.group(4)}-{int(om.group(3)):02d}-{int(om.group(2)):02d}"
    um = re.search(r"Рег\.\s*№\s*([\d.\-]+)\s*от\s*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{4})", appr, re.I)
    if um:
        doc["approval_page"]["curriculum_reference"]["registration_number"] = um.group(1)
        doc["approval_page"]["curriculum_reference"]["approval_date"] = f"{um.group(4)}-{int(um.group(3)):02d}-{int(um.group(2)):02d}"
    hm = re.search(r"Зав\.\s*кафедрой[^\n]{0,40}?([А-ЯЁ]\.\s*[А-ЯЁ]\.\s*[А-ЯЁ][а-яё]+)", appr)
    if hm:
        doc["approval_page"]["department_approval"]["head_of_department"] = re.sub(r"\s+", " ", hm.group(1))
    rv = re.search(r"Рецензент:\s*([А-ЯЁ]\.\s*[А-ЯЁ]\.\s*[А-ЯЁ][а-яё]+)\s*,\s*(.+?)(?:Рабочая программа согласована|$)", appr, re.S)
    if rv:
        doc["approval_page"]["reviewer"]["name"] = re.sub(r"\s+", " ", rv.group(1))
        doc["approval_page"]["reviewer"]["position"] = re.sub(r"\s+", " ", rv.group(2)).strip(" ._")[:300]

    llm_doc = _llm_extract(blob, source_file)
    if llm_doc:
        llm_doc.setdefault("source_file", source_file)
        llm_doc["extraction"] = llm_provider() or "llm"
        llm_doc.setdefault("_validation_and_audit", {})
        return llm_doc

    doc["_validation_and_audit"] = _audit(doc)
    return doc


def _system_prompt() -> str:
    if not PROMPT_PATH.is_file():
        return ""
    text = PROMPT_PATH.read_text(encoding="utf-8")
    m = re.search(r"## SYSTEM PROMPT.*```markdown\n(.*)\n```", text, re.S)
    return m.group(1) if m else text


def _llm_extract(markdown: str, source_file: str) -> Optional[dict]:
    if not openrouter_configured():
        return None
    system = _system_prompt()
    user = (
        f"Преобразуй документ Рабочей программы дисциплины в полный JSON schema 2.0.0.\n"
        f"Имя файла: {source_file}\n\n<document_content>\n{markdown[:120000]}\n</document_content>"
    )
    doc = chat_json(system, user)
    if not doc:
        return None
    doc.setdefault("schema_version", SCHEMA_VERSION)
    doc.setdefault("document_type", "RPD")
    return doc


def maybe_extract_rpd(markdown: str, card: dict, source_file: str) -> Optional[dict]:
    if (card or {}).get("document_type") != "rp":
        return None
    return extract_rpd(markdown, source_file=source_file)


if __name__ == "__main__":
    import sys
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not src:
        print("usage: python -m converter.rpd <file.md|docx>")
        raise SystemExit(2)
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_suffix(".rpd.json")
    doc = extract_rpd(src, source_file=src.name)
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    labs = doc["section_2_structure_and_content"]["subsection_2_2_schedule_map"]["aggregated_labs_and_practices"]["total_laboratory_works_count"]
    print(json.dumps({
        "out": str(out),
        "discipline": doc["title_page"].get("discipline_name"),
        "labs": labs,
        "extraction": doc.get("extraction"),
        "audit": doc.get("_validation_and_audit"),
    }, ensure_ascii=False, indent=2))
