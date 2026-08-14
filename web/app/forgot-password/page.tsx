'use client';

import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';

import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthMessages } from '@/components/auth/auth-messages';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { AuthShell } from '@/components/auth-shell';
import { useForgotPassword } from '@/hooks/auth/use-forgot-password';

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();

  return (
    <AuthShell
      title="Recuperar contraseña"
      description="Ingresa tu correo y te enviaremos un enlace seguro para restablecer tu acceso.">
      <form className="mt-6 space-y-4" onSubmit={forgotPassword.onSubmit}>
        <AuthFormField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="admin@empresa.com"
          leftIcon={<Mail className="h-4 w-4" />}
          value={forgotPassword.email}
          onChange={forgotPassword.setEmail}
        />

        <AuthSubmitButton
          isSubmitting={forgotPassword.isSubmitting}
          submittingLabel="Enviando enlace...">
          Enviar enlace de recuperación
        </AuthSubmitButton>
      </form>

      <div className="mt-4">
        <AuthMessages
          errorMessage={forgotPassword.errorMessage}
          message={forgotPassword.message}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-center text-xs sm:text-sm text-slate-700">
        <Link
          className="inline-flex items-center gap-1.5 font-bold text-emerald-800 underline-offset-4 hover:underline hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded px-1"
          href="/login">
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a iniciar sesión
        </Link>
      </div>
    </AuthShell>
  );
}
