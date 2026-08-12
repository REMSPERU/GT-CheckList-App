# Decision de integracion Alexperto-GEMA Web

## Decision recomendada

No se debe copiar constantemente toda la base de datos de Alexperto hacia GEMA.
La primera version debe usar un modelo **hibrido de lectura en tiempo real con
estado interno en GEMA**:

1. Alexperto conserva la fuente de verdad para inmuebles, cotizaciones,
   preventivos, estados y documentos.
2. GEMA Web consulta Alexperto desde el servidor de Next.js, nunca desde el
   navegador.
3. GEMA guarda solamente los datos propios: autorizacion, mapeos confirmados,
   reglas, acciones de auditoria, speeches, alertas, analisis y metricas.
4. La respuesta se arma en el servidor haciendo el match por IDs externos ya
   verificados, no por nombre o direccion en cada consulta.
5. Una cache o snapshot parcial sera una optimizacion futura y controlada, no
   una copia permanente de todas las tablas externas.

Este enfoque permite que el auditor vea el estado actual de Alexperto, conserva
el control de permisos en GEMA y evita duplicar datos que no se pueden editar.

## Alternativas evaluadas

| Alternativa | Ventajas | Riesgos | Decision |
| --- | --- | --- | --- |
| Consulta directa bajo demanda | Datos actuales, menor duplicacion, implementacion inicial mas simple | Depende de disponibilidad y rendimiento de Alexperto | Base del MVP. |
| Replica completa y constante | Reportes locales y menor dependencia durante la consulta | Sincronizacion compleja, datos desactualizados, costo, duplicidad y dificil conciliacion de borrados/cambios | No usar. |
| Cache o snapshot selectivo | Mejora listas, alertas y metricas sin replicar todo | Requiere fecha de corte, expiracion e invalidacion claras | Usar solo despues del MVP si las mediciones lo justifican. |
| API oficial de Alexperto | Contrato mas estable y controlable que leer tablas | Depende de que Alexperto la entregue | Preferirla cuando exista; mantiene el mismo diseno de GEMA. |

## Flujo seguro de consulta y match

```text
Navegador
  -> API Route de GEMA Web
      -> valida token, usuario activo y rol
      -> obtiene inmuebles GEMA autorizados del auditor
      -> resuelve sus mapeos CONFIRMED
      -> consulta Alexperto por los IDs externos autorizados y filtros
      -> une datos externos con estado interno GEMA
  -> respuesta limitada al usuario
```

El navegador no recibira credenciales, acceso SQL, tokens de documentos ni una
lista de inmuebles ajenos. Ocultar la seccion en la barra lateral mejora la UX,
pero la API Route y las rutas del servidor deben aplicar el control real.

## Autorizacion

La seccion `Alexperto` se mostrara unicamente a `AUDITOR` y `SUPERADMIN`.

| Rol | Acceso |
| --- | --- |
| `AUDITOR` | Solo inmuebles asignados en `user_properties` que tengan un mapeo Alexperto confirmado. Puede crear y actualizar sus acciones internas permitidas. |
| `SUPERADMIN` | Todos los inmuebles mapeados, configuracion, conciliacion, catalogos, speeches, historial global y correcciones. |
| Demas roles | Sin enlace en la barra y respuesta `403` en las rutas y APIs de Alexperto. |

Se debe implementar un guard de servidor especifico, por ejemplo
`requireAlexpertoAccessSession`. No se debe reutilizar un guard exclusivo de
superadmin ni confiar solo en el componente de navegacion.

## Verificacion de inmuebles

El nombre y la direccion sirven para proponer coincidencias, pero no son una
llave confiable. Cada relacion debe verificarse una sola vez por un
superadministrador y luego consultar por el ID estable de Alexperto.

Tabla propuesta: `alexperto_property_mappings`.

| Campo | Uso |
| --- | --- |
| `gema_property_id` | Inmueble interno de GEMA. |
| `alexperto_property_id` | ID unico del inmueble en Alexperto. |
| `status` | `PENDING`, `NEEDS_REVIEW`, `CONFIRMED` o `REJECTED`. |
| `match_method` | `MANUAL`, `EXACT_NAME` o `NAME_AND_ADDRESS`. |
| `confidence_score` | Puntaje de sugerencia, entre 0 y 100. No autoriza por si solo. |
| `confirmed_by`, `confirmed_at` | Evidencia de quien verifico el match y cuando. |
| `notes` | Excepciones y fundamento de la decision. |

Reglas:

