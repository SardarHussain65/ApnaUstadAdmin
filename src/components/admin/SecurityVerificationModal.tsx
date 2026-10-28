import { useState, useRef, useEffect } from "react";
import { ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/admin/Drawer";

export interface SecurityVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  isDestructive?: boolean;
}

export function SecurityVerificationModal({
  open,
  onClose,
  onConfirm,
  title = "Security Authentication Required",
  description = "This action modifies critical financial or platform settings. Enter your 6-digit administrator verification code to proceed.",
  actionLabel = "Confirm Action",
  isDestructive = false,
}: SecurityVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[index] = val.slice(-1);
    setDigits(newDigits);

    // Auto advance focus
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const nextIdx = Math.min(5, pasted.length);
    inputRefs.current[nextIdx]?.focus();
  };

  const code = digits.join("");
  const isValid = code.length === 6;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onConfirm(code);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
          <p className="leading-relaxed">{description}</p>
        </div>

        <div>
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-3 text-center">
            Enter 6-Digit Admin Security PIN / TOTP
          </label>
          <div className="flex justify-center gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className="w-11 h-13 text-center text-xl font-mono font-black rounded-xl bg-surface-light border border-hairline focus:border-primary focus:glow-cyan focus:outline-none text-white transition-all"
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            <span>2FA Policy: ACTIVE</span>
          </span>
          <span className="text-[10px] text-dim">Default Dev PIN: 123456</span>
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-hairline">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 rounded-xl border border-hairline hover:bg-surface-light text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className={`px-5 h-10 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 ${
              isDestructive
                ? "bg-destructive text-white hover:bg-destructive/90 glow-red"
                : "bg-primary text-background hover:bg-primary/90 glow-cyan font-extrabold"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{actionLabel}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
