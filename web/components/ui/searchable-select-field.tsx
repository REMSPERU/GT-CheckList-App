import { useEffect, useMemo, useState } from 'react';

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectFieldProps {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function SearchableSelectField({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  disabled = false,
}: SearchableSelectFieldProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find(option => option.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');

    if (!term) return options;

    return options.filter(option =>
      option.label.toLocaleLowerCase('es').includes(term),
    );
  }, [options, search]);

  useEffect(() => {
    if (!isOpen) setSearch(selectedOption?.label ?? '');
  }, [isOpen, selectedOption]);

  function handleSearchChange(nextSearch: string) {
    if (disabled) return;

    setSearch(nextSearch);
    setIsOpen(true);

    if (!nextSearch) {
      onChange('');
      return;
    }

    const exactOption = options.find(
      option =>
        option.label.toLocaleLowerCase('es') ===
        nextSearch.toLocaleLowerCase('es'),
    );

    onChange(exactOption?.value ?? '');
  }

  function handleSelect(option: SearchableSelectOption) {
    if (disabled) return;

    onChange(option.value);
    setSearch(option.label);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <input
        className="min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        value={search}
        onChange={event => handleSearchChange(event.target.value)}
        onFocus={() => {
          if (disabled) return;

          if (selectedOption?.value === '') {
            setSearch('');
          }

          setIsOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={isOpen}
      />

      {isOpen ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm font-bold text-slate-500">
              Sin resultados.
            </div>
          ) : (
            filteredOptions.map(option => (
              <button
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition hover:bg-emerald-50 hover:text-emerald-900 ${
                  option.value === value
                    ? 'bg-emerald-100 text-emerald-950'
                    : 'text-slate-700'
                }`}
                key={option.value}
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => handleSelect(option)}>
                {option.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
