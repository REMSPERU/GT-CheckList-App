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


CREATE SCHEMA IF NOT EXISTS "public";

ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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
    'SUPERADMIN'
);


ALTER TYPE "public"."roleenum" OWNER TO "postgres";


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

SET default_tablespace = '';

SET default_table_access_method = "heap";


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
    "error_code" character varying(50)
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "direccion" "text",
    "telefono" "text",
    "raz_social" "text",
    "RUC" "text"
);


ALTER TABLE "public"."company" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_equipment" (
    "id_company" "uuid" NOT NULL,
    "id_equipament" "uuid" NOT NULL
);


ALTER TABLE "public"."company_equipment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_property" (
    "id_company" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_property" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
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


CREATE TABLE IF NOT EXISTS "public"."equipamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" character varying(45),
    "abreviatura" character varying(45)
);


ALTER TABLE "public"."equipamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipamentos_property" (
    "id_equipamentos" "uuid" NOT NULL,
    "id_property" "uuid" NOT NULL
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
    "estatus" character varying(45),
    "equipment_detail" "jsonb",
    "config" boolean DEFAULT false,
    "created" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "equipos_config_check" CHECK (("config" = ANY (ARRAY[true, false])))
);


ALTER TABLE "public"."equipos" OWNER TO "postgres";


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
    "detail_maintenance" "jsonb"
);


ALTER TABLE "public"."maintenance_response" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mantenimientos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id_equipo" "uuid" DEFAULT "gen_random_uuid"(),
    "estatus" "text" DEFAULT 'NO INICIADO'::"text",
    "id_user" "uuid" DEFAULT "gen_random_uuid"(),
    "dia_programado" timestamp with time zone,
    "tipo_mantenimiento" "text",
    "observations" "text"
);


ALTER TABLE "public"."mantenimientos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
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
    "floor" smallint
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."template_hardware" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_equipamento" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "json_detail" "jsonb"
);


ALTER TABLE "public"."template_hardware" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_maintenance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_equipamento" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "json_detail" "jsonb"
);


ALTER TABLE "public"."template_maintenance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_maintenace" (
    "id_user" "uuid" NOT NULL,
    "id_maintenance" "uuid" NOT NULL
);


ALTER TABLE "public"."user_maintenace" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_properties" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
    "user_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp without time zone NOT NULL,
    "assignment_reason" character varying(500),
    "expires_at" timestamp without time zone,
    "property_role" "public"."roleenum"
);


