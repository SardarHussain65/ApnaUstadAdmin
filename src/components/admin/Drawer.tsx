import { type ReactNode, useEffect, useId, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type OverlayVariant = "default" | "danger" | "success" | "warning";

const VARIANT_STYLES: Record<
  OverlayVariant,
  { ring: string; glow: string; iconBg: string; iconColor: string; label: string; Icon: typeof Info }
> = {
  default: {
    ring: "from-primary/40 via-transparent to-secondary/30",
    glow: "bg-primary/12",
    iconBg: "border-primary/25 bg-primary/10",
    iconColor: "text-primary",
    label: "Details",
    Icon: Info,
  },
  danger: {
    ring: "from-destructive/50 via-transparent to-destructive/20",
    glow: "bg-destructive/10",
    iconBg: "border-destructive/25 bg-destructive/10",
    iconColor: "text-destructive",
    label: "Confirm action",
    Icon: AlertTriangle,
  },
  success: {
    ring: "from-success/45 via-transparent to-success/15",
    glow: "bg-success/10",
    iconBg: "border-success/25 bg-success/10",
    iconColor: "text-success",
    label: "Success",
    Icon: CheckCircle2,
  },
  warning: {
    ring: "from-gold/45 via-transparent to-accent/20",
    glow: "bg-gold/10",
    iconBg: "border-gold/25 bg-gold/10",
    iconColor: "text-gold",
    label: "Review required",
    Icon: AlertTriangle,
  },
};

function useOverlayLock(open: boolean, onClose: () => void, focusRef: React.RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    focusRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose, focusRef]);
}

function OverlayShell({
  open,
  onClose,
  title,
  description,
  children,
  width = "max-w-lg",
  variant = "default",
  icon,
  footer,
  eyebrow,
  titleTag: TitleTag = "h3",
  closeLabel = "Close dialog",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
  variant?: OverlayVariant;
  icon?: ReactNode;
  footer?: ReactNode;
  eyebrow?: string;
  titleTag?: "h2" | "h3";
  closeLabel?: string;
}) {
  const titleId = useId();
  const descId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const styles = VARIANT_STYLES[variant];
  const HeaderIcon = styles.Icon;

  useOverlayLock(open, onClose, closeButtonRef);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5" onClick={onClose}>
      <div className="overlay-backdrop absolute inset-0" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`overlay-panel relative flex max-h-[min(94vh,920px)] w-full flex-col overflow-hidden rounded-[28px] ${width}`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modal-in 0.28s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r ${styles.ring}`} />
        <div className={`pointer-events-none absolute -right-8 -top-16 h-36 w-36 rounded-full blur-3xl ${styles.glow}`} />

        <header className="relative z-10 flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${styles.iconBg}`}>
              {icon ?? <HeaderIcon className={`h-5 w-5 ${styles.iconColor}`} />}
            </div>
            <div className="min-w-0 pr-2">
              <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${styles.iconColor}`}>
                {eyebrow ?? styles.label}
              </div>
              <TitleTag id={titleId} className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                {title}
              </TitleTag>
              {description && (
                <p id={descId} className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button ref={closeButtonRef} onClick={onClose} aria-label={closeLabel} className="overlay-close-btn">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="overlay-footer">{footer}</footer>}
      </div>
    </div>
  );
}

/** Centered detail panel — same layout as Modal, usually wider. */
export function Drawer(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
  variant?: OverlayVariant;
  icon?: ReactNode;
  footer?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <OverlayShell
      {...props}
      width={props.width ?? "max-w-2xl"}
      titleTag="h2"
      closeLabel="Close panel"
    />
  );
}

export function Modal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
  variant?: OverlayVariant;
  icon?: ReactNode;
  footer?: ReactNode;
  eyebrow?: string;
}) {
  return <OverlayShell {...props} width={props.width ?? "max-w-lg"} />;
}

export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

export function DrawerSection({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-white/8 bg-white/[0.02] p-4 ${className}`}>
      {title && (
        <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-dim">{title}</h4>
      )}
      {children}
    </section>
  );
}

export function FormHint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{children}</p>;
}
