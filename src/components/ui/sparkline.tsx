import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiny dependency-free SVG sparkline. Handles 0/1/flat series gracefully
 * (draws a baseline instead of a broken path).
 */
export function Sparkline({
  data,
  className,
  height = 32,
  width = 112,
  area = true,
}: {
  data: number[];
  className?: string;
  height?: number;
  width?: number;
  area?: boolean;
}) {
  const gradId = useId().replace(/:/g, "");
  const series = data.filter((n) => Number.isFinite(n));
  const pad = 2;

  if (series.length < 2) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("text-muted-foreground/60", className)} aria-hidden="true">
        <line x1={pad} x2={width - pad} y1={height - pad - 1} y2={height - pad - 1} stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 3" strokeLinecap="round" />
      </svg>
    );
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = pad + i * stepX;
    const y = max === min ? height / 2 : pad + (height - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("text-primary", className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.25} fill="currentColor" />
    </svg>
  );
}
