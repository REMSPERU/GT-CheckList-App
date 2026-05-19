import { useState } from 'react';
import type { FormEvent } from 'react';

import { sendPasswordResetEmail } from '@/services/auth/auth.service';

export function useForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result = await sendPasswordResetEmail(email);
      if (result.errorMessage) {
        setErrorMessage(result.errorMessage);
        return;
      }

      setMessage(
        'Te enviamos un correo con el enlace para cambiar tu contrasena.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return { email, setEmail, isSubmitting, message, errorMessage, onSubmit };
}
