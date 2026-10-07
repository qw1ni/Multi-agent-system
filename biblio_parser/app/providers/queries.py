CREATE_TABLE_FACULTIES = """
CREATE TABLE IF NOT EXISTS faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    url TEXT NOT NULL UNIQUE
);
"""

CREATE_TABLE_DEPARTMENTS = """
-- Связь: 1 Факультет имеет М Кафедр
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    url TEXT NOT NULL UNIQUE,
    faculty_id INTEGER NOT NULL,
    CONSTRAINT fk_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES faculties(id)
        ON DELETE CASCADE
);
"""

CREATE_TABLE_AUTHORS = """
CREATE TABLE IF NOT EXISTS authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);
"""

CREATE_TABLE_KEYWORDS = """
CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    word VARCHAR(100) UNIQUE NOT NULL
);
"""

CREATE_TABLE_SPECIALTIES = """
CREATE TABLE IF NOT EXISTS specialties (
    spec_code VARCHAR(30) PRIMARY KEY,
    spec_name TEXT NOT NULL
);
"""

CREATE_TABLE_TYPES = """
CREATE TABLE IF NOT EXISTS types (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) UNIQUE NOT NULL
);
"""

CREATE_TABLE_UDC_CODES = """
CREATE TABLE IF NOT EXISTS udc_codes (
    code TEXT PRIMARY KEY,      
    title TEXT
);
"""

CREATE_TABLE_MATERIALS = """
-- Связи 1:М с departments
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    alternative_title TEXT,
    abstract_text TEXT,
    language_code VARCHAR(10) DEFAULT 'ru',
    publisher TEXT,
    citation TEXT,
    uri TEXT NOT NULL UNIQUE,
    available_date TIMESTAMP,
    issued_year INTEGER,
    pages INTEGER,
    file_link TEXT NOT NULL UNIQUE,
    department_id INTEGER NOT NULL,

    CONSTRAINT fk_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE
);
"""

CREATE_TABLE_MATERIAL_AUTHORS = """
-- Связь автор - материал
CREATE TABLE IF NOT EXISTS material_authors (
    material_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    PRIMARY KEY (material_id, author_id),
    CONSTRAINT fk_material_ma
        FOREIGN KEY (material_id)
        REFERENCES materials(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_author_ma
        FOREIGN KEY (author_id)
        REFERENCES authors(id)
        ON DELETE CASCADE
);
"""

CREATE_TABLE_MATERIAL_KEYWORDS = """
-- Связь ключевое_слово - материал
CREATE TABLE IF NOT EXISTS material_keywords (
    material_id INTEGER NOT NULL,
    keyword_id INTEGER NOT NULL,
    PRIMARY KEY (material_id, keyword_id),
    CONSTRAINT fk_material_mk
        FOREIGN KEY (material_id)
        REFERENCES materials(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_keyword_mk
        FOREIGN KEY (keyword_id)
        REFERENCES keywords(id)
        ON DELETE CASCADE
);
"""

CREATE_TABLE_MATERIAL_SPECIALTIES = """
-- Связь специальность - материал
CREATE TABLE IF NOT EXISTS material_specialties (
    material_id INTEGER NOT NULL,
    spec_code VARCHAR(30) NOT NULL,
    PRIMARY KEY (material_id, spec_code),
    CONSTRAINT fk_material_ms
        FOREIGN KEY (material_id)
        REFERENCES materials(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_specialty_ms
        FOREIGN KEY (spec_code)
        REFERENCES specialties(spec_code)
        ON DELETE CASCADE
);
"""

CREATE_TABLE_MATERIAL_TYPES = """
-- Связь тип - материал
CREATE TABLE IF NOT EXISTS material_types (
    material_id INTEGER NOT NULL,
    type_id INTEGER NOT NULL,
    PRIMARY KEY (material_id, type_id),
    CONSTRAINT fk_material_mt
        FOREIGN KEY (material_id)
        REFERENCES materials(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_specialty_mt
        FOREIGN KEY (type_id)
        REFERENCES types(id)
        ON DELETE CASCADE
);
"""

CREATE_TABLE_MATERIAL_UDC = """
-- Связь УДК код - материал
CREATE TABLE IF NOT EXISTS material_udcCodes (
    material_id INTEGER NOT NULL,
    code_udc TEXT NOT NULL,
    PRIMARY KEY (material_id, code_udc),
    CONSTRAINT fk_material_mu
        FOREIGN KEY (material_id)
        REFERENCES materials(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_udcCodes_mu
        FOREIGN KEY (code_udc)
        REFERENCES udc_codes(code)
        ON DELETE CASCADE
);
"""

