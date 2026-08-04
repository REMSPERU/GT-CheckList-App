interface AlertProps {
  children: string | null;
  variant?: 'error' | 'success';
}

export function Alert({ children, variant = 'error' }: AlertProps) {
  if (!children) return null;

  const className =
    variant === 'success'
      ? 'mt-4 rounded-xl border border-status-success/20 bg-status-success-bg px-4 py-3 text-sm font-semibold text-status-success'
      : 'mt-3 rounded-xl border border-status-danger/20 bg-status-danger-bg px-3.5 py-2.5 text-sm font-semibold text-status-danger';

  return <div className={className}>{children}</div>;
}

