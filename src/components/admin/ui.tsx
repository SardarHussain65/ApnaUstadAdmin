import { useEffect, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
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
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const display = isCurrency ? fmtPKR(n) : n.toLocaleString();
  const positive = (change ?? 0) >= 0;

  return (
    <div className="card-hover bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center`}>
          {icon}
        </div>
        {change !== undefined && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
            {positive ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="mt-4 text-3xl font-extrabold tracking-tight">{display}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wide ${map[variant]}`}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
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
      className="rounded-full bg-surface-light flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : name[0]?.toUpperCase()}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="w-16 h-16 rounded-2xl bg-surface-light mx-auto mb-4 flex items-center justify-center text-3xl">📭</div>
      <div className="font-semibold text-foreground">{title}</div>
      {description && <div className="text-sm mt-1">{description}</div>}
    </div>
  );
}
