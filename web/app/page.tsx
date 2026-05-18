import Link from 'next/link';

import { AuthShell } from '@/components/auth-shell';

export default function HomePage() {
  return (
    <AuthShell
      title="Portal administrativo"
      description="Gestiona inmuebles, equipos y mantenimientos desde la web.">
      <div className="mt-3.5 flex flex-wrap gap-3">
        <Link className="text-emerald-800 underline underline-offset-2" href="/login">
          Iniciar sesion
        </Link>
        <Link className="text-emerald-800 underline underline-offset-2" href="/admin">
          Entrar al panel
        </Link>
        <Link className="text-emerald-800 underline underline-offset-2" href="/register">
          Crear cuenta
        </Link>
        <Link
          className="text-emerald-800 underline underline-offset-2"
          href="/forgot-password">
          Olvide mi contrasena
        </Link>
      </div>
    </AuthShell>
  );
}
