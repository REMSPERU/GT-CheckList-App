import { Input } from '@/components/ui/input';
import type { ReactNode } from 'react';

interface AuthFormFieldProps {
  label: ReactNode;
  type: 'email' | 'password';
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
  minLength?: number;
}

export function AuthFormField({
  label,
  type,
  value,
  autoComplete,
  onChange,
  minLength,
}: AuthFormFieldProps) {
  return (
    <div className="mt-2">
      <Input
        label={typeof label === 'string' ? label : undefined}
        type={type}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
}

