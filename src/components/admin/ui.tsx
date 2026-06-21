import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, Inbox, Loader2, Star } from "lucide-react";
import { fmtPKR } from "@/lib/mock-data";

export function StatCard({
  label, value, icon, gradient, change, isCurrency,
}: {
  label: string; value: number; icon: ReactNode; gradient: string; change?: number; isCurrency?: boolean;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const fallback = window.setTimeout(() => setN(value), dur);
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [value]);

  const display = isCurrency ? fmtPKR(n) : n.toLocaleString();
  const positive = (change ?? 0) >= 0;

  return (
    <div className="app-glass card-hover relative min-h-[164px] overflow-hidden rounded-[18px] p-5 group">
      <div className={`absolute -right-9 -top-10 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition-transform duration-500 group-hover:scale-125 ${gradient}`} />
      <div className="flex items-start justify-between relative z-10">
        <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-lg`}>
          {icon}
        </div>
        {change !== undefined && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${positive ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
            <ArrowUpRight className={`w-3 h-3 ${positive ? "" : "rotate-90"}`} /> {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="mt-5 text-[28px] font-extrabold tracking-[-0.04em] text-white relative z-10">{display}</div>
      <div className="text-[13px] font-semibold text-muted-foreground mt-1 group-hover:text-foreground transition-colors relative z-10">{label}</div>
    </div>
  );
}

export function Badge({
  children, variant = "muted", pulse,
}: { children: ReactNode; variant?: "success" | "warning" | "danger" | "info" | "muted" | "purple" | "orange"; pulse?: boolean }) {
  const map = {
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-gold/15 text-gold border-gold/30",
    danger: "bg-destructive/15 text-destructive border-destructive/30",
    info: "bg-primary/15 text-primary border-primary/30",
    purple: "bg-secondary/15 text-secondary border-secondary/30",
    orange: "bg-accent/15 text-accent border-accent/30",
    muted: "bg-surface-light text-muted-foreground border-border",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.08em] ${map[variant]}`}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { v: "success" | "warning" | "danger" | "info" | "purple" | "orange" | "muted"; pulse?: boolean }> = {
    pending: { v: "warning", pulse: true },
    accepted: { v: "info" },
    ongoing: { v: "orange", pulse: true },
    completed: { v: "success" },
    cancelled: { v: "danger" },
    open: { v: "info", pulse: true },
    assigned: { v: "info" },
    reviewing: { v: "warning" },
    closed: { v: "success" },
    active: { v: "success", pulse: true },
    inactive: { v: "danger" },
    paid: { v: "success" },
    unpaid: { v: "danger" },
    delivered: { v: "success" },
    sent: { v: "info" },
    queued: { v: "warning", pulse: true },
    created: { v: "muted" },
    failed: { v: "danger" },
    instant: { v: "orange" },
    scheduled: { v: "purple" },
  };
  const cfg = map[status] ?? { v: "muted" as const };
  return <Badge variant={cfg.v} pulse={cfg.pulse}>{status}</Badge>;
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

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-6 py-16 text-center text-muted-foreground">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.07] text-primary">
        <Inbox className="w-6 h-6" />
      </div>
      <div className="font-bold text-foreground">{title}</div>
      {description && <div className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="surface-panel px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/[0.07] text-destructive">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {onRetry && <Button variant="primary" className="mt-5" onClick={onRetry}>Try again</Button>}
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
    primary: "border-primary/30 gradient-cyan text-background shadow-[0_0_22px_rgba(0,245,255,0.22)] hover:shadow-[0_0_28px_rgba(0,245,255,0.34)]",
    secondary: "border-white/10 bg-surface-light/80 text-white hover:border-primary/35 hover:bg-primary/10",
    ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-white/[0.05] hover:text-white",
    danger: "border-destructive/35 bg-destructive/15 text-destructive hover:bg-destructive/22 hover:text-white",
    success: "border-success/35 bg-success text-white hover:bg-success/90",
    outline: "border-border bg-transparent text-foreground hover:border-primary/40 hover:bg-primary/8",
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
      className={`min-h-28 w-full resize-y rounded-xl border border-border bg-input px-3.5 py-3 text-sm leading-relaxed text-white outline-none transition placeholder:text-dim focus:border-primary/60 focus:ring-3 focus:ring-primary/10 ${className}`}
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
      className={`h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm text-white outline-none transition placeholder:text-dim focus:border-primary/60 focus:ring-3 focus:ring-primary/10 ${className}`}
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
