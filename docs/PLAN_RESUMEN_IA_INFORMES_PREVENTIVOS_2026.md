# Plan: Resumen IA de Informes Preventivos 2026

## Objetivo

Generar un resumen técnico orientado a la toma de decisiones para los informes
técnicos en PDF de solicitudes preventivas programadas durante 2026. El flujo
convertirá el PDF a Markdown con MarkItDown y enviará el contenido a un modelo
de IA mediante OpenRouter. El resultado quedará registrado en Supabase con
evidencia, trazabilidad y validación humana.

## Contexto Actual

El portal web de Alexperto ya dispone de:

- Solicitudes con `request_type = 'PREVENTIVE'`.
- Fecha programada en `start_time`.
- Documentos asociados a la solicitud, cotización y propuesta.
- Selección preferente de documentos de tipo `Informes técnicos`.
- URLs firmadas de S3 con duración de cinco minutos para ver documentos.
- Una definición documental de `alexperto_document_analyses`, aún sin migración
  ni uso en la aplicación.

## Regla de Elegibilidad

Se analizará un documento sólo si se cumplen todas estas condiciones:

1. La solicitud tiene `request_type = 'PREVENTIVE'`.
2. La fecha `start_time` pertenece al periodo entre `2026-01-01` y
   `2026-12-31`, interpretada con la zona horaria `America/Lima`.
3. La solicitud tiene un documento clasificado como informe técnico.
4. El documento tiene MIME permitido, inicialmente `application/pdf`.
5. El usuario que consulta tiene acceso al inmueble vinculado.

La fecha de referencia debe ser `start_time`, no `created_at`, porque representa
la programación del mantenimiento.

## Arquitectura

```text
Portal web
  -> solicita el análisis o muestra uno existente
API Next.js autenticada
  -> valida acceso, elegibilidad y documento
  -> registra o encola el análisis
Worker privado de análisis
  -> descarga el PDF desde S3
  -> valida y convierte PDF a Markdown con MarkItDown
  -> solicita resumen estructurado a OpenRouter
  -> guarda resultado, evidencia y auditoría en Supabase
Portal web
  -> muestra resumen y permite validación humana
```

MarkItDown no debe ejecutarse de forma síncrona dentro de una ruta de Next.js:

- Requiere Python 3.10+ y dependencias de PDF.
- La conversión y la IA pueden superar el tiempo de ejecución de una petición.
- El flujo requiere límites de recursos, reintentos y trazabilidad.

Se implementará un worker Python aislado en un contenedor o servicio de jobs. La
API web sólo creará el trabajo y consultará su estado.

## Persistencia en Supabase

Crear una migración real para ampliar funcionalmente
`alexperto_document_analyses`. La tabla debe contener como mínimo:

```sql
id uuid primary key
external_entity_type text not null check (external_entity_type = 'REQUEST')
external_entity_id text not null
gema_property_id uuid not null references properties(id)

source_document_id text not null
source_document_type text not null -- REQUEST | QUOTE | PROPOSAL
source_document_name text not null
source_mime_type text
file_hash text not null
file_size_bytes bigint

status text not null
-- PENDING | PROCESSING | COMPLETED | FAILED | UNSUPPORTED | NEEDS_REVIEW

markdown_storage_path text
markdown_hash text
summary jsonb
evidence jsonb
model_provider text
ai_model text
prompt_version text
input_tokens integer
output_tokens integer
cost_usd numeric
error_code text
error_message text
attempt_count integer not null default 0
requested_by uuid references users(id)
validated_by uuid references users(id)
validated_at timestamptz
created_at timestamptz not null
updated_at timestamptz not null
completed_at timestamptz
```

También se requieren:

- Restricción única sobre `(source_document_id, file_hash)` para idempotencia.
- Índice sobre `(external_entity_type, external_entity_id)`.
- Índice por `status` para recoger trabajos pendientes desde el worker.
- RLS para lectura únicamente por usuarios autorizados al inmueble.
- Escritura sólo desde los servicios de backend con `service_role`.
- Almacenamiento del Markdown en un bucket privado; no guardar URLs firmadas ni
  Markdown grande en JSONB.

## Contrato del Resumen

La IA debe devolver JSON validado con Zod, no texto libre:

```json
{
  "resumenEjecutivo": "Conclusión factual y breve.",
  "estadoGeneral": "CONFORME | OBSERVADO | CRITICO | INSUFICIENTE",
  "hallazgos": [
    {
      "titulo": "Hallazgo",
      "severidad": "BAJA | MEDIA | ALTA | CRITICA",
      "equipoOArea": "Texto o null",
      "descripcion": "Hecho identificado en el informe",
      "impacto": "Riesgo operacional",
      "accionRecomendada": "Acción concreta",
      "prioridad": "INMEDIATA | 30_DIAS | PROGRAMAR | MONITOREAR",
      "evidencia": [{ "pagina": 3, "cita": "Fragmento literal" }]
    }
  ],
  "accionesPrioritarias": [],
  "datosFaltantes": [],
  "confianza": "ALTA | MEDIA | BAJA",
  "advertencia": "No reemplaza la revisión técnica humana."
}
```

