


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "view";


ALTER SCHEMA "view" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."actionenum" AS ENUM (
    'LOGIN',
    'LOGOUT',
    'REGISTER',
    'ASSIGN_ROLE',
    'CREATE_PROPERTY',
    'UPDATE_PROPERTY',
    'DELETE_PROPERTY',
    'ACTIVATE_PROPERTY',
    'DEACTIVATE_PROPERTY',
    'ASSIGN_PROPERTY',
    'REVOKE_PROPERTY',
    'CREATE_DEVICE',
    'UPDATE_DEVICE',
    'DELETE_DEVICE',
    'ACTIVATE_DEVICE',
    'DEACTIVATE_DEVICE',
    'ASSIGN_DEVICE',
    'REVOKE_DEVICE',
    'CREATE_PM',
    'UPDATE_PM',
    'DELETE_PM',
    'CREATE_CM',
    'UPDATE_CM',
    'DELETE_CM',
    'COMPLETE_CHECKLIST',
    'UPDATE_DATASHEET'
);


ALTER TYPE "public"."actionenum" OWNER TO "postgres";


CREATE TYPE "public"."frecuencia" AS ENUM (
    'MENSUAL',
    'QUINCENAL',
    'SEMANAL',
    'INTERDIARIO',
    'DIARIO'
);


ALTER TYPE "public"."frecuencia" OWNER TO "postgres";


COMMENT ON TYPE "public"."frecuencia" IS 'Frecuencia para el checklist';



CREATE TYPE "public"."resultenum" AS ENUM (
    'SUCCESS',
    'FAILED'
);


ALTER TYPE "public"."resultenum" OWNER TO "postgres";


CREATE TYPE "public"."roleenum" AS ENUM (
    'GUEST',
    'PROVEEDOR',
    'TECNICO',
    'SUPERVISOR',
    'SUPERADMIN',
    'AUDITOR',
    'TECNICO_REMS'
);


ALTER TYPE "public"."roleenum" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."user_properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp without time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "assignment_reason" character varying(500),
    "expires_at" timestamp without time zone,
    "property_role" "public"."roleenum"
);


