interface AdminPageHeaderProps {
  eyebrow: string;
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
          ? 'flex min-h-[190px] items-end rounded-3xl border border-slate-900/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(217,249,157,0.42)),radial-gradient(circle_at_78%_20%,rgba(8,145,178,0.24),transparent_30%)] p-[26px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]'
          : compact
            ? 'rounded-[22px] border border-slate-900/10 bg-white/80 px-[22px] py-4 shadow-[0_12px_34px_rgba(12,23,32,0.06)]'
            : 'rounded-3xl border border-slate-900/10 bg-white/80 p-[26px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]'
      }>
      <div>
        <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
          {eyebrow}
        </span>
        <h2
          className={
            compact
              ? 'm-0 text-[clamp(1.5rem,2vw,2.25rem)] font-bold tracking-[-0.04em] text-[#0c1720]'
              : 'm-0 text-[clamp(2rem,4vw,4.2rem)] font-bold tracking-[-0.04em] text-[#0c1720]'
          }>
          {title}
        </h2>
        <p
          className={
            compact
              ? 'mb-0 mt-1 max-w-[760px] text-sm text-slate-500'
              : 'max-w-[680px] text-base text-slate-500'
          }>
          {description}
        </p>
      </div>
    </section>
  );
}
