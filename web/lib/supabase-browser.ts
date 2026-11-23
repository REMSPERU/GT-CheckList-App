'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

import { getPublicSupabaseEnv } from '@/lib/supabase-env';

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabasePublishableKey } = getPublicSupabaseEnv();
  browserClient = createClient(supabaseUrl, supabasePublishableKey);

  return browserClient;
}

export function getSiteUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000');

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url.replace(/\/+$/, '');
}
