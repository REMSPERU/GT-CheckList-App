interface AlertProps {
  children: string | null;
  variant?: 'error' | 'success';
}

export function Alert({ children, variant = 'error' }: AlertProps) {
  if (!children) return null;

  const className =
    variant === 'success'
      ? 'mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800'
      : 'mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[0.95rem] text-red-800';

  return <div className={className}>{children}</div>;
}
