-- Schemas required by the self-hosted Realtime service.
-- `_realtime` stores realtime's own metadata (tenants, extensions); its
-- startup migrations fail when the schema is missing.
-- `realtime` is the tenant-facing schema (messages, subscription, ...)
-- created by realtime's per-tenant migrations; they fail when the schema
-- is missing, which drops every websocket join.
-- On hosted Supabase these schemas are managed by the platform and
-- `authorization supabase_admin` fails with insufficient_privilege —
-- the exception handler below turns that into a no-op.
do $$
begin
  execute 'create schema if not exists _realtime authorization supabase_admin';
  execute 'create schema if not exists realtime authorization supabase_admin';
  execute 'grant usage on schema realtime to anon, authenticated, service_role, postgres';
exception
  when insufficient_privilege then
    raise notice 'realtime schemas already managed by the platform; skipping';
end
$$;
