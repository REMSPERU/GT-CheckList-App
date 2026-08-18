import type { SupabaseClient } from '@supabase/supabase-js';

import { resolveAuthorizedProperties } from './alexperto-access.service';
import { findAuthorizedRequestProperty } from './alexperto-requests.service';

export async function requireAuthorizedRequest(
  requestId: string,
  userSupabase: SupabaseClient,
) {
  const properties = await resolveAuthorizedProperties(userSupabase);
  const property = await findAuthorizedRequestProperty(requestId, properties);
  if (!property) throw new Error('FORBIDDEN');
  return property;
}
