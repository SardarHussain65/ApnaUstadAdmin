import { useState, useEffect } from "react";
import { Eye, EyeOff, ShieldAlert, Copy, Check, Lock, AlertTriangle, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { useRevealWorkerCnic } from "@/lib/api-hooks";
import { formatCnic, maskCnic } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CnicRevealModalProps {
  workerId: string;
  maskedCnic?: string;
  workerName?: string;
  className?: string;
  showImages?: boolean;
}

const REVEAL_PRESETS = [
  "Identity verification review",
  "Suspected fraudulent account check",
  "NADRA verification discrepancy",
  "Dispute or law enforcement compliance",
  "Worker payout information check",
];

export function CnicRevealModal({
  workerId,
  maskedCnic,
  workerName,
  className,
  showImages = true,
}: CnicRevealModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revealedData, setRevealedData] = useState<{
    cnicNumber: string;
    cnicFrontImage?: string;
    cnicBackImage?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const revealMutation = useRevealWorkerCnic();

  // 60-second countdown to automatically re-mask confidential CNIC
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) {
      if (secondsRemaining === 0) {
        setRevealedData(null);
        setSecondsRemaining(null);
        toast.info("Revealed CNIC view has expired and re-masked for security.");
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const handleConfirmReveal = async (payload: ConfirmPayload) => {
    try {
      const result = await revealMutation.mutateAsync({
        id: workerId,
        reason: payload.reason,
      });

      const unmasked = (result as any)?.data || result;
      setRevealedData(unmasked);
      setSecondsRemaining(60);
      toast.success("Worker CNIC revealed and recorded in Audit Log");
    } catch (err: any) {
      toast.error(err.message || "Failed to reveal CNIC. Check your permissions.");
      throw err;
    }
  };

  const handleCopy = () => {
    if (!revealedData?.cnicNumber) return;
    navigator.clipboard.writeText(revealedData.cnicNumber);
    setCopied(true);
    toast.success("CNIC copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const displayMasked = maskCnic(maskedCnic || "");

  return (
    <div className={cn("inline-flex flex-col gap-2", className)}>
      {/* Revealed View */}
      {revealedData ? (
        <div className="space-y-3 rounded-2xl border border-warning/40 bg-warning/5 p-4 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-warning">
              <ShieldAlert className="h-4 w-4" />
              <span>CONFIDENTIAL · AUDIT LOGGED</span>
            </div>
            {secondsRemaining !== null && (
              <span className="text-[11px] font-mono font-medium text-muted-foreground">
                Auto-masks in <strong className="text-foreground">{secondsRemaining}s</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold tracking-wider text-foreground">
              {formatCnic(revealedData.cnicNumber)}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:text-foreground"
              title="Copy unmasked CNIC"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setRevealedData(null);
                setSecondsRemaining(null);
              }}
              className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-surface px-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Mask</span>
            </button>
          </div>

          {showImages && (revealedData.cnicFrontImage || revealedData.cnicBackImage) && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {revealedData.cnicFrontImage && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">CNIC Front</span>
                  <div
                    onClick={() => setLightboxImage(revealedData.cnicFrontImage!)}
                    className="group relative aspect-[3/2] cursor-pointer overflow-hidden rounded-xl border border-border bg-surface"
                  >
                    <img
                      src={revealedData.cnicFrontImage}
                      alt="CNIC Front"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <ExternalLink className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              )}
              {revealedData.cnicBackImage && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">CNIC Back</span>
                  <div
                    onClick={() => setLightboxImage(revealedData.cnicBackImage!)}
                    className="group relative aspect-[3/2] cursor-pointer overflow-hidden rounded-xl border border-border bg-surface"
                  >
                    <img
                      src={revealedData.cnicBackImage}
                      alt="CNIC Back"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <ExternalLink className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Masked Default View */
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {displayMasked}
          </span>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
          >
            <Lock className="h-3 w-3" />
            <span>Reveal</span>
          </button>
        </div>
      )}

      {/* Audit Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Audit-Logged CNIC Reveal"
        description={
          <div>
            <p>
              Pakistani CNIC numbers and identity photos for{" "}
              <strong className="text-foreground">{workerName || "this ustad"}</strong> are protected
              under privacy regulations.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Revealing this document will write a permanent compliance log with your administrator ID,
              timestamp, and provided justification.
            </p>
          </div>
        }
        confirmLabel="Reveal & Log Access"
        tone="warning"
        requireReason={true}
        reasons={REVEAL_PRESETS}
        notePlaceholder="Explain why this identity record needs to be inspected..."
        onConfirm={handleConfirmReveal}
      />

      {/* Lightbox Dialog for Full Image View */}
      {lightboxImage && (
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-3xl border-border bg-card p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-foreground">
                CNIC Document Preview
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Confidential identity document. Do not capture or distribute externally.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex max-h-[75vh] items-center justify-center overflow-auto rounded-xl bg-surface p-2">
              <img src={lightboxImage} alt="CNIC Document" className="max-h-full max-w-full rounded-lg object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