ALTER TABLE "public"."user_properties" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_auditor_to_property"("p_auditor_id" "uuid", "p_property_id" "uuid", "p_assignment_reason" "text" DEFAULT NULL::"text", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "public"."user_properties"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  assigned_row public.user_properties;
  v_role public.roleenum;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not public.is_supervisor_or_admin_user() then
    raise exception 'No tiene permisos para asignar usuarios';
  end if;

  if not (public.is_auditor_user(p_auditor_id) or public.is_tecnico_rems_user(p_auditor_id)) then
    raise exception 'El usuario destino no tiene un rol asignable (AUDITOR o TECNICO_REMS)';
  end if;

  select role into v_role from public.users where id = p_auditor_id;

  insert into public.user_properties (
    user_id,
    property_id,
    assigned_by,
    assignment_reason,
    expires_at,
    property_role,
    assigned_at,
    created_at,
    updated_at
  ) values (
    p_auditor_id,
    p_property_id,
    auth.uid(),
    p_assignment_reason,
    p_expires_at,
    v_role,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (user_id, property_id)
  do update set
    assigned_by = excluded.assigned_by,
    assignment_reason = excluded.assignment_reason,
    expires_at = excluded.expires_at,
    property_role = v_role,
    assigned_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  returning * into assigned_row;

  return assigned_row;
end;
$$;


ALTER FUNCTION "public"."assign_auditor_to_property"("p_auditor_id" "uuid", "p_property_id" "uuid", "p_assignment_reason" "text", "p_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_audit_session"("p_property_id" "uuid", "p_auditor_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if public.is_supervisor_or_admin_user() then
    return true;
  end if;

  if auth.uid() <> p_auditor_id then
    return false;
  end if;

  if not public.is_auditor_user(auth.uid()) then
    return false;
  end if;

  return public.has_audit_property_assignment(p_property_id, auth.uid());
end;
$$;


ALTER FUNCTION "public"."can_access_audit_session"("p_property_id" "uuid", "p_auditor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_property"("p_property_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select case
    when p_user_id is null then false
    when public.is_auditor_user(p_user_id) or public.is_tecnico_rems_user(p_user_id)
      then public.has_audit_property_assignment(p_property_id, p_user_id)
    else true
  end;
$$;


ALTER FUNCTION "public"."can_read_property"("p_property_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$begin
  insert into public.users (
    id,
    email,
    username,
    role,
    is_active,
    created_at
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'username',
    'GUEST',
    true,
    now()
  );
  return new;
end;$$;


ALTER FUNCTION "public"."create_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_max_two_session_start_photos"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_existing_count integer;
BEGIN
  IF COALESCE(NEW.tipo, 'inicio') <> 'inicio' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.sesion_mantenimiento_fotos
  WHERE id_sesion = NEW.id_sesion
    AND COALESCE(tipo, 'inicio') = 'inicio';

  IF v_existing_count >= 2 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'No se permiten mas de 2 fotos de inicio por sesion de mantenimiento.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_max_two_session_start_photos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_checklist_target_date_for_month"("anchor_date" "date", "reference_date" "date") RETURNS "date"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select (
    date_trunc('month', reference_date)::date
    + (
      least(
        extract(day from anchor_date)::integer,
        extract(
          day from (
            date_trunc('month', reference_date)::date
            + interval '1 month - 1 day'
          )
        )::integer
      ) - 1
    )
  )::date;
$$;


ALTER FUNCTION "public"."get_checklist_target_date_for_month"("anchor_date" "date", "reference_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."roleenum"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.is_active = true
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_audit_property_assignment"("p_property_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_properties up
    where up.user_id = p_user_id
      and up.property_id = p_property_id
      and (up.expires_at is null or up.expires_at > now())
      and (
        up.property_role is null
        or up.property_role in (
          'AUDITOR'::public.roleenum,
          'TECNICO_REMS'::public.roleenum,
          'SUPERVISOR'::public.roleenum,
          'SUPERADMIN'::public.roleenum
        )
      )
  );
$$;


ALTER FUNCTION "public"."has_audit_property_assignment"("p_property_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_auditor_user"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.role = 'AUDITOR'::public.roleenum
  );
$$;


ALTER FUNCTION "public"."is_auditor_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_supervisor_or_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('SUPERVISOR', 'SUPERADMIN')
  );
$$;


ALTER FUNCTION "public"."is_supervisor_or_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_supervisor_or_admin_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('SUPERVISOR', 'SUPERADMIN')
  );
$$;


ALTER FUNCTION "public"."is_supervisor_or_admin_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_tecnico_rems_user"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.role = 'TECNICO_REMS'::public.roleenum
  );
$$;


ALTER FUNCTION "public"."is_tecnico_rems_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_equipo_historial"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  changed_fields text[] := '{}'::text[];
  action_name text;
  next_version integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_name := 'INSERT';
    changed_fields := ARRAY[
      'id_property',
      'id_equipamento',
      'codigo',
      'ubicacion',
      'detalle_ubicacion',
      'estatus',
      'config',
      'equipment_detail'
    ];
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.id_property IS DISTINCT FROM OLD.id_property THEN
      changed_fields := array_append(changed_fields, 'id_property');
    END IF;

    IF NEW.id_equipamento IS DISTINCT FROM OLD.id_equipamento THEN
      changed_fields := array_append(changed_fields, 'id_equipamento');
    END IF;

    IF NEW.codigo IS DISTINCT FROM OLD.codigo THEN
      changed_fields := array_append(changed_fields, 'codigo');
    END IF;

    IF NEW.ubicacion IS DISTINCT FROM OLD.ubicacion THEN
      changed_fields := array_append(changed_fields, 'ubicacion');
    END IF;

    IF NEW.detalle_ubicacion IS DISTINCT FROM OLD.detalle_ubicacion THEN
      changed_fields := array_append(changed_fields, 'detalle_ubicacion');
    END IF;

    IF NEW.estatus IS DISTINCT FROM OLD.estatus THEN
      changed_fields := array_append(changed_fields, 'estatus');
    END IF;

    IF NEW.config IS DISTINCT FROM OLD.config THEN
      changed_fields := array_append(changed_fields, 'config');
    END IF;

    IF NEW.equipment_detail IS DISTINCT FROM OLD.equipment_detail THEN
      changed_fields := array_append(changed_fields, 'equipment_detail');
    END IF;

    IF coalesce(array_length(changed_fields, 1), 0) = 0 THEN
      RETURN NEW;
    END IF;

    IF coalesce(OLD.estatus, '') <> 'INACTIVO'
      AND coalesce(NEW.estatus, '') = 'INACTIVO' THEN
      action_name := 'SOFT_DELETE';
    ELSIF coalesce(OLD.estatus, '') = 'INACTIVO'
      AND coalesce(NEW.estatus, '') <> 'INACTIVO' THEN
      action_name := 'RESTORE';
    ELSE
      action_name := 'UPDATE';
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  SELECT coalesce(MAX(version), 0) + 1
  INTO next_version
  FROM public.equipos_historial
  WHERE equipo_id = NEW.id;

  INSERT INTO public.equipos_historial (
    equipo_id,
    version,
    accion,
    changed_at,
    changed_by,
    old_data,
    new_data,
    changed_fields
  )
  VALUES (
    NEW.id,
    next_version,
    action_name,
    timezone('utc', now()),
    coalesce(NEW.updated_by, NEW.created_by, auth.uid()),
    CASE
      WHEN TG_OP = 'UPDATE' THEN
        jsonb_strip_nulls(
          jsonb_build_object(
            'id_property', OLD.id_property,
            'id_equipamento', OLD.id_equipamento,
            'codigo', OLD.codigo,
            'ubicacion', OLD.ubicacion,
            'detalle_ubicacion', OLD.detalle_ubicacion,
            'estatus', OLD.estatus,
            'config', OLD.config,
            'equipment_detail', OLD.equipment_detail
          )
        )
      ELSE NULL
    END,
    jsonb_strip_nulls(
      jsonb_build_object(
        'id_property', NEW.id_property,
        'id_equipamento', NEW.id_equipamento,
        'codigo', NEW.codigo,
        'ubicacion', NEW.ubicacion,
        'detalle_ubicacion', NEW.detalle_ubicacion,
        'estatus', NEW.estatus,
        'config', NEW.config,
        'equipment_detail', NEW.equipment_detail
      )
    ),
    changed_fields
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_equipo_historial"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_equipos_updated_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_equipos_updated_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_audit_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_audit_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_checklist_schedules_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_checklist_schedules_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unassign_auditor_from_property"("p_auditor_id" "uuid", "p_property_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not public.is_supervisor_or_admin_user() then
    raise exception 'No tiene permisos para quitar usuarios';
  end if;

  if not (public.is_auditor_user(p_auditor_id) or public.is_tecnico_rems_user(p_auditor_id)) then
    raise exception 'El usuario destino no tiene un rol asignable (AUDITOR o TECNICO_REMS)';
  end if;

  delete from public.user_properties
  where user_id = p_auditor_id
    and property_id = p_property_id
    and property_role in ('AUDITOR'::public.roleenum, 'TECNICO_REMS'::public.roleenum);
end;
$$;


ALTER FUNCTION "public"."unassign_auditor_from_property"("p_auditor_id" "uuid", "p_property_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_audit_payload"("p_payload" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  answer_item  jsonb;
  answer_status text;
  answer_comment text;
  answer_photos  jsonb;
begin
  if p_payload is null then
    return true;
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    return false;
  end if;

  -- 'answers' key must exist and be an array
  if not (p_payload ? 'answers') then
    return false;
  end if;

  if jsonb_typeof(p_payload -> 'answers') <> 'array' then
    return false;
  end if;

  for answer_item in
    select value from jsonb_array_elements(p_payload -> 'answers')
  loop
    if jsonb_typeof(answer_item) <> 'object' then
      return false;
    end if;

    if not (answer_item ? 'question_id' and answer_item ? 'status') then
      return false;
    end if;

    answer_status := answer_item ->> 'status';
    if answer_status not in ('OK', 'OBS') then
      return false;
    end if;

    -- OBS must have a non-empty comment (photos are optional for admin edits)
    if answer_status = 'OBS' then
      answer_comment := nullif(trim(coalesce(answer_item ->> 'comment', '')), '');
      if answer_comment is null then
        return false;
      end if;

      -- photos field, if present, must be an array (but can be empty)
      answer_photos := answer_item -> 'photos';
      if answer_photos is not null
        and jsonb_typeof(answer_photos) <> 'array' then
        return false;
      end if;
    end if;
  end loop;

  return true;
end;
$$;


ALTER FUNCTION "public"."validate_audit_payload"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_checklist_schedule"("p_equipo_id" "uuid", "p_submitted_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())) RETURNS TABLE("has_schedule" boolean, "allowed" boolean, "reason" "text", "schedule_id" "uuid", "frequency" "text", "occurrences_per_day" integer, "window_start" time without time zone, "window_end" time without time zone, "current_count" integer, "period_start" "date", "period_end" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_property_id uuid;
  v_equipamento_id uuid;
begin
  select e.id_property, e.id_equipamento
  into v_property_id, v_equipamento_id
  from public.equipos e
  where e.id = p_equipo_id
  limit 1;

  return query
  select *
  from public.validate_checklist_schedule(
    v_property_id,
    v_equipamento_id,
    p_submitted_at,
    p_equipo_id
  );
end;
$$;


ALTER FUNCTION "public"."validate_checklist_schedule"("p_equipo_id" "uuid", "p_submitted_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_checklist_schedule"("p_property_id" "uuid", "p_equipamento_id" "uuid", "p_submitted_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()), "p_equipo_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("has_schedule" boolean, "allowed" boolean, "reason" "text", "schedule_id" "uuid", "frequency" "text", "occurrences_per_day" integer, "window_start" time without time zone, "window_end" time without time zone, "current_count" integer, "period_start" "date", "period_end" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_schedule public.checklist_schedules%rowtype;
  v_tz text;
  v_local_ts timestamp;
  v_local_date date;
  v_local_time time;
  v_anchor_date date;
  v_period_start_utc timestamptz;
  v_period_end_utc timestamptz;
  v_current_count integer := 0;
  v_days_from_anchor integer;
  v_is_frequency_day boolean := true;
  v_effective_start_date date;
  v_effective_end_date date;
begin
  if p_property_id is null or p_equipamento_id is null then
    return query
    select false, true, null::text, null::uuid, null::text,
      null::integer, null::time, null::time, 0, null::date, null::date;
    return;
  end if;

  select *
  into v_schedule
  from public.checklist_schedules cs
  where cs.property_id = p_property_id
    and cs.equipamento_id = p_equipamento_id
    and cs.is_active = true
  limit 1;

  if not found then
    return query
    select false, true, null::text, null::uuid, null::text,
      null::integer, null::time, null::time, 0, null::date, null::date;
    return;
  end if;

  v_tz := coalesce(nullif(v_schedule.timezone, ''), 'America/Lima');
  v_local_ts := p_submitted_at at time zone v_tz;
  v_local_date := v_local_ts::date;
  v_local_time := v_local_ts::time;
  v_anchor_date := v_schedule.start_date;

  if v_local_date < v_anchor_date then
    return query
    select true, false, 'La programacion aun no inicia.', v_schedule.id,
      v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0, null::date, null::date;
    return;
  end if;

  if v_schedule.end_date is not null and v_local_date > v_schedule.end_date then
    return query
    select true, false, 'La programacion ya vencio.', v_schedule.id,
      v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0, null::date, null::date;
    return;
  end if;

  if not (
    v_local_time >= v_schedule.window_start
    and v_local_time <= v_schedule.window_end
  ) then
    return query
    select true, false, 'El checklist esta fuera del rango horario permitido.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0, null::date, null::date;
    return;
  end if;

  v_days_from_anchor := v_local_date - v_anchor_date;

  if v_schedule.frequency = 'DIARIA' then
    v_effective_start_date := v_local_date;
    v_effective_end_date := v_local_date;

  elsif v_schedule.frequency = 'INTERDIARIA' then
    v_is_frequency_day := mod(v_days_from_anchor, 2)
      < v_schedule.execution_range_days;
    v_effective_start_date := v_anchor_date
      + (floor(v_days_from_anchor / 2.0)::integer * 2);
    v_effective_end_date := v_effective_start_date
      + v_schedule.execution_range_days - 1;

  elsif v_schedule.frequency = 'SEMANAL' then
    v_is_frequency_day := mod(v_days_from_anchor, 7)
      < v_schedule.execution_range_days;
    v_effective_start_date := v_anchor_date
      + (floor(v_days_from_anchor / 7.0)::integer * 7);
    v_effective_end_date := v_effective_start_date
      + v_schedule.execution_range_days - 1;

  elsif v_schedule.frequency = 'QUINCENAL' then
    v_is_frequency_day := mod(v_days_from_anchor, 15)
      < v_schedule.execution_range_days;
    v_effective_start_date := v_anchor_date
      + (floor(v_days_from_anchor / 15.0)::integer * 15);
    v_effective_end_date := v_effective_start_date
      + v_schedule.execution_range_days - 1;

  elsif v_schedule.frequency = 'MENSUAL' then
    select targets.target_date,
      targets.target_date + v_schedule.execution_range_days - 1
    into v_effective_start_date, v_effective_end_date
    from (
      values
        (
          public.get_checklist_target_date_for_month(
            v_anchor_date,
            (v_local_date - interval '1 month')::date
          )
        ),
        (
          public.get_checklist_target_date_for_month(
            v_anchor_date,
            v_local_date
          )
        ),
        (
          public.get_checklist_target_date_for_month(
            v_anchor_date,
            (v_local_date + interval '1 month')::date
          )
        )
    ) as targets(target_date)
    where targets.target_date >= v_anchor_date
      and v_local_date between targets.target_date
        and (targets.target_date + v_schedule.execution_range_days - 1)
    order by targets.target_date desc
    limit 1;

    v_is_frequency_day := v_effective_start_date is not null;
  end if;

  if not v_is_frequency_day then
    return query
    select true, false,
      'Hoy no corresponde por frecuencia o rango de ejecucion.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0,
      null::date, null::date;
    return;
  end if;

  v_period_start_utc := v_effective_start_date::timestamp at time zone v_tz;
  v_period_end_utc := (v_effective_end_date + 1)::timestamp at time zone v_tz;

  if p_equipo_id is not null then
    select count(*)::integer
    into v_current_count
    from public.checklist_response cr
    where cr.equipo_id = p_equipo_id
      and cr.submitted_at >= v_period_start_utc
      and cr.submitted_at < v_period_end_utc;
  else
    select count(*)::integer
    into v_current_count
    from public.checklist_response cr
    join public.equipos e on e.id = cr.equipo_id
    where e.id_property = p_property_id
      and e.id_equipamento = p_equipamento_id
      and cr.submitted_at >= v_period_start_utc
      and cr.submitted_at < v_period_end_utc;
  end if;

  if v_current_count >= v_schedule.occurrences_per_day then
    return query
    select true, false,
      'Se alcanzo el maximo de checklist permitidos para este rango.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, v_current_count,
      v_effective_start_date, v_effective_end_date;
    return;
  end if;

  return query
  select true, true, null::text, v_schedule.id, v_schedule.frequency,
    v_schedule.occurrences_per_day, v_schedule.window_start,
    v_schedule.window_end, v_current_count,
    v_effective_start_date, v_effective_end_date;
end;
$$;


ALTER FUNCTION "public"."validate_checklist_schedule"("p_property_id" "uuid", "p_equipamento_id" "uuid", "p_submitted_at" timestamp with time zone, "p_equipo_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "user_role" "public"."roleenum",
    "username" character varying(50),
    "action" "public"."actionenum" NOT NULL,
    "result" "public"."resultenum" NOT NULL,
    "entity" character varying(100),
    "entity_id" "uuid",
    "details" json NOT NULL,
    "ip_address" character varying(45) NOT NULL,
    "user_agent" character varying(500),
    "session_id" character varying(255),
    "timestamp" timestamp without time zone NOT NULL,
    "error_message" character varying(1000),
    "error_code" character varying(50),
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_question_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_name" "text" NOT NULL,
    "order_index" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "audit_question_sections_order_positive" CHECK (("order_index" > 0))
);


ALTER TABLE "public"."audit_question_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_text" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "section_id" "uuid" NOT NULL,
    "equipment_name" "text"
);


ALTER TABLE "public"."audit_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_submission_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "auditor_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "scheduled_for" "date" NOT NULL,
    "status" "text" DEFAULT 'PROGRAMADA'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "audit_payload" "jsonb",
    "summary" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "audit_sessions_payload_valid_check" CHECK ("public"."validate_audit_payload"("audit_payload")),
    CONSTRAINT "audit_sessions_status_check" CHECK (("status" = ANY (ARRAY['PROGRAMADA'::"text", 'EN_PROGRESO'::"text", 'ENVIADA'::"text", 'SINCRONIZADA'::"text", 'CANCELADA'::"text"]))),
    CONSTRAINT "audit_sessions_summary_object_check" CHECK (("jsonb_typeof"("summary") = 'object'::"text"))
);


ALTER TABLE "public"."audit_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_response" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_created" "uuid" NOT NULL,
    "equipamento_id" "uuid" NOT NULL,
    "equipamento_nombre" "text" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "equipo_codigo" "text" NOT NULL,
    "equipo_ubicacion" "text",
    "building_name" "text",
    "frequency" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "respuestas_json" "jsonb" NOT NULL,
    "evidencia_general_fotos" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total_questions" integer DEFAULT 0 NOT NULL,
    "total_ok" integer DEFAULT 0 NOT NULL,
    "total_observed" integer DEFAULT 0 NOT NULL,
    "total_photos" integer DEFAULT 0 NOT NULL,
    "form_started_at" timestamp with time zone NOT NULL,
    "first_interaction_at" timestamp with time zone,
    "submitted_at" timestamp with time zone NOT NULL,
    "duration_seconds" integer DEFAULT 0 NOT NULL,
    "interaction_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "checklist_schedule_id" "uuid",
    "client_submission_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "checklist_response_totals_non_negative" CHECK ((("total_questions" >= 0) AND ("total_ok" >= 0) AND ("total_observed" >= 0) AND ("total_photos" >= 0)))
);


ALTER TABLE "public"."checklist_response" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid",
    "property_id" "uuid" NOT NULL,
    "equipamento_id" "uuid" NOT NULL,
    "frequency" "text" NOT NULL,
    "occurrences_per_day" integer DEFAULT 1 NOT NULL,
    "window_start" time without time zone NOT NULL,
    "window_end" time without time zone NOT NULL,
    "timezone" "text" DEFAULT 'America/Lima'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "execution_range_days" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "checklist_schedules_date_range_check" CHECK ((("end_date" IS NULL) OR ("start_date" IS NULL) OR ("end_date" >= "start_date"))),
    CONSTRAINT "checklist_schedules_execution_range_days_check" CHECK (
CASE "frequency"
    WHEN 'DIARIA'::"text" THEN ("execution_range_days" = 1)
    WHEN 'INTERDIARIA'::"text" THEN (("execution_range_days" >= 1) AND ("execution_range_days" <= 2))
    WHEN 'SEMANAL'::"text" THEN (("execution_range_days" >= 1) AND ("execution_range_days" <= 7))
    WHEN 'QUINCENAL'::"text" THEN (("execution_range_days" >= 1) AND ("execution_range_days" <= 15))
    WHEN 'MENSUAL'::"text" THEN (("execution_range_days" >= 1) AND ("execution_range_days" <= 31))
    ELSE false
END),
    CONSTRAINT "checklist_schedules_frequency_check" CHECK (("frequency" = ANY (ARRAY['DIARIA'::"text", 'INTERDIARIA'::"text", 'SEMANAL'::"text", 'QUINCENAL'::"text", 'MENSUAL'::"text"]))),
    CONSTRAINT "checklist_schedules_occurrences_per_day_check" CHECK ((("occurrences_per_day" >= 1) AND ("occurrences_per_day" <= 24))),
    CONSTRAINT "checklist_schedules_window_range_check" CHECK (("window_start" < "window_end"))
);


ALTER TABLE "public"."checklist_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "direccion" "text",
    "telefono" "text",
    "raz_social" "text",
    "RUC" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."company" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_equipment" (
    "id_company" "uuid" NOT NULL,
    "id_equipament" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."company_equipment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_property" (
    "id_company" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_property" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."company_property" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."detalle_tablero_electrico" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
    "id_tablero_electrico" "uuid" NOT NULL,
    "tipo" character varying(45) NOT NULL,
    "voltaje" integer NOT NULL,
    "fases" character varying(45) NOT NULL
);


ALTER TABLE "public"."detalle_tablero_electrico" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipamento_marca" (
    "id_equipamento" "uuid" NOT NULL,
    "id_marca" "uuid" NOT NULL
);


ALTER TABLE "public"."equipamento_marca" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" character varying(45),
    "abreviatura" character varying(45),
    "Frecuencia" "public"."frecuencia",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "id_sistema" "uuid",
    "image_url" "text"
);


ALTER TABLE "public"."equipamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipamentos_property" (
    "id_equipamentos" "uuid" NOT NULL,
    "id_property" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."equipamentos_property" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipo_extra" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
    "equipo" character varying(45),
    "abreviatura" character varying(45)
);


ALTER TABLE "public"."equipo_extra" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_property" "uuid",
    "id_equipamento" "uuid",
    "codigo" character varying(45),
    "ubicacion" character varying(45),
    "estatus" "text",
    "equipment_detail" "jsonb",
    "config" boolean DEFAULT false,
    "created" timestamp with time zone DEFAULT "now"(),
    "detalle_ubicacion" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_by" "uuid",
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "equipos_config_check" CHECK (("config" = ANY (ARRAY[true, false])))
);


ALTER TABLE "public"."equipos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipos_historial" (
    "id" bigint NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "accion" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_fields" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "equipos_historial_accion_check" CHECK (("accion" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'SOFT_DELETE'::"text", 'RESTORE'::"text"])))
);


ALTER TABLE "public"."equipos_historial" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."equipos_historial_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."equipos_historial_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."equipos_historial_id_seq" OWNED BY "public"."equipos_historial"."id";



CREATE TABLE IF NOT EXISTS "public"."equipos_tablero" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
    "id_tablero_electrico" "uuid" NOT NULL,
    "abreviatura" character varying(45) NOT NULL,
    "descripcion" character varying(45) NOT NULL,
    "id_equipo" "uuid" NOT NULL
);


