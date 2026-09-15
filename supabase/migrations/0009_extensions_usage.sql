-- =============================================================
-- Step 9: Grant USAGE on the `extensions` schema
-- `unaccent` moved out of `public` in 0008 — PostgREST roles need
-- schema USAGE or functions calling extensions.unaccent() 403.
-- =============================================================

grant usage on schema extensions to anon, authenticated;
