import { useSyncExternalStore } from "react";

/**
 * Persisted UI preferences: theme, table density and visual effects.
 * Kept in a tiny external store so any component can subscribe without a
 * provider re-render cascade. SSR-safe (server snapshot = defaults).
 */

export type ThemePreference = "system" | "dark" | "light";
export type Density = "comfortable" | "compact";
/** `auto` = enabled unless reduced-motion / low-end device. */
export type EffectsPreference = "auto" | "on" | "off";

export interface UiPreferences {
  theme: ThemePreference;
  density: Density;
  effects: EffectsPreference;
  pinned: string[];
}

const STORAGE_KEY = "au-ui-prefs";

export const DEFAULT_PREFS: UiPreferences = {
  theme: "system",
  density: "comfortable",
  effects: "auto",
  pinned: [],
};

let state: UiPreferences = DEFAULT_PREFS;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): UiPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      theme: (["system", "dark", "light"] as const).includes(parsed.theme as ThemePreference) ? (parsed.theme as ThemePreference) : "system",
      density: parsed.density === "compact" ? "compact" : "comfortable",
      effects: (["auto", "on", "off"] as const).includes(parsed.effects as EffectsPreference) ? (parsed.effects as EffectsPreference) : "auto",
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned.filter((p): p is string => typeof p === "string") : [],
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = read();
}

function emit() {
  listeners.forEach((l) => l());
}

export function getPreferences(): UiPreferences {
  ensureHydrated();
  return state;
}

export function setPreferences(patch: Partial<UiPreferences>) {
  ensureHydrated();
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode): keep in-memory only */
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = read();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePreferences(): UiPreferences {
  return useSyncExternalStore(subscribe, getPreferences, () => DEFAULT_PREFS);
}

export function togglePinned(path: string) {
  const { pinned } = getPreferences();
  setPreferences({ pinned: pinned.includes(path) ? pinned.filter((p) => p !== path) : [...pinned, path] });
}

/* ───────────────────────── effects resolution ───────────────────────── */

export function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency;
  return typeof cores === "number" && cores > 0 && cores <= 4;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Pure resolution logic, unit tested. */
export function resolveEffects(pref: EffectsPreference, opts: { reducedMotion: boolean; lowEnd: boolean }): boolean {
  if (opts.reducedMotion) return false; // accessibility always wins
  if (pref === "off") return false;
  if (pref === "on") return true;
  return !opts.lowEnd;
}