ALTER TABLE "public"."equipos_tablero" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipos_temp" (
    "codigo" character varying,
    "inmueble_mysql" character varying,
    "property_uuid_supabase" character varying,
    "equipamento_nombre" character varying,
    "equipamento_uuid" character varying,
    "mysql_tabla" character varying,
    "mysql_id" character varying,
    "ubicacion" character varying,
    "estatus" character varying,
    "equipment_detail_json" "text"
);


ALTER TABLE "public"."equipos_temp" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_equipos_preview" (
    "source_table" "text",
    "source_id" "text",
    "property_name" "text",
    "property_code" "text",
    "equipamento_nombre" "text",
    "id_property" "text",
    "id_equipamento" "text",
    "codigo" "text",
    "ubicacion" "text",
    "detalle_ubicacion" "text",
    "estatus" "text",
    "config" "text",
    "equipment_detail" "text"
);


ALTER TABLE "public"."import_equipos_preview" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instrumentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instrumento" character varying(45) NOT NULL,
    "marca" character varying(45) NOT NULL,
    "modelo" character varying(45) NOT NULL,
    "serie" character varying(45) NOT NULL,
    "equipamento" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."instrumentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interruptor_diferencial" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
    "id_itm" "uuid" NOT NULL,
    "fases" character varying(45) NOT NULL,
    "amperaje" integer NOT NULL
);


