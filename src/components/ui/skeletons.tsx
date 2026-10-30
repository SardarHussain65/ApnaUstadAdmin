import { cn } from "@/lib/utils";

/** Skeletons for every view type. Heights mirror the real content so loading never shifts layout. */

export function TableSkeleton({ rows = 6, columns = 5, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn("app-glass overflow-hidden rounded-2xl", className)} aria-busy="true" aria-label="Loading table">
      <div className="flex gap-4 border-b border-hairline bg-surface/70 px-4 py-3.5">
        {Array.from({ length: columns }).map((_, c) => <div key={c} className="skeleton h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-hairline px-4 py-4 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="skeleton h-4 flex-1" style={{ maxWidth: c === 0 ? "22%" : undefined, opacity: 1 - r * 0.08 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 260, className }: { height?: number; className?: string }) {
  return (
    <div className={cn("app-glass rounded-2xl p-5", className)} aria-busy="true" aria-label="Loading chart">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-1.5 h-3 w-56" />
      <div className="skeleton mt-5 w-full rounded-xl" style={{ height }} />
    </div>
  );
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("app-glass rounded-2xl p-5", className)} aria-busy="true">
      <div className="skeleton h-4 w-32" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => <div key={i} className="skeleton h-3.5" style={{ width: `${90 - i * 15}%` }} />)}
      </div>
    </div>
  );
}

export function DrawerSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading details">
      <div className="flex items-center gap-3">
        <div className="skeleton h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2"><div className="skeleton h-4 w-40" /><div className="skeleton h-3 w-24" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="space-y-2"><div className="skeleton h-3 w-16" /><div className="skeleton h-4 w-28" /></div>)}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="app-glass min-h-[148px] rounded-2xl p-5">
            <div className="skeleton h-10 w-10 rounded-xl" /><div className="skeleton mt-5 h-8 w-28" /><div className="skeleton mt-2 h-4 w-20" />
          </div>
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
