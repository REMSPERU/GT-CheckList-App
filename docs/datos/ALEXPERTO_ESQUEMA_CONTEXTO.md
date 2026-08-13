# Contexto del esquema de Alexperto

Documento de referencia para volver a consultar la base de datos de Alexperto sin
tener que descubrir nuevamente el esquema.

Fecha de verificacion: 2026-08-13


La contrasena debe leerse desde el `.env` local. Nunca debe escribirse en este
documento, en un commit, en una consulta o en el frontend.

## Fuente de datos principal

El reporte de cotizaciones parte de:

```text
sch_main.quotes
  -> sch_main.properties
  -> sch_main.sub_specialties -> sch_main.specialties
  -> sch_main.proposals -> sch_main.providers
  -> sch_main.quote_notes -> sch_main.users
```

## Tablas y columnas relevantes

### `sch_main.quotes`

Entidad principal de cotizaciones.

| Columna | Uso |
| --- | --- |
| `id` | ID externo estable de Alexperto. |
| `code` | Codigo visible, por ejemplo `CO-7756`. |
| `request_type` | Tipo de solicitud: `CORRECTIVE`, `REQUIREMENT`, etc. |
| `created_at` | Fecha de creacion. |
| `updated_at` | Ultima actualizacion. |
| `property_id` | Relacion con `properties.id`. |
| `sub_specialty_id` | Relacion con `sub_specialties.id`. |
| `latest_quote_status` | Estado externo actual. |
| `quote_status` | Historial de estados en JSONB. |
| `assigned_provider_id` | Proveedor asignado, si existe. |
| `has_been_reviewed` | Indica si Alexperto marco la cotizacion como revisada. |
| `description` | Descripcion de la solicitud. |
| `creation_user_type` | Tipo de usuario que creo el registro. |
| `creation_user_id` | Usuario creador. |

Nota: `quotes` no tiene `deleted_at`. El filtro de registros vigentes se hace
con `properties.deleted_at IS NULL`.

### `sch_main.properties`

| Columna | Uso |
| --- | --- |
| `id` | ID externo del inmueble. |
| `code` | Codigo externo, por ejemplo `INM-81`. |
| `name` | Nombre del inmueble. |
| `deleted_at` | Borrado logico. |
| `property_status` | Estado del inmueble en JSONB. |
| `location` | Ubicacion en JSONB. |
| `created_at`, `updated_at` | Marcas de tiempo. |

### Especialidad

`sch_main.sub_specialties` contiene `name`, `code` y `specialty_id`.

`sch_main.specialties` contiene `id`, `name` y `code`.

La especialidad de una cotizacion se obtiene con:

```sql
sub_specialties.specialty_id = specialties.id
```

### `sch_main.proposals`

Contiene la propuesta economica relacionada con una cotizacion.

| Columna | Uso |
| --- | --- |
| `quote_id` | Relacion con `quotes.id`. |
| `cost` | Importe economico. |
| `latest_proposal_status` | Estado de la propuesta. |
| `provider_id` | Proveedor de la propuesta. |
| `start_date` | Fecha prevista de inicio. |
| `updated_at` | Fecha usada para elegir la ultima propuesta. |

Puede haber varias propuestas por cotizacion. Para el reporte se toma la mas
reciente usando `updated_at DESC` y luego `created_at DESC`.

## Correspondencia de columnas solicitadas

| Columna del reporte | Fuente o calculo |
| --- | --- |
| `COD` | `quotes.code` |
| `CREACION` | `quotes.created_at` |
| `INMUEBLE` | `properties.name` |
| `ESPEC` | `specialties.name` + `sub_specialties.name` |
| `SERVICIO` | `requests.description`; respaldo `quotes.description` |
| `COD_SERVICIO` | `requests.code` |
| `FINANZAS` | Ultima propuesta: `proposals.cost` |
| `RESOLUCION` | `proposals.latest_proposal_status`; respaldo `quotes.latest_quote_status` |
| `RETRASO` | Dias desde `quotes.created_at`; cero para estados finales |

Los estados considerados finales para `RETRASO` son `APPROVED`, `COMPLETED`,
`COMPLETE`, `CLOSED`, `CANCELLED`, `CANCELED`, `RESOLVED` y `REJECTED`.

## Consulta preparada

La consulta completa esta en:

```text
docs/datos/02_alexperto_cotizaciones_reporte.sql
```

Devuelve las columnas:

```text
COD | CREACION | INMUEBLE | ESPEC | ABREV | SERVICIO | COD_SERVICIO |
FINANZAS | RESOLUCION | RETRASO
```

Alexperto no tiene una tabla `service/services` en el esquema confirmado. El
servicio se obtiene de `sch_main.requests`, enlazando `quotes.generated_request_id`
o `quotes.trigger_request_id`; se usa `quotes.description` como respaldo.

El reporte filtra exclusivamente estas subespecialidades reales de Alexperto:

| Abreviatura | Nombre solicitado | `sch_main.sub_specialties.name` |
| --- | --- | --- |
| `AA` | Aire acondicionado | `Sistema de aire acondicionado` |
| `VM` | Ventilacion mecanica | `Equipos de ventilación mecánica` |
| `SCI` | Sistema contra incendio | `Sistemas contra incendio` |
| `TE` | Tablero electrico | `Tableros eléctricos` |
| `GE` | Grupo electrogeno | `Grupos electrógenos` |
| `BOM` | Bombas de agua y desague | `Bombas de agua y desagüe` |
| `SSC` | Seguridad electronica | `Sistemas de seguridad y control` |
| `SEE` | Sub estacion electrica | `Sub estación eléctrica` |
| `TTA` | Tablero transferencia aut | `Tableros de transferencia | Distribución | Otros relacionados` |
| `ASC` | Ascensores | `Ascensores` |

El filtro se aplica sobre `sub_specialties.name`, no sobre `specialties.name`,
porque Alexperto agrupa varias de estas especialidades bajo categorías amplias
como `Instalaciones eléctricas`, `Climatización y HVAC` e `Instalaciones de
seguridad`.

## Ejecucion con Docker

Desde la raiz del repositorio, ejecutar usando la contrasena del entorno. Este
comando no modifica la base de datos y usa el usuario de solo lectura.

```powershell
$env:PGPASSWORD = 'PEGAR_AQUI_DATABASE_PASSWORD_LOCAL'

docker run --rm `
  -e "PGPASSWORD=$env:PGPASSWORD" `
  -v "${PWD}/docs/datos:/sql:ro" `
  postgres:16-alpine `
  psql `
  "host=database-alexperto-prod.c7scaq606lx0.us-east-1.rds.amazonaws.com port=5432 dbname=db_alexperto_prod user=readonly_user sslmode=require" `
  -v ON_ERROR_STOP=1 `
  -v monto_minimo=3000 `
  -f /sql/02_alexperto_cotizaciones_reporte.sql
```

El parametro `monto_minimo` filtra el costo de la ultima propuesta. Ejemplos:

```powershell
# Cotizaciones desde S/ 3,000
... -v monto_minimo=3000 -f /sql/02_alexperto_cotizaciones_reporte.sql

# Cotizaciones desde S/ 10,000
... -v monto_minimo=10000 -f /sql/02_alexperto_cotizaciones_reporte.sql
```

Si no se envia `-v monto_minimo=...`, el valor predeterminado es `0` y se
devuelven todos los registros filtrados por especialidad. Las cotizaciones sin
propuesta economica se consideran con monto `0` para este filtro.

Para no mostrar los resultados completos en consola, agregar una salida CSV:

```powershell
... -f /sql/02_alexperto_cotizaciones_reporte.sql | Out-File alexperto-cotizaciones.txt
```

## Consultas de diagnostico

### Ver columnas de una tabla

```sql
SELECT column_name, data_type, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'sch_main'
  AND table_name = 'quotes'
ORDER BY ordinal_position;
```

### Ver volumen de cotizaciones

```sql
SELECT count(*) AS total_cotizaciones
FROM sch_main.quotes;
```

### Ver estados externos

```sql
SELECT latest_quote_status, count(*)
FROM sch_main.quotes
GROUP BY latest_quote_status
ORDER BY count(*) DESC;
```

### Ver las cotizaciones recientes

```sql
SELECT id, code, created_at, latest_quote_status, property_id
FROM sch_main.quotes
ORDER BY created_at DESC
LIMIT 20;
```

## Integracion con GEMA

Alexperto es la fuente de verdad para cotizaciones, inmuebles, estados,
propuestas, proveedores y documentos.

GEMA debe guardar solamente la gestion interna del auditor. Una referencia a una
cotizacion debe usar:

```text
external_entity_type = 'QUOTE'
external_entity_id   = quotes.id
```

No se debe modificar `sch_main.quotes` desde GEMA ni copiar toda la base de
datos. La consulta debe ejecutarse en el servidor, despues de validar usuario,
rol, inmueble asignado y mapeo externo confirmado.

El SQL de este documento es de lectura directa para diagnostico o servicio
servidor. No debe exponerse al navegador ni incluirse en una app movil.

## Limitaciones conocidas

1. `FINANZAS` se toma de la ultima propuesta, no directamente de `quotes`.
2. `RETRASO` es una metrica calculada desde la fecha de creacion; Alexperto no
   tiene una columna `delay` confirmada.
3. `RESOLUCION` representa el estado externo. El estado interno del auditor debe
   venir de GEMA y mostrarse separado.
4. El proveedor y los comentarios internos de Paul pertenecen a GEMA y no forman
   parte de este reporte externo.
5. Para preventivos, documentos y alertas se debe hacer una consulta especifica;
   este archivo documenta el reporte de cotizaciones.
