import { format as fnsFormat, formatDistanceToNowStrict, isValid } from "date-fns";

/**
 * Central formatting utilities for the admin console.
 * Every page must format money / numbers / identifiers through this module so
 * the UI stays consistent (e.g. `Rs 5,252`, never `₨5251.5`).
 */

const EM_DASH = "—";

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

/* ───────────────────────────── Money ───────────────────────────── */

export interface FormatPKROptions {
  /** Number of fraction digits. Defaults to 0 (whole rupees). */
  decimals?: number;
  /** Compact notation, e.g. `Rs 1.2M`. */
  compact?: boolean;
  /** Prefix + sign for positive numbers (for ledger deltas). */
  signed?: boolean;
}

/** Format an amount in PKR rupees: `Rs 5,252`. Returns "—" for nullish input. */
export function formatPKR(value: unknown, options: FormatPKROptions = {}): string {
  const n = toNumber(value);
  if (n === null) return EM_DASH;
  const { decimals = 0, compact = false, signed = false } = options;
  const abs = Math.abs(n);
  const body = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: compact ? 0 : decimals,
    maximumFractionDigits: compact ? 1 : decimals,
    notation: compact ? "compact" : "standard",
  }).format(abs);
  const sign = n < 0 ? "-" : signed && n > 0 ? "+" : "";
  return `${sign}Rs ${body}`;
}

/** Backwards compatible alias used across existing pages. */
export const fmtPKR = (n: unknown) => formatPKR(n);

/* ──────────────────────────── Numbers ──────────────────────────── */

export function formatNumber(value: unknown, decimals = 0): string {
  const n = toNumber(value);
  if (n === null) return EM_DASH;
  return new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatCompact(value: unknown): string {
  const n = toNumber(value);
  if (n === null) return EM_DASH;
  return new Intl.NumberFormat("en-PK", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatPercent(value: unknown, decimals = 0): string {
  const n = toNumber(value);
  if (n === null) return EM_DASH;
  return `${n.toFixed(decimals)}%`;
}

/* ───────────────────────────── Deltas ───────────────────────────── */

export interface Delta {
  /** Display string: `+12%`, `-4%`, `New`, `—`. */
  label: string;
  direction: "up" | "down" | "flat" | "new" | "none";
  /** Raw percentage, or null when it can't be computed. */
  pct: number | null;
}

/**
 * Real previous-period comparison. Never fabricates a "100%" when the
 * previous value is zero: that case is `New` (or `—` when both are zero).
 */
export function computeDelta(current: unknown, previous: unknown): Delta {
  const cur = toNumber(current);
  const prev = toNumber(previous);
  if (cur === null || prev === null) return { label: EM_DASH, direction: "none", pct: null };
  if (prev === 0) {
    if (cur === 0) return { label: EM_DASH, direction: "none", pct: null };
    return { label: "New", direction: "new", pct: null };
  }
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) return { label: "0%", direction: "flat", pct: 0 };
  const shown = Math.abs(rounded) >= 100 ? Math.round(rounded) : rounded;
  return {
    label: `${shown > 0 ? "+" : ""}${shown}%`,
    direction: shown > 0 ? "up" : "down",
    pct: rounded,
  };
}

/* ─────────────────────── Phone / city / CNIC ─────────────────────── */

/**
 * Legacy Google sign-ups stored synthetic values like `G-1781351343301-537`
 * in the `phone` field. Anything that is not a plausible phone number is
 * treated as "not provided".
 */
export function isPlaceholderPhone(phone: unknown): boolean {
  if (typeof phone !== "string") return true;
  const trimmed = phone.trim();
  if (!trimmed) return true;
  if (/^g-\d+/i.test(trimmed)) return true;
  if (/^(n\/?a|null|undefined|none|-+)$/i.test(trimmed)) return true;
  return trimmed.replace(/\D/g, "").length < 7;
}

/** Pretty-prints Pakistani numbers (`+92 300 1234567`); returns null for placeholders. */
export function formatPhone(phone: unknown): string | null {
  if (isPlaceholderPhone(phone)) return null;
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, "");
  let national: string | null = null;
  if (digits.startsWith("92") && digits.length === 12) national = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) national = digits.slice(1);
  else if (digits.length === 10 && digits.startsWith("3")) national = digits;
  if (national) return `+92 ${national.slice(0, 3)} ${national.slice(3)}`;
  return raw;
}

/** True when the number is in +92 format (used to flag test data such as +91). */
export function isPakistaniPhone(phone: unknown): boolean {
  const formatted = formatPhone(phone);
  return !!formatted && formatted.startsWith("+92");
}

const CITY_PLACEHOLDERS = new Set(["n/a", "na", "null", "undefined", "none", "unknown", "mountain view", "-", ""]);

/** Normalises city values, treating placeholders (`N/A`, `Mountain View`) as unknown. */
export function formatCity(city: unknown): string | null {
  if (typeof city !== "string") return null;
  const trimmed = city.trim();
  if (CITY_PLACEHOLDERS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/** Valid Pakistani CNIC format: `#####-#######-#`. */
export const CNIC_REGEX = /^\d{5}-\d{7}-\d$/;
export const isValidCnic = (value: unknown) => typeof value === "string" && CNIC_REGEX.test(value.trim());

/** Format standard 13-digit raw string into `XXXXX-XXXXXXX-X`. */
export function formatCnic(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return EM_DASH;
  const raw = value.trim();
  if (raw.includes("-")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13) return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  return raw;
}

/** Mask all but the first group and last digit: `75211-*******-2`. */
export function maskCnic(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return EM_DASH;
  const trimmed = value.trim();
  if (trimmed.includes("*")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length !== 13) return `${trimmed.slice(0, 2)}${"*".repeat(Math.max(trimmed.length - 3, 0))}${trimmed.slice(-1)}`;
  return `${digits.slice(0, 5)}-*******-${digits.slice(12)}`;
}

/** Short display form for ids: `#c9630c`. Full id is shown in drawers via CopyableId. */
export function shortId(id: unknown, length = 6): string {
  if (!id) return EM_DASH;
  let str = "";
  if (typeof id === "string") {
    str = id;
  } else if (typeof id === "object" && id !== null) {
    if ("$oid" in (id as any)) str = String((id as any).$oid);
    else if ("toHexString" in (id as any) && typeof (id as any).toHexString === "function") str = (id as any).toHexString();
    else if (typeof (id as any).toString === "function") {
      const s = String((id as any).toString());
      str = s !== "[object Object]" ? s : "";
    }
  } else {
    str = String(id);
  }
  if (!str) return EM_DASH;
  return `#${str.slice(-length)}`;
}

/* ───────────────────────────── Dates ───────────────────────────── */

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value as string | number);
  return isValid(d) ? d : null;
};

export function formatDate(value: unknown, pattern = "dd MMM yyyy"): string {
  const d = toDate(value);
  return d ? fnsFormat(d, pattern) : EM_DASH;
}

export function formatDateTime(value: unknown): string {
  return formatDate(value, "dd MMM yyyy, h:mm a");
}

/** `3h`, `12m`, `2d` — compact age used for SLA badges ("waiting 3h"). */
export function formatAge(value: unknown, now: number = Date.now()): string {
  const d = toDate(value);
  if (!d) return EM_DASH;
  const minutes = Math.max(0, Math.floor((now - d.getTime()) / 60000));
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatRelative(value: unknown): string {
  const d = toDate(value);
  return d ? `${formatDistanceToNowStrict(d)} ago` : EM_DASH;
}
