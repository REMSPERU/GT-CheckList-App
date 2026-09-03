# Inventario de servicios, cuentas y bases de datos

Documento de referencia del proyecto `GT-CheckList-App`.

> Este documento no contiene valores de claves, contrasenas ni tokens. Solo enumera
> los servicios y las variables necesarias para configurarlos.

## 1. Resumen de infraestructura

| Servicio | Uso | Aplicacion |
| --- | --- | --- |
| Supabase GEMA | Auth, PostgreSQL principal y Storage | App y web |
| SQLite `offline_maintenance.db` | Espejo local y operaciones offline | App |
| Backend REST en Vercel | API HTTP configurada para la app | App, posiblemente legacy |
| PostgreSQL Alexperto | Cotizaciones, solicitudes y documentos | Web |
| AWS S3 | Archivos/documentos Alexperto | Web |
| OpenRouter | Resumen tecnico mediante IA | Web |
| Sentry | Errores y crashes | App |
| SMTP de Supabase | Correos de confirmacion y recuperacion | App y web |

## 2. Aplicacion movil

Ruta principal: `services/`.

### Servicios Supabase

| Archivo | Funcion | Tablas, buckets o recursos |
| --- | --- | --- |
| `supabase-auth.service.ts` | Login, registro, logout, sesiones y recuperacion de contrasena | Supabase Auth |
| `supabase-user.service.ts` | Consulta y actualizacion de usuarios | `users` |
| `supabase-user-property.service.ts` | Asignacion de usuarios a inmuebles | `users`, `user_properties` |
| `supabase-property.service.ts` | CRUD de inmuebles | `properties` |
| `supabase-company.service.ts` | Empresas y proveedores | Datos de empresas |
| `supabase-equipamento.service.ts` | Tipos de equipamiento | `equipamentos` |
| `supabase-electrical-panel.service.ts` | Consulta de tableros electricos | `equipos` |
| `supabase-maintenance.service.ts` | Respuestas y mantenimientos | `maintenance_response`, `mantenimientos`, bucket `maintenance` |
| `supabase-grounding-well.service.ts` | Checklists de pozos a tierra | `maintenance_response` |
| `supabase-equipment-history.service.ts` | Historial de equipos | `equipos_historial` |
| `supabase-session-notes.service.ts` | Notas de sesiones | `session_notes` |
| `supabase-checklist-schedule.service.ts` | Programacion y validacion de checklists | `checklist_schedules` |
| `supabase-audit-storage.service.ts` | Fotos y URLs de auditoria | Storage, bucket `maintenance` |

### SQLite y funcionamiento offline

| Archivo | Funcion |
| --- | --- |
| `services/db/connection.ts` | Conexion, inicializacion, migraciones y locks de SQLite |
| `services/db/queries.ts` | Consultas locales de inmuebles, equipos, sistemas y mantenimientos |
| `services/db/maintenance.ts` | Mantenimientos pendientes offline |
| `services/db/equipment-offline.ts` | Equipos creados o modificados sin conexion |
| `services/db/grounding-well.ts` | Checklists y fotos de pozos a tierra offline |
| `services/db/checklist.ts` | Respuestas y fotos de checklists offline |
| `services/db/audit.ts` | Auditorias offline |
| `services/db/photos.ts` | Fotos pendientes de sincronizacion |
| `services/db/session.ts` | Sesion local del usuario |
| `services/db/session-photos.ts` | Fotos de sesiones offline |
| `services/db/panel-configuration.ts` | Configuracion offline de tableros |
| `services/db/users.ts` | Usuarios almacenados localmente |
| `services/db/equipment.ts` | CRUD local y generacion de codigos de equipos |
| `services/db/brands.ts` | Marcas locales |
| `services/db/sync.ts` | Tablas espejo y sincronizacion local |
| `services/db/index.ts` | Fachada `DatabaseService` y exportaciones |
| `services/database.ts` | Reexport legacy hacia `services/db` |

### Sincronizacion

| Archivo | Funcion |
| --- | --- |
| `sync.ts` | Sincroniza Supabase con SQLite y sube operaciones offline |
| `sync-queue.ts` | Cola de reintentos con backoff para operaciones pendientes |

Tablas principales que sincroniza la app:

