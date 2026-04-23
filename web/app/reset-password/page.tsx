'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

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
      <form onSubmit={onSubmit}>
        <label>
          Nueva contrasena (minimo 8)
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

        <button
          type="submit"
          disabled={isSubmitting || !isFormValid || !isReady}>
          {isSubmitting ? 'Actualizando...' : 'Actualizar contrasena'}
        </button>
      </form>

      {errorMessage ? (
        <div className="feedback error">{errorMessage}</div>
      ) : null}
      {message ? <div className="feedback ok">{message}</div> : null}

      <div className="links">
        <Link href="/login">Ir a iniciar sesion</Link>
        <Link href="/forgot-password">Solicitar nuevo enlace</Link>
      </div>
    </AuthShell>
  );
}
