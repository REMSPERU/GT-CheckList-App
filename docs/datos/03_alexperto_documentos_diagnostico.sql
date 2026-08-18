-- Diagnostico de documentos de Alexperto para GEMA.
-- Ejecutar solo con el usuario de lectura y no incluir resultados con secretos.

-- 1. Tablas cuyo nombre sugiere documentos, archivos o adjuntos.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND lower(table_name) ~ '(document|file|archivo|adjunt|attachment|media|evidence)'
ORDER BY table_schema, table_name;

-- 2. Columnas que pueden contener la relacion con una cotizacion o una URL/key S3.
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND (
    lower(table_name) ~ '(document|file|archivo|adjunt|attachment|media|evidence|quote)'
    OR lower(column_name) ~ '(document|file|archivo|adjunt|attachment|media|evidence|quote|s3|bucket|object|storage|url|key|path)'
  )
ORDER BY table_schema, table_name, ordinal_position;

-- 3. Columnas JSONB de quotes/requests que pueden contener metadatos de archivos.
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'sch_main'
  AND table_name IN ('quotes', 'requests', 'proposals')
  AND data_type IN ('json', 'jsonb')
ORDER BY table_name, ordinal_position;

-- Despues de identificar la tabla, consultar solo columnas no sensibles y limitar
-- la salida. Buscar valores como bucket, object key, URL o document type.
