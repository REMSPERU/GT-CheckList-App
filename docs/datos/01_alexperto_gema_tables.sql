-- ============================================================================
-- MIGRACIÓN SQL PARA SUPABASE GEMA: INTEGRACIÓN DIRECTA CON ALEXPERTO
-- Fecha: 2026-08-12
-- Método: Columna alexperto_property_id directa en la tabla public.properties
-- Filtro: Solo inmuebles activos de GEMA (is_active = true)
-- Documentación de referencia: docs/DECISION_INTEGRACION_ALEXPERTO.md
-- ============================================================================

-- 1. AGREGAR COLUMNA EN public.properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS alexperto_property_id TEXT UNIQUE;

-- Índice opcional para acelerar filtros por ID externo
CREATE INDEX IF NOT EXISTS idx_properties_alexperto_id ON public.properties(alexperto_property_id);

-- 2. POBLAR alexperto_property_id PARA LOS 67 INMUEBLES ACTIVOS MATCHEADOS
UPDATE public.properties SET alexperto_property_id = 'hwrwle299fdmg41wsxhh97hv' WHERE id = '2a17a7e8-3975-4ea5-b8ab-65a3cf066bc4'; -- CENTRO INDUSTRIAL LOGIKO <-> CENTRO INDUSTRIAL LOGIKO
UPDATE public.properties SET alexperto_property_id = 'lg8u8fje63tv4x32u1sjru5g' WHERE id = '7c0f5a40-367c-4ecc-b7dc-03dce0c0d01a'; -- EDIFICIO NACIONAL <-> EDIFICIO NACIONAL
UPDATE public.properties SET alexperto_property_id = 'p1duz5vj66xekr8v7qjg3egx' WHERE id = 'cd43c397-ea16-4d18-ac5b-afc3bb6f3ccb'; -- EDIFICIO VICTOR ANDRES BELAUNDE <-> EDIFICIO VICTOR ANDRES BELAUNDE
UPDATE public.properties SET alexperto_property_id = 'snzopw2ksv6vam3s1dgmgxsl' WHERE id = '47eb73ea-967d-4f55-a7f4-f9291c0f0b25'; -- PANORAMA CENTRO EMPRESARIAL DOS <-> PANORAMA CENTRO EMPRESARIAL DOS
UPDATE public.properties SET alexperto_property_id = 'b2vfq92yv5l3og8j1zxup9r8' WHERE id = 'a68e0058-a2a8-472d-a0d6-40f6439756e6'; -- PANORAMA CENTRO EMPRESARIAL ESTACIONAMIENTO <-> PANORAMA CENTRO EMPRESARIAL ESTACIONAMIENTO
UPDATE public.properties SET alexperto_property_id = 'loswkh58vfuyegz8nafe24pj' WHERE id = '759dc2a5-3cd5-4fc5-b4ba-86fad5f41cc3'; -- PANORAMA CENTRO EMPRESARIAL UNO <-> PANORAMA CENTRO EMPRESARIAL UNO
UPDATE public.properties SET alexperto_property_id = 'ion6pk9ay0nr6z0b7k44hrn1' WHERE id = 'b6f7b942-bd12-4037-b91d-7fcda684457c'; -- TORRE TEKTON <-> TORRE TEKTON
UPDATE public.properties SET alexperto_property_id = 'p53v56md3f9lewyoorlve029' WHERE id = 'c4492cb6-5ec0-4002-9bf8-8275434b271e'; -- TORRE SIGLO XXI <-> TORRE SIGLO XXI
UPDATE public.properties SET alexperto_property_id = 'etakpw23ggsha50cg4m6y4bb' WHERE id = '2598c18c-a5ae-460a-9c57-8a4d1df1ed88'; -- EDIFICIO PERSHING TOWER <-> EDIFICIO PERSHING TOWER
UPDATE public.properties SET alexperto_property_id = 'po09m1uvdme04d5g3yssmr3r' WHERE id = 'd498f30d-4fcb-483e-85e1-0788ab828ca6'; -- LIT ONE <-> LIT ONE
UPDATE public.properties SET alexperto_property_id = 'o68fkws5vbmjbnnlyqb9yef5' WHERE id = '024ae5ad-72b6-45f3-965a-10189cc4de9e'; -- PRISMA BUSINESS TOWER <-> PRISMA BUSINESS TOWER
UPDATE public.properties SET alexperto_property_id = 'yz9168qabikbw59m87pp9jvk' WHERE id = '9d930928-79c4-4c0f-b312-e00b33e27d3f'; -- TORRE AMERICA <-> TORRE AMERICA
UPDATE public.properties SET alexperto_property_id = 'qzteg73d1f7kuaukerqq63od' WHERE id = '7564592f-475e-4234-81b4-9bdce1bbad93'; -- TORRE PARQUE MAR <-> TORRE PARQUE MAR
UPDATE public.properties SET alexperto_property_id = 'xawuk3h7pn85mep2e0b4itlg' WHERE id = '08d6c326-7d88-4626-8e6b-9eaa9086d4bf'; -- REDUCTO BUSINESS CENTER <-> REDUCTO BUSINESS CENTER
UPDATE public.properties SET alexperto_property_id = 'pm799iplxj2etej0ps5t0eki' WHERE id = 'dc5f9fda-a9e9-4b76-bc91-88381f2699cd'; -- ICHMA EDIFICIO CORPORATIVO <-> ICHMA EDIFICIO CORPORATIVO
UPDATE public.properties SET alexperto_property_id = 'vy0wsnaszbx2f05kci82i2ud' WHERE id = 'f12e9e24-39da-4ddf-98c5-4f36b6ba21bc'; -- CENTRO EMPRESARIAL QUATTRO <-> CENTRO EMPRESARIAL QUATTRO
UPDATE public.properties SET alexperto_property_id = 'mzvgzs33z6mdn8easdl3wwb1' WHERE id = '68d4d736-dba7-481d-aae8-1fdc5cae33e7'; -- CENTRO EMPRESARIAL REDUCTO <-> CENTRO EMPRESARIAL REDUCTO
UPDATE public.properties SET alexperto_property_id = 'dhgryxvi64zqieht60gmlwfx' WHERE id = '21a1dfb6-8b3f-4fa1-b233-5ae41a0e9aa8'; -- CENTRO DE CONVENCIONES Y OFICINAS CAMINO REAL <-> CENTRO DE CONVENCIONES Y OFICINAS CAMINO REAL
UPDATE public.properties SET alexperto_property_id = 'tntnuwwqqldmc9djokz958bz' WHERE id = 'fe822222-3247-41da-8238-d9c95c02c5ea'; -- CENTRO EMPRESARIAL ABRIL <-> CENTRO EMPRESARIAL ABRIL
UPDATE public.properties SET alexperto_property_id = 'st3pvprw229ksr42mtq06keq' WHERE id = '05e7c13e-52b2-46c9-a3ce-8962ca35bcc6'; -- CENTRO EMPRESARIAL LA MOLINA <-> CENTRO EMPRESARIAL LA MOLINA
UPDATE public.properties SET alexperto_property_id = 'ckz5ti3pzwglmwhzc4crbc1c' WHERE id = '2b7ccb30-da9d-4773-ab93-4d7e88c3ab4f'; -- CENTRO EMPRESARIAL POLO HUNT II <-> CENTRO EMPRESARIAL POLO HUNT II
UPDATE public.properties SET alexperto_property_id = 'w3wcxlj1isjhbwgj1ccnvxax' WHERE id = '5193e682-a2ac-45b5-bff0-a1fa6be7b91c'; -- CENTRO EMPRESARIAL TANGÜIS <-> CENTRO EMPRESARIAL TANGÜIS
UPDATE public.properties SET alexperto_property_id = 'eqz6ckokx66scksag3ecwhy8' WHERE id = 'ba7c1a4d-e475-417c-b68b-74219c987efd'; -- CENTRO EMPRESARIAL TORRE PINAR <-> CENTRO EMPRESARIAL TORRE PINAR
UPDATE public.properties SET alexperto_property_id = 'u4ikfxqq7kttv0ccawipkrtw' WHERE id = 'deee4983-bf5d-495d-a746-d1d2668797b5'; -- EDIFICIO CORPORATIVO AENZA <-> EDIFICIO CORPORATIVO AENZA
UPDATE public.properties SET alexperto_property_id = 'eituf8hyt60c2lt1j7axck7m' WHERE id = '0b3f53b8-9d9d-40e2-8dd7-3c71217c05c7'; -- EDIFICIO CHOCAVENTO <-> EDIFICIO CHOCAVENTO
UPDATE public.properties SET alexperto_property_id = 'cejsopdxehz9r0e4jbs3383l' WHERE id = 'f23322e9-a63e-474c-bb6c-efbeae62f100'; -- EDIFICIO EMPRESARIAL OMEGA <-> EDIFICIO EMPRESARIAL OMEGA
UPDATE public.properties SET alexperto_property_id = 'gp911v7x3e4te650cxxx3oiv' WHERE id = 'db9764e7-84e1-48a3-8d69-749c8788caeb'; -- EDIFICIO EMPRESARIAL ESQUILACHE <-> EDIFICIO EMPRESARIAL ESQUILACHE
UPDATE public.properties SET alexperto_property_id = 'te50dwde3eunx82herx9wmkg' WHERE id = 'fa175321-dd87-46dd-b0df-f09e1a973a7d'; -- TORRE NAVARRETE <-> TORRE NAVARRETE
UPDATE public.properties SET alexperto_property_id = 'i8q6hawzxgndt8654fz9qz7i' WHERE id = 'ed07fef6-ad7b-478c-9c0e-fc459553270a'; -- EDIFICIO CORPORATIVO QUBO <-> EDIFICIO CORPORATIVO QUBO
UPDATE public.properties SET alexperto_property_id = 'f9o52db2313acz0xx8rxc5vq' WHERE id = 'e5aecb83-8853-4b1f-89f0-f7164ad2ed08'; -- TORRE FORUM <-> TORRE FORUM
UPDATE public.properties SET alexperto_property_id = 'gfzj07crbpnhnrk7n1mn8mcr' WHERE id = '59975d02-17e0-4885-a1a6-5e45d7f66703'; -- ONYX BUSINESS CENTER <-> ONYX BUSINESS CENTER
UPDATE public.properties SET alexperto_property_id = 'rbl7t953ns04po6kmasi8d06' WHERE id = 'd2caae2c-c67b-49d7-8cfe-b4ecb73d36e5'; -- EDIFICIO PARQUE LAS LOMAS <-> EDIFICIO PARQUE LAS LOMAS
UPDATE public.properties SET alexperto_property_id = 'r15jz5o6rfl4bca41wxpdn2w' WHERE id = 'b45c2598-1771-4805-8227-9ee29de3970d'; -- EDIFICIO TORRE ORQUIDEAS <-> EDIFICIO TORRE ORQUIDEAS
UPDATE public.properties SET alexperto_property_id = 'btj8r7wjm74cwmjlw5m48tpf' WHERE id = '5e9d25e2-80b4-46ad-8e20-c28b938133aa'; -- EDIFICIO SANTO TORIBIO <-> EDIFICIO SANTO TORIBIO
UPDATE public.properties SET alexperto_property_id = 'b230mzs6jr5mzvnsfh999cob' WHERE id = 'a002ec80-c614-4350-8d41-64efa3d0a5a4'; -- EDIFICIO PARDO Y ALIAGA <-> EDIFICIO PARDO Y ALIAGA
UPDATE public.properties SET alexperto_property_id = 'gvn6ya6vbtyvpbw9g7q966iy' WHERE id = '93b5c0c6-5abb-4d43-b00b-855a9d2e17d2'; -- PATIO ABTAO <-> PATIO ABTAO
UPDATE public.properties SET alexperto_property_id = 'twoi4699tjk4p77np6i6q7zo' WHERE id = '201c22b8-1a61-4eef-8470-291008c40ef8'; -- EDIFICIO ALIAGA 360 <-> EDIFICIO ALIAGA 360
UPDATE public.properties SET alexperto_property_id = 'qhxem9xnw0l5hj776bgwj3yt' WHERE id = '49e11af8-407b-4346-b122-ee72b59670df'; -- FIBRA PASEO DEL BOSQUE <-> FIBRA PASEO DEL BOSQUE
UPDATE public.properties SET alexperto_property_id = 'qzw7f3a45d4a5rm5yuphyi84' WHERE id = '4a933c1f-0f9d-4304-a39f-e233cd13f357'; -- PRIME TOWER <-> PRIME TOWER
UPDATE public.properties SET alexperto_property_id = 'pjh1lk2qeia02scl6gby0etq' WHERE id = '5a83e82a-eb83-4ee9-813f-72b221a809b3'; -- PATIO CENTRIC <-> PATIO CENTRIC
UPDATE public.properties SET alexperto_property_id = 'ijs8w1sv9hdtffxv599v8ivv' WHERE id = '4810e704-8817-4913-97f1-2d6bd4d1de23'; -- CENTRO EJECUTIVO CHACARILLA <-> CENTRO EJECUTIVO CHACARILLA
UPDATE public.properties SET alexperto_property_id = 'wqu5c3sxk6y6d9i1518vyau6' WHERE id = '6b9a771f-1280-4f05-9d1f-91edf33fddd5'; -- CENTRO EMPRESARIAL LEURO <-> CENTRO EMPRESARIAL LEURO
UPDATE public.properties SET alexperto_property_id = 'cxvg4mvsvsl8p0w4mronydma' WHERE id = '2bb7a671-d35d-4b4b-950e-8425876b9f10'; -- EDIFICIO BASADRE 233 <-> EDIFICIO BASADRE 233
UPDATE public.properties SET alexperto_property_id = 'ynpuc04jkksd89cjvja4pca9' WHERE id = '96ce32c0-ce7a-4530-a7fd-d702a4edc46c'; -- EDIFICIO BASADRE 607 <-> EDIFICIO BASADRE 607
UPDATE public.properties SET alexperto_property_id = 'sk8aeykbyxhn9pr1f5wdi6hn' WHERE id = '43461665-acd7-453f-8688-eb5deb58cfaa'; -- EDIFICIO FUNDACION <-> EDIFICIO FUNDACION
UPDATE public.properties SET alexperto_property_id = 'vj32xwlh9y0it0n22vpgompf' WHERE id = 'c2025c45-21f2-450d-868b-faba22e89741'; -- EDIFICIO GERENS <-> EDIFICIO GERENS
UPDATE public.properties SET alexperto_property_id = 'vlf340zbdycwneqp8guq4x19' WHERE id = '87db2753-3b71-40c7-b96e-1a80ed34fe23'; -- EDIFICIO LARCO <-> EDIFICIO LARCO
UPDATE public.properties SET alexperto_property_id = 'aiv8gg2erz2w74ecaizncmt7' WHERE id = '679781a7-816b-43c4-be24-abc463cf110f'; -- EDIFICIO 991 <-> EDIFICIO 991
UPDATE public.properties SET alexperto_property_id = 's4t1rjs97y3ciu2rf5ezrlnr' WHERE id = 'cc7cabd0-48a5-4836-8894-715ced201e5f'; -- EDIFICIO AENZA <-> EDIFICIO AENZA
UPDATE public.properties SET alexperto_property_id = 'zbtt33gd34valbikqllw5nwq' WHERE id = '633681a6-419d-45d5-8d1b-7e4b9207e5cd'; -- EDIFICIO LA HABANA <-> EDIFICIO LA HABANA
UPDATE public.properties SET alexperto_property_id = 'kxasjx2c8oeq4eat1eo6x5p9' WHERE id = '74679d8c-ad12-4770-975c-775395df4849'; -- LAS TORRES SAN ISIDRO <-> LAS TORRES SAN ISIDRO
UPDATE public.properties SET alexperto_property_id = 'jaa9l7j8nbw5se2tkinly7nl' WHERE id = '6eedcc7d-4ada-4852-9292-3e211b5e845c'; -- SANTANDER CONSUMER BANK <-> SANTANDER CONSUMER BANK
UPDATE public.properties SET alexperto_property_id = 'lv4urj4tqv19be56sglawod8' WHERE id = '27e4edf6-6b3d-47cc-a98d-f288781d9fb0'; -- EDIFICIO LIBERTADORES <-> EDIFICIO LIBERTADORES
UPDATE public.properties SET alexperto_property_id = 's1xdkm8dp47d6w6buj0u9mtu' WHERE id = 'd90924b6-faf9-4b15-b30d-d86fb842533b'; -- EDIFICIO METROPOLIS <-> EDIFICIO METROPOLIS
UPDATE public.properties SET alexperto_property_id = 'dxy8l5mpk83k5q3nlpi4kd1t' WHERE id = '8aacfcd9-8cb0-41f3-8aef-deed6c40b1fa'; -- EDIFICIO VITRA <-> EDIFICIO VITRA
UPDATE public.properties SET alexperto_property_id = 'f1cvzqwmpp5a7nmxo72j6pj1' WHERE id = '92d87aba-2d5a-4a56-9cf9-257a9faddfee'; -- EDIFICIO T-TOWER <-> EDIFICIO T-TOWER
UPDATE public.properties SET alexperto_property_id = 'zg4kesbadk26uh37yl3k3nqx' WHERE id = '87a228a2-b3b5-4dc8-982d-ec316096fa1b'; -- FIBRA - CAMINO REAL <-> FIBRA - CAMINO REAL
UPDATE public.properties SET alexperto_property_id = 'yykrr80x2f4wm84pbknztlzt' WHERE id = 'ec114322-068e-4875-b2f0-fef55d451f08'; -- EDIFICIO SANTA CRUZ <-> EDIFICIO SANTA CRUZ
UPDATE public.properties SET alexperto_property_id = 'd78y9yulnwzgxzgtcw49k3fy' WHERE id = '1fac9a25-1b5d-4637-a8f8-5ac7646ed9d3'; -- LINK TOWER <-> LINK TOWER
UPDATE public.properties SET alexperto_property_id = 'h5tvjlo5166oohgtjnsj0ltv' WHERE id = '5bffac4e-9d5c-4b88-9315-c5d5e44f4ca8'; -- EDIFICIO TORRE 28 <-> EDIFICIO TORRE 28
UPDATE public.properties SET alexperto_property_id = 'cgmnz4hnf6gavml0yb5gvdqk' WHERE id = '18dbafe2-25cd-41ad-bd40-e8c22f9eeab9'; -- EDIFICIO TRILLIUM TOWER <-> EDIFICIO TRILLIUM TOWER
UPDATE public.properties SET alexperto_property_id = 'nfesa3t3m4rrwr0rwsdul6xv' WHERE id = '97656472-dec7-4203-87ed-6cdf6d19a7a6'; -- TORRE WIESE <-> TORRE WIESE
UPDATE public.properties SET alexperto_property_id = 'ykizuz63t3ww7lcafq0z5f29' WHERE id = '08db06af-3b12-4933-985c-2e5d1a0c08fb'; -- MACROS EDIFICIO EMPRESARIAL <-> MACROS EDIFICIO EMPRESARIAL
UPDATE public.properties SET alexperto_property_id = 'zxr3hpwy0dsgpxqiqak1uy54' WHERE id = '786f227a-fe64-416c-b8ea-c000e025c053'; -- PATIO CAMELIAS <-> PATIO CAMELIAS
UPDATE public.properties SET alexperto_property_id = 'yhivu047gj6xcaymdxjrvtnv' WHERE id = '712eac0f-9493-4495-92c2-c06b85f5c280'; -- TORRE BARLOVENTO <-> TORRE BARLOVENTO
UPDATE public.properties SET alexperto_property_id = 'abdxib1443yd8f1ofn4s42hj' WHERE id = '2a2e9069-cc1d-4597-97e9-ed82c6d5ebd3'; -- TORRE PANAMÁ <-> TORRE PANAMÁ
UPDATE public.properties SET alexperto_property_id = 'mn65i6uu2yo933jf84id0xup' WHERE id = 'c10391b5-0462-4b68-a6a8-2506e4d28d14'; -- TORRE SANTA LUISA <-> TORRE SANTA LUISA

