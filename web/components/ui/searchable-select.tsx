import { useState, useRef, useEffect, useId, memo } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export const SearchableSelect = memo(function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Find currently selected option to show its label in the input
  const selectedOption = options.find(opt => opt.value === value);

  // Filter options based on typed search query
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Reset activeIndex when filtered options change
  useEffect(() => {
    setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions.length]);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1,
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          const selected = filteredOptions[activeIndex];
          if (selected) {
            onChange(selected.value);
            setIsOpen(false);
            setSearchQuery('');
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative min-h-11 w-full ${className ?? ''}`}>
      <div
        className="flex min-h-11 w-full items-center justify-between rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-[0.95rem] text-slate-900 cursor-pointer focus-within:border-emerald-800 focus-within:ring-2 focus-within:ring-emerald-800/20"
        onClick={() => setIsOpen(true)}>
        <input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen && activeIndex >= 0 && filteredOptions[activeIndex]
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          className="w-full bg-transparent border-0 p-0 text-[0.95rem] text-slate-900 placeholder-slate-400 outline-none focus:ring-0"
          placeholder={selectedOption ? selectedOption.label : placeholder}
          value={
            isOpen
              ? searchQuery
              : selectedOption
                ? selectedOption.label
                : ''
          }
          onChange={e => {
            setIsOpen(true);
            setSearchQuery(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_36px_rgba(12,23,32,0.12)] outline-none">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isFocused = index === activeIndex;
              const isSelected = option.value === value;
              return (
                <li
                  id={`${listboxId}-option-${index}`}
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`rounded-lg px-3 py-2 text-[0.92rem] cursor-pointer transition-colors ${
                    isFocused
                      ? 'bg-emerald-100 text-emerald-950 font-semibold'
                      : isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  onMouseEnter={() => setActiveIndex(index)}>
                  {option.label}
                </li>
              );
            })
          ) : (
            <li className="px-3 py-2 text-center text-[0.92rem] italic text-slate-400" role="status">
              No se encontraron opciones
            </li>
          )}
        </ul>
      )}
    </div>
  );
});
