import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { shortId } from "@/lib/format";

/** Click-to-copy id. Shows `#c9630c` by default or the full id (`full`) in drawers. */
export function CopyableId({
  id,
  full = false,
  label = "ID",
  className,
}: {
  id?: string | null;
  full?: boolean;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!id) return <span className="text-muted-foreground">—</span>;

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger row click
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success(`${label} copied`, { description: id, duration: 1800 });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn’t copy to clipboard");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label}: ${id}`}
      aria-label={`Copy ${label} ${id}`}
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 font-mono-ids text-xs text-muted-foreground transition hover:border-hairline hover:bg-surface-light hover:text-foreground",
        className,
      )}
    >
      <span className={cn(full ? "break-all text-left" : "truncate")}>{full ? id : shortId(id)}</span>
      {copied ? <Check className="h-3 w-3 shrink-0 text-success" /> : <Copy className="h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />}
    </button>
  );
}
