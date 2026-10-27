import type { ComponentType, ReactNode } from "react";
import {
  AlertCircle, Ban, CheckCircle2, Circle, Clock, FileSearch, Hourglass, Loader2, PauseCircle,
  PlayCircle, Radio, ShieldCheck, ShieldOff, Timer, XCircle, Zap, CalendarClock, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "success" | "warning" | "danger" | "info" | "purple" | "orange" | "muted";

/** Tone → classes. Tinted bg + same-hue text; all pairs ≥ 4.5:1 in both themes. */
export const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-info/15 text-info border-info/30",
  purple: "bg-secondary/15 text-secondary border-secondary/30",
  orange: "bg-accent/15 text-accent border-accent/30",
  muted: "bg-surface-light text-muted-foreground border-border",
};

type IconType = ComponentType<{ className?: string }>;

export function Badge({
  children, variant = "muted", pulse, icon: Icon, className,
}: {
  children: ReactNode;
  variant?: Tone;
  pulse?: boolean;
  icon?: IconType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        TONE_CLASSES[variant],
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3 shrink-0" /> : pulse ? <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" /> : null}
      {children}
    </span>
  );
}

interface StatusConfig { tone: Tone; label?: string; icon: IconType; pulse?: boolean }

/**
 * SINGLE source of truth for every status in the console.
 * Every status gets an icon so colour is never the only signal (a11y).
 */
export const STATUS_MAP: Record<string, StatusConfig> = {
  // booking / job lifecycle
  pending: { tone: "warning", icon: Hourglass },
  open: { tone: "info", icon: Radio, pulse: true },
  assigned: { tone: "info", icon: PlayCircle },
  accepted: { tone: "info", icon: CheckCircle2 },
  ongoing: { tone: "orange", icon: Loader2, pulse: true },
  in_progress: { tone: "orange", label: "in progress", icon: Loader2, pulse: true },
  completed: { tone: "success", icon: CheckCircle2 },
  cancelled: { tone: "danger", icon: XCircle },
  closed: { tone: "muted", icon: Circle },
  expired: { tone: "muted", icon: Timer },
  // payments
  paid: { tone: "success", icon: CheckCircle2 },
  unpaid: { tone: "danger", icon: AlertCircle },
  refunded: { tone: "purple", icon: AlertCircle },
  // accounts
  active: { tone: "success", icon: CheckCircle2 },
  inactive: { tone: "danger", icon: Ban },
  suspended: { tone: "danger", icon: Ban },
  deactivated: { tone: "danger", icon: Ban },
  online: { tone: "success", icon: Radio, pulse: true },
  offline: { tone: "muted", icon: Circle },
  // verification & review queues
  verified: { tone: "success", icon: ShieldCheck },
  unverified: { tone: "warning", icon: ShieldOff },
  reviewing: { tone: "warning", icon: FileSearch },
  investigating: { tone: "info", icon: FileSearch },
  approved: { tone: "success", icon: CheckCircle2 },
  rejected: { tone: "danger", icon: XCircle },
  resolved: { tone: "success", icon: CheckCircle2 },
  // messaging
  created: { tone: "muted", icon: Circle },
  queued: { tone: "warning", icon: Clock, pulse: true },
  scheduled: { tone: "purple", icon: CalendarClock },
  sent: { tone: "info", icon: Send },
  delivered: { tone: "success", icon: CheckCircle2 },
  failed: { tone: "danger", icon: XCircle },
  // misc
  draft: { tone: "muted", icon: Circle },
  paused: { tone: "warning", icon: PauseCircle },
  instant: { tone: "orange", icon: Zap },
  urgent: { tone: "danger", icon: Zap },
  high: { tone: "danger", icon: AlertCircle },
  medium: { tone: "warning", icon: AlertCircle },
  low: { tone: "muted", icon: Circle },
};

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const key = (status ?? "").toString().trim().toLowerCase().replace(/[\s-]+/g, "_");
  const cfg = STATUS_MAP[key];
  const label = cfg?.label ?? (key ? key.replace(/_/g, " ") : "unknown");
  return (
    <Badge variant={cfg?.tone ?? "muted"} icon={cfg?.icon ?? Circle} className={cn("capitalize", className)}>
      {label}
    </Badge>
  );
}
