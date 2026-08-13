# Avance de implementacion GEMA-Alexperto

## Estado actual

- Fecha de inicio: 2026-08-13.
- Plan ejecutado: `docs/PLAN_IMPLEMENTACION_ALEXPERTO_GEMA.md`.
- Fase 0: completada en codigo; requiere configuracion operativa.
- Fase 1: parcialmente completada.
- Fase 2: pendiente.
- Fase 3: parcialmente completada.

## Hallazgos iniciales

- La pantalla web de cotizaciones existia, pero usaba datos estaticos y cambios
  de estado solo en memoria.
- No existian rutas `/api/alexperto` ni servicios de consulta a Alexperto.
- El guard del servidor solo contemplaba `SUPERADMIN`.
- La migracion SQL ya incluia `properties.alexperto_property_id` y tablas de
  acciones, aunque todavia requiere revisar RLS, RPC e idempotencia.
- El nombre solicitado `PLAN_IMPLEMENTACION_GEMA` no existe; se tomo como
  referencia `PLAN_IMPLEMENTACION_ALEXPERTO_GEMA.md`.

## Avances realizados

- Iniciada la instalacion de `pg`, `zod`, `@supabase/ssr` y `@types/pg` en `web`.
- Creado contrato Zod/tipos para filtros, estados y respuesta de cotizaciones.
- Creado guard `requireAlexpertoAccessSession` para `AUDITOR` y `SUPERADMIN`.
- Creado alcance por asignaciones vigentes y `properties.alexperto_property_id`.
- Creado pool PostgreSQL lazy, server-only, parametrizado y con timeout.
- Creado `GET /api/alexperto/cotizaciones` con paginacion, filtros y `no-store`.
- Conectada la pantalla existente al endpoint y agregados estados de carga/error/vacio.
- TypeScript pasa. El build requiere las variables privadas de Alexperto en el entorno.
- TypeScript y `next build` pasan sin credenciales configuradas localmente.

## Acciones requeridas del usuario

- Configurar en el entorno del servidor las variables privadas `DATABASE_HOST`,
  `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` y `DATABASE_PASSWORD`.
- Confirmar que `DATABASE_USER` sea una cuenta de solo lectura y que RDS permita
  conexiones desde el origen de despliegue aprobado con TLS verificado.
- Aplicar la migracion SQL en Supabase y confirmar que los 67 mapeos cargados son
  correctos antes de usar datos reales.

## Bloqueos

- No se puede validar una consulta real contra Alexperto sin las credenciales y
  conectividad de red del entorno servidor.
- Las credenciales y la red fueron verificadas el 2026-08-13: conecta como
  `readonly_user` a `db_alexperto_prod`, pero TLS falla con
  `SELF_SIGNED_CERT_IN_CHAIN` porque falta `DATABASE_SSL_CA`.
- El pool ahora exige `DATABASE_SSL_CA` y usa esa CA con
  `rejectUnauthorized: true`; no se habilito una excepcion insegura.
- TypeScript y `next build` pasan despues del ajuste.
- La consulta SQL real fue probada directamente el 2026-08-13 con TLS solo para
  diagnostico: conecto y devolvio una fila con las columnas esperadas. El fallo
  restante es exclusivamente la CA incompleta.
- Corregido el `500` del listado: los filtros opcionales no tenian placeholders
  SQL cuando venian vacios, pero el cliente enviaba seis parametros. La consulta
  ahora soporta listas vacias con `cardinality(...)` y fue probada contra
  Alexperto devolviendo 25 filas.
- No se puede validar una escritura atomica hasta disponer de una RPC transaccional
  en Supabase o de su esquema SQL definitivo.

## Accion inmediata pendiente

- Agregar `DATABASE_SSL_CA` al `.env` local y a Vercel con el certificado CA de la
  instancia RDS/Alexperto en formato PEM completo, incluyendo `-----BEGIN CERTIFICATE-----`
  y `-----END CERTIFICATE-----`. Luego reiniciar el servidor web.
- El valor actual tiene solo 57 caracteres y no contiene el cuerpo Base64 del
  certificado; no es una CA valida.
- Se habilito una excepcion controlada para desarrollo local mediante
  `DATABASE_SSL_REJECT_UNAUTHORIZED=false`. Esta excepcion se ignora en
  produccion, donde la CA completa sigue siendo obligatoria.

## Pendientes tecnicos

- Implementar acciones, historial, RPC transaccional e idempotencia.
- El filtro `estadoInterno` debe aplicarse en servidor sobre la union con acciones.
- El endpoint todavia necesita endpoint de detalle y la interfaz debe eliminar el
  fallback estatico restante antes de considerar cerrado el MVP.
- `npm run lint` sigue bloqueado por dos warnings heredados de imports QR.
