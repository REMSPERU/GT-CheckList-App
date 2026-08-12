-- ============================================================================
-- MIGRACIÓN SQL PARA SUPABASE GEMA: INTEGRACIÓN DE ALEXPERTO
-- Fecha: 2026-08-12
-- Filtro: Solo inmuebles activos de GEMA (is_active = true)
-- Documentación de referencia: docs/DECISION_INTEGRACION_ALEXPERTO.md
-- ============================================================================

-- 1. TABLA: alexperto_property_mappings (Estructura simplificada)
CREATE TABLE IF NOT EXISTS public.alexperto_property_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gema_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  alexperto_property_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índice de búsqueda rápida por inmueble GEMA
CREATE UNIQUE INDEX IF NOT EXISTS idx_alexperto_mappings_gema_prop ON public.alexperto_property_mappings(gema_property_id);

-- 2. TABLA: alexperto_audit_actions (Estado de trabajo propio de GEMA)
CREATE TABLE IF NOT EXISTS public.alexperto_audit_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_entity_type TEXT NOT NULL, -- 'QUOTE', 'PREVENTIVE', 'DOCUMENT'
  external_entity_id TEXT NOT NULL,
  gema_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  current_status TEXT NOT NULL DEFAULT 'PENDIENTE_REVISION' CHECK (current_status IN ('PENDIENTE_REVISION', 'OBSERVADO', 'CULMINADO', 'PENDIENTE_VALIDACION', 'VALIDADO')),
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_alexperto_audit_action_entity UNIQUE (external_entity_type, external_entity_id)
);

