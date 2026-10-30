import { cn } from "@/lib/utils";
import { formatPKR, type FormatPKROptions } from "@/lib/format";

/** Money rendered through the one `formatPKR` util with tabular numerals. */
export function MoneyText({
  value,
  className,
  tone = "default",
  warnBelow,
  ...options
}: {
  value: unknown;
  className?: string;
  /** `delta` colours positive green / negative red (ledger rows). */
  tone?: "default" | "delta" | "muted";
  /** Renders in red when below this amount (e.g. Rs 500 minimum wallet balance). */
  warnBelow?: number;
} & FormatPKROptions) {
  const n = typeof value === "number" ? value : Number(value);
  const low = warnBelow !== undefined && Number.isFinite(n) && n < warnBelow;
  return (
    <span
      className={cn(
        "tabular whitespace-nowrap",
        tone === "muted" && "text-muted-foreground",
        tone === "delta" && Number.isFinite(n) && (n > 0 ? "text-success" : n < 0 ? "text-destructive" : ""),
        low && "font-semibold text-destructive",
        className,
      )}
      title={low ? `Below minimum of ${formatPKR(warnBelow)}` : undefined}
    >
      {formatPKR(value, { signed: tone === "delta", ...options })}
    </span>
  );
}
