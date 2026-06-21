import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  icon,
  actions,
  stats,
  eyebrow = "Admin workspace",
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(18,18,38,0.95),rgba(10,10,24,0.92))] p-5 shadow-elev sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(0,245,255,0.16),transparent_45%),radial-gradient(circle_at_0%_100%,rgba(191,90,242,0.12),transparent_42%),radial-gradient(circle_at_50%_120%,rgba(255,45,85,0.08),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary shadow-[0_0_18px_rgba(0,245,255,0.18)]">
            {icon}
            <span>{eyebrow}</span>
          </div>
          <h2 className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-white sm:text-[34px]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {stats && (
        <div className="relative mt-6 border-t border-white/8 pt-5">{stats}</div>
      )}
    </div>
  );
}

export function StatChip({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone?: "default" | "success" | "gold" | "danger" | "muted" | "primary";
}) {
  const tones = {
    default: "border-white/10 bg-white/[0.03] text-white",
    success: "border-success/20 bg-success/10 text-success",
    gold: "border-gold/20 bg-gold/10 text-gold",
    danger: "border-destructive/20 bg-destructive/10 text-destructive",
    muted: "border-border/60 bg-surface-light/10 text-muted-foreground",
    primary: "border-primary/20 bg-primary/10 text-primary",
  };

  return (
    <div className={`flex min-w-[140px] flex-1 items-center gap-3 rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-black/20">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-extrabold tracking-tight text-white">{value}</div>
        <div className="text-xs opacity-80">{label}</div>
      </div>
    </div>
  );
}
