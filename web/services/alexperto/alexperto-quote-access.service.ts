import type { SupabaseClient } from '@supabase/supabase-js';

import { resolveAuthorizedProperties } from './alexperto-access.service';
import { findAuthorizedQuoteProperty } from './alexperto-quotes.service';

export async function requireAuthorizedQuote(
  quoteId: string,
  userSupabase: SupabaseClient,
) {
  const properties = await resolveAuthorizedProperties(userSupabase);
  const property = await findAuthorizedQuoteProperty(quoteId, properties);
  if (!property) throw new Error('FORBIDDEN');
  return property;
}
