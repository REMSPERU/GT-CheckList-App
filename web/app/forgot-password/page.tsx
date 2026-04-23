'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { getSiteUrl, getSupabaseClient } from '@/lib/supabase-browser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/reset-password`,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage(
        'Te enviamos un correo con el enlace para cambiar tu contrasena.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Recuperar contrasena"
      description="Ingresa tu correo y enviaremos un enlace para restablecerla.">
      <form onSubmit={onSubmit}>
        <label>
          Correo
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>

      {errorMessage ? (
        <div className="feedback error">{errorMessage}</div>
      ) : null}
      {message ? <div className="feedback ok">{message}</div> : null}

      <div className="links">
        <Link href="/login">Volver a iniciar sesion</Link>
      </div>
    </AuthShell>
  );
}
