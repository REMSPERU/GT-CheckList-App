import { memo } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

export const SelectField = memo(function SelectField({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: SelectFieldProps) {
  return (
    <select
      className={
        className ??
        'min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3.5 py-2.5 text-[0.95rem] font-medium text-slate-900 outline-none transition-colors focus:border-[#07352f] focus:ring-1 focus:ring-emerald-800/20'
      }
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-label={ariaLabel}>
      {options.map(option => (
        <option value={option.value} key={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

