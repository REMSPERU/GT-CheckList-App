# Plan de implementacion Alexperto en GEMA Web

## Estado y decision

Este plan implementa el MVP de lectura de cotizaciones de Alexperto y gestion
interna en GEMA Web.

| Tema | Decision |
| --- | --- |
| Fuente de cotizaciones | PostgreSQL de Alexperto, schema `sch_main`. |
| Cliente de base de datos | `pg` para Node.js, solo en servidor. |
| Backend que atiende al cliente | Route Handlers de Next.js desplegados en Vercel. |
| Autenticacion y permisos | Supabase Auth, tablas GEMA y RLS. |
| Usuarios del MVP | `AUDITOR` y `SUPERADMIN`. |
| Acceso del auditor | Solo inmuebles GEMA activos asignados en `user_properties`, con asignacion vigente y `properties.alexperto_property_id` definido. |
| Responsable interno | El auditor con asignacion activa sobre el inmueble GEMA. No proviene de Alexperto. |
| Gestion interna | Estado, comentario y trazabilidad en tablas GEMA. |
| Datos externos | No se editan ni se copian de forma permanente a Supabase. |
| Fuente unica de mapeo | `properties.alexperto_property_id`. No se usara `alexperto_property_mappings` en el MVP. |
| Validacion final | Solo `SUPERADMIN` puede cambiar una gestion interna a `VALIDADO`. |

No se usa Supabase Edge Functions como capa principal porque GEMA Web ya tiene
Next.js y las rutas requieren autenticar, autorizar, consultar Supabase y unir
con Alexperto en una misma operacion. Edge Functions quedan reservadas para
tareas asincronas futuras.

## Arquitectura

```text
Navegador
  -> Next.js Route Handler /api/alexperto/*
      -> valida sesion Supabase
      -> valida rol AUDITOR o SUPERADMIN
      -> consulta asignaciones y mapeos en Supabase
      -> limita property_id autorizados
      -> ejecuta consulta parametrizada en Alexperto con pg
      -> obtiene acciones internas de GEMA
      -> une resultados por quotes.id
  -> JSON limitado al usuario autenticado
```

Las credenciales `DATABASE_*` de Alexperto se configuran solo en las variables
privadas de Vercel. No deben tener prefijo `NEXT_PUBLIC_`, aparecer en el
navegador, logs, respuestas HTTP, repositorio ni documentación.

## Librerias

Instalar en `web/`:

```bash
npm install pg zod @supabase/ssr
npm install -D @types/pg
```

| Libreria | Uso |
| --- | --- |
| `pg` | Cliente PostgreSQL para Alexperto; soporta parámetros, TLS y pool. |
| `zod` | Validación y transformación de filtros, cuerpo de acciones y respuestas internas. |
| `@supabase/ssr` | Cliente Supabase seguro para sesiones en Route Handlers y Server Components. |
| `@supabase/supabase-js` | Cliente tipado de Supabase ya existente. |
| TanStack Query | Cache, deduplicación, cancelación y estados de carga en la interfaz. Ya debe ser el estándar de datos del proyecto principal. |

No usar un ORM sobre Alexperto en el MVP. La consulta requiere CTE, `row_number`,
filtros dinámicos y relaciones ya documentadas; `pg` permite mantener SQL
revisable y parámetros explícitos sin añadir una capa o migraciones sobre una
base externa de solo lectura.

## Seguridad

### Base de datos Alexperto

1. Usar exclusivamente el usuario técnico `readonly_user` y permisos `SELECT`.
2. Requerir TLS: `sslmode=require` local y `ssl: { rejectUnauthorized: true }`
   en el cliente Node si el certificado de RDS está disponible.
3. Definir `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` y
   `DATABASE_PASSWORD` como secretos de Vercel, no como variables públicas.
4. Rotar las credenciales que fueron expuestas anteriormente en archivos locales
   de trabajo y eliminar tokens de ejemplos/documentación.
5. Configurar el Security Group de RDS para permitir solo el origen aprobado para
   el despliegue. Si Vercel no tiene salida con IP fija compatible con ese grupo,
   no abrir RDS a internet: usar una API oficial de Alexperto o un proxy privado
   con IP fija antes de producción.

### API y autorizacion

1. Crear `requireAlexpertoAccessSession(request)`.
2. Retornar `401` sin sesión y `403` si el rol no es `AUDITOR` o `SUPERADMIN`.
3. Una asignacion esta vigente cuando `expires_at IS NULL OR expires_at > now()`.
4. Para `AUDITOR`, obtener desde `user_properties` solo inmuebles GEMA activos
   con asignacion vigente y `alexperto_property_id` no nulo; estos IDs externos
   se agregan siempre a la query de Alexperto en servidor.
5. Para `SUPERADMIN`, permitir todos los inmuebles GEMA activos con
   `alexperto_property_id` no nulo.