1. El sistema normaliza nombres y direcciones para sugerir matches.
2. El superadmin confirma, corrige o rechaza cada sugerencia.
3. Solo un mapeo `CONFIRMED` permite mostrar registros de Alexperto a un auditor.
4. Debe existir una restriccion unica para impedir que un ID externo se asigne a
   mas de un inmueble GEMA, salvo una excepcion de negocio explicitamente
   aprobada.
5. Si Alexperto puede exponer o almacenar `properties.code` de GEMA, ese campo
   sera la integracion preferida para altas futuras.

## Verificacion del trabajo del auditor

Se deben separar tres conceptos que no se pueden confundir:

| Concepto | Fuente de verdad | Ejemplo |
| --- | --- | --- |
| Estado operativo | Alexperto | Cotizacion pendiente, trabajo ejecutado, documento cargado. |
| Gestion del auditor | GEMA | Pendiente de revision, observado, culminado. |
| Verificacion humana | GEMA | Auditor confirma que reviso el caso o que realizo la accion manual en Alexperto. |

La accion `CULMINADO` no actualiza Alexperto. Registra que el auditor realizo
la gestion manual y debe incluir usuario, fecha, comentario opcional e ID de la
entidad externa. Si el proceso exige segunda revision, agregar estado
`PENDIENTE_VALIDACION` y una accion de `VALIDADO` reservada para superadmin o
un auditor revisor. No debe marcarse un caso como verificado automaticamente
solo porque su estado externo cambio.

Para documentos, la verificacion debe exigir que el tipo externo sea
`INFORME_TECNICO`. Protocolos o certificados no satisfacen esta regla. El
analisis con IA sera una ayuda con evidencia por pagina y requerira confirmacion
humana antes de generar una conclusion o speech final.

## Datos que deben vivir en GEMA

| Tabla | Contenido |
| --- | --- |
| `alexperto_property_mappings` | Relacion verificada entre inmuebles. |
| `alexperto_audit_actions` | Acciones, comentarios, estado interno y trazabilidad por ID externo. |
| `alexperto_speeches` | Plantillas y versiones administrables. |
| `alexperto_alerts` | Alertas internas de preventivos ejecutados sin informe o sin revision. |
| `alexperto_document_analyses` | Analisis IA, hash del archivo, evidencia, modelo y validacion humana. |
| `alexperto_specialties` | Catalogo de las 10 especialidades y sus equivalencias externas. |

Cada tabla que guarde una referencia externa debe incluir tipo de entidad, ID
externo, inmueble GEMA, usuario creador y marcas de tiempo. Esto mantiene el
historial aunque Alexperto cambie de estado, elimine un resultado de una lista o
deje de cumplir un filtro.

### Como agregar estados a datos que vienen de Alexperto

No se modifica ni se copia la cotizacion externa para agregarle una columna. Se
crea un registro interno en GEMA que referencia su ID externo. Por ejemplo, una
cotizacion de Alexperto `id = 4587` puede tener su gestion en
`alexperto_audit_actions`:

| Campo | Ejemplo | Proposito |
| --- | --- | --- |
| `external_entity_type` | `QUOTE` | Distingue cotizaciones, preventivos y otros modulos. |
| `external_entity_id` | `4587` | Llave estable del registro en Alexperto. Debe guardarse como texto. |
| `gema_property_id` | UUID del inmueble | Permite aplicar asignacion y mantener trazabilidad. |
| `current_status` | `PENDIENTE_REVISION` | Estado de trabajo que existe solo en GEMA. |
| `created_by`, `updated_by` | UUID de usuario | Identifica al auditor responsable. |
| `created_at`, `updated_at` | Fecha UTC | Permite medir y auditar el flujo. |

La clave unica debe ser, como minimo, `(external_entity_type, external_entity_id)`.
Con esto hay solo un estado actual de GEMA por cotizacion externa, aun cuando la
lista se consulte muchas veces. Si una cotizacion pudiera pertenecer a varios
inmuebles, la regla se amplia con `gema_property_id` solo despues de confirmar
ese caso de negocio.

Cuando se lista una cotizacion, la API hace el join logico en el servidor:

```text
Cotizacion de Alexperto (id 4587, estado externo, importe, proveedor)
  +
Accion actual en GEMA (external_entity_type = QUOTE, external_entity_id = 4587)
  =
Respuesta para la pantalla (estado_externo + estado_interno)
```