ALTER TABLE "public"."interruptor_diferencial" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."itg" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
    "id_detalle_tablero_electrico" "uuid" NOT NULL,
    "suministra" character varying(45) NOT NULL
);


ALTER TABLE "public"."itg" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."itm" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
    "id_itg" "uuid" NOT NULL,
    "fases" character varying(45) NOT NULL,
    "amperaje" integer NOT NULL
);


ALTER TABLE "public"."itm" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_response" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_mantenimiento" "uuid",
    "user_created" "uuid",
    "date_created" timestamp with time zone DEFAULT "now"(),
    "detail_maintenance" "jsonb",
    "protocol" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."maintenance_response" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mantenimientos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "id_equipo" "uuid" DEFAULT "gen_random_uuid"(),
    "estatus" "text" DEFAULT 'NO INICIADO'::"text",
    "id_user" "uuid" DEFAULT "gen_random_uuid"(),
    "dia_programado" timestamp with time zone,
    "tipo_mantenimiento" "text",
    "observations" "text",
    "codigo" "text",
    "id_sesion" "uuid",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."mantenimientos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marca" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."marca" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preguntas_equipamento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipamento_id" "uuid" NOT NULL,
    "pregunta" "text" NOT NULL,
    "orden" integer DEFAULT 1 NOT NULL,
    "activa" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ponderado" numeric
);


ALTER TABLE "public"."preguntas_equipamento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" character varying(500),
    "address" character varying(500) NOT NULL,
    "city" character varying(100) NOT NULL,
    "state" character varying(100),
    "country" character varying(100) NOT NULL,
    "postal_code" character varying(20),
    "latitude" double precision,
    "longitude" double precision,
    "property_type" character varying(50) NOT NULL,
    "total_area_sqm" double precision,
    "construction_year" integer,
    "manager_name" character varying(200),
    "manager_email" character varying(255),
    "manager_phone" character varying(20),
    "emergency_contact_name" character varying(200),
    "emergency_contact_phone" character varying(20),
    "is_active" boolean NOT NULL,
    "maintenance_priority" character varying(20) NOT NULL,
    "basement" smallint,
    "floor" smallint,
    "image_url" "text"
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sesion_mantenimiento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "fecha_programada" timestamp with time zone,
    "created_by" "uuid",
    "estatus" "text" DEFAULT 'NO INICIADO'::"text" NOT NULL,
    "id_property" "uuid",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."sesion_mantenimiento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sesion_mantenimiento_fotos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_sesion" "uuid" NOT NULL,
    "foto_url" "text" NOT NULL,
    "tipo" "text" DEFAULT 'inicio'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."sesion_mantenimiento_fotos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "session_date" "date" NOT NULL,
    "recommendations" "text",
    "conclusions" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."session_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sistemas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."sistemas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tablero_electrico" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
    "id_property" "uuid" NOT NULL,
    "tipo" character varying(45) NOT NULL,
    "ubicacion" character varying(45) NOT NULL,
    "rotulo" character varying(45) NOT NULL,
    "codigo" character varying(45) NOT NULL,
    "is_configured" boolean NOT NULL
);


ALTER TABLE "public"."tablero_electrico" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."technician_devices" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
    "technician_id" "uuid" NOT NULL,
    "device_id" "uuid" NOT NULL,
    "supervisor_id" "uuid" NOT NULL,
    "assigned_at" timestamp without time zone NOT NULL,
    "assignment_reason" character varying(500),
    "expires_at" timestamp without time zone,
    "work_order_id" "uuid",
    "is_active" boolean NOT NULL,
    "deactivated_at" timestamp without time zone,
    "deactivated_by" "uuid",
    "deactivation_reason" character varying(500)
);


