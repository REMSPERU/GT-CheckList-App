import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { signUpWithPassword } from '@/services/auth/auth.service';

export function useRegister() {
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
      const result = await signUpWithPassword(email, password);
      if (result.errorMessage) {
        setErrorMessage(result.errorMessage);
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

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSubmitting,
    isFormValid,
    message,
    errorMessage,
    onSubmit,
  };
}
