import Link from 'next/link';

import { AuthShell } from '@/components/auth-shell';

export default function HomePage() {
  return (
    <AuthShell
      title="Portal administrativo"
      description="Gestiona inmuebles, equipos y mantenimientos desde la web.">
      <div className="links">
        <Link href="/login">Iniciar sesion</Link>
        <Link href="/admin">Entrar al panel</Link>
        <Link href="/register">Crear cuenta</Link>
        <Link href="/forgot-password">Olvide mi contrasena</Link>
      </div>
    </AuthShell>
  );
}