ALTER TABLE "public"."technician_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_maintenance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_equipamento" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "json_detail" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."template_maintenance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sesion_mantenimiento" (
    "id_user" "uuid" NOT NULL,
    "id_sesion" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_sesion_mantenimiento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "email" character varying(255) NOT NULL,
    "username" character varying(50),
    "role" "public"."roleenum" NOT NULL,
    "is_active" boolean NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "phone" character varying(20),
    "id_company" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_user_property_assignments" WITH ("security_invoker"='true') AS
 SELECT "u"."id" AS "user_id",
    "u"."email",
    "u"."role",
    "p"."id" AS "property_id",
    "p"."code" AS "property_code",
    "p"."name" AS "property_name",
    "up"."property_role",
    "up"."assigned_at",
    "up"."expires_at",
        CASE
            WHEN ("up"."user_id" IS NULL) THEN 'SIN_ASIGNACION'::"text"
            WHEN (("up"."expires_at" IS NOT NULL) AND ("up"."expires_at" <= "now"())) THEN 'VENCIDA'::"text"
            ELSE 'ACTIVA'::"text"
        END AS "assignment_status"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."user_properties" "up" ON (("up"."user_id" = "u"."id")))
     LEFT JOIN "public"."properties" "p" ON (("p"."id" = "up"."property_id")))
  WHERE ("public"."is_supervisor_or_admin_user"() OR ("u"."id" = "auth"."uid"()));


ALTER VIEW "public"."v_user_property_assignments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_company_property" AS
 SELECT "c"."nombre" AS "company",
    "p"."name" AS "property"
   FROM (("public"."company_property" "cp"
     LEFT JOIN "public"."company" "c" ON (("cp"."id_company" = "c"."id")))
     LEFT JOIN "public"."properties" "p" ON (("cp"."id_property" = "p"."id")));


ALTER VIEW "public"."vista_company_property" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_equipamentos_property" AS
 SELECT "e"."nombre" AS "equipamentos",
    "p"."name" AS "property"
   FROM (("public"."equipamentos_property" "ep"
     LEFT JOIN "public"."equipamentos" "e" ON (("ep"."id_equipamentos" = "e"."id")))
     LEFT JOIN "public"."properties" "p" ON (("ep"."id_property" = "p"."id")));


ALTER VIEW "public"."vista_equipamentos_property" OWNER TO "postgres";


ALTER TABLE ONLY "public"."equipos_historial" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."equipos_historial_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mantenimientos"
    ADD CONSTRAINT "Mantenimientos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_question_sections"
    ADD CONSTRAINT "audit_question_sections_order_index_key" UNIQUE ("order_index");



ALTER TABLE ONLY "public"."audit_question_sections"
    ADD CONSTRAINT "audit_question_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_question_sections"
    ADD CONSTRAINT "audit_question_sections_section_name_key" UNIQUE ("section_name");



ALTER TABLE ONLY "public"."audit_questions"
    ADD CONSTRAINT "audit_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_sessions"
    ADD CONSTRAINT "audit_sessions_client_submission_id_key" UNIQUE ("client_submission_id");



ALTER TABLE ONLY "public"."audit_sessions"
    ADD CONSTRAINT "audit_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_response"
    ADD CONSTRAINT "checklist_response_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_schedules"
    ADD CONSTRAINT "checklist_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_equipment"
    ADD CONSTRAINT "company_equipment_pkey" PRIMARY KEY ("id_company", "id_equipament");



ALTER TABLE ONLY "public"."company"
    ADD CONSTRAINT "company_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_property"
    ADD CONSTRAINT "company_property_pkey" PRIMARY KEY ("id_company", "id_property");



ALTER TABLE ONLY "public"."detalle_tablero_electrico"
    ADD CONSTRAINT "detalle_tablero_electrico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipamento_marca"
    ADD CONSTRAINT "equipamento_marca_pkey" PRIMARY KEY ("id_equipamento", "id_marca");



ALTER TABLE ONLY "public"."equipamentos"
    ADD CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipamentos_property"
    ADD CONSTRAINT "equipamentos_property_pkey" PRIMARY KEY ("id_equipamentos", "id_property");



ALTER TABLE ONLY "public"."equipo_extra"
    ADD CONSTRAINT "equipo_extra_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipos_historial"
    ADD CONSTRAINT "equipos_historial_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipos_tablero"
    ADD CONSTRAINT "equipos_tablero_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interruptor_diferencial"
    ADD CONSTRAINT "interruptor_diferencial_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."itg"
    ADD CONSTRAINT "itg_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."itm"
    ADD CONSTRAINT "itm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_response"
    ADD CONSTRAINT "maintenance_response_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marca"
    ADD CONSTRAINT "marca_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."marca"
    ADD CONSTRAINT "marca_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preguntas_equipamento"
    ADD CONSTRAINT "preguntas_equipamento_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instrumentos"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesion_mantenimiento_fotos"
    ADD CONSTRAINT "sesion_mantenimiento_fotos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesion_mantenimiento"
    ADD CONSTRAINT "sesion_mantenimiento_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_notes"
    ADD CONSTRAINT "session_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_notes"
    ADD CONSTRAINT "session_notes_property_id_session_date_key" UNIQUE ("property_id", "session_date");



ALTER TABLE ONLY "public"."sistemas"
    ADD CONSTRAINT "sistemas_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."sistemas"
    ADD CONSTRAINT "sistemas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tablero_electrico"
    ADD CONSTRAINT "tablero_electrico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technician_devices"
    ADD CONSTRAINT "technician_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_maintenance"
    ADD CONSTRAINT "template_maintenance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technician_devices"
    ADD CONSTRAINT "uq_technician_device" UNIQUE ("technician_id", "device_id");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "uq_user_property" UNIQUE ("user_id", "property_id");



ALTER TABLE ONLY "public"."user_sesion_mantenimiento"
    ADD CONSTRAINT "user_maintenace_pkey" PRIMARY KEY ("id_user", "id_sesion");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_question_sections_active_order" ON "public"."audit_question_sections" USING "btree" ("is_active", "order_index");



CREATE INDEX "idx_audit_sessions_auditor_scheduled" ON "public"."audit_sessions" USING "btree" ("auditor_id", "scheduled_for" DESC);



CREATE UNIQUE INDEX "idx_audit_sessions_open_scope_unique" ON "public"."audit_sessions" USING "btree" ("property_id", "auditor_id", "scheduled_for") WHERE ("status" = ANY (ARRAY['PROGRAMADA'::"text", 'EN_PROGRESO'::"text", 'ENVIADA'::"text"]));



CREATE INDEX "idx_audit_sessions_payload_gin" ON "public"."audit_sessions" USING "gin" ("audit_payload");



CREATE INDEX "idx_audit_sessions_property_scheduled" ON "public"."audit_sessions" USING "btree" ("property_id", "scheduled_for" DESC);



CREATE INDEX "idx_audit_sessions_status_scheduled" ON "public"."audit_sessions" USING "btree" ("status", "scheduled_for" DESC);



CREATE UNIQUE INDEX "idx_checklist_response_client_submission_id" ON "public"."checklist_response" USING "btree" ("client_submission_id");



CREATE INDEX "idx_checklist_response_created" ON "public"."checklist_response" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_checklist_response_equipo_submitted_at" ON "public"."checklist_response" USING "btree" ("equipo_id", "submitted_at" DESC);



CREATE INDEX "idx_checklist_response_period" ON "public"."checklist_response" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_checklist_response_respuestas_json" ON "public"."checklist_response" USING "gin" ("respuestas_json");



CREATE INDEX "idx_checklist_response_schedule_submitted_at" ON "public"."checklist_response" USING "btree" ("checklist_schedule_id", "submitted_at" DESC);



CREATE UNIQUE INDEX "idx_checklist_schedules_scope_unique" ON "public"."checklist_schedules" USING "btree" ("property_id", "equipamento_id");



CREATE INDEX "idx_equipamentos_id_sistema" ON "public"."equipamentos" USING "btree" ("id_sistema");



CREATE INDEX "idx_equipamentos_property_id_property" ON "public"."equipamentos_property" USING "btree" ("id_property");



CREATE INDEX "idx_equipos_historial_changed_by" ON "public"."equipos_historial" USING "btree" ("changed_by") WHERE ("changed_by" IS NOT NULL);



CREATE INDEX "idx_equipos_historial_equipo_changed_at" ON "public"."equipos_historial" USING "btree" ("equipo_id", "changed_at" DESC);



CREATE UNIQUE INDEX "idx_equipos_historial_equipo_version" ON "public"."equipos_historial" USING "btree" ("equipo_id", "version");



CREATE INDEX "idx_equipos_id_property" ON "public"."equipos" USING "btree" ("id_property");