-- 3. TABLAS DE GESTIÓN Y AUDITORÍA DE GEMA PARA COTIZACIONES Y SOLICITUDES

-- 3.1. TABLA: alexperto_audit_actions (Estado de trabajo propio de GEMA por cotización/solicitud)
CREATE TABLE IF NOT EXISTS public.alexperto_audit_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_entity_type TEXT NOT NULL, -- 'QUOTE', 'REQUEST', 'DOCUMENT'
  external_entity_id TEXT NOT NULL,
  gema_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  current_status TEXT NOT NULL DEFAULT 'PENDIENTE_REVISION' CHECK (current_status IN ('PENDIENTE_REVISION', 'OBSERVADO', 'CULMINADO', 'VALIDADO')),
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_alexperto_audit_action_entity UNIQUE (external_entity_type, external_entity_id)
);

-- 3.2. TABLA: alexperto_audit_action_history (Historial trazable de cambios por el auditor)
CREATE TABLE IF NOT EXISTS public.alexperto_audit_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.alexperto_audit_actions(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.3. TABLA: alexperto_speeches (Plantillas de discursos/observaciones)
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

-- 3.4. TABLA: alexperto_alerts (Alertas operativas de trabajos/cotizaciones)
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

-- 3.5. TABLA: alexperto_document_analyses (Análisis e IA de informes)
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

-- 3.6. TABLA: alexperto_specialties (Catálogo de especialidades)
CREATE TABLE IF NOT EXISTS public.alexperto_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  external_specialty_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
