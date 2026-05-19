import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { updateRecoveredPassword } from '@/services/auth/auth.service';

export function useResetPassword() {
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
      if (!mounted) return;

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
      const result = await updateRecoveredPassword(password);
      if (result.errorMessage) {
        setErrorMessage(result.errorMessage);
        return;
      }

      setMessage('Contrasena actualizada. Ahora puedes iniciar sesion.');
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSubmitting,
    isReady,
    isFormValid,
    message,
    errorMessage,
    onSubmit,
  };
}
