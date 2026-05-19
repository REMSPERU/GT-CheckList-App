'use client';

import Link from 'next/link';

import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthMessages } from '@/components/auth/auth-messages';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { AuthShell } from '@/components/auth-shell';
import { useForgotPassword } from '@/hooks/auth/use-forgot-password';

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();

  return (
    <AuthShell
      title="Recuperar contrasena"
      description="Te enviaremos un enlace seguro para definir una nueva contrasena.">
      <form className="mt-6 grid gap-4" onSubmit={forgotPassword.onSubmit}>
        <AuthFormField
          label="Correo"
          type="email"
          autoComplete="email"
          value={forgotPassword.email}
          onChange={forgotPassword.setEmail}
        />
        <AuthSubmitButton
          isSubmitting={forgotPassword.isSubmitting}
          submittingLabel="Enviando...">
          Enviar enlace
        </AuthSubmitButton>
      </form>

      <AuthMessages
        errorMessage={forgotPassword.errorMessage}
        message={forgotPassword.message}
      />

      <div className="mt-5 rounded-2xl border border-emerald-950/10 bg-emerald-50/70 p-4 text-sm text-slate-600">
        <Link
          className="font-black text-emerald-900 underline-offset-4 hover:underline"
          href="/login">
          Volver a iniciar sesion
        </Link>
      </div>
    </AuthShell>
  );
}