6. No aceptar `propertyId`, `externalEntityId`, rol o usuario como fuente de
   autorización desde el navegador. Son filtros adicionales, nunca permisos.
7. Aplicar RLS a las tablas internas GEMA y verificar el inmueble también en el
   Route Handler antes de crear o actualizar una acción.
8. El cliente Supabase con `service_role` omite RLS; por ello el Route Handler
   debe resolver y verificar todo el alcance antes de cualquier lectura o
   escritura. RLS permanece como defensa para accesos que no usan ese cliente.
9. Usar códigos de error públicos genéricos; registrar el detalle técnico solo
   en logs estructurados sin secretos, SQL, comentarios ni datos personales
   innecesarios.
10. Limitar el body a 16 KB, paginación máxima de 100 registros y rate limit por
    usuario/IP en las rutas de lectura y escritura. Definir antes del despliegue
    el proveedor compatible con Vercel y los límites concretos por endpoint.

## Cliente `pg` seguro

Crear `web/services/alexperto/alexperto-db.server.ts`. Debe incluir
`import 'server-only'` y no puede ser importado desde componentes cliente.

Configuración recomendada:

```ts
import 'server-only';

import { Pool } from 'pg';

export const alexpertoPool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: { rejectUnauthorized: true },
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'gema-web',
});
```

La query debe usar siempre valores parametrizados:

```ts
await alexpertoPool.query({
  text: 'SELECT ... WHERE q.property_id = ANY($1::text[]) AND p.cost >= $2',
  values: [authorizedAlexpertoPropertyIds, filters.montoMinimo],
  statement_timeout: 10_000,
});
```

Nunca concatenar texto de filtros del navegador en SQL. Para orden y
especialidades usar allowlists de constantes internas; nunca usar identificadores
SQL recibidos del cliente.

## Modelo de datos y union

### Alexperto: datos de lectura

La consulta base está en `docs/datos/02_alexperto_cotizaciones_reporte.sql`.

Campos externos expuestos por el MVP:

```text
externalQuoteId, code, createdAt, property, specialty, specialtyCode,
service, serviceCode, amount, externalStatus, delayDays
```

Solo se incluyen las diez subespecialidades documentadas: `AA`, `VM`, `SCI`,
`TE`, `GE`, `BOM`, `SSC`, `SEE`, `TTA` y `ASC`.

### GEMA: datos internos

Tablas ya definidas:

| Tabla | Uso MVP |
| --- | --- |
| `properties` | Inmueble interno y su código. |
| `user_properties` | Define el alcance y responsable auditor del inmueble. |
| `properties.alexperto_property_id` | ID estable de Alexperto confirmado para el inmueble GEMA. Es la única fuente de mapeo del MVP. |
| `alexperto_audit_actions` | Estado actual, comentario y creador/actualizador. |
| `alexperto_audit_action_history` | Historial inmutable de cada cambio. |

Al listar, la API hace un join lógico:

```text
quotes.id (Alexperto)
  +
alexperto_audit_actions.external_entity_id (GEMA, tipo QUOTE)
  =
cotizacion con estado_externo y gestion_interna
```

Si no existe acción GEMA, devolver:

```text
internalStatus: PENDIENTE_REVISION
internalComment: null
responsible: auditor asignado al inmueble
```

No crear una acción durante una lectura. Crear la fila y su historial solo al
registrar una acción del auditor.

### Estados internos y permisos

Estos estados pertenecen exclusivamente a la gestión interna de GEMA; no
modifican ni reemplazan `externalStatus` de Alexperto.

| Rol | Estados que puede establecer |
| --- | --- |
| `AUDITOR` | `PENDIENTE_REVISION`, `OBSERVADO`, `CULMINADO`, `PENDIENTE_VALIDACION`. |
| `SUPERADMIN` | Todos, incluido `VALIDADO`. |

El Route Handler valida las transiciones permitidas en servidor. `VALIDADO`
representa la revisión final de la gestión del auditor y solo puede ser marcado
por `SUPERADMIN`.

## Contrato de API

### Listado

```text
GET /api/alexperto/cotizaciones
```

Parámetros Zod:

```text
page: entero, mínimo 1, por defecto 1
pageSize: entero, mínimo 1, máximo 100, por defecto 25
montoMinimo: número >= 0, por defecto 0
especialidades: lista opcional de AA|VM|SCI|TE|GE|BOM|SSC|SEE|TTA|ASC
estadoExterno: lista opcional allowlist
estadoInterno: lista opcional allowlist GEMA
propertyId: UUID opcional; se valida contra el alcance permitido
sort: createdAt|amount|delayDays, por defecto createdAt
direction: asc|desc, por defecto desc
```

Respuesta:

```ts
interface AlexpertoQuoteListItem {
  externalQuoteId: string;
  code: string;
  createdAt: string;
  property: { id: string; name: string; gemaPropertyId: string };
  specialty: { name: string; code: 'AA' | 'VM' | 'SCI' | 'TE' | 'GE' | 'BOM' | 'SSC' | 'SEE' | 'TTA' | 'ASC' };
  service: string | null;
  serviceCode: string | null;
amount: string | null; // Decimal exacto, por ejemplo "3000.50"
  externalStatus: string | null;
  delayDays: number;
  internalStatus: 'PENDIENTE_REVISION' | 'OBSERVADO' | 'CULMINADO' | 'PENDIENTE_VALIDACION' | 'VALIDADO';
  internalComment: string | null;
  responsible: { id: string; name: string | null } | null;
}
```

La respuesta incluye `page`, `pageSize`, `total`, `items` y `queriedAt` en UTC.
No incluir proveedor Alexperto ni comentarios de Alexperto en la lista MVP.

### Detalle

```text
GET /api/alexperto/cotizaciones/:externalQuoteId
```

Revalida acceso al inmueble antes de devolver detalle. Consulta Alexperto en
tiempo real y las acciones/historial GEMA correspondientes.

### Acción interna

```text
POST /api/alexperto/cotizaciones/:externalQuoteId/acciones
```

Body validado con Zod:

```text
status: PENDIENTE_REVISION|OBSERVADO|CULMINADO|PENDIENTE_VALIDACION|VALIDADO
comment: string opcional, máximo 2,000 caracteres
```

El cliente envía la clave de idempotencia en el header `Idempotency-Key`; no se
acepta como parte del cuerpo de la acción.

El Route Handler debe confirmar que la cotización existe en Alexperto y pertenece
a un inmueble autorizado antes de escribir en Supabase. La mutación actualiza
`alexperto_audit_actions` y agrega un registro en
`alexperto_audit_action_history` dentro de una única operación transaccional en
Supabase, preferentemente mediante una función RPC. La verificación previa en
Alexperto no puede ser parte de esa transacción distribuida.

La mutación debe aceptar una clave de idempotencia generada por el cliente y
conservarla por usuario y endpoint. Un reintento con la misma clave devuelve el
resultado original sin crear una acción o historial duplicado.

## Rendimiento y experiencia

1. Seleccionar solo columnas necesarias; no hacer `SELECT *`.
2. La consulta a Alexperto debe filtrar por `property_id` autorizados, las diez
   subespecialidades y el monto antes de paginar.
3. Usar paginación server-side. Preferir cursor por `(created_at, id)` si las
   pruebas muestran degradación con `OFFSET`; el MVP puede iniciar con
   `LIMIT/OFFSET` limitado.
4. Ejecutar en paralelo la lectura de acciones GEMA y la consulta Alexperto solo
   después de resolver el alcance del usuario.
5. Configurar timeout de conexión de 5 s y de query de 10 s. Mostrar un error
   recuperable si Alexperto no responde; no sustituir silenciosamente con datos
   obsoletos.
6. En React, usar TanStack Query con query keys que incluyan filtros/página,
   `staleTime` de 30 s, `gcTime` de 5 min y cancelación con `AbortSignal`.
7. Usar `placeholderData` al cambiar de página y debounce de 300 ms para filtros
   de texto si se agregan.
8. No cachear respuestas compartidas en CDN porque el resultado depende de los
   permisos del usuario. Configurar `Cache-Control: private, no-store` en MVP.
9. Medir p50, p95, errores y número de filas antes de añadir snapshots. Objetivo:
   p95 del listado menor de 2.5 s para 25 filas.
10. Mantener `amount` con precisión decimal desde PostgreSQL hasta la respuesta;
    no convertir un valor `numeric` a `number` de JavaScript si puede perder
    precisión. Exponerlo como texto decimal o definir una conversión segura.

## Roadmap

### Fase 0: seguridad y contrato

1. Rotar credenciales expuestas y configurar secretos privados en Vercel.
2. Validar acceso de red Vercel a RDS y TLS con certificado verificado.
3. Instalar `pg`, `zod`, `@supabase/ssr` y `@types/pg`.
4. Usar exclusivamente `properties.alexperto_property_id` como fuente de mapeo;
   validar que los inmuebles activos con ID externo hayan sido confirmados antes
   del despliegue.
5. Crear tipos, schemas Zod y allowlists de especialidades/estados.
6. Agregar índices GEMA para `(external_entity_type, external_entity_id)`,
   `gema_property_id`, `user_properties(user_id, property_id, expires_at)` y
   `properties(alexperto_property_id)` si aún no existen.

**Salida:** conexión privada validada, secretos protegidos, contrato de filtros
y fuente de mapeo acordada.

### Fase 1: servicio y autorización

1. Crear `web/services/alexperto/alexperto-db.server.ts` y
   `alexperto-quotes.service.ts`.
