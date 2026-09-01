# Plan de Implementación: Dashboard de Avance REMS

## 1. Objetivo

Integrar el dashboard de avance de `examples/dashboard-avance-rems (1).html` al
panel web Next.js existente, usando Supabase como fuente de verdad y cargando como
referencia inicial los proyectos válidos de `examples/Tracker_Proyectos.xlsx`.

La administración se realizará desde el panel de `SUPERADMIN`. Cada gerente tendrá
un enlace público individual, sin inicio de sesión, y verá únicamente las filas
asignadas a ese enlace. El reenvío del enlace concede el mismo acceso y es una
limitación aceptada para esta primera versión.

## 2. Decisiones aprobadas

- El Excel no será parte del funcionamiento diario; solo servirá para la carga inicial.
- Las filas se administrarán directamente dentro del sistema.
- `SUPERADMIN` podrá crear, editar, asignar, archivar y reactivar filas.
- No se crearán cuentas Auth ni contraseñas para los gerentes en esta fase.
- No se agregará `GERENTE` al enum de roles todavía.
- Cada gerente tendrá un enlace público aleatorio, individual y revocable.
- La ruta pública será `/avance/[token]` y no requerirá sesión.
- El panel administrativo será `/admin/avance-proyectos`.
- El avance será automático: cada una de las diez etapas vale 10%.
- El porcentaje no será editable directamente.
- Al completar diez etapas, el estado será `COMPLETADO`.
- Se conservarán los cinco estados del HTML: Planificación, En curso, Pausado,
  Retrasado y Completado.
- Supabase será la fuente principal y compartida; el Excel no se actualizará.

## 3. Alcance funcional

### Panel SUPERADMIN

- Listado con búsqueda por número, proyecto, tipo, encargado y gerente.
- Filtros por estado, gerente y activo/archivado.
- Alta y edición de proyectos.
- Asignación y reasignación de gerente.
- Edición de etapas y observaciones.
- Cambio de estado.
- Archivado y reactivación lógica.
- Eliminación permanente de proyectos con confirmación explícita.
- Detalle con avance, etapas e historial.
- Creación, activación, desactivación y regeneración de enlaces.
- Eliminación permanente de gerentes con confirmación explícita; sus proyectos
  quedan sin asignación.
- Copia del enlace público al portapapeles.

### Vista pública

- Acceso únicamente mediante `/avance/[token]`.
- Nombre del gerente asociado.
- Solo proyectos activos asignados a ese enlace.
- Proyecto, tipo, avance, estado, etapas, observaciones y fecha de actualización.
- Estados de carga, enlace inválido/desactivado, error y lista vacía.
- Diseño responsive para móvil, tableta y escritorio.
- Sin edición ni exposición de UUID, token, usuarios internos o auditoría técnica.

## 4. Modelo de datos

### `progress_viewers`

Representa el destinatario de un enlace.

- `id uuid primary key`.
- `display_name text not null`.
- `public_token text unique not null`.
- `is_active boolean not null default true`.
- `created_at timestamptz`.
- `updated_at timestamptz`.

No tendrá relación con Auth. El token se generará en servidor con una fuente
criptográficamente segura y nunca se aceptará desde el navegador al crear o rotar.

### `progress_projects`

Representa una fila operativa del Excel.

- `id uuid primary key`.
- `sequence_number integer not null`.
- `name text not null`.
- `project_type text not null`.
- `property_id uuid null references properties(id)`.
- `assigned_viewer_id uuid null references progress_viewers(id)`.
- `manager_name text null`.
- `observations text null`.
- `current_progress smallint not null default 0`.
- `current_status text not null default 'PLANIFICACION'`.
- `is_active boolean not null default true`.
- `created_by uuid null references users(id)`.
- `updated_by uuid null references users(id)`.
- `created_at timestamptz`.
- `updated_at timestamptz`.

### `progress_project_stages`

Contiene las diez etapas de cada proyecto.

