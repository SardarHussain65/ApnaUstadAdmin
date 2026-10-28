import { useState, useMemo } from "react";
import { 
  MapPin, 
  Users, 
  Clock, 
  Flame, 
  Radio, 
  ShieldCheck, 
  Compass, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { fmtPKR } from "@/lib/format";

export type CityOpsData = {
  id: string;
  name: string;
  province: string;
  x: number; // SVG X coordinate
  y: number; // SVG Y coordinate
  activeUstads: number;
  pendingJobs: number;
  avgSla: string;
  topTrade: string;
  demandLevel: "high" | "medium" | "surging";
};

const CITY_HUBS: CityOpsData[] = [
  {
    id: "karachi",
    name: "Karachi",
    province: "Sindh",
    x: 230,
    y: 430,
    activeUstads: 142,
    pendingJobs: 9,
    avgSla: "3.8 min",
    topTrade: "AC & Refrigeration",
    demandLevel: "surging",
  },
  {
    id: "lahore",
    name: "Lahore",
    province: "Punjab",
    x: 420,
    y: 220,
    activeUstads: 198,
    pendingJobs: 14,
    avgSla: "4.1 min",
    topTrade: "Electrician & UPS",
    demandLevel: "surging",
  },
  {
    id: "islamabad",
    name: "Islamabad & Rawalpindi",
    province: "ICT / Punjab",
    x: 385,
    y: 135,
    activeUstads: 115,
    pendingJobs: 6,
    avgSla: "3.5 min",
    topTrade: "Plumbing & Sanitization",
    demandLevel: "high",
  },
  {
    id: "faisalabad",
    name: "Faisalabad",
    province: "Punjab",
    x: 375,
    y: 235,
    activeUstads: 74,
    pendingJobs: 4,
    avgSla: "5.2 min",
    topTrade: "Carpentry & Woodwork",
    demandLevel: "medium",
  },
  {
    id: "multan",
    name: "Multan",
    province: "Punjab",
    x: 335,
    y: 290,
    activeUstads: 62,
    pendingJobs: 3,
    avgSla: "4.8 min",
    topTrade: "Solar & Power Systems",
    demandLevel: "medium",
  },
  {
    id: "peshawar",
    name: "Peshawar",
    province: "Khyber Pakhtunkhwa",
    x: 330,
    y: 125,
    activeUstads: 58,
    pendingJobs: 5,
    avgSla: "5.0 min",
    topTrade: "Painting & Masonry",
    demandLevel: "high",
  },
  {
    id: "gujranwala",
    name: "Gujranwala & Sialkot",
    province: "Punjab",
    x: 415,
    y: 180,
    activeUstads: 86,
    pendingJobs: 7,
    avgSla: "4.3 min",
    topTrade: "Appliance Repair",
    demandLevel: "high",
  },
  {
    id: "quetta",
    name: "Quetta",
    province: "Balochistan",
    x: 195,
    y: 275,
    activeUstads: 29,
    pendingJobs: 2,
    avgSla: "6.5 min",
    topTrade: "Automotive & Mechanical",
    demandLevel: "medium",
  },
];

export function LiveOpsMap() {
  const [activeCityId, setActiveCityId] = useState<string>("lahore");
  const [viewMode, setViewMode] = useState<"ustads" | "jobs" | "heatmap">("ustads");

  const activeCity = useMemo(() => {
    return CITY_HUBS.find((c) => c.id === activeCityId) || CITY_HUBS[0];
  }, [activeCityId]);

  const totalUstads = useMemo(() => CITY_HUBS.reduce((acc, c) => acc + c.activeUstads, 0), []);
  const totalJobs = useMemo(() => CITY_HUBS.reduce((acc, c) => acc + c.pendingJobs, 0), []);

  return (
    <div className="rounded-2xl border border-hairline bg-card overflow-hidden shadow-card">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline p-5">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <h3 className="text-base font-bold text-foreground">Pakistan Live Operations Radar</h3>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              {totalUstads} Ustads Online
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Geographic dispatch density, active workforce clusters, and pending booking alerts
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-light border border-hairline text-xs">
          <button
            onClick={() => setViewMode("ustads")}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              viewMode === "ustads"
                ? "bg-primary text-background shadow-glow-cyan"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Active Ustads</span>
          </button>
          <button
            onClick={() => setViewMode("jobs")}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              viewMode === "jobs"
                ? "bg-amber-400 text-black shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pending Jobs ({totalJobs})</span>
          </button>
          <button
            onClick={() => setViewMode("heatmap")}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              viewMode === "heatmap"
                ? "bg-purple-500 text-white shadow-glow-purple"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Demand Heatmap</span>
          </button>
        </div>
      </div>

      {/* Map + Detail Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* SVG Interactive Canvas */}
        <div className="lg:col-span-8 relative p-4 sm:p-6 bg-[#04060C] flex items-center justify-center min-h-[420px] select-none border-b lg:border-b-0 lg:border-r border-hairline">
          {/* Subtle Grid Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

          {/* Compass Rose */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 text-[11px] text-muted-foreground/60 font-mono">
            <Compass className="w-4 h-4 text-primary/70 animate-spin-slow" />
            <span>NORTH • PKT (UTC+5)</span>
          </div>

          <svg
            viewBox="0 0 600 500"
            className="w-full h-auto max-w-[560px] drop-shadow-[0_0_35px_rgba(0,245,255,0.08)]"
          >
            <defs>
              {/* Radial gradient for glowing heatmaps */}
              <radialGradient id="heatSurge" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#BF5AF2" stopOpacity="0.6" />
                <stop offset="60%" stopColor="#BF5AF2" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#BF5AF2" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heatHigh" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00F5FF" stopOpacity="0.5" />
                <stop offset="60%" stopColor="#00F5FF" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#00F5FF" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Stylized Pakistan Provincial Borders Base */}
            <g className="transition-all duration-300">
              {/* Balochistan Territory */}
              <path
                d="M 90 280 L 150 220 L 250 250 L 260 380 L 200 420 L 120 370 Z"
                fill="#0F172A"
                stroke="#334155"
                strokeWidth="1.5"
                className="hover:fill-slate-800/80 transition-colors"
              />
              {/* Sindh Province */}
              <path
                d="M 200 420 L 260 380 L 320 340 L 320 440 L 240 470 L 210 450 Z"
                fill="#0F172A"
                stroke="#334155"
                strokeWidth="1.5"
                className="hover:fill-slate-800/80 transition-colors"
              />
              {/* Punjab Province */}
              <path
                d="M 260 250 L 330 190 L 440 180 L 450 270 L 360 320 L 320 340 Z"
                fill="#111C35"
                stroke="#334155"
                strokeWidth="1.5"
                className="hover:fill-slate-800/80 transition-colors"
              />
              {/* Khyber Pakhtunkhwa & FATA */}
              <path
                d="M 270 190 L 330 110 L 380 90 L 370 180 L 330 190 Z"
                fill="#0D1A30"
                stroke="#334155"
                strokeWidth="1.5"
                className="hover:fill-slate-800/80 transition-colors"
              />
              {/* Gilgit-Baltistan & Northern Areas */}
              <path
                d="M 370 90 L 440 40 L 510 70 L 460 120 L 380 90 Z"
                fill="#0A1527"
                stroke="#334155"
                strokeWidth="1.5"
                className="hover:fill-slate-800/80 transition-colors"
              />
              {/* AJK / Kashmir Corridor */}
              <path
                d="M 380 90 L 460 120 L 440 180 L 370 180 Z"
                fill="#0E1E38"
                stroke="#334155"
                strokeWidth="1.5"
                className="hover:fill-slate-800/80 transition-colors"
              />
            </g>

            {/* Heatmap Layer if activated */}
            {viewMode === "heatmap" && (
              <g>
                {CITY_HUBS.map((c) => (
                  <circle
                    key={`heat-${c.id}`}
                    cx={c.x}
                    cy={c.y}
                    r={c.demandLevel === "surging" ? 65 : 45}
                    fill={c.demandLevel === "surging" ? "url(#heatSurge)" : "url(#heatHigh)"}
                    className="animate-pulse"
                  />
                ))}
              </g>
            )}

            {/* City Hub Markers & Pulse Radars */}
            {CITY_HUBS.map((city) => {
              const isSelected = city.id === activeCityId;
              const markerColor =
                viewMode === "jobs"
                  ? "#FFB800"
                  : viewMode === "heatmap"
                  ? "#BF5AF2"
                  : "#00F5FF";

              return (
                <g
                  key={city.id}
                  onClick={() => setActiveCityId(city.id)}
                  className="cursor-pointer group"
                >
                  {/* Radar Pulse Wave */}
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={isSelected ? "22" : "14"}
                    fill={markerColor}
                    fillOpacity="0.2"
                    className="animate-ping"
                  />

                  {/* Halo ring */}
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={isSelected ? "14" : "9"}
                    fill={markerColor}
                    fillOpacity="0.4"
                    stroke={markerColor}
                    strokeWidth={isSelected ? "2" : "1"}
                  />

                  {/* Core Pin Center */}
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={isSelected ? "6" : "4"}
                    fill="#FFFFFF"
                    stroke={markerColor}
                    strokeWidth="2"
                  />

                  {/* City Label */}
                  <text
                    x={city.x}
                    y={city.y - 12}
                    textAnchor="middle"
                    className={`font-mono text-[11px] font-bold tracking-wider transition-all select-none ${
                      isSelected
                        ? "fill-primary font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                        : "fill-slate-300 group-hover:fill-white"
                    }`}
                  >
                    {city.name}
                  </text>

                  {/* City metric pill under label */}
                  <text
                    x={city.x}
                    y={city.y + 18}
                    textAnchor="middle"
                    className={`font-mono text-[9px] font-semibold select-none ${
                      viewMode === "jobs"
                        ? "fill-amber-400"
                        : viewMode === "heatmap"
                        ? "fill-purple-300"
                        : "fill-emerald-400"
                    }`}
                  >
                    {viewMode === "jobs"
                      ? `${city.pendingJobs} pending`
                      : viewMode === "heatmap"
                      ? city.demandLevel.toUpperCase()
                      : `${city.activeUstads} online`}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Quick city pill tabs */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CITY_HUBS.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCityId(c.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition border ${
                  c.id === activeCityId
                    ? "bg-primary/20 border-primary text-primary font-bold shadow-cyan-glow"
                    : "bg-surface/80 border-hairline text-muted-foreground hover:text-white"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Selected City Command Panel */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-card flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* City Title */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-dim">
                  {activeCity.province} Region
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    activeCity.demandLevel === "surging"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}
                >
                  {activeCity.demandLevel} Demand
                </span>
              </div>
              <h4 className="text-xl font-black text-foreground mt-1 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span>{activeCity.name}</span>
              </h4>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-surface-light border border-hairline">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ustads Online</span>
                <span className="text-xl font-mono font-black text-emerald-400 mt-1 block">
                  {activeCity.activeUstads}
                </span>
                <span className="text-[10px] text-dim">Ready for instant dispatch</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-light border border-hairline">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pending Requests</span>
                <span className="text-xl font-mono font-black text-amber-400 mt-1 block">
                  {activeCity.pendingJobs}
                </span>
                <span className="text-[10px] text-dim">Awaiting Ustad match</span>
              </div>
            </div>

            {/* SLA and Trade Insights */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-light/60 border border-hairline text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Average Match SLA</span>
                </div>
                <span className="font-mono font-bold text-foreground">{activeCity.avgSla}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-light/60 border border-hairline text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span className="text-muted-foreground">Top Trade Demand</span>
                </div>
                <span className="font-bold text-foreground text-right">{activeCity.topTrade}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-hairline space-y-2">
            <Link
              to="/workers"
              className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-background font-bold text-xs flex items-center justify-center gap-2 shadow-cyan-glow transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Inspect {activeCity.name} Ustads</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/bookings"
              className="w-full h-10 rounded-xl bg-surface-light hover:bg-surface-light/80 border border-hairline text-foreground font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <span>View Active Bookings in {activeCity.name}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
