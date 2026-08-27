# Plan de Integración: Dashboard de Avance REMS

## 1. Objetivo

Convertir la funcionalidad del archivo `examples/dashboard-avance-rems (1).html`
en un módulo del panel web Next.js existente, accesible desde la navegación lateral,
con datos persistidos en Supabase y visibles según permisos. El HTML se toma como
referencia funcional y visual; no se trasladará su almacenamiento ni sus claves
embebidas a producción.

Este documento es un plan de implementación. No se crearán migraciones, tablas ni
pantallas definitivas hasta resolver las preguntas pendientes de la sección 14.

### Decisiones confirmadas por el solicitante

- El Excel no será parte del funcionamiento del módulo.
- Las filas se crearán y administrarán directamente dentro del sistema.
- Los usuarios supervisores serán quienes tengan el rol `SUPERADMIN`.
- Los gerentes tendrán el rol `GERENTE` y solo verán sus filas asignadas.
- Cada proyecto tendrá 10 etapas: 8 de Gestión Técnica y 2 de Administración.
- Las 31 filas del Excel se cargarán inicialmente al sistema.
- El porcentaje de avance se calculará automáticamente a partir de las etapas.
- Las 10 etapas tendrán el mismo peso: cada etapa representa 10%.
- La vista para `GERENTE` será autenticada; no será una vista pública anónima.
- Las cuatro personas de la hoja `UC` se crearán inicialmente con rol `GERENTE`.
- Las filas sin usuario asignado solo serán visibles para `SUPERADMIN`.

## 2. Hallazgos del HTML

### Funcionalidades identificadas

- Pestaña de **Panel de gestión**.
- Pestaña de **Vista de cliente**.
- Inicio de sesión de gestor mediante una lista de claves fija.
- Creación de proyecto con nombre y cliente.
- Generación de código de proyecto a partir del nombre más un sufijo aleatorio.
- Selección de proyecto.
- Actualización del porcentaje de avance entre 0 y 100.
- Actualización del estado:
  - `Planificación`
  - `En curso`
  - `Pausado`
  - `Retrasado`
  - `Completado`
- Registro de comentario para el cliente.
- Historial ordenado de actualizaciones, con fecha, porcentaje, estado y comentario.
- Consulta por código de proyecto.
- Barra visual de progreso y badge de estado.
- Mensajes de validación, éxito, error y estados vacíos.
- Fechas formateadas para `es-PE`.

### Datos que actualmente maneja el HTML

El objeto almacenado por proyecto tiene esta forma lógica:

```text
proyecto
  codigo
  nombre
  cliente
  avance_actual
  estado_actual
  historial[]
    fecha
    avance
    estado
    comentario
```

El HTML guarda todo el objeto en `window.storage` bajo `rems-proyectos`. No hay
base de datos relacional, auditoría, usuario responsable, control de concurrencia,
RLS, actualización en tiempo real ni protección real para la vista de cliente.

## 3. Encaje en la aplicación actual

La aplicación ya contiene el destino técnico solicitado:

- Panel Next.js en `web/`.
- Shell con sidebar en `web/components/admin-shell.tsx`.
- Rutas administrativas bajo `web/app/admin/`.
- Sesión Supabase mediante `web/hooks/auth/use-admin-session.tsx`.
- Servicios de dominio en `web/services/admin/`.
- Cliente Supabase en `web/lib/supabase-browser.ts`.
- Roles existentes: `SUPERVISOR`, `TECNICO`, `AUDITOR`, `SUPERADMIN` y
  `TECNICO_REMS`.
- Tablas existentes relacionadas: `company`, `properties`, `users`,
  `user_properties` y otras relaciones de inmuebles.

Por lo tanto, el módulo debe agregarse al panel web existente, no como una segunda
aplicación Next.js ni como una página HTML incrustada.

## 4. Decisiones que no deben asumirse

El HTML usa la palabra “proyecto” y un campo libre “cliente”, pero el sistema ya
tiene conceptos de empresa e inmueble. Antes de modelar se debe confirmar si:

