import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] select-none';

    const variants = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm focus:ring-primary/40 rounded-xl',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary-hover focus:ring-secondary-foreground/20 rounded-xl',
      outline:
        'border border-surface-border bg-surface text-text-main hover:bg-secondary focus:ring-primary/20 rounded-xl',
      danger:
        'bg-status-danger text-white hover:bg-red-800 focus:ring-red-500/40 rounded-xl',
      ghost:
        'bg-transparent text-text-main hover:bg-secondary focus:ring-primary/20 rounded-lg',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
