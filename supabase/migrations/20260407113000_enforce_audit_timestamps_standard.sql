create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

do $$
declare
  table_record record;
  trigger_name text;
begin
  for table_record in
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  loop
    execute format(
      'alter table %I.%I add column if not exists created_at timestamptz',
      table_record.table_schema,
      table_record.table_name
    );

    execute format(
      'alter table %I.%I add column if not exists updated_at timestamptz',
      table_record.table_schema,
      table_record.table_name
    );

    execute format(
      'alter table %I.%I alter column created_at set default timezone(''utc'', now())',
      table_record.table_schema,
      table_record.table_name
    );

    execute format(
      'alter table %I.%I alter column updated_at set default timezone(''utc'', now())',
      table_record.table_schema,
      table_record.table_name
    );

    execute format(
      'update %I.%I set created_at = timezone(''utc'', now()) where created_at is null',
      table_record.table_schema,
      table_record.table_name
    );

    execute format(
      'update %I.%I set updated_at = timezone(''utc'', now()) where updated_at is null',
      table_record.table_schema,
      table_record.table_name
    );

    execute format(
      'alter table %I.%I alter column created_at set not null',
      table_record.table_schema,
      table_record.table_name
    );

    execute format(
      'alter table %I.%I alter column updated_at set not null',
      table_record.table_schema,
      table_record.table_name
    );

    trigger_name := format('trg_touch_%s_updated_at', table_record.table_name);

    execute format(
      'drop trigger if exists %I on %I.%I',
      trigger_name,
      table_record.table_schema,
      table_record.table_name
    );

    execute format(
      'create trigger %I before update on %I.%I for each row execute function public.set_updated_at_timestamp()',
      trigger_name,
      table_record.table_schema,
      table_record.table_name
    );
  end loop;
end;
$$;