- un proyecto es un inmueble existente;
- un proyecto agrupa uno o varios inmuebles;
- un proyecto es un contrato/servicio independiente del inmueble;
- el cliente corresponde a una fila existente de `company`;
- un proyecto puede tener varios clientes, responsables o empresas;
- el código debe ser público, secreto o ambos.

Estas respuestas cambian las claves foráneas, las políticas RLS y el flujo de
consulta externa.

## 5. Modelo de datos candidato

Este modelo es una propuesta para validar, no una migración aprobada.

### Opción recomendada si “proyecto” es un concepto independiente

#### `progress_projects`

- `id uuid` como clave primaria.
- `code text` como código único y estable para consulta.
- `name text` como nombre del proyecto.
- `company_id uuid` como cliente/empresa, si se confirma la reutilización de
  `company`.
- `current_progress smallint` con restricción de 0 a 100.
- `current_status text` con los cinco estados aprobados.
- `is_active boolean` para retiro lógico.
- `created_by uuid` y `updated_by uuid` referenciando `users`.
- `created_at` y `updated_at` con zona horaria.

#### `progress_project_updates`

- `id uuid` como clave primaria.
- `project_id uuid` referenciando `progress_projects`.
- `progress smallint` con restricción de 0 a 100.
- `status text` con los estados permitidos.
- `comment text` nullable.
- `created_by uuid` referenciando `users`.
- `created_at timestamptz` generado por la base de datos.

#### Relación opcional con inmuebles

Si un proyecto puede cubrir inmuebles existentes, agregar una relación explícita
como `progress_project_properties(project_id, property_id)` en vez de guardar
el nombre o código del inmueble como texto.

### Opción alternativa si “proyecto” equivale a inmueble

Reutilizar `properties` como entidad principal y agregar una tabla de historial
de avance asociada a `property_id`. En este caso no se debe crear `progress_projects`.
Esta opción evita duplicación, pero solo es válida si cada inmueble puede tener
un único avance activo y no existen varios contratos/proyectos simultáneos para
el mismo inmueble.

## 6. Reglas de negocio por confirmar

- El avance debe ser entero o se permitirán decimales.
- `Completado` debe exigir 100% o solo representar un estado independiente.
- 100% debe cambiar automáticamente el estado a `Completado` o no.
- Se podrá retroceder el avance o el estado.
- Las actualizaciones históricas serán inmutables o editables por supervisores.
- El historial mostrará todos los comentarios o habrá comentarios internos y
  comentarios visibles al cliente separados.
- Se permitirán proyectos archivados/eliminados y qué significa eliminar.
- El código se generará automáticamente o podrá ser ingresado por un gestor.
- El código será sensible a mayúsculas/minúsculas; se recomienda normalizarlo a
  mayúsculas y validarlo en base de datos.
- Se requiere fecha de inicio, fecha estimada de finalización, responsable,
  presupuesto, documentos, fotos o adjuntos. El HTML no los contiene, por lo que
  no se deben agregar sin confirmación.

## 7. Acceso y seguridad propuestos

### Panel de gestión

Reemplazar `MANAGER_KEYS` por la sesión Supabase actual. La administración del
módulo corresponderá a `SUPERADMIN`. El rol `GERENTE` tendrá únicamente lectura
filtrada por `assigned_user_id`. `SUPERVISOR`, `TECNICO`, `AUDITOR` y
`TECNICO_REMS` no recibirán acceso por defecto a este módulo.

### Vista de gerente

La vista que antes se identificaba como “Vista de cliente” será una vista
autenticada para usuarios con rol `GERENTE`. No se habilitará una consulta anónima
por código ni un `.select()` público directo sobre las tablas.

### RLS y auditoría

