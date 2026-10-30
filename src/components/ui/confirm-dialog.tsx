import { useEffect, useId, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { OTHER_REASON, buildReason, validateReason } from "@/lib/reason";

export interface ConfirmPayload {
  /** Final composed reason string (preset + note). */
  reason: string;
  selected?: string;
  note?: string;
}

/**
 * Confirmation dialog for destructive / financial actions.
 * - `requireReason` forces a preset (if `reasons` given) and/or a free-text note
 * - double-submit safe: confirm is disabled while the promise is pending
 * - never closes on error, so the admin can retry with the same reason
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  requireReason = true,
  reasons,
  notePlaceholder = "Add context for the audit log…",
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "default" | "warning";
  requireReason?: boolean;
  reasons?: string[];
  notePlaceholder?: string;
  onConfirm: (payload: ConfirmPayload) => Promise<unknown> | unknown;
  /** Extra content (e.g. fee preview) rendered above the reason form. */
  children?: ReactNode;
}) {
  const uid = useId();
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = reasons ? (reasons.includes(OTHER_REASON) ? reasons : [...reasons, OTHER_REASON]) : undefined;
  const validation = validateReason({ selected, note }, { hasPresets: !!presets, required: requireReason });

  useEffect(() => {
    if (open) { setSelected(""); setNote(""); setTouched(false); setPending(false); setError(null); }
  }, [open]);

  const submit = async () => {
    setTouched(true);
    if (validation || pending) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm({ reason: buildReason({ selected, note }), selected: selected || undefined, note: note.trim() || undefined });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const Icon = tone === "danger" ? ShieldAlert : AlertTriangle;
  const toneClasses = {
    danger: { icon: "border-destructive/30 bg-destructive/10 text-destructive", btn: "bg-destructive text-destructive-foreground hover:brightness-110" },
    warning: { icon: "border-warning/30 bg-warning/10 text-warning", btn: "bg-warning text-warning-foreground hover:brightness-110" },
    default: { icon: "border-primary/30 bg-primary/10 text-primary", btn: "gradient-cyan text-primary-foreground hover:brightness-110" },
  }[tone];

  return (
    <Dialog open={open} onOpenChange={(next) => (!pending ? onOpenChange(next) : undefined)}>
      <DialogContent className="max-w-md overflow-hidden rounded-2xl border-hairline-strong bg-card p-0">
        <DialogHeader className="flex-row items-start gap-3 space-y-0 p-5 pb-3 text-left">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", toneClasses.icon)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 pr-6">
            <DialogTitle className="text-base font-semibold text-foreground">{title}</DialogTitle>
            {description && <DialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</DialogDescription>}
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 pb-2">
          {children}
          {requireReason && (
            <div className="space-y-3">
              {presets && (
                <div>
                  <label htmlFor={`${uid}-reason`} className="mb-1.5 block text-xs font-medium text-muted-foreground">Reason <span className="text-destructive">*</span></label>
                  <select
                    id={`${uid}-reason`}
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="h-10 w-full px-3 text-sm"
                    aria-invalid={touched && !selected}
                  >
                    <option value="">Select a reason…</option>
                    {presets.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor={`${uid}-note`} className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {presets ? "Note" : "Reason"} {(!presets || selected === OTHER_REASON) && <span className="text-destructive">*</span>}
                </label>
                <textarea
                  id={`${uid}-note`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={notePlaceholder}
                  className="w-full resize-none px-3 py-2 text-sm"
                />
                <div className="mt-1 flex justify-between text-xs text-dim">
                  <span>Recorded in the audit log.</span>
                  <span className="tabular">{note.length}/500</span>
                </div>
              </div>
              {touched && validation && <p role="alert" className="text-xs font-medium text-destructive">{validation}</p>}
            </div>
          )}
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="mt-3 flex-row justify-end gap-2 border-t border-hairline bg-surface/60 p-4 sm:space-x-0">
          <button type="button" onClick={() => onOpenChange(false)} disabled={pending} className="action-button">Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-13 font-semibold transition disabled:opacity-60", toneClasses.btn)}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
