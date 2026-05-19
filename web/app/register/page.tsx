'use client';

import Link from 'next/link';

import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthMessages } from '@/components/auth/auth-messages';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { AuthShell } from '@/components/auth-shell';
import { useRegister } from '@/hooks/auth/use-register';

export default function RegisterPage() {
  const register = useRegister();

  return (
    <AuthShell
      title="Crear cuenta"
      description="Solicita acceso al panel con tu correo administrativo.">
      <form className="mt-6 grid gap-4" onSubmit={register.onSubmit}>
        <AuthFormField
          label="Correo"
          type="email"
          autoComplete="email"
          value={register.email}
          onChange={register.setEmail}
        />
        <AuthFormField
          label="Contrasena (minimo 8)"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={register.password}
          onChange={register.setPassword}
        />
        <AuthFormField
          label="Confirmar contrasena"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={register.confirmPassword}
          onChange={register.setConfirmPassword}
        />
        <AuthSubmitButton
          isSubmitting={register.isSubmitting}
          submittingLabel="Creando..."
          disabled={!register.isFormValid}>
          Crear cuenta
        </AuthSubmitButton>
      </form>

      <AuthMessages
        errorMessage={register.errorMessage}
        message={register.message}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-950/10 bg-emerald-50/70 p-4 text-sm text-slate-600">
        <Link
          className="font-black text-emerald-900 underline-offset-4 hover:underline"
          href="/login">
          Ya tengo cuenta
        </Link>
        <Link
          className="font-black text-emerald-900 underline-offset-4 hover:underline"
          href="/forgot-password">
          Olvide mi contrasena
        </Link>
      </div>
    </AuthShell>
  );
}
