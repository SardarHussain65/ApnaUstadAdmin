import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CopyableId } from "@/components/ui/copyable-id";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { Tone } from "@/components/ui/status-badge";

export function KeyValueGrid({
  items,
  columns = 2,
  className,
}: {
  items: Array<{ label: string; value: ReactNode; /** copyable monospace id */ id?: string; hidden?: boolean }>;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const cols = columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", cols, className)}>
      {items.filter((i) => !i.hidden).map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 break-words text-sm text-foreground">
            {item.id ? <CopyableId id={item.id} full label={item.label} className="-ml-1.5" /> : (item.value ?? "—")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface TimelineEvent {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  at?: string | Date | null;
  actor?: string;
  tone?: Tone;
  icon?: ComponentType<{ className?: string }>;
}

const DOT_TONE: Record<Tone, string> = {
  success: "border-success/40 bg-success/15 text-success",
  warning: "border-warning/40 bg-warning/15 text-warning",
  danger: "border-destructive/40 bg-destructive/15 text-destructive",
  info: "border-info/40 bg-info/15 text-info",
  purple: "border-secondary/40 bg-secondary/15 text-secondary",
  orange: "border-accent/40 bg-accent/15 text-accent",
  muted: "border-border bg-surface-light text-muted-foreground",
};

/** Vertical event timeline (booking/job/dispute history). */
export function Timeline({ events, className, empty = "No events yet." }: { events: TimelineEvent[]; className?: string; empty?: string }) {
  if (!events.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className={cn("relative space-y-5", className)}>
      {events.map((event, i) => {
        const Icon = event.icon;
        return (
          <li key={event.id} className="relative flex gap-3">
            {i < events.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-4px)] w-px bg-border" aria-hidden="true" />}
            <span className={cn("relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border", DOT_TONE[event.tone ?? "muted"])}>
              {Icon ? <Icon className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="text-sm font-medium text-foreground">{event.title}</div>
              {event.description && <div className="mt-0.5 text-13 text-muted-foreground">{event.description}</div>}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-dim">
                {event.at && <time dateTime={new Date(event.at).toISOString()} title={formatDateTime(event.at)}>{formatRelative(event.at)}</time>}
                {event.actor && <span>· by {event.actor}</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
