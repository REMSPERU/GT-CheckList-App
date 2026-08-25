import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminRole } from '@/types/auth';

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

/** Verifies that an auditor can access a quote that was explicitly dispatched. */
export async function requireVisibleQuote(
  quoteId: string,
  userSupabase: SupabaseClient,
  serviceSupabase: SupabaseClient,
  role: AdminRole,
) {
  const property = await requireAuthorizedQuote(quoteId, userSupabase);
  if (role === 'SUPERADMIN') return property;

  const { data, error } = await serviceSupabase
    .from('alexperto_audit_actions')
    .select('id')
    .eq('external_entity_type', 'QUOTE')
    .eq('external_entity_id', quoteId)
    .eq('gema_property_id', property.id)
    .eq('auditor_dispatch_status', 'ENVIADO')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('FORBIDDEN');
  return property;
}
