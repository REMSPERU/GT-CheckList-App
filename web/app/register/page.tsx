'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { getSiteUrl, getSupabaseClient } from '@/lib/supabase-browser';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFormValid = useMemo(() => {
    return (
      email.length > 4 && password.length >= 8 && confirmPassword.length >= 8
    );
  }, [confirmPassword.length, email.length, password.length]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Las contrasenas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getSiteUrl()}/login`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage('Cuenta creada. Revisa tu correo para confirmar el registro.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Registro"
      description="Crea una cuenta con correo y contrasena.">
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

        <label className="text-sm font-semibold">
          Contrasena (minimo 8)
          <input
            className="mt-1.5 h-11 w-full rounded-[10px] border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </label>

        <label className="text-sm font-semibold">
          Confirmar contrasena
          <input
            className="mt-1.5 h-11 w-full rounded-[10px] border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
          />
        </label>

        <button
          className="mt-1 h-11 rounded-[10px] border-0 bg-emerald-800 px-4 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting || !isFormValid}>
          {isSubmitting ? 'Creando...' : 'Crear cuenta'}
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
          Ya tengo cuenta
        </Link>
        <Link
          className="text-emerald-800 underline underline-offset-2"
          href="/forgot-password">
          Olvide mi contrasena
        </Link>
      </div>
    </AuthShell>
  );
}
