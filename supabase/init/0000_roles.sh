#!/bin/bash
# Minimal Supabase roles required by gotrue + postgrest.
# Runs before app migrations (filename sorts first). Uses $POSTGRES_PASSWORD.
set -e

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-SQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
      CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
      CREATE ROLE authenticator NOINHERIT LOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
      CREATE ROLE supabase_auth_admin NOINHERIT LOGIN CREATEROLE;
    END IF;
    -- gotrue migrations grant to "postgres"; the image's superuser is supabase_admin
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') THEN
      CREATE ROLE postgres LOGIN SUPERUSER;
    END IF;
  END
  \$\$;

  ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE postgres WITH PASSWORD '$POSTGRES_PASSWORD';

  GRANT anon TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role TO authenticator;

  CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON SCHEMA public TO supabase_auth_admin;
  ALTER ROLE supabase_auth_admin SET search_path = auth, public;

  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

  -- auth.uid()/auth.role(): RLS policies depend on them. Owner must be
  -- supabase_auth_admin so gotrue's own migrations can replace them.
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS \$\$
    SELECT coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  \$\$;
  CREATE OR REPLACE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE AS \$\$
    SELECT coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
    )::text
  \$\$;
  ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;
  ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;
SQL
