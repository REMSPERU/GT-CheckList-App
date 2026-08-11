import { memo } from 'react';

interface SearchInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export const SearchInput = memo(function SearchInput({
  value,
  placeholder,
  onChange,
  ariaLabel = 'Buscar',
}: SearchInputProps) {
  return (
    <input
      className="m-0 w-full min-h-11 rounded-[10px] border border-slate-300 bg-white px-3.5 py-2.5 text-[0.95rem] font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#07352f] focus:ring-1 focus:ring-emerald-800/20"
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-label={ariaLabel}
    />
  );
});

