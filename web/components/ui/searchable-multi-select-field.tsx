'use client';

import { useEffect, useId, useMemo, useRef, useState, memo } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface SearchableMultiSelectFieldProps {
  values: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  placeholder: string;
  ariaLabel?: string;
  compact?: boolean;
}

export const SearchableMultiSelectField = memo(
  function SearchableMultiSelectField({
    values,
    options,
    onChange,
    placeholder,
    ariaLabel,
    compact = false,
  }: SearchableMultiSelectFieldProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
      const term = search.trim().toLowerCase();
      if (!term) return options;
      return options.filter(opt => opt.label.toLowerCase().includes(term));
    }, [options, search]);

    // Click outside listener
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSearch('');
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto focus search input when opened
    useEffect(() => {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen]);

    const toggleOption = (val: string) => {
      if (!val) {
        // If clicking empty option (e.g. "Todos"), clear selection
        onChange([]);
        setSearch('');
        return;
      }
      if (values.includes(val)) {
        onChange(values.filter(v => v !== val));
      } else {
        onChange([...values, val]);
      }
      // Start from the complete list so another option can be selected immediately.
      setSearch('');
    };

    const clearAll = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange([]);
      setSearch('');
    };

    const selectAll = () => {
      onChange(options.filter(o => o.value !== '').map(o => o.value));
      setSearch('');
    };

    // Selected display summary
    const selectedOptions = useMemo(
      () => options.filter(o => o.value && values.includes(o.value)),
      [options, values],
    );

    const displayLabel = useMemo(() => {
      if (values.length === 0) return placeholder;
      if (selectedOptions.length === 1) return selectedOptions[0].label;
      return `${selectedOptions.length} seleccionados`;
    }, [values, selectedOptions, placeholder]);

    return (
      <div ref={containerRef} className="relative w-full">
        {/* Trigger Button */}
        <div
          onClick={() => setIsOpen(prev => !prev)}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 transition-colors cursor-pointer select-none focus-within:border-emerald-800 focus-within:ring-1 focus-within:ring-emerald-800/20 hover:border-slate-400 ${
            compact ? 'h-9 text-xs' : 'min-h-11 py-2 text-xs font-medium'
          } ${values.length > 0 ? 'border-emerald-700/60 bg-emerald-50/20' : ''}`}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={ariaLabel ?? placeholder}>
          <div className="flex flex-1 items-center gap-1.5 min-w-0 overflow-hidden">
            <span
              className={`truncate ${
                values.length > 0
                  ? 'font-semibold text-emerald-950'
                  : 'text-slate-500 font-medium'
              }`}>
              {displayLabel}
            </span>
            {values.length > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-800 px-1 text-[10px] font-bold text-white shrink-0">
                {values.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 text-slate-400">
            {values.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="rounded p-0.5 hover:bg-slate-200 hover:text-slate-700 transition"
                title="Limpiar selección">
                <X size={13} />
              </button>
            )}
            <ChevronDown
              size={14}
              className={`transition-transform duration-150 ${isOpen ? 'rotate-180 text-emerald-800' : ''}`}
            />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 z-50 mt-1 max-h-72 w-full min-w-[260px] sm:min-w-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col">
            {/* Search Box & Quick Controls */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/80 space-y-1.5 shrink-0">
              <div className="relative flex items-center">
                <Search
                  size={13}
                  className="absolute left-2.5 text-slate-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Escribir para buscar..."
                  className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-2.5 py-1 text-xs outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] font-medium text-slate-500">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-emerald-800 hover:text-emerald-950 font-semibold hover:underline">
                  Marcar todos
                </button>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-slate-500 hover:text-slate-800 hover:underline">
                  Desmarcar todos
                </button>
              </div>
            </div>

            {/* Options List */}
            <div className="overflow-y-auto p-1 flex-1 max-h-52 divide-y divide-slate-50">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(option => {
                  const isSelected = option.value
                    ? values.includes(option.value)
                    : values.length === 0;

                  return (
                    <div
                      key={option.value || 'all'}
                      onClick={() => toggleOption(option.value)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}>
                      <span className="pr-2 leading-snug break-words text-left flex-1">
                        {option.label}
                      </span>
                      <div
                        className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-emerald-800 bg-emerald-800 text-white'
                            : 'border-slate-300 bg-white'
                        }`}>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-center text-xs italic text-slate-400">
                  Sin coincidencia
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);
