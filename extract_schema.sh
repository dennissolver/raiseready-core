# extract_schema.sh

# Export all table structures
supabase db dump --schema public > schema_dump.sql

# Export RLS policies
psql $DATABASE_URL -c "\
SELECT schemaname, tablename, policyname, roles, cmd, qual \
FROM pg_policies \
WHERE schemaname = 'public' \
ORDER BY tablename, policyname" \
--csv > rls_policies.csv

# Export functions
psql $DATABASE_URL -c "\
SELECT routine_name, routine_type, data_type \
FROM information_schema.routines \
WHERE routine_schema = 'public' \
ORDER BY routine_name" \
--csv > functions.csv