ALTER TABLE "public"."user_properties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_property" (
    "id_user" "uuid" NOT NULL,
    "id_property" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."user_property" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone,
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


ALTER TABLE ONLY "public"."mantenimientos"
    ADD CONSTRAINT "Mantenimientos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_equipment"
    ADD CONSTRAINT "company_equipment_pkey" PRIMARY KEY ("id_company", "id_equipament");



ALTER TABLE ONLY "public"."company"
    ADD CONSTRAINT "company_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_property"
    ADD CONSTRAINT "company_property_pkey" PRIMARY KEY ("id_company", "id_property");



ALTER TABLE ONLY "public"."detalle_tablero_electrico"
    ADD CONSTRAINT "detalle_tablero_electrico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipamentos"
    ADD CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipamentos_property"
    ADD CONSTRAINT "equipamentos_property_pkey" PRIMARY KEY ("id_equipamentos", "id_property");



ALTER TABLE ONLY "public"."equipo_extra"
    ADD CONSTRAINT "equipo_extra_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tablero_electrico"
    ADD CONSTRAINT "tablero_electrico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technician_devices"
    ADD CONSTRAINT "technician_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_hardware"
    ADD CONSTRAINT "template_hardware_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_maintenance"
    ADD CONSTRAINT "template_maintenance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technician_devices"
    ADD CONSTRAINT "uq_technician_device" UNIQUE ("technician_id", "device_id");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "uq_user_property" UNIQUE ("user_id", "property_id");



ALTER TABLE ONLY "public"."user_maintenace"
    ADD CONSTRAINT "user_maintenace_pkey" PRIMARY KEY ("id_user", "id_maintenance");



ALTER TABLE ONLY "public"."user_property"
    ADD CONSTRAINT "user_maintenance_pkey" PRIMARY KEY ("id_user", "id_property");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_equipamentos_property_id_property" ON "public"."equipamentos_property" USING "btree" ("id_property");



CREATE INDEX "idx_equipos_id_property" ON "public"."equipos" USING "btree" ("id_property");



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



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



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



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_id_equipamento_fkey" FOREIGN KEY ("id_equipamento") REFERENCES "public"."equipamentos"("id");



ALTER TABLE ONLY "public"."equipamentos_property"
    ADD CONSTRAINT "fk_equipamentos_property_equip" FOREIGN KEY ("id_equipamentos") REFERENCES "public"."equipamentos"("id");



ALTER TABLE ONLY "public"."equipamentos_property"
    ADD CONSTRAINT "fk_equipamentos_property_prop" FOREIGN KEY ("id_property") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "fk_equipos_property" FOREIGN KEY ("id_property") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."maintenance_response"
    ADD CONSTRAINT "fk_maintenance_response_mantenimiento" FOREIGN KEY ("id_mantenimiento") REFERENCES "public"."mantenimientos"("id");



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



ALTER TABLE ONLY "public"."tablero_electrico"
    ADD CONSTRAINT "tablero_electrico_id_property_fkey" FOREIGN KEY ("id_property") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."technician_devices"
    ADD CONSTRAINT "technician_devices_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."technician_devices"
    ADD CONSTRAINT "technician_devices_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."technician_devices"
    ADD CONSTRAINT "technician_devices_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."template_hardware"
    ADD CONSTRAINT "template_hardware_id_equipamento_fkey" FOREIGN KEY ("id_equipamento") REFERENCES "public"."equipamentos"("id");



ALTER TABLE ONLY "public"."template_maintenance"
    ADD CONSTRAINT "template_maintenance_id_equipamento_fkey" FOREIGN KEY ("id_equipamento") REFERENCES "public"."equipamentos"("id");



ALTER TABLE ONLY "public"."user_maintenace"
    ADD CONSTRAINT "user_maintenace_id_maintenance_fkey" FOREIGN KEY ("id_maintenance") REFERENCES "public"."mantenimientos"("id");



ALTER TABLE ONLY "public"."user_maintenace"
    ADD CONSTRAINT "user_maintenace_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_property"
    ADD CONSTRAINT "user_maintenance_id_property_fkey" FOREIGN KEY ("id_property") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."user_property"
    ADD CONSTRAINT "user_maintenance_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_properties"
    ADD CONSTRAINT "user_properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_company_fkey" FOREIGN KEY ("id_company") REFERENCES "public"."company"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users ven solo propiedades de su compa├▒ia" ON "public"."properties" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."company_property" "cp"
     JOIN "public"."users" "u" ON (("u"."id_company" = "cp"."id_company")))
  WHERE (("cp"."id_property" = "properties"."id") AND ("u"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."company_equipment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_hardware" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_maintenance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_property" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."company" TO "anon";
GRANT ALL ON TABLE "public"."company" TO "authenticated";
GRANT ALL ON TABLE "public"."company" TO "service_role";



GRANT ALL ON TABLE "public"."company_equipment" TO "anon";
GRANT ALL ON TABLE "public"."company_equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."company_equipment" TO "service_role";



GRANT ALL ON TABLE "public"."company_property" TO "anon";
GRANT ALL ON TABLE "public"."company_property" TO "authenticated";
GRANT ALL ON TABLE "public"."company_property" TO "service_role";



GRANT ALL ON TABLE "public"."detalle_tablero_electrico" TO "anon";
GRANT ALL ON TABLE "public"."detalle_tablero_electrico" TO "authenticated";
GRANT ALL ON TABLE "public"."detalle_tablero_electrico" TO "service_role";



GRANT ALL ON TABLE "public"."equipamentos" TO "anon";
GRANT ALL ON TABLE "public"."equipamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."equipamentos" TO "service_role";



GRANT ALL ON TABLE "public"."equipamentos_property" TO "anon";
GRANT ALL ON TABLE "public"."equipamentos_property" TO "authenticated";
GRANT ALL ON TABLE "public"."equipamentos_property" TO "service_role";



GRANT ALL ON TABLE "public"."equipo_extra" TO "anon";
GRANT ALL ON TABLE "public"."equipo_extra" TO "authenticated";
GRANT ALL ON TABLE "public"."equipo_extra" TO "service_role";



GRANT ALL ON TABLE "public"."equipos" TO "anon";
GRANT ALL ON TABLE "public"."equipos" TO "authenticated";
GRANT ALL ON TABLE "public"."equipos" TO "service_role";



GRANT ALL ON TABLE "public"."equipos_tablero" TO "anon";
GRANT ALL ON TABLE "public"."equipos_tablero" TO "authenticated";
GRANT ALL ON TABLE "public"."equipos_tablero" TO "service_role";



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
GRANT ALL ON TABLE "public"."maintenance_response" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_response" TO "service_role";



GRANT ALL ON TABLE "public"."mantenimientos" TO "anon";
GRANT ALL ON TABLE "public"."mantenimientos" TO "authenticated";
GRANT ALL ON TABLE "public"."mantenimientos" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."tablero_electrico" TO "anon";
GRANT ALL ON TABLE "public"."tablero_electrico" TO "authenticated";
GRANT ALL ON TABLE "public"."tablero_electrico" TO "service_role";



GRANT ALL ON TABLE "public"."technician_devices" TO "anon";
GRANT ALL ON TABLE "public"."technician_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."technician_devices" TO "service_role";



GRANT ALL ON TABLE "public"."template_hardware" TO "anon";
GRANT ALL ON TABLE "public"."template_hardware" TO "authenticated";
GRANT ALL ON TABLE "public"."template_hardware" TO "service_role";



GRANT ALL ON TABLE "public"."template_maintenance" TO "anon";
GRANT ALL ON TABLE "public"."template_maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."template_maintenance" TO "service_role";



GRANT ALL ON TABLE "public"."user_maintenace" TO "anon";
GRANT ALL ON TABLE "public"."user_maintenace" TO "authenticated";
GRANT ALL ON TABLE "public"."user_maintenace" TO "service_role";



GRANT ALL ON TABLE "public"."user_properties" TO "anon";
GRANT ALL ON TABLE "public"."user_properties" TO "authenticated";
GRANT ALL ON TABLE "public"."user_properties" TO "service_role";



GRANT ALL ON TABLE "public"."user_property" TO "anon";
GRANT ALL ON TABLE "public"."user_property" TO "authenticated";
GRANT ALL ON TABLE "public"."user_property" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



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
