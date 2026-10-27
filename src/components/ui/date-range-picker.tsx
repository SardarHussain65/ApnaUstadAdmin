import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { DateRange as DPRange } from "react-day-picker";
import { endOfDay, format, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { rangeFromPreset, type DateRange, type RangePreset } from "@/lib/date-range";

const PRESETS: Array<{ id: Exclude<RangePreset, "custom">; label: string }> = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
];

/** Segmented 7D / 30D / 90D / Custom range selector. Controlled. */
export function DateRangePicker({
  value,
  onChange,
  className,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DPRange | undefined>({ from: value.from, to: value.to });

  const apply = (range: DPRange | undefined) => {
    setDraft(range);
    if (range?.from && range.to) {
      onChange({ from: startOfDay(range.from), to: endOfDay(range.to), preset: "custom" });
      setOpen(false);
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl border border-hairline bg-surface/70 p-1", className)} role="group" aria-label="Date range">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(rangeFromPreset(p.id))}
          aria-pressed={value.preset === p.id}
          className={cn(
            "h-8 rounded-lg px-3 text-13 font-semibold tabular-nums transition",
            value.preset === p.id ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.label}
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-pressed={value.preset === "custom"}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-13 font-semibold transition",
              value.preset === "custom" ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {value.preset === "custom" ? `${format(value.from, "d MMM")} – ${format(value.to, "d MMM")}` : "Custom"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto border-hairline-strong bg-card p-0">
          <Calendar mode="range" numberOfMonths={2} selected={draft} onSelect={apply} disabled={{ after: new Date() }} defaultMonth={value.from} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
