'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthFormFieldProps {
  label: string;
  action?: ReactNode;
  type: 'email' | 'password' | 'text';
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
  minLength?: number;
  placeholder?: string;
  leftIcon?: ReactNode;
  hint?: string;
}

export function AuthFormField({
  label,
  action,
  type,
  value,
  autoComplete,
  onChange,
  minLength,
  placeholder,
  leftIcon,
  hint,
}: AuthFormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = `auth-field-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const isPasswordField = type === 'password';
  const effectiveType = isPasswordField ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
        <label htmlFor={inputId} className="cursor-pointer select-none">
          {label}
        </label>
        {action}
      </div>

      <div className="relative flex items-center">
        {leftIcon ? (
          <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-slate-500">
            {leftIcon}
          </div>
        ) : null}

        <input
          id={inputId}
          className={`h-11 sm:h-12 w-full rounded-xl border border-slate-300 bg-white text-slate-900 text-sm md:text-base outline-none transition-all duration-150 placeholder:text-slate-500 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 ${
            leftIcon ? 'pl-11' : 'pl-4'
          } ${isPasswordField ? 'pr-12' : 'pr-4'}`}
          type={effectiveType}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          placeholder={placeholder}
          value={value}
          onChange={event => onChange(event.target.value)}
        />

        {isPasswordField ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      {hint ? (
        <span className="text-xs text-slate-600">{hint}</span>
      ) : null}
    </div>
  );
}
