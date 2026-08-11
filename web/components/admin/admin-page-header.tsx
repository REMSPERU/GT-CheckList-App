interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  featured?: boolean;
  compact?: boolean;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  featured = false,
  compact = false,
}: AdminPageHeaderProps) {
  return (
    <section
      className={
        featured
          ? 'rounded-xl border border-slate-800 bg-gradient-to-r from-[#072e27] to-[#0b1a21] p-6 shadow-xs text-white'
          : compact
            ? 'rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-xs'
            : 'rounded-xl border border-slate-200 bg-white p-6 shadow-xs'
      }>
      <div>
        {eyebrow ? (
          <span
            className={`mb-1.5 inline-block text-[11px] font-bold uppercase tracking-wider ${
              featured ? 'text-emerald-400' : 'text-slate-500'
            }`}>
            {eyebrow}
          </span>
        ) : null}
        <h2
          className={`m-0 font-extrabold tracking-tight ${
            featured ? 'text-white' : 'text-slate-900'
          } ${compact ? 'text-xl' : 'text-2xl'}`}>
          {title}
        </h2>
        <p
          className={`mb-0 mt-1.5 max-w-[720px] text-xs font-medium leading-relaxed ${
            featured ? 'text-slate-300' : 'text-slate-500'
          }`}>
          {description}
        </p>
      </div>
    </section>
  );
}

