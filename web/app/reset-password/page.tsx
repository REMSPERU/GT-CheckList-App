'use client';

import Link from 'next/link';
import { Lock, KeyRound, ArrowLeft } from 'lucide-react';

import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthMessages } from '@/components/auth/auth-messages';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { AuthShell } from '@/components/auth-shell';
import { useResetPassword } from '@/hooks/auth/use-reset-password';

export default function ResetPasswordPage() {
  const resetPassword = useResetPassword();

  const passwordsMatch =
    resetPassword.password &&
    resetPassword.confirmPassword &&
    resetPassword.password === resetPassword.confirmPassword;
  const passwordsDontMatch =
    resetPassword.password &&
    resetPassword.confirmPassword &&
    resetPassword.password !== resetPassword.confirmPassword;

  return (
    <AuthShell
      title="Nueva contraseña"
      description="Establece una nueva contraseña segura para restablecer el acceso a tu cuenta.">
      <form className="mt-6 space-y-4" onSubmit={resetPassword.onSubmit}>
        <AuthFormField
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          leftIcon={<Lock className="h-4 w-4" />}
          hint="Mínimo 8 caracteres"
          value={resetPassword.password}
          onChange={resetPassword.setPassword}
        />

        <AuthFormField
          label="Confirmar nueva contraseña"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Repite tu nueva contraseña"
          leftIcon={<KeyRound className="h-4 w-4" />}
          hint={
            passwordsDontMatch
              ? 'Las contraseñas no coinciden aún'
              : passwordsMatch
              ? '✓ Las contraseñas coinciden'
              : undefined
          }
          value={resetPassword.confirmPassword}
          onChange={resetPassword.setConfirmPassword}
        />

        <AuthSubmitButton
          isSubmitting={resetPassword.isSubmitting}
          submittingLabel="Actualizando..."
          disabled={!resetPassword.isFormValid || !resetPassword.isReady}>
          Guardar nueva contraseña
        </AuthSubmitButton>
      </form>

      <div className="mt-4">
        <AuthMessages
          errorMessage={resetPassword.errorMessage}
          message={resetPassword.message}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs sm:text-sm text-slate-700">
        <Link
          className="flex items-center gap-1.5 font-bold text-emerald-800 underline-offset-4 hover:underline hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1"
          href="/login">
          <ArrowLeft className="h-3.5 w-3.5" />
          Ir a iniciar sesión
        </Link>
        <Link
          className="font-medium text-slate-700 underline-offset-4 hover:underline hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1"
          href="/forgot-password">
          Solicitar nuevo enlace
        </Link>
      </div>
    </AuthShell>
  );
}