- `id uuid primary key`.
- `project_id uuid not null references progress_projects(id)`.
- `stage_key text not null`.
- `stage_label text not null`.
- `stage_group text not null`.
- `position smallint not null`.
- `is_completed boolean not null default false`.
- `updated_by uuid null references users(id)`.
- `updated_at timestamptz`.
- Unique `(project_id, stage_key)`.

Etapas: proyecto identificado, bases/alcances elaborado, invitación enviada, visita
técnica realizada, propuestas recibidas, evaluación técnica, evaluación económica,

### `progress_project_history`

Auditoría inmutable de cambios.

- `id uuid primary key`.
- `project_id uuid not null references progress_projects(id)`.
- `event_type text not null`.
- `previous_value jsonb`.
- `new_value jsonb`.
- `comment text`.
- `created_by uuid null references users(id)`.
- `created_at timestamptz`.

No se expondrá el historial técnico completo a la vista pública.

## 5. Reglas de negocio

- Cada proyecto se crea con las diez etapas en estado pendiente.
- `current_progress = completed_stages / 10 * 100`.
- La base de datos recalcula el porcentaje después de cada cambio de etapa.
- El frontend mostrará el porcentaje y no lo enviará como dato editable.
- El estado inicial es `PLANIFICACION`.
- Al llegar a 100%, el estado se vuelve `COMPLETADO` automáticamente.
- Al desmarcar una etapa, el porcentaje baja y el estado no se fuerza a un valor
  concreto salvo el recálculo de `COMPLETADO` cuando ya no corresponde.
- El archivado seguirá disponible para conservar proyectos temporalmente fuera de
  operación.
- `SUPERADMIN` podrá eliminar proyectos físicamente después de una confirmación;
  sus etapas e historial se eliminarán en cascada.
- `SUPERADMIN` podrá eliminar gerentes físicamente después de una confirmación;
  sus proyectos permanecerán y quedarán sin gerente asignado por `on delete set null`.
- El historial será inmutable.
- Un proyecto sin gerente será visible solamente en administración.
- Un gerente sin proyectos verá un estado vacío.

## 6. Acceso y seguridad

Las tablas nuevas tendrán RLS habilitada. Las políticas de escritura y lectura
interna serán exclusivas de `SUPERADMIN` autenticado. No se otorgará `SELECT` amplio
a `anon`.

La API `GET /api/public/progress/[token]` se ejecutará en servidor con el cliente
`service_role`, validará el token y devolverá una proyección explícita. Nunca se
enviará la clave de servicio al cliente ni se expondrán las tablas directamente.

El enlace podrá revocarse desactivando el gerente o regenerando el token. Un token
inválido, desactivado o alterado devolverá una respuesta controlada sin detalles
internos. No se implementará login, expiración ni rate limiting en esta fase, porque
el requisito actual es acceso libre con el enlace.

## 7. Migración Supabase

Archivo previsto: `supabase/migrations/20260901120000_progress_dashboard.sql`.

La migración deberá:

1. Crear las cuatro tablas y sus claves foráneas.
2. Crear constraints para estados, grupos, posiciones y progreso 0-100.
3. Crear índices por token, gerente/activo, proyecto/posición e historial/fecha.
4. Crear función y trigger de `updated_at`.
5. Crear función transaccional para recalcular etapas y avance.
6. Crear triggers de auditoría y completar automáticamente al 100%.
7. Activar RLS en las cuatro tablas.
8. Crear políticas para `SUPERADMIN` autenticado.
9. Conceder a `service_role` el acceso necesario para la API pública.
10. No crear políticas de lectura anónima sobre las tablas.

## 8. Implementación web

### Tipos, schemas y servicios

- `web/types/progress.ts`.
- `web/schemas/progress.schema.ts`.
- `web/services/admin/progress.service.ts`.
- `web/services/progress-public.service.ts`.
- Hooks bajo `web/hooks/admin/` siguiendo el patrón existente.

### APIs

