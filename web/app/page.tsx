import Link from 'next/link';

import { AuthShell } from '@/components/auth-shell';

export default function HomePage() {
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
