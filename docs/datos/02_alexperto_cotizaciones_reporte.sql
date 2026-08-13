-- Reporte de cotizaciones de Alexperto para GEMA.
-- Fuente: PostgreSQL Alexperto, schema sch_main.
-- Ejecutar solo con un usuario de lectura.
--
-- Columnas del reporte:
-- COD | CREACION | INMUEBLE | ESPEC | ABREV | SERVICIO | COD_SERVICIO |
-- FINANZAS | RESOLUCION | RETRASO
--
-- Parametro opcional de psql:
--   -v monto_minimo=3000
-- Si no se envia, se usa 0 y no se filtra por monto.

\if :{?monto_minimo}
\else
  \set monto_minimo 0
\endif

WITH ultima_propuesta AS (
  SELECT
    p.quote_id,
    p.cost,
    p.latest_proposal_status,
    p.start_date,
    p.updated_at,
    row_number() OVER (
      PARTITION BY p.quote_id
      ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
    ) AS rn
  FROM sch_main.proposals p
)
SELECT
  q.code AS "COD",
  q.created_at AS "CREACION",
  prop.name AS "INMUEBLE",
  concat_ws(' / ', esp.name, subesp.name) AS "ESPEC",
  CASE lower(subesp.name)
    WHEN 'sistema de aire acondicionado' THEN 'AA'
    WHEN 'equipos de ventilación mecánica' THEN 'VM'
    WHEN 'sistemas contra incendio' THEN 'SCI'
    WHEN 'tableros eléctricos' THEN 'TE'
    WHEN 'grupos electrógenos' THEN 'GE'
    WHEN 'bombas de agua y desagüe' THEN 'BOM'
    WHEN 'sistemas de seguridad y control' THEN 'SSC'
    WHEN 'sub estación eléctrica' THEN 'SEE'
    WHEN 'tableros de transferencia | distribución | otros relacionados' THEN 'TTA'
    WHEN 'ascensores' THEN 'ASC'
  END AS "ABREV",
  coalesce(req.description, q.description) AS "SERVICIO",
  req.code AS "COD_SERVICIO",
  up.cost AS "FINANZAS",
  coalesce(up.latest_proposal_status, q.latest_quote_status) AS "RESOLUCION",
  CASE
    WHEN lower(coalesce(q.latest_quote_status, '')) IN
      ('approved', 'completed', 'complete', 'closed', 'cancelled', 'canceled', 'resolved', 'rejected')
      THEN 0
    ELSE greatest(0, current_date - q.created_at::date)
  END AS "RETRASO"
FROM sch_main.quotes q
LEFT JOIN sch_main.properties prop ON prop.id = q.property_id
LEFT JOIN sch_main.sub_specialties subesp ON subesp.id = q.sub_specialty_id
LEFT JOIN sch_main.specialties esp ON esp.id = subesp.specialty_id
LEFT JOIN sch_main.requests req
  ON req.id = coalesce(q.generated_request_id, q.trigger_request_id)
LEFT JOIN ultima_propuesta up ON up.quote_id = q.id AND up.rn = 1
WHERE prop.deleted_at IS NULL
  AND lower(subesp.name) IN (
    'sistema de aire acondicionado',
    'equipos de ventilación mecánica',
    'sistemas contra incendio',
    'tableros eléctricos',
    'grupos electrógenos',
    'bombas de agua y desagüe',
    'sistemas de seguridad y control',
    'sub estación eléctrica',
    'tableros de transferencia | distribución | otros relacionados',
    'ascensores'
  )
  AND coalesce(up.cost, 0) >= :monto_minimo
ORDER BY q.created_at DESC;
