import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { getCurrentAdminUser, signInWithPassword } from '@/services/auth/auth.service';

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
      const user = await getCurrentAdminUser();
      if (isMounted && user) router.replace('/admin');
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

      setMessage('Sesion iniciada correctamente. Redirigiendo...');
      router.push('/admin');
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
