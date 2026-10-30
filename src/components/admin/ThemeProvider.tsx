import { useEffect, type ReactNode } from "react";
import { isLowEndDevice, prefersReducedMotion, resolveEffects, usePreferences } from "@/lib/preferences";

/**
 * Inline script injected into <head> (see __root.tsx) so the correct theme is
 * painted before hydration (no dark → light flash).
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem('au-ui-prefs')||'{}');var t=p.theme||'system';var d=t==='dark'||(t==='system'&&!window.matchMedia('(prefers-color-scheme: light)').matches);var r=document.documentElement;r.classList.remove('dark','light');r.classList.add(d?'dark':'light');r.style.colorScheme=d?'dark':'light';r.dataset.density=p.density==='compact'?'compact':'comfortable';var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;var low=(navigator.hardwareConcurrency||8)<=4;var e=p.effects||'auto';r.dataset.fx=(rm||e==='off'||(e==='auto'&&low))?'off':'on';}catch(e){document.documentElement.classList.add('dark')}})();`;

/** Mirrors preferences onto <html> (theme class, density, fx, tab visibility). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, density, effects } = usePreferences();

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && !media.matches);
      root.classList.toggle("dark", dark);
      root.classList.toggle("light", !dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  useEffect(() => {
    const root = document.documentElement;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const on = resolveEffects(effects, { reducedMotion: prefersReducedMotion(), lowEnd: isLowEndDevice() });
      root.dataset.fx = on ? "on" : "off";
    };
    apply();
    motion.addEventListener("change", apply);
    return () => motion.removeEventListener("change", apply);
  }, [effects]);

  // Pause ambient animation while the tab is hidden (saves battery / GPU).
  useEffect(() => {
    const root = document.documentElement;
    const onVisibility = () => {
      root.dataset.tabHidden = document.hidden ? "true" : "false";
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return <>{children}</>;
}
