'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { AuthShell } from '@/components/auth-shell';

export default function HomePage() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hash = window.location.hash;
    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const type = params.get('type');
    const hasAccessToken = params.has('access_token');

    if (type === 'recovery' && hasAccessToken) {
      window.location.replace(`/reset-password${hash}`);
    }
  }, []);

  return (
    <AuthShell
      title="Portal de acceso"
      description="Por ahora esta web maneja registro y recuperacion de contrasena.">
      <div className="links">
        <Link href="/register">Crear cuenta</Link>
        <Link href="/login">Iniciar sesion</Link>
        <Link href="/forgot-password">Olvide mi contrasena</Link>
      </div>
    </AuthShell>
  );
}