CREATE INDEX "idx_equipos_scope_lookup" ON "public"."equipos" USING "btree" ("id_property", "id_equipamento", "id");



CREATE INDEX "idx_preguntas_equipamento_equipamento_id" ON "public"."preguntas_equipamento" USING "btree" ("equipamento_id");



CREATE INDEX "idx_sesion_mantenimiento_fotos_id_sesion" ON "public"."sesion_mantenimiento_fotos" USING "btree" ("id_sesion");



CREATE INDEX "ix_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "ix_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity");



CREATE INDEX "ix_audit_logs_entity_id" ON "public"."audit_logs" USING "btree" ("entity_id");



CREATE INDEX "ix_audit_logs_id" ON "public"."audit_logs" USING "btree" ("id");



CREATE INDEX "ix_audit_logs_result" ON "public"."audit_logs" USING "btree" ("result");



CREATE INDEX "ix_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "ix_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "ix_detalle_tablero_electrico_id" ON "public"."detalle_tablero_electrico" USING "btree" ("id");



CREATE INDEX "ix_equipo_extra_id" ON "public"."equipo_extra" USING "btree" ("id");



CREATE INDEX "ix_equipos_tablero_id" ON "public"."equipos_tablero" USING "btree" ("id");



CREATE INDEX "ix_interruptor_diferencial_id" ON "public"."interruptor_diferencial" USING "btree" ("id");



CREATE INDEX "ix_itg_id" ON "public"."itg" USING "btree" ("id");



CREATE INDEX "ix_itm_id" ON "public"."itm" USING "btree" ("id");



CREATE UNIQUE INDEX "ix_properties_code" ON "public"."properties" USING "btree" ("code");



CREATE INDEX "ix_properties_id" ON "public"."properties" USING "btree" ("id");



CREATE INDEX "ix_tablero_electrico_id" ON "public"."tablero_electrico" USING "btree" ("id");



CREATE INDEX "ix_technician_devices_device_id" ON "public"."technician_devices" USING "btree" ("device_id");



CREATE INDEX "ix_technician_devices_id" ON "public"."technician_devices" USING "btree" ("id");



CREATE INDEX "ix_technician_devices_supervisor_id" ON "public"."technician_devices" USING "btree" ("supervisor_id");



CREATE INDEX "ix_technician_devices_technician_id" ON "public"."technician_devices" USING "btree" ("technician_id");



CREATE INDEX "ix_technician_devices_work_order_id" ON "public"."technician_devices" USING "btree" ("work_order_id");



CREATE INDEX "ix_user_properties_id" ON "public"."user_properties" USING "btree" ("id");



CREATE INDEX "ix_user_properties_property_id" ON "public"."user_properties" USING "btree" ("property_id");



CREATE INDEX "ix_user_properties_user_id" ON "public"."user_properties" USING "btree" ("user_id");



CREATE UNIQUE INDEX "ix_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "ix_users_id" ON "public"."users" USING "btree" ("id");



CREATE INDEX "ix_users_username" ON "public"."users" USING "btree" ("username");



CREATE UNIQUE INDEX "uq_pregunta_por_equipamento" ON "public"."preguntas_equipamento" USING "btree" ("equipamento_id", "pregunta");



CREATE OR REPLACE TRIGGER "trg_enforce_max_two_session_start_photos" BEFORE INSERT ON "public"."sesion_mantenimiento_fotos" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_max_two_session_start_photos"();



CREATE OR REPLACE TRIGGER "trg_equipos_set_updated" BEFORE UPDATE ON "public"."equipos" FOR EACH ROW EXECUTE FUNCTION "public"."set_equipos_updated_fields"();



CREATE OR REPLACE TRIGGER "trg_log_equipo_historial" AFTER INSERT OR UPDATE ON "public"."equipos" FOR EACH ROW EXECUTE FUNCTION "public"."log_equipo_historial"();



CREATE OR REPLACE TRIGGER "trg_touch_audit_logs_updated_at" BEFORE UPDATE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_audit_question_sections_updated_at" BEFORE UPDATE ON "public"."audit_question_sections" FOR EACH ROW EXECUTE FUNCTION "public"."touch_audit_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_audit_questions_updated_at" BEFORE UPDATE ON "public"."audit_questions" FOR EACH ROW EXECUTE FUNCTION "public"."touch_audit_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_audit_sessions_updated_at" BEFORE UPDATE ON "public"."audit_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."touch_audit_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_checklist_response_updated_at" BEFORE UPDATE ON "public"."checklist_response" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_checklist_schedules_updated_at" BEFORE UPDATE ON "public"."checklist_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_company_equipment_updated_at" BEFORE UPDATE ON "public"."company_equipment" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_company_property_updated_at" BEFORE UPDATE ON "public"."company_property" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_company_updated_at" BEFORE UPDATE ON "public"."company" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_equipamentos_property_updated_at" BEFORE UPDATE ON "public"."equipamentos_property" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_equipamentos_updated_at" BEFORE UPDATE ON "public"."equipamentos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_equipos_historial_updated_at" BEFORE UPDATE ON "public"."equipos_historial" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_equipos_updated_at" BEFORE UPDATE ON "public"."equipos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_instrumentos_updated_at" BEFORE UPDATE ON "public"."instrumentos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_maintenance_response_updated_at" BEFORE UPDATE ON "public"."maintenance_response" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_mantenimientos_updated_at" BEFORE UPDATE ON "public"."mantenimientos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_preguntas_equipamento_updated_at" BEFORE UPDATE ON "public"."preguntas_equipamento" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_properties_updated_at" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_sesion_mantenimiento_fotos_updated_at" BEFORE UPDATE ON "public"."sesion_mantenimiento_fotos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_sesion_mantenimiento_updated_at" BEFORE UPDATE ON "public"."sesion_mantenimiento" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_session_notes_updated_at" BEFORE UPDATE ON "public"."session_notes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_template_maintenance_updated_at" BEFORE UPDATE ON "public"."template_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_user_properties_updated_at" BEFORE UPDATE ON "public"."user_properties" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_user_sesion_mantenimiento_updated_at" BEFORE UPDATE ON "public"."user_sesion_mantenimiento" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_touch_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."audit_questions"
    ADD CONSTRAINT "audit_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."audit_question_sections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_sessions"
    ADD CONSTRAINT "audit_sessions_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_sessions"
    ADD CONSTRAINT "audit_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_sessions"
    ADD CONSTRAINT "audit_sessions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."checklist_response"
    ADD CONSTRAINT "checklist_response_checklist_schedule_id_fkey" FOREIGN KEY ("checklist_schedule_id") REFERENCES "public"."checklist_schedules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checklist_schedules"
    ADD CONSTRAINT "checklist_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checklist_schedules"
    ADD CONSTRAINT "checklist_schedules_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "public"."equipamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_schedules"
    ADD CONSTRAINT "checklist_schedules_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_schedules"
    ADD CONSTRAINT "checklist_schedules_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_schedules"
    ADD CONSTRAINT "checklist_schedules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_equipment"
    ADD CONSTRAINT "company_equipment_id_company_fkey" FOREIGN KEY ("id_company") REFERENCES "public"."company"("id");



ALTER TABLE ONLY "public"."company_equipment"
    ADD CONSTRAINT "company_equipment_id_equipament_fkey" FOREIGN KEY ("id_equipament") REFERENCES "public"."equipamentos"("id");



ALTER TABLE ONLY "public"."company_property"
    ADD CONSTRAINT "company_property_id_company_fkey" FOREIGN KEY ("id_company") REFERENCES "public"."company"("id");



ALTER TABLE ONLY "public"."company_property"
    ADD CONSTRAINT "company_property_id_property_fkey" FOREIGN KEY ("id_property") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."detalle_tablero_electrico"
    ADD CONSTRAINT "detalle_tablero_electrico_id_tablero_electrico_fkey" FOREIGN KEY ("id_tablero_electrico") REFERENCES "public"."tablero_electrico"("id");



