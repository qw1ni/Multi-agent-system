-- RAG: чанки конвертера (chunks.jsonl) → pgvector 384 (MiniLM).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunk_embeddings (
    chunk_id       TEXT PRIMARY KEY,
    material_id    INTEGER REFERENCES materials(id) ON DELETE SET NULL,
    doc_id         TEXT NOT NULL,
    section        TEXT,
    source_file    TEXT,
    chunk_index    INTEGER,
    headings       TEXT,
    pages          INTEGER[],
    role           TEXT,
    document_type  TEXT,
    important      BOOLEAN NOT NULL DEFAULT FALSE,
    text           TEXT NOT NULL,
    embedding      vector(384) NOT NULL,
    indexed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chunk_embeddings_hnsw
    ON chunk_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS chunk_embeddings_material_id
    ON chunk_embeddings (material_id);

CREATE INDEX IF NOT EXISTS chunk_embeddings_doc_id
    ON chunk_embeddings (doc_id);