- Activar RLS en todas las tablas nuevas.
- Separar permisos de lectura pública, lectura interna y escritura.
- Permitir insertar historial solo a roles autorizados.
- Registrar el usuario que creó cada actualización.
- Impedir que un cliente modifique proyectos o historial.
- Definir si la lectura interna se limita por `company_id`, `property_id` o rol.

## 8. Diseño de la integración web

### Navegación

Agregar un grupo o ítem al `NAV_GROUPS` de `AdminShell`, con ruta propuesta:

```text
/admin/avance-proyectos
```

El label e ícono deben confirmarse con el nombre comercial del módulo. También se
debe agregar el título de sección y la regla de autorización de la ruta.

### Pantallas propuestas

- **Listado/gestión:** proyectos visibles, búsqueda por código/nombre/cliente,
  filtro por estado y acción para crear.
- **Detalle de proyecto:** avance actual, estado, cliente, código e historial.
- **Formulario de actualización:** porcentaje, estado y comentario visible.
- **Formulario de creación:** campos que se confirmen para el modelo final.
- **Vista de gerente:** consulta autenticada filtrada por las filas asignadas al
  usuario con rol `GERENTE`.
- Estados de carga, error, vacío, guardado, permisos insuficientes y proyecto
  inexistente.

### Arquitectura de código

- Tipos en `web/types/`.
- Servicio Supabase en `web/services/admin/` o un servicio de dominio equivalente.
- Hook de consulta/mutación en `web/hooks/` siguiendo el patrón existente.
- Componentes reutilizables en `web/components/admin/`.
- Validación con Zod para creación y actualización.
- Invalidación/refresco de datos después de crear o actualizar.
- Suscripción Realtime solo si se confirma que el avance debe actualizarse en
  otras sesiones sin recargar.

## 9. Datos a extraer y migrar

### Del HTML de referencia

No se encontraron datos reales persistidos en el archivo. Solo existen:

- cuatro claves de ejemplo (`CLAVE1` a `CLAVE4`), que no deben migrarse;
- estados y textos de interfaz;
- la forma lógica de proyecto e historial;
- reglas de normalización de código y fecha.

### Del archivo `Tracker_Proyectos.xlsx` como referencia inicial

El archivo contiene tres hojas:

- `PROGRESO`: hoja operativa principal, con 31 filas de proyectos.
- `RESUMEN`: hoja resumida, con 23 filas no vacías y datos derivados del avance.
- `UC`: catálogo de cuatro usuarios y contraseñas de dos letras.

La hoja `PROGRESO` contiene estas columnas funcionales que servirán como referencia
para el formulario de filas del sistema. Las etapas confirmadas son:

- Número.
- Proyecto/inmueble.
- Tipo de proyecto.
- **Gestión Técnica:** proyecto identificado, bases/alcances elaborado, invitación
  enviada, visita técnica realizada, propuestas recibidas, evaluación técnica,
  evaluación económica y adjudicación.
- **Administración:** contrato firmado e implementación realizada.
- Avance.
- Observaciones/comentarios.
- Encargado.
- Usuario responsable.

La hoja `RESUMEN` contiene número, fecha de ingreso, proyecto, porcentaje,
estado, estado-notas, notas y encargado. Por su estructura, debe tratarse como
una vista o reporte derivado, no como una segunda fuente editable, para evitar
que el mismo proyecto termine con dos avances diferentes.

La hoja `UC` contiene estas identidades de referencia:

- Julio Agapito (`JA`).
- Zaida Mori (`ZM`).
- Alexander Salazar (`AS`).
- Isabel Reategui (`IR`).

Las contraseñas del Excel no se deben importar ni usar en la aplicación. Se deben
crear/invitar usuarios en Supabase Auth y asignarles acceso mediante sus cuentas.
En la hoja `PROGRESO` se encontraron asignaciones para Julio, Zaida y Alexander;
Isabel no aparece asignada en las filas revisadas. Esta diferencia requiere
confirmación antes de importar.

### Modelo recomendado para la asignación por fila

Cada fila operativa debe tener un responsable explícito mediante UUID, no mediante
el texto `USUARIO` del Excel:

