interface StatusBadgeProps {
  children: string | null;
}

export function StatusBadge({ children }: StatusBadgeProps) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-extrabold text-green-900">
      {children ?? '-'}
    </span>
  );
}
