"""
Семантика поверх Docling: тип учебного документа и «жёлтый маркер» важных полей.

Типы (схема преподовского doc-19):
  mu  — методические указания / рекомендации к лабораторным
  rp  — рабочая программа дисциплины
  fos — фонд оценочных средств
  up  — учебный план
  oop — основная образовательная программа
  other — не распознали шаблон

Классификация и поля считаются по тексту Markdown: так их можно проверить
на эталоне без повторного OCR и один раз прогнать на уже готовых document.md.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

TYPE_LABELS = {
    "mu": "Методические указания (МУ)",
    "rp": "Рабочая программа (РП)",
    "fos": "Фонд оценочных средств (ФОС)",
    "up": "Учебный план",
    "oop": "Основная образовательная программа (ООП)",
    "other": "Прочий учебно-методический документ",
}

# (роль блока, метка в Markdown, regex по заголовку/началу абзаца)
ROLE_RULES: List[Tuple[str, str, str]] = [
    ("toc", "ОГЛАВЛЕНИЕ", r"^содержание\b"),
    ("lab", "ЛАБ", r"лабораторн\w*\s+работ"),
    ("control_questions", "КОНТРОЛЬ", r"контрольн\w+\s+вопрос"),
    ("work_order", "ПОРЯДОК", r"порядок\s+выполнения"),
    ("assessment", "ФОС", r"(фонд\s+оценоч|оценочн\w+\s+средств)"),
    ("assessment_criteria", "КРИТЕРИИ", r"критери\w+\s+оценк"),
    ("competences", "КОМПЕТЕНЦИИ", r"(компетенц|опк-|пк-|ук-|иопк-)"),
    ("learning_outcomes", "РЕЗУЛЬТАТЫ", r"(планируем\w+\s+результат|(^|\b)(знать|уметь|владеть)\b)"),
    ("explanatory", "ПОЯСНЕНИЕ", r"пояснительн\w+\s+записк|цель\s+учебной\s+дисциплины"),
    ("bibliography", "ЛИТЕРАТУРА", r"(основн\w+\s+литератур|дополнительн\w+\s+литератур|список\s+литератур|библиографич)"),
    ("teaching_map", "КАРТА", r"учебно-методическ\w+\s+карт"),
    ("coursework", "КУРСОВАЯ", r"требовани\w+\s+к\s+курсов|курсов\w+\s+работ"),
    ("hours", "ЧАСЫ", r"(лекции,?\s*часы|всего\s+часов|зачетн\w+\s+единиц)"),
    ("authors", "АВТОРЫ", r"^составител"),
]

# РФ: 09.03.01; РБ: 1-27 01 01 и 1-27 01 01-01
SPECIALTY_RE = re.compile(
    r"\b(\d{2}\.\d{2}\.\d{2}|\d-\d{2}\s+\d{2}\s+\d{2}(?:-\d{2})?)\b"
)
UDC_RE = re.compile(r"УДК\s*([\d.]+)", re.IGNORECASE)
BBK_RE = re.compile(r"ББК\s*([\d.\s\-–]+)", re.IGNORECASE)
COMPETENCE_RE = re.compile(r"\b(?:ИОПК|ОПК|ПК|УК)-\d+(?:\.\d+)?\b", re.IGNORECASE)
LAB_RE = re.compile(
    r"лабораторн(?:ая|ой)?\s+работ[аые]?\s*(?:№|#)?\s*(\d+)\s*[.\-–:]?\s*(.+)",
    re.IGNORECASE,
)
AUTHORS_RE = re.compile(
    r"составители?\s*[:.]?\s*(.+?)(?:\n\n|\n#|рецензент|одобрено|рекомендовано|$)",
    re.IGNORECASE | re.DOTALL,
)
TITLE_HINTS = re.compile(
    r"(?:рабочая программа дисциплины|методические рекомендации[^\n]{0,80}\n)?"
    r"([А-ЯЁA-Z][А-ЯЁA-Z \-]{8,120})",
)
HOURS_ROWS = {
    "lectures": re.compile(r"лекци\w*[, ]{0,20}час[^\d]{0,12}(\d{1,3})", re.IGNORECASE),
    "labs": re.compile(r"лабораторн\w+\s+занят\w*[, ]{0,20}час[^\d]{0,12}(\d{1,3})", re.IGNORECASE),
    "self_study": re.compile(r"самостоятельн\w+\s+работ\w*[, ]{0,20}час[^\d]{0,12}(\d{1,3})", re.IGNORECASE),
    "contact": re.compile(r"контактн\w+\s+работ\w*[^\d]{0,20}(\d{1,3})", re.IGNORECASE),
}
TOTAL_HOURS_RE = re.compile(r"всего\s+часов[^\d]{0,40}(\d{2,4})\s*/\s*(\d{1,2})", re.IGNORECASE)
FRONT_MATTER_RE = re.compile(r"^---\n.*?\n---\n*", re.DOTALL)

_TYPE_SIGNALS = {
    "rp": [
        (5, r"рабочая программа дисциплины"),
        (4, r"пояснительная записка"),
        (3, r"планируемые результаты"),
        (3, r"учебно-методическая карта"),
        (2, r"\bзнать\b"),
        (2, r"\bуметь\b"),
        (2, r"\bвладеть\b"),
        (2, r"направления подготовки"),
        (2, r"регистрационн\w+\s+№"),
    ],
    "mu": [
        (5, r"методические рекомендации"),
        (4, r"лабораторн\w+\s+работ"),
        (3, r"контрольные вопросы"),
        (3, r"порядок выполнения работы"),
        (2, r"варианты заданий"),
        (2, r"очной формы обучения"),
    ],
    "fos": [
        (6, r"фонд оценочных средств"),
        (4, r"оценочные средства"),
        (3, r"уровни сформированности компетенц"),
        (3, r"критерии оценки"),
        (2, r"вопросы к зачету"),
        (2, r"вопросы к экзамену"),
    ],
    "up": [
        (6, r"^учебный план\b"),
        (3, r"календарный учебный график"),
    ],
    "oop": [
        (6, r"основная образовательная программа"),
        (3, r"\bооп\b"),
    ],
}


def _fold(text: str) -> str:
    return (text or "").casefold()


def _score_types(text: str) -> Dict[str, int]:
    folded = _fold(text)
    scores = {key: 0 for key in _TYPE_SIGNALS}
    for doc_type, rules in _TYPE_SIGNALS.items():
        for weight, pattern in rules:
            if re.search(pattern, folded, re.MULTILINE):
                scores[doc_type] += weight
    labs = len(re.findall(r"лабораторн\w+\s+работ", folded))
    if labs >= 3:
        scores["mu"] += 3
    if COMPETENCE_RE.search(text or "") and scores["rp"] >= 5:
        scores["rp"] += 2
    if "рабочая программа" in folded and "методические рекомендации" in folded:
        # титул МУ часто цитирует РП — не даём РП победить из-за одной фразы
        if scores["mu"] >= scores["rp"] - 2:
            scores["rp"] = max(0, scores["rp"] - 3)
    return scores


def classify_document(text: str) -> Tuple[str, Dict[str, int]]:
    scores = _score_types(text)
    best = max(scores, key=scores.get)
    if scores[best] < 4:
        return "other", scores
    return best, scores


def _unique(items: List[str]) -> List[str]:
    seen = set()
    out = []
    for item in items:
        key = item.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out


def _list_after(text: str, verb: str) -> List[str]:
    pattern = re.compile(
        rf"{verb}\s*[:.]?\s*((?:[-–—•]\s*.+\n?)+)",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        return []
    return _unique(re.findall(r"[-–—•]\s*(.+)", match.group(1)))


def _labs(text: str) -> List[dict]:
    labs = []
    for match in LAB_RE.finditer(text):
        title = re.sub(r"\s+", " ", match.group(2)).strip(" .")
        title = re.split(r"\s{2,}|\.{2,}|стр\.|с\.\s*\d", title, maxsplit=1)[0].strip(" .")
        if len(title) < 4:
            continue
        labs.append({"number": int(match.group(1)), "title": title[:200]})
    # уникальные по номеру, первое вхождение обычно из оглавления
    by_num = {}
    for lab in labs:
        by_num.setdefault(lab["number"], lab)
    return [by_num[n] for n in sorted(by_num)]


def _hours(text: str) -> dict:
    hours = {}
    window = text[:8000]
    for key, pattern in HOURS_ROWS.items():
        match = pattern.search(window)
        if match:
            hours[key] = int(match.group(1))
    total = TOTAL_HOURS_RE.search(window)
    if total:
        hours["total"] = int(total.group(1))
        hours["credits"] = int(total.group(2))
    return hours


def _title(text: str, doc_type: str) -> Optional[str]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    skip = re.compile(
        r"^(#{1,6}\s*)?(\d+(\.\d+)*\s+)?(межгосударственн|белорусско-российск|кафедра|могилев|"
        r"рекомендовано|одобрено|удк|ббк|содержани|рабочая программа|"
        r"учебно-методическое издание|направления подготовки|составител|"
        r"пояснительн|планируем|оценочн|критери|методик|уровень|"
        r"опк-|пк-|ук-|иопк-)",
        re.IGNORECASE,
    )
    numbered = re.compile(r"^\d+(\.\d+)*\b")
    candidates = []
    for line in lines[:50]:
        clean = re.sub(r"^#+\s*", "", line)
        clean = clean.replace("\\", "")
        clean = re.sub(r"_+", " ", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" «»\"")
        if skip.match(clean) or numbered.match(clean) or len(clean) < 8:
            continue
        letters = re.sub(r"[^А-Яа-яЁёA-Za-z ]", "", clean)
        if not letters:
            continue
        if letters.isupper() and len(letters) >= 10:
            candidates.append(clean.title() if clean.isupper() else clean)
        elif doc_type in ("rp", "mu") and 12 <= len(clean) <= 140 and clean[0].isupper():
            if "способ" in clean.casefold():
                continue
            candidates.append(clean)
    if not candidates:
        return None

    def score(s: str) -> int:
        n = len(re.sub(r"[^А-Яа-яЁёA-Za-z]", "", s))
        value = 0
        if 12 <= n <= 80:
            value += 10
        letters = re.sub(r"[^А-Яа-яЁёA-Za-z ]", "", s)
        if letters.isupper():
            value += 6
        if n > 100:
            value -= 12
        return value

    return max(candidates, key=score)[:200]


def extract_card(text: str) -> dict:
    doc_type, scores = classify_document(text)
    authors_match = AUTHORS_RE.search(text)
    authors = []
    if authors_match:
        raw = re.sub(r"\s+", " ", authors_match.group(1))
        parts = re.split(r";|\s+и\s+(?=[А-ЯA-Z])", raw)
        authors = _unique(
            re.sub(r"^[^А-ЯA-Z]+", "", a).strip(" .")
            for a in parts if 8 < len(a.strip()) < 120
        )[:6]

    card = {
        "document_type": doc_type,
        "document_type_label": TYPE_LABELS[doc_type],
        "type_scores": scores,
        "title": _title(text, doc_type),
        "specialties": _unique(SPECIALTY_RE.findall(text)),
        "competences": _unique([m.upper() for m in COMPETENCE_RE.findall(text)]),
        "udc": (UDC_RE.search(text).group(1) if UDC_RE.search(text) else None),
        "bbk": (BBK_RE.search(text).group(1).strip() if BBK_RE.search(text) else None),
        "authors": authors,
        "hours": _hours(text),
        "know": _list_after(text, "знать"),
        "can": _list_after(text, "уметь"),
        "own": _list_after(text, "владеть"),
        "labs": _labs(text),
    }
    return card


def detect_role(text: str) -> Optional[Tuple[str, str]]:
    folded = _fold(text)
    for role, label, pattern in ROLE_RULES:
        if re.search(pattern, folded, re.MULTILINE):
            return role, label
    return None


def annotate_markdown(text: str, card: Optional[dict] = None) -> str:
    """Front matter + метки ролей на заголовках + маркер кодов специальностей и компетенций."""
    card = card or extract_card(text)
    body = FRONT_MATTER_RE.sub("", text).lstrip()
    lines = []
    for line in body.splitlines():
        heading = re.match(r"^(#{1,6})\s+(.*)$", line)
        if heading:
            hashes, title = heading.group(1), heading.group(2)
            title = re.sub(r"^\[[А-ЯЁA-Z/\s]+\]\s+", "", title)
            found = detect_role(title)
            if found:
                _, label = found
                line = f"{hashes} [{label}] {title}"
        lines.append(line)
    body = "\n".join(lines)
    body = SPECIALTY_RE.sub(r"==\1==", body)
    body = COMPETENCE_RE.sub(lambda m: f"=={m.group(0).upper()}==", body)
    body = UDC_RE.sub(lambda m: f"==УДК {m.group(1)}==", body)

    yaml_lines = [
        "---",
        f"document_type: {card['document_type']}",
        f"document_type_label: \"{card['document_type_label']}\"",
    ]
    if card.get("title"):
        yaml_lines.append(f"title: \"{card['title'].replace(chr(34), '')}\"")
    if card.get("specialties"):
        yaml_lines.append("specialties: [" + ", ".join(card["specialties"]) + "]")
    if card.get("competences"):
        yaml_lines.append("competences: [" + ", ".join(card["competences"][:12]) + "]")
    if card.get("udc"):
        yaml_lines.append(f"udc: {card['udc']}")
    yaml_lines += ["important: true", "---", ""]
    yaml_lines.append(f"> **Тип документа:** {card['document_type_label']}")
    if card.get("labs"):
        yaml_lines.append(f"> **Лабораторных работ:** {len(card['labs'])}")
    yaml_lines.append("")
    return "\n".join(yaml_lines) + body


def tag_chunks(chunks: List[dict], card: Optional[dict] = None) -> List[dict]:
    card = card or {}
    doc_type = card.get("document_type")
    for chunk in chunks:
        blob = " ".join(chunk.get("headings") or []) + "\n" + (chunk.get("text") or "")
        found = detect_role(blob)
        role, label = found if found else (None, None)
        chunk["role"] = role
        chunk["role_label"] = label
        chunk["document_type"] = doc_type
        chunk["important"] = role is not None or bool(
            SPECIALTY_RE.search(blob) or COMPETENCE_RE.search(blob)
        )
        if chunk["important"] and chunk.get("text_for_embedding"):
            prefix = f"[{TYPE_LABELS.get(doc_type, doc_type) or 'документ'}]"
            if label:
                prefix += f" [{label}]"
            if not chunk["text_for_embedding"].startswith("["):
                chunk["text_for_embedding"] = f"{prefix} {chunk['text_for_embedding']}"
    return chunks


@dataclass
class Enrichment:
    markdown: str
    card: dict
    chunks: List[dict] = field(default_factory=list)


def enrich(markdown: str, chunks: Optional[List[dict]] = None) -> Enrichment:
    card = extract_card(markdown)
    card["labs_count"] = len(card.get("labs") or [])
    card["important_roles"] = sorted({
        role for role, _, pattern in ROLE_RULES
        if re.search(pattern, _fold(markdown), re.MULTILINE)
    })
    annotated = annotate_markdown(markdown, card)
    tagged = tag_chunks(list(chunks or []), card)
    return Enrichment(markdown=annotated, card=card, chunks=tagged)
