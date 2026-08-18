# Integracion de documentos S3 de Alexperto con GEMA

## Objetivo

Permitir que GEMA muestre documentos asociados a cotizaciones de Alexperto sin
hacer publico el bucket, sin guardar archivos duplicados y sin exponer
credenciales AWS al navegador o a la aplicacion movil.

La primera version debe ser de solo lectura. El servidor web de GEMA consulta la
base de Alexperto, valida el acceso del usuario y genera una URL prefirmada de
S3 con una duracion corta.

## Datos confirmados

| Dato | Valor |
| --- | --- |
| Bucket | `file-bucket-alexperto-prod` |
| Region | `us-east-1` |
| Prefijo principal | `x2jaa90r1h22ju3o8wv7v36a/` |
| Base de Alexperto | `db_alexperto_prod` |
| Usuario de base usado por GEMA | `readonly_user` |

La URL observada en Alexperto tiene este formato:

```text
https://file-bucket-alexperto-prod.s3.us-east-1.amazonaws.com/<object-key>?X-Amz-...
```

Los parametros `X-Amz-*` indican que es una URL prefirmada temporal. No es una
URL publica y no debe almacenarse como si fuera permanente.

## Relacion con las cotizaciones

Para documentos de cotizaciones:

```text
sch_main.quotes.id
    <- sch_main.quote_documents.quote_id
```

Campos principales de `sch_main.quote_documents`:

```text
id
quote_id

Para documentos de propuestas:

```text
sch_main.quotes.id
    <- sch_main.proposals.quote_id
sch_main.proposals.id
    <- sch_main.proposal_documents.proposal_id
```

Campos principales de `sch_main.proposal_documents`:

```text
id
proposal_id

Ejemplo confirmado:

```text
Codigo de cotizacion: CO-7881
Quote ID: olajzt28bh38xli60kpe8h
Proposal ID: xzr7rrwioxi0bdtl3iajmstk
Object key: x2jaa90r1h22ju3o8wv7v36a/proposals/xzr7rrwioxi0bdtl3iajmstk/documents/szjkryq77gzxdpl9v6ub1rlb.pdf
Archivo: Cotizacion_Nro - 00230-2026-NETJP Wiesse.pdf
```

La clave S3 no usa necesariamente el codigo visible `CO-7881`; usa el ID interno
de la propuesta o cotizacion.

## Estructura esperada en S3

```text
s3://file-bucket-alexperto-prod/
  x2jaa90r1h22ju3o8wv7v36a/
    quotes/{quote_id}/documents/{file}
    proposals/{proposal_id}/documents/{file}
    requests/{request_id}/documents/{file}
```

Los prefijos `requests`, `quotes` y `proposals` deben verificarse con los datos
de Alexperto antes de implementar cada modulo.

## Crear acceso AWS para el servidor GEMA

### Opcion recomendada para produccion: IAM Role

Si GEMA corre en ECS, EC2, Lambda, Elastic Beanstalk u otro servicio AWS, se debe
asignar un IAM Role al servicio. No se crean access keys permanentes. Es la opcion
recomendada para produccion.

### Opcion inicial: usuario IAM tecnico

Usar esta opcion solamente si el servidor GEMA esta fuera de AWS o todavia no se
puede asignar un role.

1. Entrar a la cuenta AWS correcta.
2. Abrir **IAM**.
3. Entrar a **Users** y seleccionar **Create user**.
4. Crear un usuario con un nombre como `gema-s3-alexperto-readonly`.
5. No habilitar acceso a la consola AWS para este usuario.
6. En permisos, elegir **Add permissions** y luego **Create inline policy**.
7. Seleccionar la vista **JSON** y colocar la politica siguiente.
8. Reemplazar solamente si el prefijo autorizado cambia.
9. Crear el usuario.
10. Entrar a **Security credentials**.
11. Crear un **Access key** para `Application running outside AWS`.
12. Guardar `Access key ID` y `Secret access key` una sola vez en el gestor de
    secretos del servidor.
13. No enviarlas por correo, WhatsApp, Git, `.env` versionado, frontend o Expo.