2. Crear `requireAlexpertoAccessSession` reutilizando el patrón de
   `requireSuperAdminSession` existente.
3. Implementar resolución de inmuebles autorizados desde `user_properties` y
   `properties.alexperto_property_id`.
4. Implementar `GET /api/alexperto/cotizaciones` con validación, parámetros SQL,
   filtros, paginación, timeout y logs seguros.
5. Añadir pruebas de autorización, validación y construcción de SQL.
6. Probar aislamiento: un auditor no puede listar, consultar detalle ni crear una
   acción sobre cotizaciones de inmuebles asignados a otro auditor.

**Salida:** ningún rol no autorizado puede consultar; un auditor recibe solo sus
inmuebles mapeados.

### Fase 2: gestión interna

1. Implementar lectura masiva de acciones GEMA para las cotizaciones de la
   página actual.
2. Implementar `POST .../acciones` con autorización por inmueble.
3. Crear acción e historial de manera atómica mediante RPC y con idempotencia.
4. Derivar el responsable de `user_properties`, sin exponer proveedor Alexperto.
5. Crear endpoint de detalle e historial.
6. Restringir `VALIDADO` a `SUPERADMIN` y validar transiciones internas en el
   servidor.

**Salida:** estado, comentario y responsable interno se muestran separados del
estado externo y quedan auditados.

### Fase 3: interfaz MVP

1. Agregar la sección Alexperto visible solo a auditor y superadmin.
2. Crear tabla de cotizaciones con filtros por monto, especialidad, estado,
   inmueble autorizado y estado interno.
3. Mostrar código, creación, inmueble, especialidad, servicio, monto, estado
   externo, retraso, estado interno y responsable.
4. Agregar pantalla de detalle con acción interna e historial.
5. Usar skeletons, estados vacíos, error recuperable y paginación.

**Salida:** el auditor puede revisar y gestionar sus cotizaciones relevantes
desde GEMA sin modificar Alexperto.

### Fase 4: observabilidad y endurecimiento

1. Instrumentar duración, timeout, resultados y errores por endpoint.
2. Configurar rate limit y alertas de errores.
3. Revisar índices y plan de ejecución con datos reales.
4. Ejecutar revisión de seguridad: acceso cruzado de inmuebles, inyección SQL,
   secretos, uso de `service_role`, RLS y errores HTTP.
5. Probar carga con filtros y paginación.
6. Verificar que logs, trazas y respuestas de error no incluyan comentarios,
   importes sensibles, SQL ni credenciales.

**Salida:** p95, disponibilidad y errores medidos; controles de seguridad
verificados.

### Fase 5: posterior al MVP

1. Crear snapshot selectivo solo si las métricas justifican una cache.
2. Agregar preventivos, documentos `INFORME_TECNICO` y alertas.
3. Migrar a una API oficial de Alexperto si se entrega, conservando el contrato
   interno del servicio.
4. Evaluar IA únicamente con evidencia y validación humana.

## Criterios de aceptación del MVP

1. El cliente nunca recibe credenciales ni SQL de Alexperto.
2. `AUDITOR` solo obtiene cotizaciones de inmuebles asignados y mapeados.
3. `SUPERADMIN` obtiene todos los inmuebles mapeados.
4. Las diez especialidades y `montoMinimo` se filtran en servidor.
5. Servicio, monto y estado externo provienen de Alexperto en tiempo real.
6. Estado, comentario y responsable interno provienen de GEMA y se muestran por
   separado.
7. Cada cambio interno queda en historial y no actualiza Alexperto.
8. Listado paginado, validado, con timeout y respuesta no cacheable compartida.
9. Solo `SUPERADMIN` puede establecer el estado interno `VALIDADO`.
10. Un auditor no puede leer ni modificar cotizaciones fuera de sus asignaciones
    vigentes, aunque conozca el ID externo o interno.

## Preguntas resueltas

| Pregunta | Respuesta |
| --- | --- |
| ¿Qué API se usa? | Route Handlers de Next.js en Vercel. |
| ¿Qué librería consulta Alexperto? | `pg`, server-only, pool pequeño y consultas parametrizadas. |
| ¿Cómo se limitan los datos? | Sesión/rol + asignación vigente en `user_properties` + `properties.alexperto_property_id` antes de SQL Alexperto. |
| ¿Cuál es la fuente de mapeo? | Solo `properties.alexperto_property_id`. |
| ¿De dónde sale responsable? | Auditor asignado al inmueble GEMA. |
| ¿Dónde se guardan comentario y estado? | `alexperto_audit_actions` e historial en Supabase. |
| ¿Quién puede validar? | Solo `SUPERADMIN` puede establecer `VALIDADO`. |
| ¿Se copian cotizaciones a Supabase? | No. Solo se consulta Alexperto bajo demanda. |
