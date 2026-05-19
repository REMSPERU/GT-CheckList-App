interface SearchInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, placeholder, onChange }: SearchInputProps) {
  return (
    <input
      className="m-0 max-w-[520px] rounded-[10px] border border-slate-300 bg-white/90 px-3 py-2.5 text-base outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300"
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  );
}