ALTER TABLE ONLY "public"."equipamento_marca"
    ADD CONSTRAINT "equipamento_marca_id_equipamento_fkey" FOREIGN KEY ("id_equipamento") REFERENCES "public"."equipamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipamento_marca"
    ADD CONSTRAINT "equipamento_marca_id_marca_fkey" FOREIGN KEY ("id_marca") REFERENCES "public"."marca"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipamentos"
    ADD CONSTRAINT "equipamentos_id_sistema_fkey" FOREIGN KEY ("id_sistema") REFERENCES "public"."sistemas"("id");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."equipos_historial"
    ADD CONSTRAINT "equipos_historial_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_id_equipamento_fkey" FOREIGN KEY ("id_equipamento") REFERENCES "public"."equipamentos"("id");



ALTER TABLE ONLY "public"."equipos_tablero"
    ADD CONSTRAINT "equipos_tablero_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "public"."equipo_extra"("id");



ALTER TABLE ONLY "public"."equipos_tablero"
    ADD CONSTRAINT "equipos_tablero_id_tablero_electrico_fkey" FOREIGN KEY ("id_tablero_electrico") REFERENCES "public"."tablero_electrico"("id");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."equipamentos_property"
    ADD CONSTRAINT "fk_equipamentos_property_equip" FOREIGN KEY ("id_equipamentos") REFERENCES "public"."equipamentos"("id");



ALTER TABLE ONLY "public"."equipamentos_property"
    ADD CONSTRAINT "fk_equipamentos_property_prop" FOREIGN KEY ("id_property") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "fk_equipos_property" FOREIGN KEY ("id_property") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."maintenance_response"
    ADD CONSTRAINT "fk_maintenance_response_mantenimiento" FOREIGN KEY ("id_mantenimiento") REFERENCES "public"."mantenimientos"("id");



ALTER TABLE ONLY "public"."maintenance_response"
    ADD CONSTRAINT "fk_maintenance_response_public_user" FOREIGN KEY ("user_created") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."maintenance_response"
    ADD CONSTRAINT "fk_maintenance_response_user" FOREIGN KEY ("user_created") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."preguntas_equipamento"
    ADD CONSTRAINT "fk_preguntas_equipamento_equipamento" FOREIGN KEY ("equipamento_id") REFERENCES "public"."equipamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instrumentos"
    ADD CONSTRAINT "instrumentos_equipamento_fkey" FOREIGN KEY ("equipamento") REFERENCES "public"."equipamentos"("id");



ALTER TABLE ONLY "public"."interruptor_diferencial"
    ADD CONSTRAINT "interruptor_diferencial_id_itm_fkey" FOREIGN KEY ("id_itm") REFERENCES "public"."itm"("id");



ALTER TABLE ONLY "public"."itg"
    ADD CONSTRAINT "itg_id_detalle_tablero_electrico_fkey" FOREIGN KEY ("id_detalle_tablero_electrico") REFERENCES "public"."detalle_tablero_electrico"("id");



ALTER TABLE ONLY "public"."itm"
    ADD CONSTRAINT "itm_id_itg_fkey" FOREIGN KEY ("id_itg") REFERENCES "public"."itg"("id");



ALTER TABLE ONLY "public"."mantenimientos"
    ADD CONSTRAINT "mantenimientos_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."mantenimientos"
    ADD CONSTRAINT "mantenimientos_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."mantenimientos"
    ADD CONSTRAINT "mantenimientos_sesion_fkey" FOREIGN KEY ("id_sesion") REFERENCES "public"."sesion_mantenimiento"("id");



ALTER TABLE ONLY "public"."sesion_mantenimiento_fotos"
    ADD CONSTRAINT "sesion_mantenimiento_fotos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sesion_mantenimiento_fotos"
    ADD CONSTRAINT "sesion_mantenimiento_fotos_id_sesion_fkey" FOREIGN KEY ("id_sesion") REFERENCES "public"."sesion_mantenimiento"("id");



ALTER TABLE ONLY "public"."sesion_mantenimiento"
    ADD CONSTRAINT "sesion_mantenimiento_id_property_fkey" FOREIGN KEY ("id_property") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sesion_mantenimiento"
    ADD CONSTRAINT "sesion_mantenimiento_user_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."session_notes"
    ADD CONSTRAINT "session_notes_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."tablero_electrico"
    ADD CONSTRAINT "tablero_electrico_id_property_fkey" FOREIGN KEY ("id_property") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."technician_devices"
    ADD CONSTRAINT "technician_devices_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."technician_devices"
    ADD CONSTRAINT "technician_devices_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."technician_devices"
    ADD CONSTRAINT "technician_devices_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."template_maintenance"
    ADD CONSTRAINT "template_maintenance_id_equipamento_fkey" FOREIGN KEY ("id_equipamento") REFERENCES "public"."equipamentos"("id");



ALTER TABLE ONLY "public"."user_sesion_mantenimiento"
    ADD CONSTRAINT "user_maintenace_id_sesion_fkey" FOREIGN KEY ("id_sesion") REFERENCES "public"."sesion_mantenimiento"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sesion_mantenimiento"
    ADD CONSTRAINT "user_maintenace_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_company_fkey" FOREIGN KEY ("id_company") REFERENCES "public"."company"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Permitir lectura de equipamento_marca a usuarios autenticados" ON "public"."equipamento_marca" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir lectura de marcas a usuarios autenticados" ON "public"."marca" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_question_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."audit_question_sections" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."audit_questions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."audit_sessions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."checklist_response" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."checklist_schedules" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."company" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."company_equipment" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."company_property" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."equipamentos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."equipamentos_property" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."equipos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."equipos_historial" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."instrumentos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."maintenance_response" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."mantenimientos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."preguntas_equipamento" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."properties" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."sesion_mantenimiento" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."sesion_mantenimiento_fotos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."session_notes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."template_maintenance" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."user_properties" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."user_sesion_mantenimiento" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_insert" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_select" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."audit_question_sections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."audit_questions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."audit_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."checklist_response" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."checklist_schedules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."company" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."company_equipment" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."company_property" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."equipamentos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."equipamentos_property" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."equipos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."equipos_historial" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."instrumentos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."maintenance_response" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."mantenimientos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."preguntas_equipamento" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."sesion_mantenimiento" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."sesion_mantenimiento_fotos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."session_notes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."template_maintenance" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."user_properties" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."user_sesion_mantenimiento" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select_sistemas" ON "public"."sistemas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_update" ON "public"."audit_logs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."audit_question_sections" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."audit_questions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."audit_sessions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."checklist_response" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."checklist_schedules" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."company" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."company_equipment" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."company_property" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."equipamentos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."equipamentos_property" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."equipos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."equipos_historial" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."instrumentos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."maintenance_response" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."mantenimientos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."preguntas_equipamento" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."properties" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."sesion_mantenimiento" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."sesion_mantenimiento_fotos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."session_notes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."template_maintenance" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."user_properties" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."user_sesion_mantenimiento" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_update" ON "public"."users" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."checklist_response" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_equipment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_property" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."detalle_tablero_electrico" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipamento_marca" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipamentos_property" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipo_extra" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipos_historial" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipos_tablero" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipos_temp" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."import_equipos_preview" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."instrumentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interruptor_diferencial" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."itg" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."itm" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_response" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mantenimientos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marca" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preguntas_equipamento" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "properties_select" ON "public"."properties" FOR SELECT TO "authenticated" USING ("public"."can_read_property"("id", ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."sesion_mantenimiento" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sesion_mantenimiento_fotos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sistemas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tablero_electrico" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."technician_devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_maintenance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_properties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sesion_mantenimiento" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON TABLE "public"."user_properties" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."user_properties" TO "authenticated";
