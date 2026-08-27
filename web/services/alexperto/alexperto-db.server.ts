import 'server-only';

import { Pool } from 'pg';

function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

let pool: Pool | null = null;

export function getAlexpertoPool() {
  if (pool) return pool;
  pool = new Pool({
    host: required(process.env.DATABASE_HOST, 'DATABASE_HOST'),
    port: Number(process.env.DATABASE_PORT ?? 5432),
    database: required(process.env.DATABASE_NAME, 'DATABASE_NAME'),
    user: required(process.env.DATABASE_USER, 'DATABASE_USER'),
    password: required(process.env.DATABASE_PASSWORD, 'DATABASE_PASSWORD'),
    // Mantiene el cifrado TLS, pero no valida la CA del certificado remoto.
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: 'gema-web',
  });
  return pool;
}
