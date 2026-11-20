-- Trigram indexes on posts.text and users (docs/architecture/data-model.md 3) need pg_trgm.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
