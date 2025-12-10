-- =============================================================================
-- YGGDRASIL Database Initialization
-- =============================================================================
-- This script runs automatically when the PostgreSQL container is first created.
-- It sets up the required extensions and initial configuration.
-- =============================================================================

-- Enable pgvector extension for semantic search and embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for text search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable uuid-ossp for UUID generation (alternative to cuid)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges to yggdrasil user
GRANT ALL PRIVILEGES ON DATABASE yggdrasil TO yggdrasil;

-- Verify extensions are installed
DO $$
BEGIN
    RAISE NOTICE 'YGGDRASIL database initialized successfully';
    RAISE NOTICE 'Extensions installed: vector, pg_trgm, uuid-ossp';
END $$;
