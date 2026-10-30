import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, RotateCcw, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for full-page "single record" views
 * (customer, booking, job, worker, dispute, verification).
 * Uses theme tokens only so it renders correctly in both light and dark themes.
 */

export interface Crumb {
  label: string;
  to?: string;
}

export function DetailPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-10">{children}</div>;
}

export function DetailBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
          {c.to ? (
            <Link to={c.to as any} className="font-medium transition hover:text-foreground">
              {c.label}
            </Link>
          ) : (
            <span className="max-w-[240px] truncate font-semibold text-foreground">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function DetailHeader({
  backTo,
  backLabel,
  crumbs,
  leading,
  title,
  subtitle,
  badges,
  meta,
  actions,
}: {
  backTo?: string;
  backLabel?: string;
  crumbs?: Crumb[];
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-4">
      {(backTo || (crumbs && crumbs.length > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backTo ? (
            <Link
              to={backTo as any}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-xs font-semibold text-muted-foreground transition hover:bg-surface hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel || "Back"}
            </Link>
          ) : (
            <span />
          )}
          {crumbs && crumbs.length > 0 && <DetailBreadcrumbs items={crumbs} />}
        </div>
      )}

      <div className="rounded-2xl border border-hairline bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {leading}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
                {badges}
              </div>
              {subtitle && (
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{subtitle}</p>
              )}
              {meta && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                  {meta}
                </div>
              )}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
        </div>
      </div>
    </header>
  );
}

export function MetaItem({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon && <span className="text-muted-foreground/80 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
      {children}
    </span>
  );
}

type Tone = "default" | "primary" | "success" | "warning" | "danger" | "info";

const TONE_ICON: Record<Tone, string> = {
  default: "bg-surface text-muted-foreground",
  primary: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-info/12 text-info",
};

export function KpiGrid({
  children,
  cols,
  columns,
}: {
  children: ReactNode;
  cols?: 3 | 4 | 5 | 6;
  columns?: 3 | 4 | 5 | 6;
}) {
  const c = cols ?? columns ?? 4;
  const map = {
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
  } as const;
  return <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", map[c])}>{children}</div>;
}

export function KpiTile({
  label,
  value,
  hint,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}) {
  const subtitle = hint ?? sub;
  return (
    <div className="rounded-2xl border border-hairline bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl [&>svg]:h-4 [&>svg]:w-4", TONE_ICON[tone])}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

/** Two-column page body: main content + right rail. Collapses on small screens. */
export function DetailGrid({
  main,
  aside,
  rail,
}: {
  main: ReactNode;
  aside?: ReactNode;
  rail?: ReactNode;
}) {
  const sideContent = aside ?? rail;
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">{main}</div>
      <aside className="min-w-0 space-y-6">{sideContent}</aside>
    </div>
  );
}

export function Section({
  title,
  description,
  icon,
  action,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const headerAction = action ?? actions;
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-hairline bg-card shadow-card", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <span className="text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {headerAction}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Label / value list used in side rails ("Contact", "Account"). */
export function InfoList({
  children,
  columns,
}: {
  children: ReactNode;
  columns?: number;
}) {
  return <dl className="divide-y divide-hairline">{children}</dl>;
}

export function InfoRow({
  label,
  icon,
  children,
  value,
  mono,
}: {
  label: string;
  icon?: ReactNode;
  children?: ReactNode;
  value?: ReactNode;
  mono?: boolean;
}) {
  const content = children ?? value;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
        {label}
      </dt>
      <dd className={cn("min-w-0 text-right text-[13px] font-medium text-foreground break-words", mono && "font-mono tabular-nums")}>
        {content}
      </dd>
    </div>
  );
}

export function NotProvided({ label = "Not provided" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

export interface TimelineItem {
  id?: string;
  title: ReactNode;
  time?: ReactNode;
  timestamp?: ReactNode;
  description?: ReactNode;
  subtitle?: ReactNode;
  tone?: Tone;
  done?: boolean;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-5">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const timeText = it.time ?? it.timestamp;
        const descText = it.description ?? it.subtitle;
        const dot =
          it.done === false
            ? "border-hairline-strong bg-card"
            : it.tone === "danger"
              ? "border-destructive bg-destructive"
              : it.tone === "warning"
                ? "border-warning bg-warning"
                : it.tone === "success"
                  ? "border-success bg-success"
                  : "border-primary bg-primary";
        return (
          <li key={it.id ?? i} className="relative flex gap-3.5">
            {!last && <span className="absolute left-[7px] top-5 h-[calc(100%+4px)] w-px bg-hairline" aria-hidden="true" />}
            <span className={cn("relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2", dot)} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className={cn("text-[13px] font-semibold", it.done === false ? "text-muted-foreground" : "text-foreground")}>
                  {it.title}
                </span>
                {timeText && <span className="font-mono text-[11px] text-muted-foreground">{timeText}</span>}
              </div>
              {descText && <div className="mt-0.5 text-xs text-muted-foreground">{descText}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function EmptyBlock({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-hairline-strong px-4 py-8 text-center">
      {icon && <span className="mb-2 text-muted-foreground/70 [&>svg]:h-6 [&>svg]:w-6">{icon}</span>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  tone = "default",
  disabled,
  icon,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "primary" | "danger" | "success";
  disabled?: boolean;
  icon?: ReactNode;
  type?: "button" | "submit";
}) {
  const styles = {
    default: "border border-hairline-strong bg-card text-foreground hover:bg-surface",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    danger: "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
    success: "border border-success/30 bg-success/10 text-success hover:bg-success/15",
  }[tone];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:h-4 [&>svg]:w-4",
        styles,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function DetailLoading({ label }: { label?: string } = {}) {
  return (
    <DetailPage>
      {label && <div className="text-xs text-muted-foreground">{label}</div>}
      <div className="h-5 w-40 animate-pulse rounded bg-surface" />
      <div className="h-28 animate-pulse rounded-2xl border border-hairline bg-card" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-hairline bg-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-card" />
        <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-card" />
      </div>
    </DetailPage>
  );
}

export function DetailError({
  backTo,
  backLabel,
  title,
  message,
  description,
  onRetry,
}: {
  backTo: string;
  backLabel: string;
  title: string;
  message?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const desc = message ?? description;
  return (
    <DetailPage>
      <Link to={backTo as any} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
      </Link>
      <div className="flex flex-col items-center rounded-2xl border border-hairline bg-card px-6 py-16 text-center shadow-card">
        <SearchX className="h-10 w-10 text-muted-foreground/70" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {desc || "This record may have been removed, or the link is invalid."}
        </p>
        {onRetry && (
          <div className="mt-5">
            <ActionButton onClick={onRetry} icon={<RotateCcw />}>
              Try again
            </ActionButton>
          </div>
        )}
      </div>
    </DetailPage>
  );
}
