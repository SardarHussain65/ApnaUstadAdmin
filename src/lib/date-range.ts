import { differenceInCalendarDays, endOfDay, startOfDay, subDays } from "date-fns";

export type RangePreset = "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset: RangePreset;
}

export const PRESET_DAYS: Record<Exclude<RangePreset, "custom">, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** Inclusive range ending today: `7d` = today and the 6 days before it. */
export function rangeFromPreset(preset: Exclude<RangePreset, "custom">, now: Date = new Date()): DateRange {
  const days = PRESET_DAYS[preset];
  return { from: startOfDay(subDays(now, days - 1)), to: endOfDay(now), preset };
}

/** Immediately preceding period of identical length, used for compare-to-previous. */
export function previousPeriod(range: Pick<DateRange, "from" | "to">): { from: Date; to: Date } {
  const days = differenceInCalendarDays(range.to, range.from) + 1;
  const to = endOfDay(subDays(range.from, 1));
  const from = startOfDay(subDays(range.from, days));
  return { from, to };
}

/** Serialise for query strings: `YYYY-MM-DD` in local time. */
export function toQueryDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
