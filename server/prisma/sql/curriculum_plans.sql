-- План и факт издания УМД (методички), плюс шапка учебного плана специальности.
-- Норма — curriculum_plans.kind = 'plan', факт издания — kind = 'fact'.
-- LLM сравнивает строки плана с фактом и с материалами библиотеки.

CREATE TABLE IF NOT EXISTS curriculum_plans (
    id              SERIAL PRIMARY KEY,
    spec_code       VARCHAR(30) REFERENCES specialties(spec_code)
                        ON UPDATE CASCADE ON DELETE RESTRICT,
    kind            VARCHAR(20) NOT NULL DEFAULT 'plan',
    title           TEXT NOT NULL,
    year_start      INTEGER,
    form_of_study   VARCHAR(50),
    qualification   VARCHAR(100),
    source_file     TEXT,
    source_sha256   TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE curriculum_plans ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'plan';
ALTER TABLE curriculum_plans ALTER COLUMN spec_code DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_plans_kind_year_file
    ON curriculum_plans (kind, COALESCE(year_start, 0), COALESCE(source_file, ''));

CREATE TABLE IF NOT EXISTS curriculum_plan_items (
    id                 SERIAL PRIMARY KEY,
    plan_id            INTEGER NOT NULL REFERENCES curriculum_plans(id) ON DELETE CASCADE,
    module_name        TEXT,
    discipline_name    TEXT NOT NULL,
    discipline_id      INTEGER REFERENCES disciplines(id) ON DELETE SET NULL,
    department_name    TEXT,
    material_kind      TEXT,
    publication_title  TEXT,
    authors            TEXT,
    spec_codes         TEXT[] NOT NULL DEFAULT '{}',
    semester           INTEGER,
    month              TEXT,
    lectures_hours     INTEGER,
    labs_hours         INTEGER,
    practice_hours     INTEGER,
    self_study_hours   INTEGER,
    total_hours        INTEGER,
    credits            NUMERIC(5,1),
    volume_sheets      NUMERIC(6,2),
    print_run          INTEGER,
    control_form       VARCHAR(80),
    competences        TEXT[] NOT NULL DEFAULT '{}',
    form_of_study      VARCHAR(50),
    status             TEXT,
    source_row         INTEGER,
    sort_order         INTEGER
);

ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS department_name TEXT;
ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS material_kind TEXT;
ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS publication_title TEXT;
ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS authors TEXT;
ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS spec_codes TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS month TEXT;
ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS volume_sheets NUMERIC(6,2);
ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS print_run INTEGER;
ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS form_of_study VARCHAR(50);
ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE curriculum_plan_items ADD COLUMN IF NOT EXISTS source_row INTEGER;

DROP INDEX IF EXISTS curriculum_plan_items_plan_disc_sem;
CREATE INDEX IF NOT EXISTS curriculum_plan_items_discipline ON curriculum_plan_items (discipline_id);
CREATE INDEX IF NOT EXISTS curriculum_plan_items_plan ON curriculum_plan_items (plan_id);
CREATE INDEX IF NOT EXISTS curriculum_plan_items_specs ON curriculum_plan_items USING GIN (spec_codes);

COMMENT ON TABLE curriculum_plans IS 'План или факт издания УМД / учебный план специальности';
COMMENT ON TABLE curriculum_plan_items IS 'Строка: дисциплина, вид издания, специальности, статус';