Si no existe una fila interna, la API devuelve un estado por defecto calculado,
por ejemplo `PENDIENTE_REVISION`, pero no tiene que crearla al leer. La fila se
crea cuando el auditor realiza su primera accion: observar, culminar, asignar o
registrar comentario. Asi no se llena GEMA con miles de registros externos que
nunca se trabajaron.

Para conservar el historial, `alexperto_audit_action_history` registra cada
cambio con `action_id`, estado anterior, estado nuevo, comentario, usuario y
fecha. La tabla principal guarda solo el estado actual para consultas rapidas.
El estado externo de Alexperto y el estado interno de GEMA siempre se muestran
por separado; ningun cambio interno intenta actualizar la fuente externa.

## Cache futura, si se necesita

No cachear ni copiar antes de medir. Si las consultas directas no cumplen el
tiempo de respuesta requerido o las alertas necesitan detectar cambios sin que
un usuario abra la pantalla, crear snapshots minimos por modulo:

1. Ejecutar un proceso programado del servidor cada intervalo acordado.
2. Consultar solo inmuebles mapeados y solo columnas necesarias.
3. Guardar `external_id`, `external_updated_at` si existe, `synced_at` y un hash
   o version del registro.
4. Marcar en la interfaz la fecha de ultima sincronizacion.
5. Mantener la consulta de detalle contra Alexperto para confirmar informacion
   sensible o antes de una accion del auditor.
6. Definir retencion y eliminacion de snapshots para no convertir GEMA en una
   replica no gobernada.

La cache no reemplaza los mapeos confirmados ni las verificaciones de permiso.

## Roadmap

### Fase 0: contrato de datos

2. Solicitar un usuario tecnico dedicado con permiso `SELECT` limitado a vistas
   de auditoria, no una cuenta personal o administrativa.
3. Documentar IDs, relaciones, estados, montos, especialidades, documentos y
   formato de enlaces directos.
4. Solicitar vistas estables para cotizaciones, preventivos, documentos e
   inmuebles; si no existen, aislar las queries sobre tablas reales.
5. Confirmar las 10 especialidades, la matriz de estados y una muestra de datos.

### Fase 1: fundacion y seguridad

1. Configurar credenciales privadas de Alexperto en el entorno del servidor.
2. Crear `web/services/alexperto/` marcado como solo servidor.
3. Crear API Routes que autentiquen, autoricen y apliquen filtros antes de
   consultar Alexperto.
4. Agregar el grupo `ALEXPERTO` en el `AdminShell` para auditor y superadmin.
5. Crear migraciones, RLS y auditoria para las tablas propias de GEMA.

### Fase 2: conciliacion y verificacion de inmuebles

1. Construir la pantalla de mapeo exclusiva para superadmin.
2. Proponer coincidencias por nombre y direccion normalizados.
3. Confirmar manualmente los mapeos iniciales y bloquear los no confirmados.
4. Validar que el alcance de cada auditor derive de `user_properties`.

### Fase 3: MVP de cotizaciones

1. Crear `/admin/alexperto/cotizaciones` y su detalle.
2. Consultar bajo demanda por IDs externos autorizados, paginacion, monto mayor
   a S/ 3,000, especialidad y estado.
3. Mostrar el estado externo junto al estado interno de GEMA.
4. Implementar speeches, copia, enlace a Alexperto y acciones de culminado u
   observado con trazabilidad.
5. Agregar historial por cotizacion y auditor.

### Fase 4: preventivos e informes

1. Crear `/admin/alexperto/preventivos` con filtro fijo de preventivos 2026.
2. Detectar trabajos ejecutados y comprobar documentos `INFORME_TECNICO`.
3. Crear alertas y speeches para trabajos sin informe.
4. Permitir acceso controlado a documentos desde el servidor.

### Fase 5: IA y metricas

1. Analizar informes bajo demanda, guardar evidencia y requerir validacion
   humana.
2. Incorporar dashboard, tiempos de gestion y alertas operativas.
3. Medir rendimiento y decidir si un snapshot selectivo es necesario.
4. Cuando Alexperto habilite API de escritura, evaluar publicacion con
   idempotencia, permisos y trazabilidad; no antes.

## Criterios de salida del MVP

1. Ninguna credencial de Alexperto llega al cliente.
2. Un auditor no puede consultar un inmueble sin asignacion y mapeo confirmado.
3. Un superadmin puede revisar y confirmar los matches de inmuebles.
4. Cotizaciones relevantes se filtran por monto, especialidad, estado y permiso.
5. La accion interna queda trazada sin modificar Alexperto.
6. El detalle siempre muestra origen externo, estado externo, estado interno y
   hora de consulta.