GRANT ALL ON TABLE "public"."user_properties" TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_auditor_to_property"("p_auditor_id" "uuid", "p_property_id" "uuid", "p_assignment_reason" "text", "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."assign_auditor_to_property"("p_auditor_id" "uuid", "p_property_id" "uuid", "p_assignment_reason" "text", "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_auditor_to_property"("p_auditor_id" "uuid", "p_property_id" "uuid", "p_assignment_reason" "text", "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_audit_session"("p_property_id" "uuid", "p_auditor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_audit_session"("p_property_id" "uuid", "p_auditor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_audit_session"("p_property_id" "uuid", "p_auditor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_read_property"("p_property_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_read_property"("p_property_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_property"("p_property_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_max_two_session_start_photos"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_max_two_session_start_photos"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_max_two_session_start_photos"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_checklist_target_date_for_month"("anchor_date" "date", "reference_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_checklist_target_date_for_month"("anchor_date" "date", "reference_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_audit_property_assignment"("p_property_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_audit_property_assignment"("p_property_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_audit_property_assignment"("p_property_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_auditor_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_auditor_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_auditor_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_supervisor_or_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_supervisor_or_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_supervisor_or_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_supervisor_or_admin_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_supervisor_or_admin_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_supervisor_or_admin_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_tecnico_rems_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_tecnico_rems_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_tecnico_rems_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_equipo_historial"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_equipo_historial"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_equipo_historial"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_equipos_updated_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_equipos_updated_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_equipos_updated_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_audit_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_audit_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_audit_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_checklist_schedules_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_checklist_schedules_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_checklist_schedules_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unassign_auditor_from_property"("p_auditor_id" "uuid", "p_property_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unassign_auditor_from_property"("p_auditor_id" "uuid", "p_property_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unassign_auditor_from_property"("p_auditor_id" "uuid", "p_property_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_audit_payload"("p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_audit_payload"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_audit_payload"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_checklist_schedule"("p_equipo_id" "uuid", "p_submitted_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_checklist_schedule"("p_equipo_id" "uuid", "p_submitted_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_checklist_schedule"("p_equipo_id" "uuid", "p_submitted_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_checklist_schedule"("p_property_id" "uuid", "p_equipamento_id" "uuid", "p_submitted_at" timestamp with time zone, "p_equipo_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_checklist_schedule"("p_property_id" "uuid", "p_equipamento_id" "uuid", "p_submitted_at" timestamp with time zone, "p_equipo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_checklist_schedule"("p_property_id" "uuid", "p_equipamento_id" "uuid", "p_submitted_at" timestamp with time zone, "p_equipo_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."audit_question_sections" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."audit_question_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_question_sections" TO "service_role";



GRANT ALL ON TABLE "public"."audit_questions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."audit_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_questions" TO "service_role";



GRANT ALL ON TABLE "public"."audit_sessions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."audit_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_response" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."checklist_response" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_response" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_schedules" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."checklist_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."company" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."company" TO "authenticated";
GRANT ALL ON TABLE "public"."company" TO "service_role";



GRANT ALL ON TABLE "public"."company_equipment" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."company_equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."company_equipment" TO "service_role";



GRANT ALL ON TABLE "public"."company_property" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."company_property" TO "authenticated";
GRANT ALL ON TABLE "public"."company_property" TO "service_role";



GRANT ALL ON TABLE "public"."detalle_tablero_electrico" TO "anon";
GRANT ALL ON TABLE "public"."detalle_tablero_electrico" TO "authenticated";
GRANT ALL ON TABLE "public"."detalle_tablero_electrico" TO "service_role";



GRANT ALL ON TABLE "public"."equipamento_marca" TO "anon";
GRANT ALL ON TABLE "public"."equipamento_marca" TO "authenticated";
GRANT ALL ON TABLE "public"."equipamento_marca" TO "service_role";



GRANT ALL ON TABLE "public"."equipamentos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."equipamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."equipamentos" TO "service_role";



GRANT ALL ON TABLE "public"."equipamentos_property" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."equipamentos_property" TO "authenticated";
GRANT ALL ON TABLE "public"."equipamentos_property" TO "service_role";



GRANT ALL ON TABLE "public"."equipo_extra" TO "anon";
GRANT ALL ON TABLE "public"."equipo_extra" TO "authenticated";
GRANT ALL ON TABLE "public"."equipo_extra" TO "service_role";



GRANT ALL ON TABLE "public"."equipos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."equipos" TO "authenticated";
GRANT ALL ON TABLE "public"."equipos" TO "service_role";



GRANT ALL ON TABLE "public"."equipos_historial" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."equipos_historial" TO "authenticated";
GRANT ALL ON TABLE "public"."equipos_historial" TO "service_role";



GRANT ALL ON SEQUENCE "public"."equipos_historial_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."equipos_historial_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."equipos_historial_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."equipos_tablero" TO "anon";
GRANT ALL ON TABLE "public"."equipos_tablero" TO "authenticated";
GRANT ALL ON TABLE "public"."equipos_tablero" TO "service_role";



GRANT ALL ON TABLE "public"."equipos_temp" TO "anon";
GRANT ALL ON TABLE "public"."equipos_temp" TO "authenticated";
GRANT ALL ON TABLE "public"."equipos_temp" TO "service_role";



GRANT ALL ON TABLE "public"."import_equipos_preview" TO "anon";
GRANT ALL ON TABLE "public"."import_equipos_preview" TO "authenticated";
GRANT ALL ON TABLE "public"."import_equipos_preview" TO "service_role";



GRANT ALL ON TABLE "public"."instrumentos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."instrumentos" TO "authenticated";
GRANT ALL ON TABLE "public"."instrumentos" TO "service_role";



GRANT ALL ON TABLE "public"."interruptor_diferencial" TO "anon";
GRANT ALL ON TABLE "public"."interruptor_diferencial" TO "authenticated";
GRANT ALL ON TABLE "public"."interruptor_diferencial" TO "service_role";



GRANT ALL ON TABLE "public"."itg" TO "anon";
GRANT ALL ON TABLE "public"."itg" TO "authenticated";
GRANT ALL ON TABLE "public"."itg" TO "service_role";



GRANT ALL ON TABLE "public"."itm" TO "anon";
GRANT ALL ON TABLE "public"."itm" TO "authenticated";
GRANT ALL ON TABLE "public"."itm" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_response" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."maintenance_response" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_response" TO "service_role";



GRANT ALL ON TABLE "public"."mantenimientos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."mantenimientos" TO "authenticated";
GRANT ALL ON TABLE "public"."mantenimientos" TO "service_role";



GRANT ALL ON TABLE "public"."marca" TO "anon";
GRANT ALL ON TABLE "public"."marca" TO "authenticated";
GRANT ALL ON TABLE "public"."marca" TO "service_role";



GRANT ALL ON TABLE "public"."preguntas_equipamento" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."preguntas_equipamento" TO "authenticated";
GRANT ALL ON TABLE "public"."preguntas_equipamento" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."sesion_mantenimiento" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."sesion_mantenimiento" TO "authenticated";
GRANT ALL ON TABLE "public"."sesion_mantenimiento" TO "service_role";



GRANT ALL ON TABLE "public"."sesion_mantenimiento_fotos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."sesion_mantenimiento_fotos" TO "authenticated";
GRANT ALL ON TABLE "public"."sesion_mantenimiento_fotos" TO "service_role";



GRANT ALL ON TABLE "public"."session_notes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."session_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."session_notes" TO "service_role";



GRANT ALL ON TABLE "public"."sistemas" TO "anon";
GRANT ALL ON TABLE "public"."sistemas" TO "authenticated";
GRANT ALL ON TABLE "public"."sistemas" TO "service_role";



GRANT ALL ON TABLE "public"."tablero_electrico" TO "anon";
GRANT ALL ON TABLE "public"."tablero_electrico" TO "authenticated";
GRANT ALL ON TABLE "public"."tablero_electrico" TO "service_role";



GRANT ALL ON TABLE "public"."technician_devices" TO "anon";
GRANT ALL ON TABLE "public"."technician_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."technician_devices" TO "service_role";



GRANT ALL ON TABLE "public"."template_maintenance" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."template_maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."template_maintenance" TO "service_role";



GRANT ALL ON TABLE "public"."user_sesion_mantenimiento" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."user_sesion_mantenimiento" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sesion_mantenimiento" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."v_user_property_assignments" TO "anon";
GRANT ALL ON TABLE "public"."v_user_property_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."v_user_property_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."vista_company_property" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."vista_company_property" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_company_property" TO "service_role";



GRANT ALL ON TABLE "public"."vista_equipamentos_property" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."vista_equipamentos_property" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_equipamentos_property" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































