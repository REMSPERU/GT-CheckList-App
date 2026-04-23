'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function getEnvValues() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getEnvValues();
  browserClient = createClient(supabaseUrl, supabaseAnonKey);

  return browserClient;
}

export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}
