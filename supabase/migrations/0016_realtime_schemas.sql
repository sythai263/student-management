-- Schemas required by the self-hosted Realtime service.
-- `_realtime` stores realtime's own metadata (tenants, extensions); its
-- startup migrations fail when the schema is missing.
-- `realtime` is the tenant-facing schema (messages, subscription, ...)
-- created by realtime's per-tenant migrations; they fail when the schema
-- is missing, which drops every websocket join.
create schema if not exists _realtime authorization supabase_admin;
create schema if not exists realtime authorization supabase_admin;
grant usage on schema realtime to anon, authenticated, service_role, postgres;