Cada conclusión debe incluir evidencia verificable contra el informe. El modelo
no debe inventar mediciones, normas, lecturas ni diagnósticos.

## Plan de Implementación

1. Confirmar el tipo documental real del informe técnico en Alexperto y decidir
   si se admitirán documentos provenientes de `REQUEST`, `QUOTE` y `PROPOSAL`.
2. Crear la migración de Supabase con tabla, índices, RLS, políticas y mecanismo
   seguro para encolar trabajos.
3. Crear el servicio web que valide acceso, solicitud preventiva de 2026, tipo
   de archivo e idempotencia mediante el hash del PDF.
4. Implementar el worker Python aislado, con MarkItDown usando
   `convert_stream()` o `convert_local()`, y plugins deshabilitados por defecto.
5. Guardar el Markdown y su hash en Storage privado. Si el PDF no tiene texto
   útil, marcarlo como `NEEDS_REVIEW` en vez de producir un resumen engañoso.
6. Integrar OpenRouter desde el worker, con secreto sólo de servidor, límite de
   tokens, temperatura baja, timeout, presupuesto y reintentos controlados.
7. Dividir Markdown extenso por secciones o páginas, resumir fragmentos y
   consolidar el resultado final estructurado.
8. Validar la respuesta del modelo con Zod antes de persistirla; si es inválida,
   reintentar una vez y luego registrar el fallo.
9. Añadir `POST /api/alexperto/solicitudes/:id/analisis` y
   `GET /api/alexperto/solicitudes/:id/analisis`, ambos con autenticación y
   verificación de acceso al inmueble.
10. Añadir una sección `Resumen IA del informe técnico` en
    `RequestDetailDialog`, con estados sin informe, no elegible, pendiente,
    procesando, listo, error y requiere revisión.
11. Incluir validación humana del análisis, registrando usuario y fecha.
12. Iniciar con generación manual; después de validar calidad y costo, añadir
    una tarea programada de carga limitada para nuevos documentos.

## Seguridad y Privacidad

- Los PDFs pueden contener datos de clientes, técnicos e inmuebles. OpenRouter
  envía las solicitudes al proveedor del modelo seleccionado; se debe aprobar
  previamente el proveedor, retención y región de procesamiento.
- La clave `OPENROUTER_API_KEY` debe existir sólo en secretos de backend/worker.
- Validar MIME real, firma PDF, tamaño, páginas, hash, tiempo máximo y memoria.
- No pasar URLs, rutas ni archivos controlados por usuarios directamente a
  MarkItDown. Usar una descarga validada desde S3 y la API más restringida.
- Tratar el texto del informe como entrada no confiable: el prompt debe ignorar
  instrucciones contenidas en el documento que intenten alterar la tarea.
- No guardar URLs S3 firmadas, y eliminar derivados cuando la política de
  retención o la eliminación del documento fuente lo requiera.

## Calidad, Costos y Operación

- Usar un modelo con buen desempeño en español, JSON fiable, contexto suficiente
  y política de privacidad aceptable.
- Registrar modelo, versión de prompt, tokens, costo, hash, salida, evidencia,
  errores y validación humana para auditoría.
- Aplicar límites por documento y por mes; el hash evita pagar por analizar el
  mismo archivo sin cambios.
- Los PDFs escaneados necesitan OCR. Evaluarlo explícitamente porque eleva costo
  y puede enviar imágenes del documento a otro proveedor.
- La IA debe priorizar riesgos y recomendar acciones, nunca aprobar trabajos ni
  reemplazar la revisión o firma de un responsable técnico.
- Probar PDF digital, escaneado, corrupto, muy grande, sin texto, no preventivo
  y fuera de 2026, además de autorización, RLS e idempotencia.

## Despliegue Progresivo

1. Habilitar generación manual para informes nuevos y una selección de informes
   existentes de 2026.
2. Evaluar los resultados con revisión técnica humana y medir costo por informe.
3. Corregir el prompt, contrato JSON y manejo de OCR según los hallazgos.
4. Activar una carga histórica limitada y, finalmente, automatización para
   documentos nuevos.

## Decisión Pendiente

Definir si la primera versión procesará todos los informes existentes de 2026 o
sólo informes nuevos. Se recomienda iniciar con ejecución manual y controlada,
antes de realizar una carga histórica automática.
