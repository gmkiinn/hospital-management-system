-- Runs automatically only on a fresh Postgres volume (first init).
-- Creates the restricted application role that the app connects as at runtime.
-- Table/RLS grants live in Alembic migrations so they stay versioned with the schema.
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hms_app') THEN
      CREATE ROLE hms_app LOGIN PASSWORD 'hms_app_dev_password';
   END IF;
END
$$;
