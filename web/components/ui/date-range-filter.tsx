'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type DatePreset =
  | 'ALL'
  | 'TODAY'
  | 'WEEK'
  | 'MONTH'
  | 'YEAR'
  | 'CUSTOM';

export interface DateRangeValue {
  from: string;
  to: string;
}

interface DateRangeFilterProps {
  value: DatePreset;
  range: DateRangeValue;
  onPresetChange: (value: DatePreset) => void;
  onRangeChange: (value: DateRangeValue) => void;
}

const DATE_PRESET_OPTIONS = [
  { value: 'ALL', label: 'Todas las fechas' },
  { value: 'TODAY', label: 'Hoy' },
  { value: 'WEEK', label: 'Esta semana' },
  { value: 'MONTH', label: 'Último mes' },
  { value: 'YEAR', label: 'Este año' },
  { value: 'CUSTOM', label: 'Personalizado' },
] as const;

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLabel(value: string) {
  if (!value) return '';
  return parseDateInput(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(month: Date) {
  const firstDay = month.getDay() === 0 ? 6 : month.getDay() - 1;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth
      ? new Date(month.getFullYear(), month.getMonth(), day)
      : null;
  });
}

/** Resolves a preset into the API-compatible date range. */
export function resolveDateRange(
  preset: DatePreset,
  customRange: DateRangeValue,
) {
  if (preset === 'CUSTOM') {
    return {
      from: customRange.from || null,
      to: customRange.to || null,
    };
  }
  if (preset === 'ALL') return { from: null, to: null };

  const today = new Date();
  const to = formatDateInput(today);
  if (preset === 'TODAY') return { from: to, to };

  const from = new Date(today);
  if (preset === 'YEAR') {
    from.setMonth(0, 1);
  } else if (preset === 'WEEK') {
    const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    from.setDate(today.getDate() - daysSinceMonday);
  } else {
    from.setMonth(today.getMonth() - 1);
  }
  return { from: formatDateInput(from), to };
}

export function DateRangeFilter({
  value,
  range,
  onPresetChange,
  onRangeChange,
}: DateRangeFilterProps) {
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarDays = useMemo(
    () => getCalendarDays(calendarMonth),
    [calendarMonth],
  );
  const selectedLabel =
    DATE_PRESET_OPTIONS.find(option => option.value === value)?.label ?? '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsPresetOpen(false);
        setIsCalendarOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function openCalendar() {
    setCalendarMonth(
      startOfMonth(range.from ? parseDateInput(range.from) : new Date()),
    );
    setIsCalendarOpen(true);
  }

  function handlePresetChange(nextValue: DatePreset) {
    onPresetChange(nextValue);
    setIsPresetOpen(false);
    if (nextValue === 'CUSTOM') {
      openCalendar();
    } else {
      setIsCalendarOpen(false);
    }
  }

  function selectDate(date: Date) {
    const selectedValue = formatDateInput(date);
    if (!range.from || range.to) {
      onRangeChange({ from: selectedValue, to: '' });
      return;
    }

    const [from, to] = [range.from, selectedValue].sort();
    onRangeChange({ from, to });
    setIsCalendarOpen(false);
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setIsPresetOpen(current => !current)}
        aria-label="Filtrar por fecha programada"
        aria-expanded={isPresetOpen}
        aria-haspopup="listbox"
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800/20 ${value === 'CUSTOM' ? 'border-emerald-700/60 pr-28' : 'border-slate-300'}`}>
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${isPresetOpen ? 'rotate-180 text-emerald-800' : ''}`}
        />
      </button>

      {isPresetOpen && (
        <div
          role="listbox"
          aria-label="Opciones de fecha"
          className="absolute left-0 top-10 z-50 w-full min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {DATE_PRESET_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => handlePresetChange(option.value as DatePreset)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                value === option.value
                  ? 'bg-emerald-50 font-semibold text-emerald-950'
                  : 'font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}>
              {value === option.value && (
                <Check size={13} className="shrink-0 text-emerald-800" />
              )}
              <span className={value === option.value ? '' : 'pl-5'}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {value === 'CUSTOM' && (
        <button
          type="button"
          onClick={openCalendar}
          aria-label="Elegir rango de fechas programadas"
          aria-expanded={isCalendarOpen}
          className="absolute inset-y-1 right-1 inline-flex items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-emerald-900 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <Calendar size={13} />
          <span>
            {range.from
              ? `${formatDateLabel(range.from)}${range.to ? ` - ${formatDateLabel(range.to)}` : ''}`
              : 'Elegir rango'}
          </span>
        </button>
      )}

      {value === 'CUSTOM' && isCalendarOpen && (
        <div
          role="dialog"
          aria-label="Calendario para elegir rango de fechas"
          className="absolute right-0 top-10 z-50 w-[286px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  month =>
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                )
              }
              aria-label="Mes anterior"
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-bold capitalize text-slate-800">
              {calendarMonth.toLocaleDateString('es-PE', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  month =>
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                )
              }
              aria-label="Mes siguiente"
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold uppercase text-slate-400">
            {['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map(day => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;
              const dateValue = formatDateInput(date);
              const isStart = dateValue === range.from;
              const isEnd = dateValue === range.to;
              const isInRange =
                !!range.from &&
                !!range.to &&
                dateValue > range.from &&
                dateValue < range.to;

              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => selectDate(date)}
                  aria-label={`Seleccionar ${date.toLocaleDateString('es-PE')}`}
                  className={`h-7 rounded-md text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isStart || isEnd
                      ? 'bg-emerald-800 text-white'
                      : isInRange
                        ? 'bg-emerald-50 text-emerald-900'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}>
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
            {!range.from || range.to
              ? 'Selecciona la fecha de inicio'
              : 'Selecciona la fecha de fin'}
          </p>
        </div>
      )}
    </div>
  );
}
