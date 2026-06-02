import { type ReactNode, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function Drawer({ open, onClose, title, children, width = "max-w-xl" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/72 backdrop-blur-sm animate-fade-in" aria-hidden="true" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby={titleId} className={`app-glass w-full ${width} overflow-y-auto border-l border-white/10 shadow-2xl`} style={{ animation: "drawer-in 0.3s ease-out" }}>
        <div className="sticky top-0 z-10 flex min-h-20 items-center justify-between border-b border-border bg-card/88 px-5 backdrop-blur-xl sm:px-6">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Details panel</div>
            <h2 id={titleId} className="text-lg font-bold tracking-tight">{title}</h2>
          </div>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Close drawer" className="icon-button">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </aside>
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = "max-w-lg" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`app-glass max-h-[92vh] w-full ${width} overflow-hidden rounded-[20px] shadow-2xl`} onClick={e => e.stopPropagation()} style={{ animation: "modal-in 0.24s ease-out" }}>
        <div className="flex items-center justify-between border-b border-border bg-white/[0.025] px-5 py-4 sm:px-6">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Admin action</div>
            <h3 id={titleId} className="font-bold text-lg">{title}</h3>
          </div>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Close dialog" className="icon-button"><X className="w-4 h-4" /></button>
        </div>
        <div className="max-h-[calc(92vh-77px)] overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
