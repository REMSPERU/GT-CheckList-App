'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { getSupabaseClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

      setMessage('Sesion iniciada correctamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Iniciar sesion"
      description="Accede para validar que tu cuenta funciona.">
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

        <label>
          Contrasena
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      {errorMessage ? (
        <div className="feedback error">{errorMessage}</div>
      ) : null}
      {message ? <div className="feedback ok">{message}</div> : null}

      <div className="links">
        <Link href="/register">Crear cuenta</Link>
        <Link href="/forgot-password">Olvide mi contrasena</Link>
      </div>
    </AuthShell>
  );
}
