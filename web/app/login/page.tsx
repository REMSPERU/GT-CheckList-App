'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { getSupabaseClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function redirectActiveSession() {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted && session?.user) {
        router.replace('/admin');
      }
    }

    void redirectActiveSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage('Sesion iniciada correctamente. Redirigiendo...');
      router.push('/admin');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Iniciar sesion"
      description="Ingresa con tu correo para entrar directo al panel administrativo.">
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <label className="text-sm font-bold text-slate-700">
          Correo
          <input
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </label>

        <label className="text-sm font-bold text-slate-700">
          <span className="flex items-center justify-between gap-3">
            Contrasena
            <Link
              className="text-xs font-black text-emerald-800 underline-offset-4 hover:underline"
              href="/forgot-password">
              Olvide mi contrasena
            </Link>
          </span>
          <input
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </label>

        <button
          className="mt-2 h-12 rounded-2xl border-0 bg-emerald-900 px-4 font-black text-white shadow-[0_12px_28px_rgba(6,78,59,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          type="submit"
          disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
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

      <div className="mt-5 rounded-2xl border border-emerald-950/10 bg-emerald-50/70 p-4 text-sm text-slate-600">
        <span>No tienes usuario administrativo?</span>{' '}
        <Link
          className="font-black text-emerald-900 underline-offset-4 hover:underline"
          href="/register">
          Crear cuenta
        </Link>
      </div>
    </AuthShell>
  );
}
