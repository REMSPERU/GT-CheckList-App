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
      description="Termina la recuperacion y vuelve a entrar al panel con tu nueva clave.">
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <label className="text-sm font-bold text-slate-700">
          Nueva contrasena (minimo 8)
          <input
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </label>

        <label className="text-sm font-bold text-slate-700">
          Confirmar contrasena
          <input
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
          />
        </label>

        <button
          className="mt-2 h-12 rounded-2xl border-0 bg-emerald-900 px-4 font-black text-white shadow-[0_12px_28px_rgba(6,78,59,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          type="submit"
          disabled={isSubmitting || !isFormValid || !isReady}>
          {isSubmitting ? 'Actualizando...' : 'Actualizar contrasena'}
        </button>
      </form>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      ) : null}
      {message ? (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {message}
        </div>
      ) : null}

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
