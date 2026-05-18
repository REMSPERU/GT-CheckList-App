'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { getSupabaseClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFormValid = useMemo(() => {
    return password.length >= 8 && confirmPassword.length >= 8;
  }, [confirmPassword.length, password.length]);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY' && mounted) {
        setIsReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        setIsReady(true);
        return;
      }

      setErrorMessage(
        'Abre esta pagina usando el enlace del correo de recuperacion.',
      );
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Las contrasenas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await supabase.auth.signOut();
      setMessage('Contrasena actualizada. Ahora puedes iniciar sesion.');
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Nueva contrasena"
      description="Ingresa tu nueva contrasena para terminar la recuperacion.">
      <form className="mt-[18px] grid gap-3" onSubmit={onSubmit}>
        <label className="text-sm font-semibold">
          Nueva contrasena (minimo 8)
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
          disabled={isSubmitting || !isFormValid || !isReady}>
          {isSubmitting ? 'Actualizando...' : 'Actualizar contrasena'}
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
          Ir a iniciar sesion
        </Link>
        <Link
          className="text-emerald-800 underline underline-offset-2"
          href="/forgot-password">
          Solicitar nuevo enlace
        </Link>
      </div>
    </AuthShell>
  );
}
