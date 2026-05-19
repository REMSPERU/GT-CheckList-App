'use client';

import Link from 'next/link';

import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthMessages } from '@/components/auth/auth-messages';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { AuthShell } from '@/components/auth-shell';
import { useLogin } from '@/hooks/auth/use-login';

export default function LoginPage() {
  const login = useLogin();

  return (
    <AuthShell
      title="Iniciar sesion"
      description="Ingresa con tu correo para entrar directo al panel administrativo.">
      <form className="mt-6 grid gap-4" onSubmit={login.onSubmit}>
        <AuthFormField
          label="Correo"
          type="email"
          autoComplete="email"
          value={login.email}
          onChange={login.setEmail}
        />
        <AuthFormField
          label={
            <span className="flex items-center justify-between gap-3">
              Contrasena
              <Link
                className="text-xs font-black text-emerald-800 underline-offset-4 hover:underline"
                href="/forgot-password">
                Olvide mi contrasena
              </Link>
            </span>
          }
          type="password"
          autoComplete="current-password"
          value={login.password}
          onChange={login.setPassword}
        />
        <AuthSubmitButton
          isSubmitting={login.isSubmitting}
          submittingLabel="Ingresando...">
          Ingresar
        </AuthSubmitButton>
      </form>

      <AuthMessages errorMessage={login.errorMessage} message={login.message} />

      <div className="mt-5 rounded-2xl border border-emerald-950/10 bg-emerald-50/70 p-4 text-sm text-slate-600">
        <span>No tienes usuario administrativo?</span>{' '}
        <Link
          className="font-black text-emerald-900 underline-offset-4 hover:underline"
          href="/register">
          Crear cuenta
        </Link>
      </div>
    </AuthShell>
  );
}
