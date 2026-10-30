/**
 * Ambient background: three slow radial-gradient blobs + a faint dot grid.
 * - Pure CSS, transform-only animation (compositor friendly, no blur filters)
 * - Paused while the tab is hidden, removed with prefers-reduced-motion,
 *   low-end devices (hardwareConcurrency <= 4) or Settings → "Reduce visual effects"
 *   (all handled by ThemeProvider through html[data-fx] / html[data-tab-hidden])
 * - Fixed + pointer-events:none, so it can never shift layout or reduce contrast.
 */
export function AuroraBackground({ variant = "shell" }: { variant?: "shell" | "hero" }) {
  return (
    <div aria-hidden="true" className={`fx-layer ${variant === "hero" ? "fx-layer-hero" : ""}`}>
      <div className="fx-blob fx-blob-a" />
      <div className="fx-blob fx-blob-b" />
      <div className="fx-blob fx-blob-c" />
      <div className="fx-dots" />
    </div>
  );
}
