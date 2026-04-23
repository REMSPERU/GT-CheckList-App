'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';

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
          Contrasena (minimo 8)
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </label>

        <label>
          Confirmar contrasena
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
          />
        </label>

        <button type="submit" disabled={isSubmitting || !isFormValid}>
          {isSubmitting ? 'Creando...' : 'Crear cuenta'}
        </button>
      </form>

      {errorMessage ? (
        <div className="feedback error">{errorMessage}</div>
      ) : null}
      {message ? <div className="feedback ok">{message}</div> : null}

      <div className="links">
        <Link href="/login">Ya tengo cuenta</Link>
        <Link href="/forgot-password">Olvide mi contrasena</Link>
      </div>
    </AuthShell>
  );
}
