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
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
        type={type}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}
