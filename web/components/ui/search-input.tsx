import { Search } from 'lucide-react';
import { Input } from './input';

interface SearchInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function SearchInput({
  value,
  placeholder,
  onChange,
  ariaLabel = 'Buscar',
  className = '',
}: SearchInputProps) {
  return (
    <Input
      type="search"
      leftIcon={<Search size={16} />}
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-label={ariaLabel}
      className={`max-w-[520px] ${className}`}
    />
  );
}

