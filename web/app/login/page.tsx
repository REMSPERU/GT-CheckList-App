'use client';

import Link from 'next/link';
import { Mail, Lock, UserPlus } from 'lucide-react';

import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthMessages } from '@/components/auth/auth-messages';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { AuthShell } from '@/components/auth-shell';
import { useLogin } from '@/hooks/auth/use-login';

export default function LoginPage() {
  const login = useLogin();

  return (
    <AuthShell
      title="Iniciar sesión"
      description="Ingresa tus credenciales autorizadas para acceder al panel administrativo.">
      <form className="mt-6 space-y-4" onSubmit={login.onSubmit}>
        <AuthFormField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="admin@empresa.com"
          leftIcon={<Mail className="h-4 w-4" />}
          value={login.email}
          onChange={login.setEmail}
        />

        <AuthFormField
          label="Contraseña"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          action={
            <Link
              className="text-xs font-semibold text-emerald-800 underline-offset-4 hover:underline hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1"
              href="/forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          }
          type="password"
          autoComplete="current-password"
          value={login.password}
          onChange={login.setPassword}
        />

        <AuthSubmitButton
          isSubmitting={login.isSubmitting}
          submittingLabel="Iniciando sesión...">
          Ingresar al panel
        </AuthSubmitButton>
      </form>

      <div className="mt-4">
        <AuthMessages errorMessage={login.errorMessage} message={login.message} />
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs sm:text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-emerald-800 shrink-0" />
          <span>¿No tienes usuario?</span>
        </div>
        <Link
          className="font-bold text-emerald-800 underline-offset-4 hover:underline hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1"
          href="/register">
          Solicitar cuenta
        </Link>
      </div>
    </AuthShell>
  );
}
