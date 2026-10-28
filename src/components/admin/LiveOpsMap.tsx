import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Users,
  Clock,
  Radio,
  ChevronRight,
  TrendingUp,
  Wrench,
  CalendarCheck,
  Plus,
  Minus,
  Maximize2,
  Layers,
  ExternalLink,
  Phone,
  ArrowUpRight,
  Briefcase,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  useOperationsRadar,
  type OperationsRadarCity,
  type OperationsRadarPin,
} from "@/lib/api-hooks";
import { formatPhone, formatPKR, shortId } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getFallbackTileUrl,
  getMapTilerTileUrl,
  type MapTilerStyle,
} from "@/components/admin/BookingTrackingMap";

// Web Mercator projection helpers (256px tile size)
function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * 256 * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const rad = (clamped * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + rad / 2));
  return (0.5 - mercN / (2 * Math.PI)) * 256 * Math.pow(2, zoom);
}

function worldXToLng(wx: number, zoom: number): number {
  return (wx / (256 * Math.pow(2, zoom))) * 360 - 180;
}

function worldYToLat(wy: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * wy) / (256 * Math.pow(2, zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

const DEFAULT_PAKISTAN_CENTER = { lat: 30.85, lng: 71.2 };
const DEFAULT_PAKISTAN_ZOOM = 6;

export function LiveOpsMap() {
  const { data: radar, isLoading } = useOperationsRadar();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 760, height: 460 });

  const [layerFilter, setLayerFilter] = useState<"all" | "bookings" | "workers" | "users">("all");
  const [activeCityId, setActiveCityId] = useState<string>("all");
  const [selectedPin, setSelectedPin] = useState<OperationsRadarPin | null>(null);
  const [tileStyle, setTileStyle] = useState<MapTilerStyle>("streets-v2");

  const [center, setCenter] = useState(DEFAULT_PAKISTAN_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_PAKISTAN_ZOOM);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; wx: number; wy: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cities = radar?.cities || [];
  const summary = radar?.summary || {
    totalWorkers: 0,
    onlineWorkers: 0,
    verifiedWorkers: 0,
    totalUsers: 0,
    activeBookings: 0,
    completedBookings: 0,
    openJobs: 0,
    totalBookings: 0,
  };

  // Pick initial active city with highest activity once loaded
  const topActiveCity = useMemo<OperationsRadarCity | null>(() => {
    if (!cities.length) return null;
    if (activeCityId !== "all") {
      return cities.find((c) => c.id === activeCityId) || cities[0];
    }
    const sorted = [...cities].sort(
      (a, b) =>
        b.totalUstads + b.totalCustomers + b.activeBookings * 2 -
        (a.totalUstads + a.totalCustomers + a.activeBookings * 2)
    );
    return sorted[0] || cities[0];
  }, [cities, activeCityId]);

  const handleSelectCity = (cityId: string) => {
    setActiveCityId(cityId);
    setSelectedPin(null);
    if (cityId === "all") {
      setCenter(DEFAULT_PAKISTAN_CENTER);
      setZoom(DEFAULT_PAKISTAN_ZOOM);
      return;
    }
    const found = cities.find((c) => c.id === cityId);
    if (found) {
      setCenter({ lat: found.lat, lng: found.lng });
      setZoom(11);
    }
  };

  const visiblePins = useMemo(() => {
    if (!radar?.pins) return [];
    const list: OperationsRadarPin[] = [];
    if (layerFilter === "all" || layerFilter === "bookings") {
      list.push(...(radar.pins.bookings || []));
    }
    if (layerFilter === "all" || layerFilter === "workers") {
      list.push(...(radar.pins.workers || []));
    }
    if (layerFilter === "all" || layerFilter === "users") {
      list.push(...(radar.pins.users || []));
    }
    if (activeCityId !== "all") {
      return list.filter((p) => p.cityId === activeCityId);
    }
    return list;
  }, [radar, layerFilter, activeCityId]);

  const centerWorldX = lngToWorldX(center.lng, zoom);
  const centerWorldY = latToWorldY(center.lat, zoom);
  const topLeftWorldX = centerWorldX - size.width / 2;
  const topLeftWorldY = centerWorldY - size.height / 2;

  const projectToScreen = (pt: { lat: number; lng: number }) => ({
    x: lngToWorldX(pt.lng, zoom) - topLeftWorldX,
    y: latToWorldY(pt.lat, zoom) - topLeftWorldY,
  });

  const tiles = useMemo(() => {
    const maxTile = Math.pow(2, zoom);
    const minTileX = Math.floor(topLeftWorldX / 256);
    const maxTileX = Math.floor((topLeftWorldX + size.width) / 256);
    const minTileY = Math.floor(topLeftWorldY / 256);
    const maxTileY = Math.floor((topLeftWorldY + size.height) / 256);

    const list: Array<{
      key: string;
      url: string;
      fallbackUrl: string;
      left: number;
      top: number;
    }> = [];
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= maxTile) continue;
        const wrappedX = ((tx % maxTile) + maxTile) % maxTile;
        list.push({
          key: `${zoom}-${tx}-${ty}-${tileStyle}`,
          url: getMapTilerTileUrl(tileStyle, zoom, wrappedX, ty),
          fallbackUrl: getFallbackTileUrl(tileStyle, zoom, wrappedX, ty),
          left: tx * 256 - topLeftWorldX,
          top: ty * 256 - topLeftWorldY,
        });
      }
    }
    return list;
  }, [zoom, topLeftWorldX, topLeftWorldY, size.width, size.height, tileStyle]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      wx: centerWorldX,
      wy: centerWorldY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setCenter({
      lat: worldYToLat(dragStartRef.current.wy - dy, zoom),
      lng: worldXToLng(dragStartRef.current.wx - dx, zoom),
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  const bookingsCount = radar?.pins?.bookings?.length ?? 0;
  const workersCount = radar?.pins?.workers?.length ?? 0;
  const usersCount = radar?.pins?.users?.length ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            <h3 className="text-base font-bold text-foreground">
              Pakistan Live Operations Radar
            </h3>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {summary.totalWorkers} Ustads ({summary.onlineWorkers} Online)
            </span>
            <span className="rounded-full bg-sky-500/10 border border-sky-500/25 px-2.5 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400">
              {summary.totalUsers} Customers
            </span>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              {summary.totalBookings} Bookings ({summary.activeBookings} Active)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time geographic map of registered Ustads, customer addresses, and live service bookings from MongoDB
          </p>
        </div>

        {/* Layer Filter Tabs + Map Theme Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl bg-surface border border-border p-1 text-xs">
            <button
              type="button"
              onClick={() => setLayerFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                layerFilter === "all"
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Live ({bookingsCount + workersCount + usersCount})
            </button>
            <button
              type="button"
              onClick={() => setLayerFilter("bookings")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                layerFilter === "bookings"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Bookings ({bookingsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setLayerFilter("workers")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                layerFilter === "workers"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Ustads ({workersCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setLayerFilter("users")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                layerFilter === "users"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customers ({usersCount})</span>
            </button>
          </div>

          <div className="inline-flex h-9 items-center rounded-xl border border-border bg-surface p-0.5 text-xs">
            {(
              [
                { id: "streets-v2", label: "Streets" },
                { id: "hybrid", label: "Satellite" },
                { id: "dataviz-dark", label: "Dark Radar" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setTileStyle(s.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  tileStyle === s.id
                    ? "bg-card text-primary shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map + Detail Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left: Real Interactive Tile Map (8 cols) */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`lg:col-span-8 relative min-h-[450px] overflow-hidden select-none border-b lg:border-b-0 lg:border-r border-border ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          } ${tileStyle === "dataviz-dark" ? "bg-[#090D16]" : "bg-[#E5E9F0]"}`}
        >
          {/* MapTiler Street / Satellite / Dark Raster Tiles */}
          <div className="absolute inset-0 pointer-events-none">
            {tiles.map((t) => (
              <img
                key={t.key}
                src={t.url}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== t.fallbackUrl) {
                    img.src = t.fallbackUrl;
                  }
                }}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: Math.round(t.left),
                  top: Math.round(t.top),
                  width: 256,
                  height: 256,
                }}
                className="max-w-none select-none"
              />
            ))}
          </div>

          {/* Route Lines for Active Bookings when zoomed in */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none">
            {visiblePins
              .filter((p) => p.type === "booking" && p.worker)
              .map((b) => {
                const start = projectToScreen({ lat: b.worker!.lat, lng: b.worker!.lng });
                const end = projectToScreen({ lat: b.lat, lng: b.lng });
                return (
                  <line
                    key={`route-${b.id}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="#F59E0B"
                    strokeWidth={selectedPin?.id === b.id ? 3.5 : 2}
                    strokeDasharray="6 4"
                    strokeOpacity={0.85}
                  />
                );
              })}
          </svg>

          {/* City Hub Badges when at Country Zoom (zoom <= 8) */}
          {zoom <= 8 &&
            cities.map((city) => {
              const pos = projectToScreen({ lat: city.lat, lng: city.lng });
              if (pos.x < -40 || pos.x > size.width + 40 || pos.y < -40 || pos.y > size.height + 40) {
                return null;
              }
              const totalActivity = city.totalUstads + city.totalCustomers + city.activeBookings;
              const isSelected = activeCityId === city.id;

              return (
                <button
                  key={`hub-${city.id}`}
                  type="button"
                  onClick={() => handleSelectCity(city.id)}
                  style={{ left: pos.x, top: pos.y }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-md transition hover:scale-105 ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground z-20"
                      : totalActivity > 0
                      ? "border-emerald-500/40 bg-card/95 text-foreground"
                      : "border-border bg-card/85 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      totalActivity > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                    }`}
                  />
                  <span>{city.name}</span>
                  {totalActivity > 0 && (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.2 font-mono text-[10px] text-primary">
                      {city.totalUstads}U · {city.totalCustomers}C
                    </span>
                  )}
                </button>
              );
            })}

          {/* Individual Real Pins (Bookings, Ustads, Customers) */}
          {visiblePins.map((pin) => {
            const pos = projectToScreen({ lat: pin.lat, lng: pin.lng });
            if (pos.x < -30 || pos.x > size.width + 30 || pos.y < -30 || pos.y > size.height + 30) {
              return null;
            }
            const isSelected = selectedPin?.id === pin.id;
            const colorClass =
              pin.type === "booking"
                ? "bg-amber-500 border-white text-white"
                : pin.type === "worker"
                ? "bg-emerald-600 border-white text-white"
                : "bg-sky-600 border-white text-white";

            return (
              <button
                key={`${pin.type}-${pin.id}`}
                type="button"
                onClick={() => {
                  setSelectedPin(pin);
                  if (zoom < 12) {
                    setCenter({ lat: pin.lat, lng: pin.lng });
                    setZoom(13);
                  }
                }}
                style={{ left: pos.x, top: pos.y }}
                title={`${pin.title} — ${pin.subtitle}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 shadow-md transition-transform ${colorClass} ${
                  isSelected ? "h-9 w-9 scale-125 z-30 ring-4 ring-primary/30" : "h-6 w-6 hover:scale-125 z-20"
                }`}
              >
                {pin.type === "booking" ? (
                  <CalendarCheck className={isSelected ? "h-4 w-4" : "h-3 w-3"} />
                ) : pin.type === "worker" ? (
                  <Wrench className={isSelected ? "h-4 w-4" : "h-3 w-3"} />
                ) : (
                  <Users className={isSelected ? "h-4 w-4" : "h-3 w-3"} />
                )}
              </button>
            );
          })}

          {/* Top-Left Legend */}
          <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card/90 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Bookings ({bookingsCount})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span>Ustads ({workersCount})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
              <span>Customers ({usersCount})</span>
            </span>
          </div>

          {/* Top-Right Zoom Controls */}
          <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(17, z + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/95 text-foreground shadow-md transition hover:bg-surface"
              title="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(5, z - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/95 text-foreground shadow-md transition hover:bg-surface"
              title="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSelectCity("all")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/95 text-primary shadow-md transition hover:bg-surface"
              title="Reset to Pakistan overview"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Bottom City Quick-Jump Bar */}
          <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => handleSelectCity("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border shadow-sm ${
                activeCityId === "all"
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card/95 border-border text-foreground hover:bg-surface"
              }`}
            >
              All Pakistan
            </button>
            {cities.map((c) => {
              const count = c.totalUstads + c.totalCustomers + c.activeBookings;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCity(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border shadow-sm flex items-center gap-1.5 ${
                    c.id === activeCityId
                      ? "bg-primary border-primary text-primary-foreground font-bold"
                      : "bg-card/95 border-border text-foreground hover:bg-surface"
                  }`}
                >
                  <span>{c.name}</span>
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                        c.id === activeCityId
                          ? "bg-white/20 text-white"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Live Inspector & City Command Panel (4 cols) */}
        <div className="lg:col-span-4 p-5 bg-card flex flex-col justify-between space-y-5">
          {selectedPin ? (
            /* Selected Pin Live Dossier Card */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {selectedPin.type === "booking"
                    ? "Live Booking Pin"
                    : selectedPin.type === "worker"
                    ? "Registered Ustad Pin"
                    : "Customer Account Pin"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPin(null)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  ← Back to City Summary
                </button>
              </div>

              <div>
                <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{selectedPin.title}</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedPin.subtitle}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface/60 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Record ID</span>
                  <span className="font-mono font-semibold text-foreground">
                    {shortId(selectedPin.id)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Location Source</span>
                  <span className="font-semibold text-primary">
                    {selectedPin.isExactGps ? "Exact GPS Pin" : `City/Area (${selectedPin.cityName})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Coordinates</span>
                  <span className="font-mono text-[11px] text-foreground">
                    {selectedPin.lat.toFixed(4)}° N, {selectedPin.lng.toFixed(4)}° E
                  </span>
                </div>
                {selectedPin.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-mono font-semibold text-foreground inline-flex items-center gap-1">
                      <Phone className="h-3 w-3 text-primary" />
                      {formatPhone(selectedPin.phone)}
                    </span>
                  </div>
                )}
                {selectedPin.type === "booking" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={selectedPin.status || "pending"} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Booking Amount</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPKR(selectedPin.totalAmount || 0)}
                      </span>
                    </div>
                    {selectedPin.customer && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Customer</span>
                        <span className="font-semibold text-foreground">
                          {selectedPin.customer.fullName}
                        </span>
                      </div>
                    )}
                    {selectedPin.worker && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned Ustad</span>
                        <span className="font-semibold text-foreground">
                          {selectedPin.worker.fullName}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {selectedPin.type === "worker" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Trade & Rate</span>
                      <span className="font-semibold text-foreground">
                        {selectedPin.category} · {formatPKR(selectedPin.hourlyRate || 0)}/hr
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Availability</span>
                      <StatusBadge status={selectedPin.isAvailable ? "active" : "inactive"} />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <Link
                  to={selectedPin.href as any}
                  className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition"
                >
                  <span>
                    Open Full{" "}
                    {selectedPin.type === "booking"
                      ? "Booking & Tracking Map"
                      : selectedPin.type === "worker"
                      ? "Ustad Dossier"
                      : "Customer 360° Profile"}
                  </span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedPin.lat},${selectedPin.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 rounded-xl border border-border bg-surface text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-accent transition"
                >
                  <span>Open Coordinates in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              </div>
            </div>
          ) : (
            /* City / Platform Live Telemetry Inspector */
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-muted-foreground">
                    {activeCityId === "all"
                      ? "Nationwide Real Telemetry"
                      : `${topActiveCity?.province || "Pakistan"} Region`}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {isLoading ? "Syncing…" : "Live Database"}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-foreground mt-1 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>
                    {activeCityId === "all"
                      ? "All Pakistan Operations"
                      : topActiveCity?.name || "Lahore"}
                  </span>
                </h4>
              </div>

              {/* Real Database Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Registered Ustads
                  </span>
                  <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {activeCityId === "all"
                      ? summary.totalWorkers
                      : topActiveCity?.totalUstads ?? 0}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {activeCityId === "all"
                      ? `${summary.onlineWorkers} currently available`
                      : `${topActiveCity?.activeUstads ?? 0} currently available`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Customers
                  </span>
                  <span className="text-xl font-mono font-bold text-sky-600 dark:text-sky-400 mt-1 block">
                    {activeCityId === "all"
                      ? summary.totalUsers
                      : topActiveCity?.totalCustomers ?? 0}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Active customer profiles
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Active Bookings
                  </span>
                  <span className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                    {activeCityId === "all"
                      ? summary.activeBookings
                      : topActiveCity?.activeBookings ?? 0}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {activeCityId === "all"
                      ? `${summary.completedBookings} completed total`
                      : `${topActiveCity?.completedBookings ?? 0} completed in city`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Open Job Requests
                  </span>
                  <span className="text-xl font-mono font-bold text-foreground mt-1 block">
                    {activeCityId === "all"
                      ? summary.openJobs
                      : topActiveCity?.pendingJobs ?? 0}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Awaiting Ustad bids
                  </span>
                </div>
              </div>

              {/* SLA and Top Trade Insights */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface/60 border border-border text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Avg Match Response</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">
                    {topActiveCity?.avgSla || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-surface/60 border border-border text-xs">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Leading Trade Category</span>
                  </div>
                  <span className="font-bold text-foreground text-right">
                    {topActiveCity?.topTrade || "General Services"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions Footer */}
          <div className="pt-4 border-t border-border space-y-2">
            <Link
              to="/workers"
              className="w-full h-10 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Inspect Registered Ustads</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/bookings"
              className="w-full h-10 rounded-xl bg-surface hover:bg-accent border border-border text-foreground font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              <span>Track All Bookings on Map</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
