'use client';

import Link from 'next/link';
import { Mail, Lock, KeyRound, ArrowLeft } from 'lucide-react';

import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthMessages } from '@/components/auth/auth-messages';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { AuthShell } from '@/components/auth-shell';
import { useRegister } from '@/hooks/auth/use-register';

export default function RegisterPage() {
  const register = useRegister();

  const passwordsMatch =
    register.password &&
    register.confirmPassword &&
    register.password === register.confirmPassword;
  const passwordsDontMatch =
    register.password &&
    register.confirmPassword &&
    register.password !== register.confirmPassword;

  return (
    <AuthShell
      title="Crear cuenta"
      description="Solicita acceso para registrarte en el portal de gestión técnica.">
      <form className="mt-6 space-y-4" onSubmit={register.onSubmit}>
        <AuthFormField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="admin@empresa.com"
          leftIcon={<Mail className="h-4 w-4" />}
          value={register.email}
          onChange={register.setEmail}
        />

        <AuthFormField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          leftIcon={<Lock className="h-4 w-4" />}
          hint="Debe tener al menos 8 caracteres"
          value={register.password}
          onChange={register.setPassword}
        />

        <AuthFormField
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Repite tu contraseña"
          leftIcon={<KeyRound className="h-4 w-4" />}
          hint={
            passwordsDontMatch
              ? 'Las contraseñas no coinciden aún'
              : passwordsMatch
              ? '✓ Las contraseñas coinciden'
              : undefined
          }
          value={register.confirmPassword}
          onChange={register.setConfirmPassword}
        />

        <AuthSubmitButton
          isSubmitting={register.isSubmitting}
          submittingLabel="Registrando..."
          disabled={!register.isFormValid}>
          Registrar cuenta
        </AuthSubmitButton>
      </form>

      <div className="mt-4">
        <AuthMessages
          errorMessage={register.errorMessage}
          message={register.message}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs sm:text-sm text-slate-700">
        <Link
          className="flex items-center gap-1.5 font-bold text-emerald-800 underline-offset-4 hover:underline hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1"
          href="/login">
          <ArrowLeft className="h-3.5 w-3.5" />
          Ya tengo cuenta
        </Link>
        <Link
          className="font-medium text-slate-700 underline-offset-4 hover:underline hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1"
          href="/forgot-password">
          Recuperar acceso
        </Link>
      </div>
    </AuthShell>
  );
}