`equipos`, `properties`, `instrumentos`, `sistemas`, `equipamentos`,
`preguntas_equipamento`, `audit_questions`, `equipamentos_property`,
`mantenimientos`, `sesion_mantenimiento`, `user_sesion_mantenimiento`,
`sesion_mantenimiento_fotos`, `audit_sessions`, `marca`, `equipamento_marca`,
`checklist_workday_config`, `checklist_workday_exceptions` y
`checklist_schedules`.

### Cliente REST y reportes

| Archivo | Funcion | Estado observado |
| --- | --- | --- |
| `api.service.ts` | Cliente Axios general | Definido |
| `property.api.ts` | Endpoints REST de inmuebles | No se encontraron referencias desde `app/` |
| `equipamento.api.ts` | API de tipos de equipamiento | Delega en Supabase |
| `electrical_panel.api.ts` | API de tableros electricos | Delega en Supabase |
| `checklist-storage.service.ts` | Carga y elimina fotos de checklists | Supabase Storage |
| `pdf-report.service.ts` | Creacion, guardado y comparticion de PDFs | Local, Expo Print/Sharing |
| `audit-report.service.ts` | Reportes de auditoria | Local |

Los generadores en `services/pdf-report/` producen reportes de tableros
electricos, PAT/pozos a tierra, luces de emergencia, protocolos y certificados.

## 3. Aplicacion web

Ruta: `web/`.

### Autenticacion

| Archivo | Funcion | Recurso |
| --- | --- | --- |
| `web/services/auth/auth.service.ts` | Login, registro, logout, recuperacion y requests autenticados | Supabase Auth |
| `web/services/auth/server-auth.service.ts` | Sesiones server-side y validacion de roles | Supabase publishable y `service_role` |

Roles comprobados por el servidor: `SUPERADMIN` y `AUDITOR`.

### Administracion

| Archivo | Funcion | Tablas principales |
| --- | --- | --- |
| `admin/users.service.ts` | Usuarios, roles, contrasenas y asignaciones | `users`, `user_properties` |
| `admin/properties.service.ts` | Inmuebles e imagenes | `properties`, `equipos` |
| `admin/equipments.service.ts` | Equipos, filtros, CRUD y exportacion | `equipos`, `equipamentos`, `properties` |
| `admin/equipment-types.service.ts` | Tipos de equipos e imagenes | `equipamentos` |
| `admin/maintenances.service.ts` | Mantenimientos y sesiones | `mantenimientos`, `sesion_mantenimiento`, `equipos` |
| `admin/checklist.service.ts` | Preguntas, respuestas, horarios y programacion | `preguntas_equipamento`, `checklist_response`, `checklist_schedules`, `checklist_workday_config`, `checklist_workday_exceptions`, `equipos`, `users` |
| `admin/audits.service.ts` | Auditorias, respuestas y feedback | `audit_sessions`, `audit_questions`, `properties`, `users` |
| `admin/metrics.service.ts` | Metricas del panel | `mantenimientos`, `sesion_mantenimiento`, `properties`, `equipos` |
| `admin/progress.service.ts` | Proyectos, visualizadores y etapas | `progress_projects`, `progress_viewers`, `progress_project_stages` |
| `admin/admin-query-helpers.ts` | Consultas auxiliares y normalizacion de datos | `sistemas`, `properties` |
| `admin/audit-report-generator.ts` | Generacion HTML de reportes | Local |

### Alexperto

| Archivo | Funcion | Fuente |
| --- | --- | --- |
| `alexperto-db.server.ts` | Pool de conexiones PostgreSQL | PostgreSQL externo Alexperto |
| `alexperto-quotes.service.ts` | Cotizaciones, notas, auditores y acciones | Alexperto + Supabase |
| `alexperto-requests.service.ts` | Solicitudes y cotizaciones relacionadas | Alexperto + Supabase |
| `alexperto-access.service.ts` | Inmuebles autorizados por usuario | Supabase, `properties` |
| `alexperto-quote-access.service.ts` | Acceso y visibilidad de cotizaciones | Supabase, `alexperto_audit_actions` |
| `alexperto-request-access.service.ts` | Autorizacion de solicitudes | Alexperto + Supabase |
| `alexperto-documents.service.ts` | Consulta de documentos y URLs prefirmadas | PostgreSQL Alexperto + AWS S3 |
| `pdf-text-extractor.service.ts` | Extraccion y formateo de texto PDF | Local, `pdfjs-dist` |
| `technical-report-ai.service.ts` | Resumen tecnico de documentos | OpenRouter + Supabase |

Tablas Alexperto observadas bajo el esquema `sch_main`:

