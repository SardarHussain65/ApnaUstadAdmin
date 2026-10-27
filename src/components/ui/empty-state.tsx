import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Inbox, Lock, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyVariant = "empty" | "success" | "search";

/**
 * Context-aware empty state.
 *  - `success`: queue cleared ("All caught up…") with a subtle success illustration
 *  - `search`:  filters/search returned nothing, offers "Clear filters"
 *  - `empty`:   genuinely no data yet
 */
export function EmptyState({
  title,
  description,
  variant = "empty",
  query,
  onClearFilters,
  action,
  compact,
  className,
}: {
  title?: string;
  description?: string;
  variant?: EmptyVariant;
  /** For `search`: the active query, shown as `No results for "xyz"`. */
  query?: string;
  onClearFilters?: () => void;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const resolvedTitle =
    title ??
    (variant === "search"
      ? query ? `No results for “${query}”` : "No results match your filters"
      : variant === "success" ? "All caught up" : "Nothing here yet");
  const resolvedDescription =
    description ??
    (variant === "search"
      ? "Try a different search term or clear the active filters."
      : variant === "success" ? "There is nothing waiting for your attention right now." : undefined);

  const Icon = variant === "success" ? CheckCircle2 : variant === "search" ? SearchX : Inbox;
  const tone =
    variant === "success"
      ? "border-success/25 bg-success/10 text-success"
      : "border-primary/20 bg-primary/10 text-primary";

  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "px-4 py-8" : "px-6 py-16", className)} role="status">
      <div className="relative mb-4">
        {variant === "success" && (
          <>
            <span className="absolute inset-0 -m-2 rounded-3xl border border-success/20" aria-hidden="true" />
            <span className="absolute inset-0 -m-4 rounded-[28px] border border-success/10" aria-hidden="true" />
          </>
        )}
        <div className={cn("relative flex h-14 w-14 items-center justify-center rounded-2xl border", tone)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="text-base font-semibold text-foreground">{resolvedTitle}</div>
      {resolvedDescription && <div className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{resolvedDescription}</div>}
      {(onClearFilters || action) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {onClearFilters && (
            <button type="button" onClick={onClearFilters} className="action-button">
              Clear filters
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("surface-panel px-6 py-14 text-center", className)} role="alert">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="action-button action-button-primary mt-5">
          Try again
        </button>
      )}
    </div>
  );
}

/** 403 page body: shown instead of silently redirecting. */
export function ForbiddenState({ description }: { description?: string }) {
  return (
    <div className="surface-panel mx-auto mt-12 max-w-lg px-6 py-14 text-center" role="alert">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-warning/30 bg-warning/10 text-warning">
        <Lock className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">You don’t have permission to view this page</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description ?? "Your admin role doesn’t include access to this section. Ask a super admin if you need it."}
      </p>
    </div>
  );
}