Politica minima para leer documentos del tenant de Alexperto:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListAlexpertoDocumentPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::file-bucket-alexperto-prod",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "x2jaa90r1h22ju3o8wv7v36a",
            "x2jaa90r1h22ju3o8wv7v36a/*"
          ]
        }
      }
    },
    {
      "Sid": "ReadAlexpertoDocuments",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::file-bucket-alexperto-prod/x2jaa90r1h22ju3o8wv7v36a/*"
    }
  ]
}
```

No agregar `s3:PutObject`, `s3:DeleteObject`, `s3:*` ni permisos de administrador.

## Verificar el acceso sin exponer secretos

En el servidor, configurar temporalmente las variables privadas:

```text
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=file-bucket-alexperto-prod
AWS_S3_PREFIX=x2jaa90r1h22ju3o8wv7v36a
```

No usar el prefijo `EXPO_PUBLIC_` para ninguna de estas variables.

Con AWS CLI instalado, probar solamente lectura y listado:

```powershell
$env:AWS_ACCESS_KEY_ID = 'ACCESS_KEY_ID_LOCAL'
$env:AWS_SECRET_ACCESS_KEY = 'SECRET_ACCESS_KEY_LOCAL'
$env:AWS_DEFAULT_REGION = 'us-east-1'

aws s3api head-object `
  --bucket file-bucket-alexperto-prod `
  --key 'x2jaa90r1h22ju3o8wv7v36a/proposals/xzr7rrwioxi0bdtl3iajmstk/documents/szjkryq77gzxdpl9v6ub1rlb.pdf'
```

No usar `aws s3 cp` en el servidor como mecanismo de la aplicacion. La aplicacion
debe generar URLs prefirmadas bajo demanda.

## Implementacion en GEMA

### Flujo del servidor

```text
Usuario autenticado
  -> API Route de GEMA
  -> valida rol y inmueble autorizado
  -> consulta quote/proposal/document en Alexperto
  -> obtiene document_path
  -> genera URL S3 prefirmada de solo lectura
  -> devuelve URL temporal al navegador
```

El navegador nunca debe recibir:

- `AWS_ACCESS_KEY_ID`.
- `AWS_SECRET_ACCESS_KEY`.
- Credenciales STS.
- Acceso SQL de Alexperto.
- Una URL S3 almacenada permanentemente.

### Consulta para documentos de una cotizacion

```sql
SELECT
  q.id AS quote_id,
  q.code AS quote_code,
  d.id AS document_id,
  d.document_name,
  d.document_path,
  d.mime_type,
  d.document_size,
  d.created_at
FROM sch_main.quote_documents d
JOIN sch_main.quotes q ON q.id = d.quote_id
WHERE q.id = $1
  AND d.deleted_at IS NULL
ORDER BY d.created_at DESC;
```

### Consulta para documentos de propuestas de una cotizacion

```sql
SELECT
  q.id AS quote_id,
  q.code AS quote_code,
  p.id AS proposal_id,
  d.id AS document_id,
  d.document_name,
  d.document_path,
  d.mime_type,
  d.document_size,
  d.created_at
FROM sch_main.proposal_documents d
JOIN sch_main.proposals p ON p.id = d.proposal_id
JOIN sch_main.quotes q ON q.id = p.quote_id
WHERE q.id = $1
  AND d.deleted_at IS NULL
ORDER BY d.created_at DESC;
```

### URL prefirmada

El servidor debe usar el SDK oficial de AWS S3 y una expiracion corta, por ejemplo
5 minutos. La key debe venir de `document_path`, pero debe validarse antes contra
la cotizacion y el inmueble autorizado.

No construir una URL usando solamente el codigo `CO-xxxx`, porque S3 usa la clave
interna completa.

## Orden recomendado de trabajo

1. Crear el usuario IAM tecnico o, preferentemente, el IAM Role del servidor.
2. Aplicar la politica de solo lectura restringida al bucket y prefijo.
3. Probar `head-object` con un documento conocido.
4. Guardar las variables AWS en el gestor de secretos del servidor.
5. Agregar el SDK S3 al proyecto web, no al proyecto Expo.
6. Crear un servicio de servidor para generar URLs prefirmadas.
7. Crear una API Route protegida por `requireAlexpertoAccessSession`.
8. Validar el mapeo de inmueble GEMA y la autorizacion del usuario.
9. Mostrar el documento con la URL temporal.
10. Registrar auditoria de quien solicito el documento, sin guardar la URL completa.
11. Rotar las claves del usuario IAM cuando se implemente un IAM Role.

## Seguridad pendiente

La URL prefirmada compartida durante el diagnostico contiene un token STS y una
firma temporal. Debe considerarse expuesta. Su validez termina al expirar
`X-Amz-Expires`, pero no debe compartirse nuevamente ni guardarse en el
repositorio.

El archivo `docs/datos/03_alexperto_documentos_diagnostico.sql` contiene las
consultas utilizadas para descubrir las tablas y columnas de documentos.
