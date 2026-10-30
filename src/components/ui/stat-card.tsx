import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Info, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeDelta, formatCompact, formatNumber, formatPKR, formatPercent, type Delta } from "@/lib/format";
import { Sparkline } from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type StatFormat = "number" | "currency" | "percent" | "compact" | "duration";

function formatValue(n: number, format: StatFormat, decimals: number) {
  switch (format) {
    case "currency": return formatPKR(n);
    case "percent": return formatPercent(n, decimals);
    case "compact": return formatCompact(n);
    case "duration": return n < 60 ? `${Math.round(n)}s` : n < 3600 ? `${Math.round(n / 60)}m` : `${(n / 3600).toFixed(1)}h`;
    default: return formatNumber(n, decimals);
  }
}

/** Eases a number from its previous value to the new one (skipped for reduced motion). */
function useCountUp(target: number | null | undefined, enabled: boolean) {
  const [display, setDisplay] = useState<number | null>(target ?? null);
  const fromRef = useRef<number>(target ?? 0);

  useEffect(() => {
    if (target === null || target === undefined) { setDisplay(null); return; }
    if (!enabled) { setDisplay(target); fromRef.current = target; return; }
    const controls = animate(fromRef.current, target, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
      onComplete: () => { fromRef.current = target; },
    });
    return () => controls.stop();
  }, [target, enabled]);

  return display;
}

export function DeltaChip({ delta, invert = false, className }: { delta: Delta; invert?: boolean; className?: string }) {
  const good = delta.direction === "up" ? !invert : delta.direction === "down" ? invert : null;
  const tone =
    delta.direction === "new" ? "border-info/30 bg-info/10 text-info"
    : good === true ? "border-success/30 bg-success/10 text-success"
    : good === false ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-border bg-surface-light text-muted-foreground";
  const Icon = delta.direction === "up" ? ArrowUpRight : delta.direction === "down" ? ArrowDownRight : delta.direction === "new" ? Sparkles : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums", tone, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {delta.label}
      <span className="sr-only">
        {delta.direction === "up" ? " increase vs previous period" : delta.direction === "down" ? " decrease vs previous period" : delta.direction === "new" ? " no data in previous period" : " no comparison available"}
      </span>
    </span>
  );
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("app-glass min-h-[148px] rounded-2xl p-5", className)} aria-busy="true">
      <div className="flex items-start justify-between">
        <div className="skeleton h-10 w-10 rounded-xl" />
        <div className="skeleton h-5 w-14 rounded-full" />
      </div>
      <div className="skeleton mt-5 h-8 w-28" />
      <div className="skeleton mt-2 h-4 w-20" />
    </div>
  );
}

export interface StatCardProps {
  label: string;
  value?: number | null;
  format?: StatFormat;
  decimals?: number;
  /** Previous-period value. Delta is computed here (never faked). */
  previous?: number | null;
  /** Or pass a precomputed delta. */
  delta?: Delta;
  /** Lower-is-better metrics (e.g. time-to-accept). */
  invertDelta?: boolean;
  sparkline?: number[];
  icon?: ReactNode;
  iconClassName?: string;
  tooltip?: string;
  loading?: boolean;
  onClick?: () => void;
  /** Staggered entrance index. */
  index?: number;
  footer?: ReactNode;
  className?: string;
}

export function StatCard({
  label, value, format = "number", decimals = 0, previous, delta, invertDelta, sparkline, icon, iconClassName,
  tooltip, loading, onClick, index = 0, footer, className,
}: StatCardProps) {
  const reduced = useReducedMotion();
  const display = useCountUp(value, !reduced && !loading);

  if (loading) return <StatCardSkeleton className={className} />;

  const resolvedDelta = delta ?? (previous !== undefined ? computeDelta(value, previous) : undefined);
  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.04, ease: "easeOut" }}
      className={cn(
        "app-glass card-hover group relative flex min-h-[148px] w-full flex-col overflow-hidden rounded-2xl p-5 text-left",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {icon ? (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-primary/10 text-primary", iconClassName)}>
            {icon}
          </div>
        ) : <span />}
        {resolvedDelta && <DeltaChip delta={resolvedDelta} invert={invertDelta} />}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="kpi truncate text-3xl font-bold leading-none tracking-tight text-foreground">
            {display === null || display === undefined ? "—" : formatValue(format === "number" || format === "compact" || format === "currency" ? Math.round(display) : display, format, decimals)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-13 font-medium text-muted-foreground">
            <span className="truncate">{label}</span>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help text-dim" tabIndex={0} aria-label={`About ${label}`}>
                    <Info className="h-3.5 w-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-60">{tooltip}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {sparkline && <Sparkline data={sparkline} className="shrink-0" />}
      </div>
      {footer && <div className="mt-3 border-t border-hairline pt-3 text-xs text-muted-foreground">{footer}</div>}
    </Wrapper>
  );
}
