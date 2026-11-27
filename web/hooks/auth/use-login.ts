import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import {
  getAdminStartPath,
  getCurrentAdminUser,
  signInWithPassword,
} from '@/services/auth/auth.service';

export function useLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function redirectActiveSession() {
      try {
        const user = await getCurrentAdminUser();
        if (isMounted && user) {
          router.replace(getAdminStartPath(user.role));
        }
      } catch {
        if (isMounted) {
          setErrorMessage('No se pudo comprobar la sesión de GEMA.');
        }
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
      const result = await signInWithPassword(email, password);
      if (result.errorMessage) {
        setErrorMessage(result.errorMessage);
        return;
      }

      const user = await getCurrentAdminUser();
      setMessage('Sesion iniciada correctamente. Redirigiendo...');
      router.push(getAdminStartPath(user?.role));
    } catch {
      setErrorMessage('No se pudo conectar con GEMA. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    isSubmitting,
    errorMessage,
    message,
    onSubmit,
  };
}
