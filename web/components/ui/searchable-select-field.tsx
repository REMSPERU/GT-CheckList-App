import { useEffect, useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';

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
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();

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
    setActiveIndex(-1);

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
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(current => {
        if (filteredOptions.length === 0) return -1;
        if (event.key === 'ArrowDown') {
          return current < filteredOptions.length - 1 ? current + 1 : 0;
        }
        return current > 0 ? current - 1 : filteredOptions.length - 1;
      });
      return;
    }

    if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) handleSelect(option);
    }
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
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
      />

      {isOpen ? (
        <div
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel ?? placeholder}>
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm font-bold text-slate-500">
              Sin resultados.
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition hover:bg-emerald-50 hover:text-emerald-900 ${
                  option.value === value || activeIndex === index
                    ? 'bg-emerald-100 text-emerald-950'
                    : 'text-slate-700'
                }`}
                key={option.value}
                type="button"
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={event => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
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
