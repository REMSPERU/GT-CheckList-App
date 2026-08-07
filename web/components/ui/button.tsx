import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      className = '',
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none';

    const variants = {
      primary:
        'bg-[#072e27] text-white hover:bg-[#05221d] active:bg-[#031814] shadow-xs border border-emerald-950/20 font-semibold',
      accent:
        'bg-[#047857] text-white hover:bg-[#036247] active:bg-[#024e38] shadow-xs font-semibold',
      secondary:
        'bg-[#f1f5f9] text-slate-800 hover:bg-[#e2e8f0] active:bg-[#cbd5e1] border border-slate-200 font-medium',
      outline:
        'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 font-medium',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-xs font-semibold',
      ghost:
        'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
      md: 'h-9 px-3.5 text-xs rounded-lg gap-2',
      lg: 'h-10 px-4 text-sm rounded-lg gap-2',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
