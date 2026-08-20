import 'server-only';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type {
  AlexpertoQuoteDocument,
  AlexpertoRequestDocument,
} from '@/types/alexperto';

import { getAlexpertoPool } from './alexperto-db.server';

interface QuoteDocumentRow {
  document_id: string;
  document_name: string | null;
  document_path: string;
  mime_type: string | null;
  document_size: string | null;
  created_at: string;
  source: 'QUOTE' | 'PROPOSAL';
}

interface RequestDocumentRow {
  document_id: string;
  document_name: string | null;
  document_path: string;
  mime_type: string | null;
  document_size: string | null;
  created_at: string;
  type_name: string | null;
  source: 'REQUEST' | 'QUOTE' | 'PROPOSAL';
}

function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getS3Config() {
  return {
    bucket: required(process.env.AWS_S3_BUCKET, 'AWS_S3_BUCKET'),
    prefix: required(process.env.AWS_S3_PREFIX, 'AWS_S3_PREFIX').replace(
      /\/+$/,
      '',
    ),
    region: required(process.env.AWS_REGION, 'AWS_REGION'),
  };
}

function validateDocumentPath(path: string, prefix: string) {
  const key = path.replace(/^\/+/, '');
  if (!key.startsWith(`${prefix}/`)) throw new Error('INVALID_DOCUMENT_PATH');
  return key;
}

let s3Client: S3Client | null = null;

function getS3Client(region: string) {
  if (!s3Client) s3Client = new S3Client({ region });
  return s3Client;
}

export async function listAlexpertoQuoteDocuments(quoteId: string) {
  const { rows } = await getAlexpertoPool().query<QuoteDocumentRow>({
    text: `
      SELECT d.id AS document_id, d.document_name, d.document_path, d.mime_type,
        d.document_size, d.created_at, 'QUOTE'::text AS source
      FROM sch_main.quote_documents d
      WHERE d.quote_id = $1 AND d.deleted_at IS NULL
      UNION ALL
      SELECT d.id AS document_id, d.document_name, d.document_path, d.mime_type,
        d.document_size, d.created_at, 'PROPOSAL'::text AS source
      FROM sch_main.proposal_documents d
      INNER JOIN sch_main.proposals p ON p.id = d.proposal_id
      WHERE p.quote_id = $1 AND d.deleted_at IS NULL
      ORDER BY created_at DESC
    `,
    values: [quoteId],
  });

  return rows.map(row => ({
    id: String(row.document_id),
    name: row.document_name?.trim() || 'Documento sin nombre',
    mimeType: row.mime_type,
    size: row.document_size === null ? null : Number(row.document_size),
    createdAt: new Date(row.created_at).toISOString(),
    source: row.source,
  })) satisfies AlexpertoQuoteDocument[];
}

export async function getAlexpertoQuoteDocumentUrl(
  quoteId: string,
  documentId: string,
  source?: 'QUOTE' | 'PROPOSAL',
) {
  const { rows } = await getAlexpertoPool().query<QuoteDocumentRow>({
    text: `
      SELECT d.id AS document_id, d.document_name, d.document_path, d.mime_type,
        d.document_size, d.created_at, 'QUOTE'::text AS source
      FROM sch_main.quote_documents d
      WHERE d.id = $2 AND d.quote_id = $1 AND d.deleted_at IS NULL
        AND ($3::text IS NULL OR $3 = 'QUOTE')
      UNION ALL
      SELECT d.id AS document_id, d.document_name, d.document_path, d.mime_type,
        d.document_size, d.created_at, 'PROPOSAL'::text AS source
      FROM sch_main.proposal_documents d
      INNER JOIN sch_main.proposals p ON p.id = d.proposal_id
      WHERE d.id = $2 AND p.quote_id = $1 AND d.deleted_at IS NULL
        AND ($3::text IS NULL OR $3 = 'PROPOSAL')
      LIMIT 1
    `,
    values: [quoteId, documentId, source ?? null],
  });
  const document = rows[0];
  if (!document) return null;

  const { bucket, prefix, region } = getS3Config();
  const key = validateDocumentPath(document.document_path, prefix);
  const url = await getSignedUrl(
    getS3Client(region),
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 300 },
  );
  return url;
}

