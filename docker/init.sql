-- Calibr.xyz Database Initialization
-- This script runs when the PostgreSQL container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create additional schemas if needed
-- CREATE SCHEMA IF NOT EXISTS calibr;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE calibr TO calibr;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Calibr.xyz database initialized successfully';
END $$;
