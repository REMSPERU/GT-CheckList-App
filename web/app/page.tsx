'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { getSupabaseClient } from '@/lib/supabase-browser';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function routeBySession() {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      router.replace(session?.user ? '/admin' : '/login');
    }

    void routeBySession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <AuthShell
      title="Portal administrativo"
      description="Estamos preparando tu acceso al panel web de GEMA.">
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-900/10 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-950">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-900/20 border-t-emerald-800" />
        Validando acceso...
      </div>
    </AuthShell>
  );
}
