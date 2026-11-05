"""Загрузка Excel «План на 20xx» / «Факт на 20xx» в curriculum_plans."""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

import openpyxl
import psycopg2
from psycopg2.extras import execute_values

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "curriculum_plans"

SHAREPOINT_ID = re.compile(r";#\d+")
SPEC_RE = re.compile(
    r"(\d{2}\.\d{2}\.\d{2}|\d-\d{2}(?:-\d{4}-\d{2}|\s+\d{2}\s+\d{2}(?:-\d{2})?))"
)


def _env():
    from dotenv import load_dotenv
    import os
    load_dotenv(ROOT / ".env")
    return dict(
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5433"),
        dbname=os.getenv("DB_NAME", "university_library_db"),
    )


def file_sha(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def clean_name(value) -> str:
    if value is None:
        return ""
    text = SHAREPOINT_ID.sub("", str(value))
    return re.sub(r"\s+", " ", text).strip(" ;")


def parse_specs(*values) -> list[str]:
    codes = []
    for value in values:
        if not value:
            continue
        for match in SPEC_RE.finditer(str(value)):
            code = re.sub(r"\s+", " ", match.group(1)).strip()
            if code not in codes:
                codes.append(code)
    return codes


def num(value):
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).replace(",", ".")))
    except ValueError:
        return None


def dec(value):
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "."))
    except ValueError:
        return None


def load_sheet(path: Path) -> tuple[list[str], list[dict]]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = ws.iter_rows(values_only=True)
    header = [str(c).strip() if c else f"col_{i}" for i, c in enumerate(next(rows))]
    out = []
    for i, raw in enumerate(rows, start=2):
        if not any(c is not None and str(c).strip() for c in raw):
            continue
        rec = {header[j]: raw[j] if j < len(raw) else None for j in range(len(header))}
        rec["_row"] = i
        out.append(rec)
    wb.close()
    return header, out


def item_from_plan(rec: dict) -> dict:
    disc = clean_name(rec.get("Дисциплина")) or "—"
    return {
        "discipline_name": disc[:255],
        "department_name": clean_name(rec.get("Кафедра") or rec.get("Подразделение")) or None,
        "material_kind": clean_name(rec.get("Методические рекомендации к")) or None,
        "publication_title": None,
        "authors": clean_name(rec.get("Автор")) or None,
        "spec_codes": parse_specs(rec.get("Для специальности"), rec.get("Для направления подготовки")),
        "semester": num(rec.get("Семестр")),
        "month": clean_name(rec.get("Месяц")) or None,
        "volume_sheets": dec(rec.get("Объем, уч.-изд.л.(1-3)")),
        "print_run": num(rec.get("Тираж, экз.")),
        "form_of_study": clean_name(rec.get("Форма обучения")) or None,
        "status": clean_name(rec.get("Отметка о выполнении") or rec.get("Состояние заявки")) or None,
        "source_row": rec["_row"],
        "sort_order": rec["_row"],
        "module_name": clean_name(rec.get("Раздел дисциплины (по необходимости)")) or None,
    }


def item_from_fact(rec: dict) -> dict:
    disc = clean_name(rec.get("Дисциплина")) or "—"
    title = clean_name(rec.get("Название")) or None
    return {
        "discipline_name": disc[:255],
        "department_name": clean_name(rec.get("Подразделение")) or None,
        "material_kind": clean_name(rec.get("Тип контента")) or None,
        "publication_title": title[:500] if title else None,
        "authors": clean_name(rec.get("Автор")) or None,
        "spec_codes": parse_specs(rec.get("Для специальности"), rec.get("Направления подготовки")),
        "semester": None,
        "month": clean_name(rec.get("Месяц")) or None,
        "volume_sheets": dec(rec.get("Объем, п.л.")),
        "print_run": num(rec.get("Тираж, экз.")),
        "form_of_study": clean_name(rec.get("Форма обучения")) or None,
        "status": clean_name(rec.get("Статус УМД") or rec.get("Установка отметки_Опубликовано")) or None,
        "source_row": rec["_row"],
        "sort_order": rec["_row"],
        "module_name": clean_name(rec.get("Раздел дисциплины (по необходимости)")) or None,
    }


def replace_plan(cur, *, kind: str, year: int, title: str, path: Path, items: list[dict]):
    cur.execute("DELETE FROM curriculum_plans WHERE kind = %s AND year_start = %s AND source_file = %s",
                (kind, year, path.name))
    cur.execute(
        """INSERT INTO curriculum_plans
           (spec_code, kind, title, year_start, source_file, source_sha256, notes)
           VALUES (NULL, %s, %s, %s, %s, %s, %s)
           RETURNING id""",
        (kind, title, year, path.name, file_sha(path), f"строк: {len(items)}"),
    )
    plan_id = cur.fetchone()[0]
    rows = [
        (
            plan_id,
            it["module_name"],
            it["discipline_name"],
            it["department_name"],
            it["material_kind"],
            it["publication_title"],
            it["authors"],
            it["spec_codes"],
            it["semester"],
            it["month"],
            it["volume_sheets"],
            it["print_run"],
            it["form_of_study"],
            it["status"],
            it["source_row"],
            it["sort_order"],
        )
        for it in items
    ]
    execute_values(
        cur,
        """INSERT INTO curriculum_plan_items (
            plan_id, module_name, discipline_name, department_name, material_kind,
            publication_title, authors, spec_codes, semester, month,
            volume_sheets, print_run, form_of_study, status, source_row, sort_order
        ) VALUES %s""",
        rows,
        page_size=500,
    )
    return plan_id, len(rows)


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = psycopg2.connect(**_env())
    conn.autocommit = False
    cur = conn.cursor()
    jobs = [
        ("План на 2027.xlsx", "plan", 2027, "План издания УМД на 2027", item_from_plan),
        ("Факт на 2026.xlsx", "fact", 2026, "Факт издания УМД на 2026", item_from_fact),
    ]
    try:
        for filename, kind, year, title, mapper in jobs:
            path = DATA_DIR / filename
            if not path.exists():
                print("нет файла", path)
                continue
            _, recs = load_sheet(path)
            items = [mapper(r) for r in recs]
            plan_id, n = replace_plan(cur, kind=kind, year=year, title=title, path=path, items=items)
            print(f"{filename}: plan_id={plan_id} kind={kind} rows={n}")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    sys.exit(main() or 0)
