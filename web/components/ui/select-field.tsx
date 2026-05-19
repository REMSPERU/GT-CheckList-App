interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function SelectField({
  value,
  options,
  onChange,
  className,
}: SelectFieldProps) {
  return (
    <select
      className={
        className ??
        'min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900'
      }
      value={value}
      onChange={event => onChange(event.target.value)}>
      {options.map(option => (
        <option value={option.value} key={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