Administrativas y protegidas con `requireSuperAdminSession()`:

- `GET/POST /api/admin/progress/projects`.
- `GET/PATCH /api/admin/progress/projects/[projectId]`.
- `PATCH /api/admin/progress/projects/[projectId]/stages`.
- `GET/POST /api/admin/progress/viewers`.
- `PATCH /api/admin/progress/viewers/[viewerId]`.

Pública y sin sesión:

- `GET /api/public/progress/[token]`.

Las entradas se validarán con Zod. Los errores de Supabase no se devolverán de forma
cruda al navegador.

### Rutas y componentes

- `web/app/admin/avance-proyectos/page.tsx`.
- `web/app/avance/[token]/page.tsx`.
- `web/components/admin/progress-project-table.tsx`.
- `web/components/admin/progress-project-form.tsx`.
- `web/components/admin/progress-project-detail.tsx`.
- `web/components/admin/progress-viewer-manager.tsx`.
- `web/components/progress/public-progress-dashboard.tsx`.

La ruta pública estará fuera de `/admin`, por lo que no heredará el guard de sesión ni
el sidebar. Se agregará `Avance de proyectos` al sidebar y se limitará explícitamente
a `SUPERADMIN`.

## 9. Importación inicial

Se preparará un script controlado de una sola ejecución para
`examples/Tracker_Proyectos.xlsx`.

- Leer únicamente `PROGRESO`.
- Validar encabezados y normalizar `SI`/`NO`.
- Crear los cuatro viewers: Julio Agapito, Zaida Mori, Alexander Salazar e Isabel
  Reategui.
- Asociar filas por usuario responsable cuando exista coincidencia.
- Conservar `encargado` como texto operativo.
- Recalcular el avance desde las etapas y no desde la fórmula de Excel.
- Omitir filas vacías, de plantilla y el proyecto `.`.
- No importar contraseñas de `UC`.
- Generar reporte de importadas, omitidas, sin gerente y con errores.

El archivo revisado tiene 29 proyectos con nombre, una fila `.` y plantillas aunque el
documento original menciona 31. No se inventarán registros para completar esa cifra.

## 10. Verificación

### Base de datos

- Crear proyecto con diez etapas.
- Confirmar avances 0%, 10%, 50% y 100%.
- Confirmar transición automática a `COMPLETADO`.
- Confirmar recálculo al revertir una etapa.
- Confirmar historial de cada cambio.
- Confirmar archivado lógico.
- Confirmar eliminación permanente de proyecto y cascada de etapas/historial.
- Confirmar eliminación de gerente y desasignación de sus proyectos.
- Confirmar bloqueo para roles no autorizados y `anon` directo.

### Enlaces

- Token válido devuelve solo sus filas.
- Enlace A no devuelve filas del gerente B.
- Token alterado o desactivado no devuelve datos.
- Regeneración invalida el token anterior.
- La página carga sin sesión.

### Aplicación

- Crear, editar, asignar, archivar y reactivar desde `SUPERADMIN`.
- Copiar y abrir enlaces.
- Validar estados de carga, error y vacío.
- Revisar responsive y accesibilidad básica.
- Ejecutar `npm --prefix web run lint`.
- Ejecutar `npm --prefix web run build`.

## 11. Orden de ejecución

1. Crear migración y validarla.
2. Crear tipos, schemas, servicios y APIs.
3. Crear panel administrativo y navegación.
4. Crear vista pública por token.
5. Crear script de importación y ejecutar preview.
6. Importar datos confirmados.
7. Probar permisos, cálculo y revocación.
8. Ejecutar lint y build.

## 12. Criterios de aceptación

La funcionalidad se considerará completa cuando un `SUPERADMIN` pueda crear un
proyecto, asignarlo a un gerente, marcar sus diez etapas y copiar el enlace de ese
gerente; al abrirlo sin autenticación, el gerente deberá ver únicamente sus filas con
el porcentaje calculado y estado actualizado.
