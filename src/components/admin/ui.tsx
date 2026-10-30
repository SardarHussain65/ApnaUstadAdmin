import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2, Star } from "lucide-react";
import { StatCard as KitStatCard } from "@/components/ui/stat-card";
import type { Delta } from "@/lib/format";

// Single source of truth lives in components/ui — re-exported so the existing pages keep working.
export { Badge, StatusBadge } from "@/components/ui/status-badge";
export { EmptyState, ErrorState } from "@/components/ui/empty-state";

/**
 * Legacy StatCard signature (label/value/icon/gradient/change/isCurrency) used by older pages.
 * Delegates to the kit StatCard. `change` is a pre-computed % — the dashboard rebuild (phase 3)
 * replaces it with real previous-period `previous` values.
 */
export function StatCard({
  label, value, icon, gradient, change, isCurrency,
}: {
  label: string; value: number; icon: ReactNode; gradient?: string; change?: number; isCurrency?: boolean;
}) {
  const delta: Delta | undefined =
    change === undefined
      ? undefined
      : change === 0
        ? { label: "0%", direction: "flat", pct: 0 }
        : { label: `${change > 0 ? "+" : ""}${change}%`, direction: change > 0 ? "up" : "down", pct: change };
  return <KitStatCard label={label} value={value} format={isCurrency ? "currency" : "number"} icon={icon} delta={delta} iconClassName={gradient ? `${gradient} text-white border-transparent` : undefined} />;
}

export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} className={i <= Math.round(rating) ? "fill-gold text-gold" : "text-dim"} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}

export function Avatar({ src, name, size = 36 }: { src?: string; name?: string; size?: number }) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-gradient-to-br from-surface-light to-card-selected flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0 shadow-sm"
      style={{ width: size, height: size }}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}



type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";

export function Button({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  const variants: Record<ButtonVariant, string> = {
    primary: "border-primary/30 gradient-cyan text-primary-foreground glow-cyan hover:brightness-110",
    secondary: "border-hairline bg-surface-light/80 text-foreground hover:border-primary/40 hover:bg-primary/10",
    ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-surface-light hover:text-foreground",
    danger: "border-destructive/35 bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground",
    success: "border-success/35 bg-success text-success-foreground hover:brightness-110",
    outline: "border-border bg-transparent text-foreground hover:border-primary/40 hover:bg-primary/10",
  };
  const sizes = {
    sm: "min-h-9 px-3 text-xs",
    md: "min-h-11 px-4 text-sm",
    lg: "min-h-12 px-5 text-sm",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`btn-press inline-flex items-center justify-center gap-2 rounded-xl border font-bold transition disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function FormField({
  label,
  hint,
  icon,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs leading-relaxed text-dim">{hint}</span>}
    </label>
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-28 w-full resize-y rounded-xl border border-border bg-input px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition placeholder:text-dim focus:border-primary/60 focus:ring-3 focus:ring-primary/10 ${className}`}
    />
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm text-foreground outline-none transition placeholder:text-dim focus:border-primary/60 focus:ring-3 focus:ring-primary/10 ${className}`}
    />
  );
}

export function InfoCard({
  title,
  children,
  tone = "default",
}: {
  title?: string;
  children: ReactNode;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const tones = {
    default: "border-white/8 bg-white/[0.02]",
    warning: "border-gold/20 bg-gold/8",
    danger: "border-destructive/20 bg-destructive/8",
    success: "border-success/20 bg-success/8",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      {title && <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim">{title}</div>}
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
