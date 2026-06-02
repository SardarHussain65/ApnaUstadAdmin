import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, Inbox, Star } from "lucide-react";
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

export function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-gradient-to-br from-surface-light to-card-selected flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0 shadow-sm"
      style={{ width: size, height: size }}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : name[0]?.toUpperCase()}
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
      {onRetry && <button onClick={onRetry} className="action-button action-button-primary mt-5">Try again</button>}
    </div>
  );
}