`quotes`, `proposals`, `requests`, `quote_documents`, `proposal_documents`,
`request_documents` y `quote_notes`.

Tablas Supabase adicionales de Alexperto:

`alexperto_audit_actions`, `alexperto_audit_action_history`,
`alexperto_document_ai_summaries` y `alexperto_document_ai_summary_attempts`.

### Progreso publico

| Archivo | Funcion | Tablas |
| --- | --- | --- |
| `progress-public.service.ts` | Consulta de avance mediante token publico | `progress_viewers`, `progress_projects` |

## 4. Cuentas y variables necesarias

### App movil

| Variable | Uso |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | URL base del backend REST |
| `EXPO_PUBLIC_SUPABASE_URL` | Proyecto Supabase GEMA |
| `EXPO_PUBLIC_SUPABASE_KEY` | Clave publica de Supabase |
| `EXPO_PUBLIC_WEB_AUTH_URL` | URL web para flujos de autenticacion |
| `EXPO_PUBLIC_SENTRY_DSN` | Monitoreo Sentry en runtime |
| `SENTRY_DSN` | DSN alternativo para integraciones de build |
| `SENTRY_AUTH_TOKEN` | Source maps/releases de Sentry en CI |

### Web

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Proyecto Supabase GEMA |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente web con RLS |
| `NEXT_PUBLIC_SITE_URL` | URL publica y redirects de autenticacion |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones server-side privilegiadas |
| `DATABASE_HOST` | Host PostgreSQL Alexperto |
| `DATABASE_PORT` | Puerto PostgreSQL Alexperto |
| `DATABASE_NAME` | Base PostgreSQL Alexperto |
| `DATABASE_USER` | Usuario PostgreSQL Alexperto |
| `DATABASE_PASSWORD` | Contrasena PostgreSQL Alexperto |
| `AWS_REGION` | Region S3 |
| `AWS_S3_BUCKET` | Bucket de documentos |
| `AWS_S3_PREFIX` | Prefijo de documentos |
| `AWS_ACCESS_KEY_ID` | Credencial AWS, si no se usa IAM role |
| `AWS_SECRET_ACCESS_KEY` | Credencial AWS, si no se usa IAM role |
| `OPENROUTER_API_KEY` | Acceso al proveedor IA |
| `OPENROUTER_MODEL` | Modelo principal |
| `OPENROUTER_FALLBACK_MODEL` | Modelo alternativo |
| `OPENROUTER_FALLBACK_MODELS` | Lista de modelos alternativos |
| `OPENROUTER_MAX_PDF_BYTES` | Limite de tamano de PDF |
| `OPENROUTER_MAX_PDF_PAGES` | Limite de paginas |
| `OPENROUTER_MAX_INPUT_CHARS` | Limite de entrada |
| `OPENROUTER_MAX_OUTPUT_TOKENS` | Limite de salida |
| `OPENROUTER_TEMPERATURE` | Temperatura del modelo |
| `OPENROUTER_REQUEST_TIMEOUT_MS` | Timeout de solicitudes IA |

## 5. Cuentas que puedes retirar solo despues de verificar

- **Backend REST de Vercel**: parece parcialmente legacy porque los wrappers REST
  no aparecen usados por las pantallas actuales. Verificar logs antes de apagarlo.
- **OpenRouter**: puede retirarse si se elimina el resumen tecnico IA.
- **Sentry**: puede retirarse si no se requiere monitoreo de errores.
- **AWS S3 Alexperto**: no retirarlo si se consultan documentos o PDFs de Alexperto.
- **PostgreSQL Alexperto**: no retirarlo si se usan cotizaciones o solicitudes.
- **Supabase GEMA**: no retirarlo; es dependencia central de la app y la web.
- **SMTP de Supabase**: necesario para confirmacion y recuperacion de contrasenas.

## 6. Seguridad

- Nunca publicar `.env`, `.env.local`, `SUPABASE_SERVICE_ROLE_KEY`, contrasenas,
  claves AWS ni `OPENROUTER_API_KEY`.
- Mantener `SUPABASE_SERVICE_ROLE_KEY` y las variables `DATABASE_*` solo en el
  servidor/web, nunca en Expo ni en variables `NEXT_PUBLIC_*`.
- Si alguna credencial fue incluida en Git o compartida, rotarla inmediatamente.
- Revisar tambien el archivo de firma Android `.jks` y sus credenciales asociadas.
