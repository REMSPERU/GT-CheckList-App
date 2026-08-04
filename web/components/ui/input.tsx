import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      helperText,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 text-text-muted">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`min-h-11 w-full rounded-xl border bg-surface text-[0.95rem] text-text-main placeholder:text-text-muted/60 transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${
              leftIcon ? 'pl-10' : 'px-3.5'
            } ${rightIcon ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/20'
                : 'border-surface-border'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 text-text-muted">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <span className="text-xs font-semibold text-status-danger">{error}</span>}
        {!error && helperText && (
          <span className="text-xs text-text-muted">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
