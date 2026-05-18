'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';

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
      <form className="mt-[18px] grid gap-3" onSubmit={onSubmit}>
        <label className="text-sm font-semibold">
          Correo
          <input
            className="mt-1.5 h-11 w-full rounded-[10px] border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </label>

        <button
          className="mt-1 h-11 rounded-[10px] border-0 bg-emerald-800 px-4 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>

      {errorMessage ? (
        <div className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[0.95rem] text-red-800">
          {errorMessage}
        </div>
      ) : null}
      {message ? (
        <div className="mt-3 rounded-[10px] border border-green-200 bg-green-50 px-3 py-2.5 text-[0.95rem] text-green-800">
          {message}
        </div>
      ) : null}

      <div className="mt-3.5 flex flex-wrap gap-3">
        <Link className="text-emerald-800 underline underline-offset-2" href="/login">
          Volver a iniciar sesion
        </Link>
      </div>
    </AuthShell>
  );
}