```text
progress_projects
  id
  property_id o nombre del inmueble, según decisión de modelado
  project_type
  assigned_user_id
  calculated_progress
  status
  observations
  created_at
  updated_at

progress_project_stages
  id
  project_id
  stage_key
  completed
  updated_by
  updated_at
```

Las 10 etapas de `PROGRESO` se modelarán como registros de una tabla de etapas del
proyecto. Esto permite agregar o reordenar etapas sin modificar la estructura de
la tabla principal. El supervisor podrá agregar una fila y definir sus etapas,
pero no editará directamente el porcentaje.

Regla confirmada para el porcentaje automático:

```text
porcentaje = etapas_completadas / 10 * 100
```

El valor se calculará en la base de datos o en una función transaccional al crear
o actualizar una etapa. El frontend únicamente lo mostrará.

### De datos existentes en Supabase

Antes de construir una importación se debe ejecutar un inventario de:

- empresas en `company`;
- inmuebles en `properties`;
- relaciones empresa-inmueble en `company_property`;
- usuarios activos y sus roles;
- asignaciones en `user_properties`, si afectan visibilidad.

No se copiarán nombres de empresas o inmuebles a columnas de texto si puede usarse
una relación por UUID. Para importar el Excel se deberá construir primero una tabla
de correspondencia entre cada nombre de la columna `PROYECTOS` y el UUID de
`properties`, si esos valores representan inmuebles existentes.

## 10. Acceso confirmado: usuarios con rol `GERENTE`

### Diseño aprobado en principio

Usar cuentas individuales de Supabase Auth, con asignación de filas por
`assigned_user_id` y políticas RLS. Los usuarios con rol `GERENTE` verán únicamente
los proyectos asignados a su UUID. Los usuarios con `SUPERADMIN` podrán
crear filas, asignar responsables, modificar etapas y consultar todos los proyectos.

Ventajas:

- Se puede revocar una cuenta sin cambiar links distribuidos.
- Cada cambio queda asociado a una persona real.
- RLS protege la información aunque alguien manipule el frontend.
- Se puede cambiar el responsable sin migrar datos ni generar otro link.
- La contraseña no queda almacenada en un Excel ni en el código.
- Las cuatro personas pueden usar la misma interfaz con datos filtrados por sesión.

### Por qué no usar solamente un link por persona

Un link fijo por persona no identifica de forma fuerte al usuario y puede ser
reenviado. Si el link contiene un token, debe tratarse como una credencial y
requiere expiración, revocación, rotación, rate limiting y auditoría. Eso termina
siendo un sistema de autenticación paralelo y más difícil de proteger.

Un enlace temporal puede ser útil solo como invitación inicial o como acceso
externo de cliente, pero no como mecanismo principal para los cuatro usuarios
internos.

### Permisos confirmados

- `SUPERADMIN`: administra configuración y permisos globales.
- `GERENTE`: ve únicamente sus filas asignadas y no puede crear, editar, asignar ni
  eliminar proyectos.
- Usuarios no asignados: no ven la fila.

Las políticas RLS deben permitir que `SUPERADMIN` vea y gestione todas las filas,
sin eliminar el filtro por responsable para `GERENTE`.

## 11. Flujo del supervisor dentro del sistema

### Flujo recomendado

1. El usuario `SUPERADMIN` inicia sesión con su cuenta individual.
2. Crea una nueva fila desde el panel web.
3. Selecciona proyecto/inmueble, tipo, usuario responsable y etapas.
4. La fila se guarda en Supabase.
5. El usuario asignado la ve automáticamente en su listado.
6. El `SUPERADMIN` actualiza etapas y observaciones.
7. La base de datos recalcula automáticamente el porcentaje.
8. El estado y el resumen se derivan de la información guardada.
9. El historial conserva quién y cuándo hizo cada modificación.

### Fuente de verdad confirmada

La opción recomendada es:

```text
Supabase = fuente principal y compartida
Next.js = interfaz de lectura y edición
```