export async function listAlexpertoRequestDocuments(requestId: string) {
  const { rows } = await getAlexpertoPool().query<RequestDocumentRow>({
    text: `
      SELECT d.id AS document_id, d.document_name, d.document_path, d.mime_type,
        d.document_size, d.created_at, dt.name AS type_name,
        'REQUEST'::text AS source
      FROM sch_main.request_documents d
       LEFT JOIN sch_main.request_document_type dt ON dt.id = d.type_id
      WHERE d.request_id = $1 AND d.deleted_at IS NULL
      UNION ALL
      SELECT d.id AS document_id, d.document_name, d.document_path, d.mime_type,
        d.document_size, d.created_at, 'Cotización'::text AS type_name,
        'QUOTE'::text AS source
      FROM sch_main.quote_documents d
       INNER JOIN sch_main.quotes q ON (
         q.id = d.quote_id AND
         (q.generated_request_id = $1 OR q.trigger_request_id = $1)
       )
      WHERE d.deleted_at IS NULL
      UNION ALL
      SELECT d.id AS document_id, d.document_name, d.document_path, d.mime_type,
        d.document_size, d.created_at, 'Propuesta'::text AS type_name,
        'PROPOSAL'::text AS source
      FROM sch_main.proposal_documents d
       INNER JOIN sch_main.proposals p ON p.id = d.proposal_id
       INNER JOIN sch_main.quotes q ON (
         q.id = p.quote_id AND
         (q.generated_request_id = $1 OR q.trigger_request_id = $1)
       )
      WHERE d.deleted_at IS NULL
      ORDER BY created_at DESC
    `,
    values: [requestId],
  });

  return rows.map(row => ({
    id: String(row.document_id),
    name: row.document_name?.trim() || 'Documento sin nombre',
    typeName: row.type_name?.trim() || 'Sin tipo',
    mimeType: row.mime_type,
    size: row.document_size === null ? null : Number(row.document_size),
    createdAt: new Date(row.created_at).toISOString(),
    source: row.source,
  })) satisfies AlexpertoRequestDocument[];
}

export async function getAlexpertoRequestDocumentUrl(
  requestId: string,
  documentId: string,
) {
  const { rows } = await getAlexpertoPool().query<RequestDocumentRow>({
    text: `
      SELECT d.id AS document_id, d.document_name, d.document_path, d.mime_type,
        d.document_size, d.created_at, dt.name AS type_name,
        'REQUEST'::text AS source
      FROM sch_main.request_documents d
       LEFT JOIN sch_main.request_document_type dt ON dt.id = d.type_id
      WHERE d.id = $2 AND d.request_id = $1 AND d.deleted_at IS NULL
      UNION ALL
      SELECT d.id AS document_id, d.document_name, d.document_path, d.mime_type,
        d.document_size, d.created_at, 'Cotización'::text AS type_name,
        'QUOTE'::text AS source
      FROM sch_main.quote_documents d
       INNER JOIN sch_main.quotes q ON (
         q.id = d.quote_id AND
         (q.generated_request_id = $1 OR q.trigger_request_id = $1)
       )
      WHERE d.id = $2 AND d.deleted_at IS NULL
      UNION ALL
      SELECT d.id AS document_id, d.document_name, d.document_path, d.mime_type,
        d.document_size, d.created_at, 'Propuesta'::text AS type_name,
        'PROPOSAL'::text AS source
      FROM sch_main.proposal_documents d
       INNER JOIN sch_main.proposals p ON p.id = d.proposal_id
       INNER JOIN sch_main.quotes q ON (
         q.id = p.quote_id AND
         (q.generated_request_id = $1 OR q.trigger_request_id = $1)
       )
      WHERE d.id = $2 AND d.deleted_at IS NULL
      LIMIT 1
    `,
    values: [requestId, documentId],
  });
  const document = rows[0];
  if (!document) return null;

  const { bucket, prefix, region } = getS3Config();
  const key = validateDocumentPath(document.document_path, prefix);
  return getSignedUrl(
    getS3Client(region),
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 300 },
  );
}
