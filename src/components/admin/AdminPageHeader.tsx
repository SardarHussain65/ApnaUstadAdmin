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
    <div className="surface-panel relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(129,140,248,0.10),transparent_45%),radial-gradient(circle_at_0%_100%,rgba(167,139,250,0.08),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {icon}
            <span>{eyebrow}</span>
          </div>
          <h2 className="font-display text-[24px] font-bold tracking-[-0.025em] text-foreground sm:text-[30px]">{title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {stats && (
        <div className="relative mt-5 border-t border-border pt-5">{stats}</div>
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
    default: "border-border bg-white/[0.025] text-foreground",
    success: "border-success/20 bg-success/10 text-success",
    gold: "border-gold/20 bg-gold/10 text-gold",
    danger: "border-destructive/20 bg-destructive/10 text-destructive",
    muted: "border-border bg-surface-light/30 text-muted-foreground",
    primary: "border-primary/20 bg-primary/10 text-primary",
  };

  return (
    <div className={`flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border p-3.5 ${tones[tone]}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-black/20">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-xl font-bold tracking-tight text-foreground">{value}</div>
        <div className="text-xs opacity-80">{label}</div>
      </div>
    </div>
  );
}
