'use client';

import Link from 'next/link';

import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthMessages } from '@/components/auth/auth-messages';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { AuthShell } from '@/components/auth-shell';
import { useResetPassword } from '@/hooks/auth/use-reset-password';

export default function ResetPasswordPage() {
  const resetPassword = useResetPassword();

  return (
    <AuthShell
      title="Nueva contrasena"
      description="Termina la recuperacion y vuelve a entrar al panel con tu nueva clave.">
      <form className="mt-6 grid gap-4" onSubmit={resetPassword.onSubmit}>
        <AuthFormField
          label="Nueva contrasena (minimo 8)"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={resetPassword.password}
          onChange={resetPassword.setPassword}
        />
        <AuthFormField
          label="Confirmar contrasena"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={resetPassword.confirmPassword}
          onChange={resetPassword.setConfirmPassword}
        />
        <AuthSubmitButton
          isSubmitting={resetPassword.isSubmitting}
          submittingLabel="Actualizando..."
          disabled={!resetPassword.isFormValid || !resetPassword.isReady}>
          Actualizar contrasena
        </AuthSubmitButton>
      </form>

      <AuthMessages
        errorMessage={resetPassword.errorMessage}
        message={resetPassword.message}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-950/10 bg-emerald-50/70 p-4 text-sm text-slate-600">
        <Link
          className="font-black text-emerald-900 underline-offset-4 hover:underline"
          href="/login">
          Ir a iniciar sesion
        </Link>
        <Link
          className="font-black text-emerald-900 underline-offset-4 hover:underline"
          href="/forgot-password">
          Solicitar nuevo enlace
        </Link>
      </div>
    </AuthShell>
  );
}
