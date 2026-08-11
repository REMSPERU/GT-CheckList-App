interface AlertProps {
  children: string | null;
  variant?: 'error' | 'success';
  onRetry?: () => void;
}

export function Alert({ children, variant = 'error', onRetry }: AlertProps) {
  if (!children) return null;

  const isError = variant === 'error';
  const className = isError
    ? 'mt-3 flex items-center justify-between gap-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[0.95rem] text-red-800'
    : 'mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800';

  return (
    <div className={className} role="alert">
      <span>{children}</span>
      {isError && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-black text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
          Reintentar
        </button>
      )}
    </div>
  );
}
