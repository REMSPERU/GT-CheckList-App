-- Ensure auditor scoping policy is the only SELECT policy for properties.
-- Multiple permissive SELECT policies are OR-ed in Postgres RLS.

do $$
declare
  policy_row record;
begin
  for policy_row in
    select p.policyname
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'properties'
      and p.cmd = 'SELECT'
      and p.policyname <> 'properties_select'
  loop
    execute format(
      'drop policy if exists %I on public.properties',
      policy_row.policyname
    );
  end loop;
end
$$;
