import type {
  LocalUserRecord,
  OfflineAuditSession,
  StoredPhoto,
} from '@/types/auditoria';

export function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseJsonSafely<T>(rawValue: string | null): T | null {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Date(value).toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSyncStatusLabel(
  syncStatus: OfflineAuditSession['sync_status'],
) {
  if (syncStatus === 'synced') return 'Subida';
  if (syncStatus === 'syncing') return 'Subiendo';
  if (syncStatus === 'error') return 'Error';
  return 'Pendiente';
}

export function normalizeAuditStatus(
  value: string | undefined,
): 'OK' | 'OBS' | 'N/A' {
  if (value === 'OK' || value === 'OBS') {
    return value;
  }

  return 'N/A';
}

function normalizePhotoUri(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }

  return null;
}

function buildSupabasePublicPhotoUrl(
  bucket: string | undefined,
  path: string | undefined,
): string | null {
  const normalizedPath = path?.trim();
  const normalizedBucket = bucket?.trim();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();

  if (!normalizedPath || !normalizedBucket || !supabaseUrl) {
    return null;
  }

  const baseUrl = supabaseUrl.replace(/\/+$/, '');
  const safePath = normalizedPath.replace(/^\/+/, '');

  return `${baseUrl}/storage/v1/object/public/${normalizedBucket}/${safePath}`;
}

export function extractPhotoUris(photos: StoredPhoto[] | undefined): string[] {
  if (!photos?.length) {
    return [];
  }

  const uris = photos
    .map(photo => {
      const fromLocalUri = normalizePhotoUri(photo.local_uri);
      if (fromLocalUri) {
        return fromLocalUri;
      }

      const fromPath = normalizePhotoUri(photo.path);
      if (fromPath) {
        return fromPath;
      }

      return buildSupabasePublicPhotoUrl(photo.bucket, photo.path);
    })
    .filter((uri): uri is string => Boolean(uri));

  return Array.from(new Set(uris));
}

export function getAuditorDisplayLabel(user: LocalUserRecord | null): string {
  if (!user) {
    return 'Auditor no identificado';
  }

  const firstName = user.first_name?.trim() || '';
  const lastName = user.last_name?.trim() || '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  const email = user.email?.trim();
  if (email) {
    return email;
  }

  const username = user.username?.trim();
  if (username) {
    return username;
  }

  return 'Auditor no identificado';
}