-- 3. TABLA: alexperto_audit_action_history
CREATE TABLE IF NOT EXISTS public.alexperto_audit_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.alexperto_audit_actions(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA: alexperto_speeches
CREATE TABLE IF NOT EXISTS public.alexperto_speeches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'QUOTE', 'PREVENTIVE', 'DOCUMENT'
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA: alexperto_alerts
CREATE TABLE IF NOT EXISTS public.alexperto_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_entity_type TEXT NOT NULL,
  external_entity_id TEXT NOT NULL,
  gema_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABLA: alexperto_document_analyses
CREATE TABLE IF NOT EXISTS public.alexperto_document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_entity_type TEXT NOT NULL,
  external_entity_id TEXT NOT NULL,
  gema_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  file_hash TEXT,
  evidence JSONB,
  ai_model TEXT,
  validated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLA: alexperto_specialties
CREATE TABLE IF NOT EXISTS public.alexperto_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  external_specialty_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- POBLAR REGISTROS DE MAPEO CONFIRMADOC EN alexperto_property_mappings
-- ============================================================================

INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('2a17a7e8-3975-4ea5-b8ab-65a3cf066bc4', 'hwrwle299fdmg41wsxhh97hv', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('7c0f5a40-367c-4ecc-b7dc-03dce0c0d01a', 'lg8u8fje63tv4x32u1sjru5g', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('cd43c397-ea16-4d18-ac5b-afc3bb6f3ccb', 'p1duz5vj66xekr8v7qjg3egx', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('47eb73ea-967d-4f55-a7f4-f9291c0f0b25', 'snzopw2ksv6vam3s1dgmgxsl', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('a68e0058-a2a8-472d-a0d6-40f6439756e6', 'b2vfq92yv5l3og8j1zxup9r8', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('759dc2a5-3cd5-4fc5-b4ba-86fad5f41cc3', 'loswkh58vfuyegz8nafe24pj', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('b6f7b942-bd12-4037-b91d-7fcda684457c', 'ion6pk9ay0nr6z0b7k44hrn1', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('c4492cb6-5ec0-4002-9bf8-8275434b271e', 'p53v56md3f9lewyoorlve029', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('2598c18c-a5ae-460a-9c57-8a4d1df1ed88', 'etakpw23ggsha50cg4m6y4bb', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('d498f30d-4fcb-483e-85e1-0788ab828ca6', 'po09m1uvdme04d5g3yssmr3r', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('024ae5ad-72b6-45f3-965a-10189cc4de9e', 'o68fkws5vbmjbnnlyqb9yef5', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('9d930928-79c4-4c0f-b312-e00b33e27d3f', 'yz9168qabikbw59m87pp9jvk', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('7564592f-475e-4234-81b4-9bdce1bbad93', 'qzteg73d1f7kuaukerqq63od', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('08d6c326-7d88-4626-8e6b-9eaa9086d4bf', 'xawuk3h7pn85mep2e0b4itlg', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('dc5f9fda-a9e9-4b76-bc91-88381f2699cd', 'pm799iplxj2etej0ps5t0eki', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('f12e9e24-39da-4ddf-98c5-4f36b6ba21bc', 'vy0wsnaszbx2f05kci82i2ud', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('68d4d736-dba7-481d-aae8-1fdc5cae33e7', 'mzvgzs33z6mdn8easdl3wwb1', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('21a1dfb6-8b3f-4fa1-b233-5ae41a0e9aa8', 'dhgryxvi64zqieht60gmlwfx', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('fe822222-3247-41da-8238-d9c95c02c5ea', 'tntnuwwqqldmc9djokz958bz', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('05e7c13e-52b2-46c9-a3ce-8962ca35bcc6', 'st3pvprw229ksr42mtq06keq', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('2b7ccb30-da9d-4773-ab93-4d7e88c3ab4f', 'ckz5ti3pzwglmwhzc4crbc1c', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('5193e682-a2ac-45b5-bff0-a1fa6be7b91c', 'w3wcxlj1isjhbwgj1ccnvxax', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('ba7c1a4d-e475-417c-b68b-74219c987efd', 'eqz6ckokx66scksag3ecwhy8', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('deee4983-bf5d-495d-a746-d1d2668797b5', 'u4ikfxqq7kttv0ccawipkrtw', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('0b3f53b8-9d9d-40e2-8dd7-3c71217c05c7', 'eituf8hyt60c2lt1j7axck7m', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('f23322e9-a63e-474c-bb6c-efbeae62f100', 'cejsopdxehz9r0e4jbs3383l', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('db9764e7-84e1-48a3-8d69-749c8788caeb', 'gp911v7x3e4te650cxxx3oiv', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('fa175321-dd87-46dd-b0df-f09e1a973a7d', 'te50dwde3eunx82herx9wmkg', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('ed07fef6-ad7b-478c-9c0e-fc459553270a', 'i8q6hawzxgndt8654fz9qz7i', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('e5aecb83-8853-4b1f-89f0-f7164ad2ed08', 'f9o52db2313acz0xx8rxc5vq', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('59975d02-17e0-4885-a1a6-5e45d7f66703', 'gfzj07crbpnhnrk7n1mn8mcr', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('d2caae2c-c67b-49d7-8cfe-b4ecb73d36e5', 'rbl7t953ns04po6kmasi8d06', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('b45c2598-1771-4805-8227-9ee29de3970d', 'r15jz5o6rfl4bca41wxpdn2w', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('5e9d25e2-80b4-46ad-8e20-c28b938133aa', 'btj8r7wjm74cwmjlw5m48tpf', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('a002ec80-c614-4350-8d41-64efa3d0a5a4', 'b230mzs6jr5mzvnsfh999cob', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('93b5c0c6-5abb-4d43-b00b-855a9d2e17d2', 'gvn6ya6vbtyvpbw9g7q966iy', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('201c22b8-1a61-4eef-8470-291008c40ef8', 'twoi4699tjk4p77np6i6q7zo', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('49e11af8-407b-4346-b122-ee72b59670df', 'qhxem9xnw0l5hj776bgwj3yt', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('4a933c1f-0f9d-4304-a39f-e233cd13f357', 'qzw7f3a45d4a5rm5yuphyi84', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('5a83e82a-eb83-4ee9-813f-72b221a809b3', 'pjh1lk2qeia02scl6gby0etq', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('4810e704-8817-4913-97f1-2d6bd4d1de23', 'ijs8w1sv9hdtffxv599v8ivv', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('6b9a771f-1280-4f05-9d1f-91edf33fddd5', 'wqu5c3sxk6y6d9i1518vyau6', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('2bb7a671-d35d-4b4b-950e-8425876b9f10', 'cxvg4mvsvsl8p0w4mronydma', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('96ce32c0-ce7a-4530-a7fd-d702a4edc46c', 'ynpuc04jkksd89cjvja4pca9', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('43461665-acd7-453f-8688-eb5deb58cfaa', 'sk8aeykbyxhn9pr1f5wdi6hn', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('c2025c45-21f2-450d-868b-faba22e89741', 'vj32xwlh9y0it0n22vpgompf', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('87db2753-3b71-40c7-b96e-1a80ed34fe23', 'vlf340zbdycwneqp8guq4x19', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('679781a7-816b-43c4-be24-abc463cf110f', 'aiv8gg2erz2w74ecaizncmt7', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('cc7cabd0-48a5-4836-8894-715ced201e5f', 's4t1rjs97y3ciu2rf5ezrlnr', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('633681a6-419d-45d5-8d1b-7e4b9207e5cd', 'zbtt33gd34valbikqllw5nwq', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('74679d8c-ad12-4770-975c-775395df4849', 'kxasjx2c8oeq4eat1eo6x5p9', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('6eedcc7d-4ada-4852-9292-3e211b5e845c', 'jaa9l7j8nbw5se2tkinly7nl', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('27e4edf6-6b3d-47cc-a98d-f288781d9fb0', 'lv4urj4tqv19be56sglawod8', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('d90924b6-faf9-4b15-b30d-d86fb842533b', 's1xdkm8dp47d6w6buj0u9mtu', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('8aacfcd9-8cb0-41f3-8aef-deed6c40b1fa', 'dxy8l5mpk83k5q3nlpi4kd1t', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('92d87aba-2d5a-4a56-9cf9-257a9faddfee', 'f1cvzqwmpp5a7nmxo72j6pj1', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('87a228a2-b3b5-4dc8-982d-ec316096fa1b', 'zg4kesbadk26uh37yl3k3nqx', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('ec114322-068e-4875-b2f0-fef55d451f08', 'yykrr80x2f4wm84pbknztlzt', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('1fac9a25-1b5d-4637-a8f8-5ac7646ed9d3', 'd78y9yulnwzgxzgtcw49k3fy', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('5bffac4e-9d5c-4b88-9315-c5d5e44f4ca8', 'h5tvjlo5166oohgtjnsj0ltv', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('18dbafe2-25cd-41ad-bd40-e8c22f9eeab9', 'cgmnz4hnf6gavml0yb5gvdqk', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('97656472-dec7-4203-87ed-6cdf6d19a7a6', 'nfesa3t3m4rrwr0rwsdul6xv', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('08db06af-3b12-4933-985c-2e5d1a0c08fb', 'ykizuz63t3ww7lcafq0z5f29', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('786f227a-fe64-416c-b8ea-c000e025c053', 'zxr3hpwy0dsgpxqiqak1uy54', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('712eac0f-9493-4495-92c2-c06b85f5c280', 'yhivu047gj6xcaymdxjrvtnv', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('2a2e9069-cc1d-4597-97e9-ed82c6d5ebd3', 'abdxib1443yd8f1ofn4s42hj', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;
INSERT INTO public.alexperto_property_mappings (gema_property_id, alexperto_property_id, status) VALUES ('c10391b5-0462-4b68-a6a8-2506e4d28d14', 'mn65i6uu2yo933jf84id0xup', 'CONFIRMED') ON CONFLICT (gema_property_id) DO UPDATE SET alexperto_property_id = EXCLUDED.alexperto_property_id, status = EXCLUDED.status;