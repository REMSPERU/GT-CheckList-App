import type { ReactNode } from 'react';

interface AuthFormFieldProps {
  label: string;
  action?: ReactNode;
  type: 'email' | 'password';
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
  minLength?: number;
}

export function AuthFormField({
  label,
  action,
  type,
  value,
  autoComplete,
  onChange,
  minLength,
}: AuthFormFieldProps) {
  const inputId = `auth-field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
        <label htmlFor={inputId}>{label}</label>
        {action}
      </div>
      <input
        id={inputId}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
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
