import { memo } from 'react';

interface SearchInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
}

export const SearchInput = memo(function SearchInput({
  value,
  placeholder,
  onChange,
  ariaLabel = 'Buscar',
  className,
  compact = false,
}: SearchInputProps) {
  return (
    <input
      className={
        className ??
        `m-0 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800/20 ${
          compact ? 'h-9' : 'min-h-11 py-2.5 text-[0.95rem]'
        }`
      }
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-label={ariaLabel}
    />
  );
});

