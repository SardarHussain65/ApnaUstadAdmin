/** Reason handling for destructive/financial actions (pure helpers, unit tested). */

export const MIN_NOTE_LENGTH = 10;
export const OTHER_REASON = "Other";

export interface ReasonInput {
  selected?: string;
  note?: string;
}

/** `Policy violation — repeated no-shows` (or just one part if the other is empty). */
export function buildReason({ selected, note }: ReasonInput): string {
  const s = selected?.trim() ?? "";
  const n = note?.trim() ?? "";
  if (s && n) return `${s} — ${n}`;
  return s || n;
}

/**
 * Rules:
 *  - when a preset list exists, one must be chosen
 *  - free-text is required (≥ 10 chars) when "Other" is chosen or no presets exist
 */
export function validateReason(input: ReasonInput, opts: { hasPresets: boolean; required: boolean }): string | null {
  if (!opts.required) return null;
  const note = input.note?.trim() ?? "";
  if (opts.hasPresets && !input.selected) return "Select a reason.";
  const needsNote = !opts.hasPresets || input.selected === OTHER_REASON;
  if (needsNote && note.length < MIN_NOTE_LENGTH) return `Add a note (at least ${MIN_NOTE_LENGTH} characters).`;
  return null;
}
