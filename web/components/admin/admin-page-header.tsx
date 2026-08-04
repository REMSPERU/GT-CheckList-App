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
          ? 'flex min-h-[170px] items-end rounded-3xl border border-surface-border bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(217,249,157,0.45)),radial-gradient(circle_at_78%_20%,rgba(8,145,178,0.22),transparent_35%)] p-[26px] shadow-[0_18px_45px_rgba(8,47,42,0.08)] backdrop-blur-md'
          : compact
            ? 'rounded-[22px] border border-surface-border bg-surface/90 px-[22px] py-4 shadow-sm backdrop-blur-md'
            : 'rounded-3xl border border-surface-border bg-surface/90 p-[26px] shadow-sm backdrop-blur-md'
      }>
      <div>
        <span className="mb-1.5 inline-block text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </span>
        <h2
          className={
            compact
              ? 'm-0 text-[clamp(1.5rem,2vw,2.25rem)] font-bold tracking-[-0.04em] text-text-main'
              : 'm-0 text-[clamp(1.8rem,3vw,3.5rem)] font-bold tracking-[-0.04em] text-text-main'
          }>
          {title}
        </h2>
        <p
          className={
            compact
              ? 'mb-0 mt-1 max-w-[760px] text-sm text-text-muted'
              : 'mt-2 max-w-[680px] text-base text-text-muted'
          }>
          {description}
        </p>
      </div>
    </section>
  );
}