El archivo Excel no se actualizará ni será editado por el módulo. El contenido
existente puede usarse únicamente como referencia para una carga inicial manual o
un importador de una sola vez, si se confirma que esas 31 filas son oficiales.

## 12. Importación inicial propuesta

Si se decide cargar las filas existentes desde el Excel, la carga debe ejecutarse
una sola vez y en una etapa controlada:

1. Leer `PROGRESO` y validar encabezados.
2. Normalizar nombres, espacios, porcentajes, estados, fechas y valores `SI/NO`.
3. Resolver cada usuario contra Supabase Auth y `users`.
4. Resolver cada inmueble/proyecto contra `properties` o registrar los no
   encontrados para revisión manual.
5. Mostrar un preview de filas válidas, advertencias y errores.
6. Importar solo después de confirmación del supervisor/administrador.
7. Generar un reporte de filas importadas, omitidas y pendientes.
8. Generar el resumen desde Supabase después de la carga.

No se deben importar las contraseñas de `UC`. Tampoco se deben crear usuarios
automáticamente con esas contraseñas.

## 13. Fases de implementación posteriores a la confirmación

1. Confirmar las preguntas pendientes y el nombre del nuevo rol.
2. Confirmar si se reutiliza `properties/company` o se crea una entidad de proyecto.
3. Diseñar y revisar migración SQL, índices, constraints, cálculo automático,
    triggers de `updated_at` y políticas RLS.
4. Implementar tipos, esquemas Zod, servicios y hooks de Supabase.
5. Implementar ruta, navegación lateral, formularios, detalle e historial.
6. Implementar la vista filtrada del rol `GERENTE`.
7. Añadir Realtime, si se requiere actualización inmediata para las sesiones activas.
8. Preparar carga inicial solo con datos confirmados, si corresponde.
9. Verificar con `npm --prefix web run lint` y `npm --prefix web run build`.
10. Ejecutar una matriz manual de permisos, cálculo, concurrencia y estados
    sin datos.

## 14. Preguntas necesarias antes de implementar

Responder con el número de cada pregunta:

1. ¿“Proyecto” es un concepto nuevo, un inmueble existente (`properties`) o un
   contrato/servicio que puede incluir varios inmuebles?
2. ¿El campo “cliente” debe seleccionar una empresa existente de `company` o se
   necesita crear un catálogo nuevo de clientes?
3. ¿`SUPERADMIN` podrá eliminar o archivar filas, o solo desactivarlas?
4. ¿El historial debe ser inmutable? ¿Quién puede corregir o eliminar una entrada?
5. ¿Los cinco estados del HTML son definitivos? ¿Se requieren estados adicionales?
6. ¿El código se genera automáticamente y debe conservar el formato actual, o
   existe un formato corporativo ya definido?
7. ¿Se necesitan fechas de inicio/fin, responsable, presupuesto, documentos,
   fotos, hitos o tareas además de los datos presentes en el HTML?
8. ¿El módulo debe funcionar también offline en la app móvil o únicamente en el
   panel web online?
9. ¿El nombre visible en el sidebar debe ser “Avance de proyectos”, “Seguimiento
   de proyectos” u otro nombre comercial?
10. ¿Habrá otros usuarios con rol `GERENTE` además de las cuatro personas iniciales?
11. ¿Los gerentes necesitan ver el historial completo de sus filas?
12. ¿Las filas sin usuario asignado se mantendrán visibles solo para `SUPERADMIN`
    hasta que se les asigne un gerente?

## 15. Criterio de aceptación del plan

La implementación podrá comenzar cuando estén definidos: entidad principal,
relación con cliente/inmueble, roles de escritura y lectura, mecanismo de acceso
del cliente, reglas de estado/avance, alcance del historial, datos iniciales y
nombre/ruta del módulo. Hasta entonces, cualquier SQL o código sería una asunción
que puede producir duplicación de datos o una exposición incorrecta de información.
