import { useState, useRef, useEffect } from 'react';

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

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected option to show its label in the input
  const selectedOption = options.find(opt => opt.value === value);

  // Filter options based on typed search query
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery(''); // Reset search text on close
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative min-h-11 w-full ${className ?? ''}`}>
      <div
        className="flex min-h-11 w-full items-center justify-between rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-[0.95rem] text-slate-900 cursor-pointer focus-within:border-emerald-800 focus-within:ring-1 focus-within:ring-emerald-800/20"
        onClick={() => setIsOpen(true)}>
        <input
          type="text"
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
        />
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {isOpen && (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_36px_rgba(12,23,32,0.12)] outline-none">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <li
                key={option.value}
                className={`rounded-lg px-3 py-2 text-[0.92rem] cursor-pointer transition-colors ${
                  option.value === value
                    ? 'bg-emerald-50 text-emerald-950 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearchQuery('');
                }}>
                {option.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-center text-[0.92rem] italic text-slate-400">
              No se encontraron opciones
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