CREATE_TABLE_MATERIAL_EMBEDDINGS = """
-- Основная таблица для векторных представлений материалов
CREATE TABLE IF NOT EXISTS material_embeddings (
    material_id INTEGER PRIMARY KEY,
    
    text_embedding vector(384),           -- Для поиска по названию и аннотации
    
    CONSTRAINT fk_material_embedding
        FOREIGN KEY (material_id)
        REFERENCES materials(id)
        ON DELETE CASCADE
);
"""

CREATE_TABLE_ROLES = """
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);
"""

CREATE_TABLE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    login VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    faculty_id INTEGER,
    department_id INTEGER,
    role_id INTEGER NOT NULL,
    
    CONSTRAINT fk_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES faculties(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT
);
"""

CREATE_TABLE_DISCIPLINES = """
CREATE TABLE IF NOT EXISTS disciplines (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
"""

CREATE_TABLE_DEPARTMENT_DISCIPLINES = """
CREATE TABLE IF NOT EXISTS department_disciplines (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL,
    discipline_id INTEGER NOT NULL,
    year_start INTEGER NOT NULL,
    
    CONSTRAINT fk_department_dd
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_discipline_dd
        FOREIGN KEY (discipline_id)
        REFERENCES disciplines(id)
        ON DELETE CASCADE,
        
    -- Одна кафедра не может иметь ту же дисциплину дважды в один год
    CONSTRAINT unique_department_discipline_year 
        UNIQUE (department_id, discipline_id, year_start)
);
"""

CREATE_TABLE_DISCIPLINE_SPECIALTIES = """
CREATE TABLE IF NOT EXISTS discipline_specialties (
    discipline_id INTEGER NOT NULL,
    spec_code VARCHAR(30) NOT NULL,
    
    PRIMARY KEY (discipline_id, spec_code),
    
    CONSTRAINT fk_discipline_ds
        FOREIGN KEY (discipline_id)
        REFERENCES disciplines(id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_specialty_ds
        FOREIGN KEY (spec_code)
        REFERENCES specialties(spec_code)
        ON DELETE CASCADE
);
"""

CREATE_TEMP_STAGE_TABLE = """
CREATE TEMP TABLE IF NOT EXISTS temp_material_stage (
    title TEXT,
    alternative_title TEXT,
    abstract_text TEXT,
    language_code VARCHAR(10),
    publisher TEXT,
    citation TEXT,
    uri TEXT,
    available_date TEXT,
    issued_year TEXT,
    pages INTEGER,
    file_link TEXT,
    department_id INTEGER,
    authors TEXT[],      -- Массив авторов
    subjects TEXT[],     -- Массив ключевых слов
    types TEXT[],        -- Массив типов
    udcs TEXT[],         -- Массив УДК
    specs TEXT[]         -- Массив специальностей
) ON COMMIT DROP; -- Удалять данные автоматически при завершении транзакции
"""

INIT_DB_COMMANDS = [
    CREATE_TABLE_FACULTIES,
    CREATE_TABLE_DEPARTMENTS,
    CREATE_TABLE_AUTHORS,
    CREATE_TABLE_KEYWORDS,
    CREATE_TABLE_SPECIALTIES,
    CREATE_TABLE_TYPES,
    CREATE_TABLE_UDC_CODES,
    CREATE_TABLE_MATERIALS,
    CREATE_TABLE_MATERIAL_AUTHORS,
    CREATE_TABLE_MATERIAL_KEYWORDS,
    CREATE_TABLE_MATERIAL_SPECIALTIES,
    CREATE_TABLE_MATERIAL_TYPES,
    CREATE_TABLE_MATERIAL_UDC,
    CREATE_TABLE_MATERIAL_EMBEDDINGS,
    CREATE_TABLE_ROLES,
    CREATE_TABLE_USERS,
    CREATE_TABLE_DISCIPLINES,
    CREATE_TABLE_DEPARTMENT_DISCIPLINES,
    CREATE_TABLE_DISCIPLINE_SPECIALTIES,
]

INSERT_FACULTY = """
    INSERT INTO faculties (name, url) 
    VALUES (%s, %s) 
    ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name 
    RETURNING id;
"""

INSERT_DEPARTMENT = """
    INSERT INTO departments (name, url, faculty_id) 
    VALUES (%s, %s, %s) 
    ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name 
    RETURNING id;
"""

INSERT_AUTHOR = """
    INSERT INTO authors (name) 
    VALUES (%s) 
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
    RETURNING id;
"""

INSERT_KEYWORD = """
    INSERT INTO keywords (word) 
    VALUES (%s) 
    ON CONFLICT (word) DO UPDATE SET word = EXCLUDED.word 
    RETURNING id;
"""

INSERT_SPECIALTY = """
    INSERT INTO specialties (spec_code, spec_name) 
    VALUES (%s, %s) 
    ON CONFLICT (spec_code) DO UPDATE SET spec_name = EXCLUDED.spec_name 
    RETURNING spec_code;
"""

INSERT_TYPE = """
    INSERT INTO types (type_name) 
    VALUES (%s) 
    ON CONFLICT (type_name) DO UPDATE SET type_name = EXCLUDED.type_name 
    RETURNING id;
"""

INSERT_UDC_CODES = """
    INSERT INTO udc_codes (code, title) 
    VALUES (%s, %s)
    ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title
    RETURNING code;
"""

INSERT_ROLE = """
    INSERT INTO roles (name) 
    VALUES (%s)
    ON CONFLICT (name) DO NOTHING
    RETURNING id;
"""

INSERT_MATERIAL = """    
    INSERT INTO materials (
        title, 
        alternative_title, 
        abstract_text, 
        language_code, 
        publisher, 
        citation, 
        uri, 
        available_date, 
        issued_year, 
        pages,
        file_link,
        department_id
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
    ) 
    ON CONFLICT (uri) DO UPDATE SET title = EXCLUDED.title
    RETURNING id;
"""

INSERT_USER = """
    INSERT INTO users (full_name, login, email, password, faculty_id, department_id, role_id) 
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (login) DO NOTHING
    RETURNING user_id;
"""

INSERT_MATERIAL_AUTHOR = """
    INSERT INTO material_authors (material_id, author_id) 
    VALUES (%s, %s) 
    ON CONFLICT (material_id, author_id) DO NOTHING;
"""

INSERT_MATERIAL_KEYWORD = """
    INSERT INTO material_keywords (material_id, keyword_id) 
    VALUES (%s, %s) 
    ON CONFLICT (material_id, keyword_id) DO NOTHING;
"""

INSERT_MATERIAL_SPECIALTY = """
    INSERT INTO material_specialties (material_id, spec_code) 
    VALUES (%s, %s) 
    ON CONFLICT (material_id, spec_code) DO NOTHING;
"""

INSERT_MATERIAL_TYPE = """
    INSERT INTO material_types (material_id, type_id) 
    VALUES (%s, %s)
    ON CONFLICT (material_id, type_id) DO NOTHING;
"""

INSERT_MATERIAL_UDC = """
    INSERT INTO material_udcCodes (material_id, code_udc) 
    VALUES (%s, %s)
    ON CONFLICT (material_id, code_udc) DO NOTHING;
"""

INSERT_DISCIPLINE = """
    INSERT INTO disciplines (name) 
    VALUES (%s) 
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id;
"""

INSERT_DEPARTMENT_DISCIPLINE = """
    INSERT INTO department_disciplines (department_id, discipline_id, year_start)
    VALUES (%s, %s, %s)
    ON CONFLICT (department_id, discipline_id, year_start) DO NOTHING
    RETURNING id;
"""

INSERT_DISCIPLINE_SPECIALTY = """
    INSERT INTO discipline_specialties (discipline_id, spec_code)
    VALUES (%s, %s)
    ON CONFLICT (discipline_id, spec_code) DO NOTHING;
"""

INSERT_INTO_STAGE = """
INSERT INTO temp_material_stage (
    title, alternative_title, abstract_text, language_code, publisher, 
    citation, uri, available_date, issued_year, pages, file_link, department_id,
    authors, subjects, types, udcs, specs
) VALUES %s
"""

BATCH_DISTRIBUTE_DATA = """
INSERT INTO authors (name)
SELECT DISTINCT unnest(authors) FROM temp_material_stage
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO keywords (word)
SELECT DISTINCT unnest(subjects) FROM temp_material_stage
ON CONFLICT (word) DO UPDATE SET word = EXCLUDED.word;

INSERT INTO types (type_name)
SELECT DISTINCT unnest(types) FROM temp_material_stage
ON CONFLICT (type_name) DO UPDATE SET type_name = EXCLUDED.type_name;

INSERT INTO udc_codes (code, title)
SELECT DISTINCT 
    split_part(raw_udc, ' ', 1) AS code,
    NULLIF(trim(substring(raw_udc from ' \s*(.*)')), '') AS title
FROM (
    SELECT unnest(udcs) AS raw_udc FROM temp_material_stage
) sub
WHERE raw_udc IS NOT NULL AND raw_udc <> ''
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO specialties (spec_code, spec_name)
SELECT DISTINCT
    trim(substring(raw_spec from '^([0-9.\- ]+)\s+')) AS spec_code,
    trim(substring(raw_spec from '^[0-9.\- ]+\s+(.*)')) AS spec_name
FROM (
    SELECT unnest(specs) AS raw_spec FROM temp_material_stage
) sub
WHERE raw_spec IS NOT NULL AND raw_spec ~ '^([0-9.\- ]+)\s+(.*)'
ON CONFLICT (spec_code) DO UPDATE SET spec_name = EXCLUDED.spec_name;

INSERT INTO materials (
    title, alternative_title, abstract_text, language_code, publisher, 
    citation, uri, available_date, issued_year, pages, file_link, department_id
)
SELECT DISTINCT 
    title, 
    alternative_title, 
    abstract_text, 
    language_code, 
    publisher, 
    citation, 
    uri, 
    NULLIF(available_date, '')::timestamp,
    NULLIF(issued_year, '')::integer,
    pages, 
    file_link, 
    department_id
FROM temp_material_stage
ON CONFLICT (uri) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO material_authors (material_id, author_id)
SELECT DISTINCT m.id, a.id
FROM temp_material_stage stage
JOIN materials m ON m.uri = stage.uri
JOIN authors a ON a.name = any(stage.authors)
ON CONFLICT (material_id, author_id) DO NOTHING;

INSERT INTO material_keywords (material_id, keyword_id)
SELECT DISTINCT m.id, k.id
FROM temp_material_stage stage
JOIN materials m ON m.uri = stage.uri
JOIN keywords k ON k.word = any(stage.subjects)
ON CONFLICT (material_id, keyword_id) DO NOTHING;

INSERT INTO material_types (material_id, type_id)
SELECT DISTINCT m.id, t.id
FROM temp_material_stage stage
JOIN materials m ON m.uri = stage.uri
JOIN types t ON t.type_name = any(stage.types)
ON CONFLICT (material_id, type_id) DO NOTHING;

INSERT INTO material_udcCodes (material_id, code_udc)
SELECT DISTINCT m.id, split_part(raw_udc, ' ', 1)
FROM temp_material_stage stage
JOIN materials m ON m.uri = stage.uri
CROSS JOIN unnest(stage.udcs) AS raw_udc
WHERE raw_udc IS NOT NULL AND raw_udc <> ''
ON CONFLICT (material_id, code_udc) DO NOTHING;

INSERT INTO material_specialties (material_id, spec_code)
SELECT DISTINCT 
    m.id, 
    trim((regexp_matches(raw_spec, '^([0-9.\- ]+)\s+(.*)'))[1])
FROM temp_material_stage stage
JOIN materials m ON m.uri = stage.uri
CROSS JOIN unnest(stage.specs) AS raw_spec
WHERE raw_spec IS NOT NULL AND raw_spec ~ '^([0-9.\- ]+)\s+(.*)'
ON CONFLICT (material_id, spec_code) DO NOTHING;
"""

INSERT_MAP = {
    'faculty': INSERT_FACULTY,
    'department': INSERT_DEPARTMENT,
    'author': INSERT_AUTHOR,
    'keyword': INSERT_KEYWORD,
    'specialty': INSERT_SPECIALTY,
    'type': INSERT_TYPE,
    'udc_code': INSERT_UDC_CODES,
    'role': INSERT_ROLE,
    'material': INSERT_MATERIAL,
    'user': INSERT_USER,
    'material_author': INSERT_MATERIAL_AUTHOR,
    'material_keyword': INSERT_MATERIAL_KEYWORD,
    'material_specialty': INSERT_MATERIAL_SPECIALTY,
    'material_type': INSERT_MATERIAL_TYPE,
    'material_udc': INSERT_MATERIAL_UDC,
    'discipline': INSERT_DISCIPLINE,
    'discipline_specialty': INSERT_DISCIPLINE_SPECIALTY,
    'department_discipline': INSERT_DEPARTMENT_DISCIPLINE
}

GET_DEPARTMENT_ID = """
    SELECT id FROM departments 
    WHERE name ILIKE '%%' || %s || '%%' 
    LIMIT 1
"""

GET_DISCIPLINE_ID = "SELECT id FROM disciplines WHERE name = %s"

SELECT_MAP = {
    'get_department': GET_DEPARTMENT_ID,
    'get_discipline': GET_DISCIPLINE_ID,
}
