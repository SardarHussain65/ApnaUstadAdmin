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
    <div className="relative overflow-hidden rounded-2xl border border-hairline bg-card p-5 shadow-card sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            {icon}
            <span>{eyebrow}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {stats && (
        <div className="relative mt-5 border-t border-hairline pt-4">{stats}</div>
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
  const iconTones = {
    default: "border-hairline bg-card text-foreground",
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
    gold: "border-amber-500/25 bg-amber-500/10 text-amber-500",
    danger: "border-destructive/25 bg-destructive/10 text-destructive",
    muted: "border-hairline bg-card text-muted-foreground",
    primary: "border-primary/25 bg-primary/10 text-primary",
  };

  const labelTones = {
    default: "text-muted-foreground",
    success: "text-emerald-500",
    gold: "text-amber-500",
    danger: "text-destructive",
    muted: "text-muted-foreground",
    primary: "text-primary",
  };

  return (
    <div className="flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border border-hairline bg-surface p-3.5">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconTones[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
          {value}
        </div>
        <div className={`text-xs font-medium ${labelTones[tone]}`}>{label}</div>
      </div>
    </div>
  );
}
