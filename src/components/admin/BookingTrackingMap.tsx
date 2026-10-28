import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Navigation,
  UserRound,
  Wrench,
  ExternalLink,
  Plus,
  Minus,
  Maximize2,
  Compass,
  Route as RouteIcon,
  Clock,
  CheckCircle2,
  Phone,
  Layers,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatPhone, shortId } from "@/lib/format";

export const MAPTILER_API_KEY =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_MAPTILER_API_KEY) ||
  "o3cm0oM4Yn3L4Nyf1ydh";

export type MapTilerStyle = "streets-v2" | "hybrid" | "dataviz-dark";

export function getMapTilerTileUrl(
  style: MapTilerStyle,
  z: number,
  x: number,
  y: number
): string {
  return `https://api.maptiler.com/maps/${style}/256/${z}/${x}/${y}@2x.png?key=${MAPTILER_API_KEY}`;
}

export function getFallbackTileUrl(
  style: MapTilerStyle,
  z: number,
  x: number,
  y: number
): string {
  const sub = ["a", "b", "c"][Math.abs(x + y) % 3];
  return style === "dataviz-dark"
    ? `https://${sub}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}@2x.png`
    : `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`;
}

// In-memory cache for MapTiler forward geocoding of addresses when exact [lng, lat] is [0, 0]
const geocodeCache = new Map<string, { lat: number; lng: number; placeName: string }>();

export async function geocodeWithMapTiler(
  addressQuery: string
): Promise<{ lat: number; lng: number; placeName: string } | null> {
  const clean = addressQuery.trim();
  if (!clean || clean.length < 3) return null;
  if (geocodeCache.has(clean)) return geocodeCache.get(clean)!;

  try {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
      clean
    )}.json?key=${MAPTILER_API_KEY}&country=pk&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const feat = json?.features?.[0];
    if (Array.isArray(feat?.center) && feat.center.length >= 2) {
      const [lng, lat] = feat.center;
      if (typeof lat === "number" && typeof lng === "number") {
        const result = {
          lat,
          lng,
          placeName: feat.place_name || clean,
        };
        geocodeCache.set(clean, result);
        return result;
      }
    }
  } catch {
    // Fallback to built-in gazetteer if offline
  }
  return null;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  isExactGps: boolean;
  sourceLabel: string;
}

interface AreaCoordDef {
  pattern: RegExp;
  lat: number;
  lng: number;
  label: string;
}

const PAKISTAN_AREA_GAZETTEER: AreaCoordDef[] = [
  // Lahore neighborhoods
  { pattern: /dha\s*phase\s*6.*lahore|phase\s*6.*dha.*lahore/i, lat: 31.4697, lng: 74.4422, label: "DHA Phase 6, Lahore" },
  { pattern: /dha\s*phase\s*5.*lahore|phase\s*5.*dha.*lahore/i, lat: 31.4625, lng: 74.4085, label: "DHA Phase 5, Lahore" },
  { pattern: /dha.*lahore|defence.*lahore/i, lat: 31.472, lng: 74.41, label: "DHA, Lahore" },
  { pattern: /gulberg.*lahore/i, lat: 31.5102, lng: 74.3441, label: "Gulberg, Lahore" },
  { pattern: /johar\s*town.*lahore/i, lat: 31.4697, lng: 74.2728, label: "Johar Town, Lahore" },
  { pattern: /model\s*town.*lahore/i, lat: 31.4839, lng: 74.3257, label: "Model Town, Lahore" },
  { pattern: /bahria.*lahore/i, lat: 31.3685, lng: 74.1852, label: "Bahria Town, Lahore" },
  { pattern: /wapda\s*town.*lahore/i, lat: 31.4342, lng: 74.2647, label: "Wapda Town, Lahore" },
  { pattern: /cantt.*lahore/i, lat: 31.5315, lng: 74.3821, label: "Cantt, Lahore" },
  { pattern: /lahore/i, lat: 31.5204, lng: 74.3587, label: "Lahore" },

  // Islamabad & Rawalpindi neighborhoods
  { pattern: /bahria.*rawalpindi|bahria.*islamabad/i, lat: 33.5221, lng: 73.0955, label: "Bahria Town, Twin Cities" },
  { pattern: /dha.*islamabad|dha.*rawalpindi/i, lat: 33.5382, lng: 73.1391, label: "DHA, Islamabad/Rawalpindi" },
  { pattern: /f-6|f-7|f-8|blue\s*area.*islamabad/i, lat: 33.7215, lng: 73.0572, label: "Central Sector, Islamabad" },
  { pattern: /g-9|g-10|g-11.*islamabad/i, lat: 33.6844, lng: 73.0151, label: "G-Sector, Islamabad" },
  { pattern: /saddar.*rawalpindi|satellite\s*town.*rawalpindi/i, lat: 33.5984, lng: 73.0541, label: "Rawalpindi Central" },
  { pattern: /rawalpindi|pindi/i, lat: 33.5651, lng: 73.0169, label: "Rawalpindi" },
  { pattern: /islamabad/i, lat: 33.6844, lng: 73.0479, label: "Islamabad" },

  // Karachi neighborhoods
  { pattern: /clifton.*karachi|dha.*karachi|defence.*karachi/i, lat: 24.8059, lng: 67.0309, label: "DHA / Clifton, Karachi" },
  { pattern: /gulshan.*iqbal|gulistan.*johar/i, lat: 24.9207, lng: 67.0924, label: "Gulshan, Karachi" },
  { pattern: /north\s*nazimabad/i, lat: 24.9372, lng: 67.0423, label: "North Nazimabad, Karachi" },
  { pattern: /pechs|tariq\s*road|bahadurabad/i, lat: 24.8719, lng: 67.0592, label: "PECHS, Karachi" },
  { pattern: /karachi/i, lat: 24.8607, lng: 67.0011, label: "Karachi" },

  // Other major cities
  { pattern: /faisalabad/i, lat: 31.4504, lng: 73.135, label: "Faisalabad" },
  { pattern: /multan/i, lat: 30.1575, lng: 71.5249, label: "Multan" },
  { pattern: /peshawar/i, lat: 34.0151, lng: 71.5249, label: "Peshawar" },
  { pattern: /gujranwala/i, lat: 32.1877, lng: 74.1945, label: "Gujranwala" },
  { pattern: /sialkot/i, lat: 32.4945, lng: 74.5229, label: "Sialkot" },
  { pattern: /quetta/i, lat: 30.1798, lng: 66.975, label: "Quetta" },
  { pattern: /hyderabad/i, lat: 25.396, lng: 68.3578, label: "Hyderabad" },
];

export function extractExactGps(loc?: { coordinates?: number[] } | null): { lat: number; lng: number } | null {
  if (!loc || !Array.isArray(loc.coordinates) || loc.coordinates.length < 2) return null;
  const [lng, lat] = loc.coordinates;
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    (Math.abs(lat) > 0.01 || Math.abs(lng) > 0.01) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return { lat, lng };
  }
  return null;
}

function deterministicOffset(seed: string, maxDeg = 0.012): { dLat: number; dLng: number } {
  let h1 = 2166136261;
  let h2 = 16777619;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ (c + i), 2166136261);
  }
  const dLat = (((h1 >>> 0) % 1000) / 500 - 1) * maxDeg;
  const dLng = (((h2 >>> 0) % 1000) / 500 - 1) * maxDeg;
  return { dLat, dLng };
}

export function resolveLocationFromRecord(opts: {
  id?: string;
  primaryLocation?: { coordinates?: number[] } | null;
  secondaryLocation?: { coordinates?: number[] } | null;
  address?: string;
  city?: string;
  fallbackNear?: { lat: number; lng: number } | null;
}): GeoPoint {
  const exact1 = extractExactGps(opts.primaryLocation);
  if (exact1) {
    return { ...exact1, isExactGps: true, sourceLabel: "Live GPS Coordinates" };
  }
  const exact2 = extractExactGps(opts.secondaryLocation);
  if (exact2) {
    return { ...exact2, isExactGps: true, sourceLabel: "Profile GPS Coordinates" };
  }

  const text = `${opts.address || ""} ${opts.city || ""}`.trim();
  for (const entry of PAKISTAN_AREA_GAZETTEER) {
    if (entry.pattern.test(text)) {
      const off = deterministicOffset(String(opts.id || text), 0.008);
      return {
        lat: entry.lat + off.dLat,
        lng: entry.lng + off.dLng,
        isExactGps: false,
        sourceLabel: `Matched Area (${entry.label})`,
      };
    }
  }

  if (opts.fallbackNear) {
    const off = deterministicOffset(String(opts.id || "near") + "_w", 0.014);
    return {
      lat: opts.fallbackNear.lat + off.dLat,
      lng: opts.fallbackNear.lng + off.dLng,
      isExactGps: false,
      sourceLabel: "Service Zone Estimate",
    };
  }

  const off = deterministicOffset(String(opts.id || "default"), 0.012);
  return {
    lat: 31.5204 + off.dLat,
    lng: 74.3587 + off.dLng,
    isExactGps: false,
    sourceLabel: "Default Hub (Lahore)",
  };
}

export function haversineDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

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

interface BookingTrackingMapProps {
  booking: any;
  compact?: boolean;
}

export function BookingTrackingMap({ booking, compact = false }: BookingTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 800, height: compact ? 320 : 400 });
  const [tileStyle, setTileStyle] = useState<MapTilerStyle>("streets-v2");
  const [geocodedJob, setGeocodedJob] = useState<GeoPoint | null>(null);
  const [geocodedWorker, setGeocodedWorker] = useState<GeoPoint | null>(null);

  const customer = booking?.customer;
  const worker = booking?.worker;

  const baseJobPoint = useMemo(
    () =>
      resolveLocationFromRecord({
        id: String(booking?._id || customer?._id || "job"),
        primaryLocation: booking?.location,
        secondaryLocation: customer?.location,
        address: booking?.address || customer?.address,
        city: customer?.city || worker?.city,
      }),
    [booking, customer, worker]
  );

  // Live MapTiler Geocoding when exact GPS is not stored
  useEffect(() => {
    setGeocodedJob(null);
    if (baseJobPoint.isExactGps) return;
    const addr = [booking?.address || customer?.address, customer?.city]
      .filter(Boolean)
      .join(", ");
    if (!addr) return;
    let cancelled = false;
    geocodeWithMapTiler(addr).then((res) => {
      if (!cancelled && res) {
        setGeocodedJob({
          lat: res.lat,
          lng: res.lng,
          isExactGps: true,
          sourceLabel: "MapTiler Geocoded Address",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [baseJobPoint.isExactGps, booking?.address, customer?.address, customer?.city]);

  const jobPoint = geocodedJob || baseJobPoint;

  const baseWorkerPoint = useMemo(() => {
    if (!worker) return null;
    return resolveLocationFromRecord({
      id: String(worker._id || "worker"),
      primaryLocation: worker.location,
      address: worker.address,
      city: worker.city,
      fallbackNear: jobPoint,
    });
  }, [worker, jobPoint]);

  useEffect(() => {
    setGeocodedWorker(null);
    if (!worker || !baseWorkerPoint || baseWorkerPoint.isExactGps) return;
    const addr = [worker.address, worker.city].filter(Boolean).join(", ");
    if (!addr) return;
    let cancelled = false;
    geocodeWithMapTiler(addr).then((res) => {
      if (!cancelled && res) {
        setGeocodedWorker({
          lat: res.lat,
          lng: res.lng,
          isExactGps: true,
          sourceLabel: "MapTiler Geocoded Ustad Area",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [worker, baseWorkerPoint]);

  const workerPoint = geocodedWorker || baseWorkerPoint;

  const distanceKm = useMemo(() => {
    if (!workerPoint) return null;
    return haversineDistanceKm(jobPoint, workerPoint);
  }, [jobPoint, workerPoint]);

  const estimatedDriveMin = useMemo(() => {
    if (distanceKm === null) return null;
    return Math.max(3, Math.round((distanceKm / 26) * 60 + 3));
  }, [distanceKm]);

  // Compute ideal initial center & zoom to frame both points
  const initialViewport = useMemo(() => {
    if (!workerPoint) {
      return { centerLat: jobPoint.lat, centerLng: jobPoint.lng, zoom: 14 };
    }
    const centerLat = (jobPoint.lat + workerPoint.lat) / 2;
    const centerLng = (jobPoint.lng + workerPoint.lng) / 2;
    const dKm = haversineDistanceKm(jobPoint, workerPoint);
    let zoom = 13;
    if (dKm > 500) zoom = 6;
    else if (dKm > 150) zoom = 8;
    else if (dKm > 40) zoom = 10;
    else if (dKm > 15) zoom = 11;
    else if (dKm > 5) zoom = 12;
    else if (dKm > 1.8) zoom = 13;
    else zoom = 14;
    return { centerLat, centerLng, zoom };
  }, [jobPoint, workerPoint]);

  const [center, setCenter] = useState({
    lat: initialViewport.centerLat,
    lng: initialViewport.centerLng,
  });
  const [zoom, setZoom] = useState(initialViewport.zoom);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; wx: number; wy: number } | null>(null);

  useEffect(() => {
    setCenter({ lat: initialViewport.centerLat, lng: initialViewport.centerLng });
    setZoom(initialViewport.zoom);
  }, [initialViewport.centerLat, initialViewport.centerLng, initialViewport.zoom]);

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

  const fitBounds = () => {
    setCenter({ lat: initialViewport.centerLat, lng: initialViewport.centerLng });
    setZoom(initialViewport.zoom);
  };

  const centerWorldX = lngToWorldX(center.lng, zoom);
  const centerWorldY = latToWorldY(center.lat, zoom);
  const topLeftWorldX = centerWorldX - size.width / 2;
  const topLeftWorldY = centerWorldY - size.height / 2;

  const projectToScreen = (pt: { lat: number; lng: number }) => ({
    x: lngToWorldX(pt.lng, zoom) - topLeftWorldX,
    y: latToWorldY(pt.lat, zoom) - topLeftWorldY,
  });

  const jobScreen = projectToScreen(jobPoint);
  const workerScreen = workerPoint ? projectToScreen(workerPoint) : null;

  // Compute visible map tiles
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
    const nextWx = dragStartRef.current.wx - dx;
    const nextWy = dragStartRef.current.wy - dy;
    setCenter({
      lat: worldYToLat(nextWy, zoom),
      lng: worldXToLng(nextWx, zoom),
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  const googleMapsJobUrl = `https://www.google.com/maps/search/?api=1&query=${jobPoint.lat},${jobPoint.lng}`;
  const googleMapsWorkerUrl = workerPoint
    ? `https://www.google.com/maps/search/?api=1&query=${workerPoint.lat},${workerPoint.lng}`
    : null;
  const googleMapsDirectionsUrl = workerPoint
    ? `https://www.google.com/maps/dir/?api=1&origin=${workerPoint.lat},${workerPoint.lng}&destination=${jobPoint.lat},${jobPoint.lng}&travelmode=driving`
    : googleMapsJobUrl;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Top Telemetry Bar */}
      <div className="flex flex-col gap-3 border-b border-border bg-surface/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Live Booking Location & Dispatch Tracking
              </h3>
              <StatusBadge status={booking?.status || "pending"} />
              {distanceKm !== null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                  <RouteIcon className="h-3 w-3" />
                  {distanceKm < 1
                    ? `${Math.round(distanceKm * 1000)} m apart`
                    : `${distanceKm.toFixed(1)} km apart`}
                </span>
              )}
              {estimatedDriveMin !== null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Clock className="h-3 w-3" />
                  ~{estimatedDriveMin} min drive
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {booking?.address || customer?.address || customer?.city || "Service location"} ·{" "}
              {worker ? `Assigned Ustad: ${worker.fullName}` : "Awaiting Ustad assignment"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-8 items-center rounded-xl border border-border bg-surface p-0.5 text-xs">
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

          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <span>{workerPoint ? "Route in Google Maps" : "Open in Google Maps"}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Interactive Slippy Map Viewport */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ height: compact ? 320 : 390 }}
        className={`relative w-full overflow-hidden select-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        } ${tileStyle === "dataviz-dark" ? "bg-[#090D16]" : "bg-[#E5E9F0]"}`}
      >
        {/* Raster MapTiler Tiles */}
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

        {/* SVG Route Line Overlay */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none">
          <defs>
            <linearGradient id="dispatchRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>

          {workerScreen && (
            <g>
              {/* Outer glow line */}
              <line
                x1={workerScreen.x}
                y1={workerScreen.y}
                x2={jobScreen.x}
                y2={jobScreen.y}
                stroke="#0284C7"
                strokeOpacity={0.22}
                strokeWidth={8}
                strokeLinecap="round"
              />
              {/* Animated dashed path between Ustad and Customer */}
              <line
                x1={workerScreen.x}
                y1={workerScreen.y}
                x2={jobScreen.x}
                y2={jobScreen.y}
                stroke="url(#dispatchRouteGrad)"
                strokeWidth={3.5}
                strokeDasharray="8 6"
                strokeLinecap="round"
              />
            </g>
          )}
        </svg>

        {/* Midpoint Distance Pill on Route */}
        {workerScreen && distanceKm !== null && (
          <div
            style={{
              left: (jobScreen.x + workerScreen.x) / 2,
              top: (jobScreen.y + workerScreen.y) / 2,
            }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-10 rounded-full border border-border bg-card/95 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-md backdrop-blur-md whitespace-nowrap"
          >
            <span className="text-primary font-mono">
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)} m`
                : `${distanceKm.toFixed(1)} km`}
            </span>
            {estimatedDriveMin !== null && (
              <span className="text-muted-foreground"> · ~{estimatedDriveMin}m</span>
            )}
          </div>
        )}

        {/* PIN 1: Customer / Service Job Location */}
        <div
          style={{ left: jobScreen.x, top: jobScreen.y }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
        >
          {/* Pulse Ring */}
          <span className="absolute -inset-3 rounded-full bg-sky-500/25 animate-ping pointer-events-none" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-sky-600 text-white shadow-lg">
            <UserRound className="h-5 w-5" />
          </div>

          {/* Floating Label Card */}
          <div className="mt-1.5 -translate-x-1/4 rounded-xl border border-border bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur-md min-w-[175px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Customer / Job Site
              </span>
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-600 dark:text-sky-400">
                {jobPoint.isExactGps ? "GPS" : "Area"}
              </span>
            </div>
            <div className="truncate text-xs font-bold text-foreground">
              {customer?.fullName || "Customer Location"}
            </div>
            <div className="truncate text-[11px] text-muted-foreground max-w-[200px]">
              {booking?.address || customer?.address || customer?.city || jobPoint.sourceLabel}
            </div>
          </div>
        </div>

        {/* PIN 2: Assigned Ustad Location */}
        {worker && workerPoint && workerScreen && (
          <div
            style={{ left: workerScreen.x, top: workerScreen.y }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
          >
            <span className="absolute -inset-3 rounded-full bg-emerald-500/25 animate-ping pointer-events-none" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-lg">
              <Wrench className="h-4 w-4" />
            </div>

            <div className="mt-1.5 -translate-x-1/4 rounded-xl border border-border bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur-md min-w-[175px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Assigned Ustad
                </span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {workerPoint.isExactGps ? "GPS" : "Area"}
                </span>
              </div>
              <div className="truncate text-xs font-bold text-foreground">
                {worker.fullName || "Ustad"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground max-w-[200px]">
                {worker.category || booking?.category || "Specialist"} ·{" "}
                {worker.city || worker.address || "Active"}
              </div>
            </div>
          </div>
        )}

        {/* Map Legend (Top-Left) */}
        <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-md">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
            <span>Customer / Job Site</span>
          </span>
          <span className="text-border">|</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            <span>{worker ? `Ustad (${worker.fullName})` : "Unassigned Ustad"}</span>
          </span>
        </div>

        {/* Zoom & Fit Controls (Bottom-Right) */}
        <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1.5">
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
            onClick={fitBounds}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/95 text-primary shadow-md transition hover:bg-surface"
            title="Center on booking route"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Attribution (Bottom-Left) */}
        <div className="pointer-events-none absolute bottom-2 left-3 z-20 rounded bg-card/75 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
          OpenStreetMap · Carto · Drag to pan · Zoom {zoom}x
        </div>
      </div>

      {/* Bottom Comparison Cards: Customer Site vs Ustad Location */}
      <div className="grid grid-cols-1 divide-y divide-border border-t border-border md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* Customer / Service Address Card */}
        <div className="p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Customer & Service Site
                  </span>
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/60">
                    {jobPoint.sourceLabel}
                  </span>
                </div>
                <div className="mt-0.5 text-sm font-bold text-foreground">
                  {customer?._id ? (
                    <Link
                      to="/users/$id"
                      params={{ id: customer._id }}
                      className="hover:text-primary transition"
                    >
                      {customer.fullName || "Customer"}
                    </Link>
                  ) : (
                    customer?.fullName || "Customer"
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {booking?.address || customer?.address || customer?.city || "Address not specified"}
                </p>
              </div>
            </div>

            <a
              href={googleMapsJobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-accent transition"
            >
              <span>Map</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface/60 px-3 py-2 text-xs border border-border/50">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-sky-500" />
              <span className="font-mono font-semibold text-foreground">
                {formatPhone(customer?.phone) || "No phone"}
              </span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {jobPoint.lat.toFixed(4)}° N, {jobPoint.lng.toFixed(4)}° E
            </span>
          </div>
        </div>

        {/* Assigned Ustad Location Card */}
        <div className="p-4 flex flex-col justify-between gap-3">
          {worker && workerPoint ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Assigned Ustad Location
                      </span>
                      <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/60">
                        {workerPoint.sourceLabel}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-foreground">
                      <Link
                        to="/workers/$id"
                        params={{ id: worker._id }}
                        className="hover:text-primary transition"
                      >
                        {worker.fullName || "Ustad"}
                      </Link>
                      <span className="ml-2 text-xs font-medium text-muted-foreground">
                        ({worker.category || booking?.category || "Service"})
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {worker.address || worker.city || "Operating in service zone"}
                    </p>
                  </div>
                </div>

                {googleMapsWorkerUrl && (
                  <a
                    href={googleMapsWorkerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-foreground hover:bg-accent transition"
                  >
                    <span>Map</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface/60 px-3 py-2 text-xs border border-border/50">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-mono font-semibold text-foreground">
                    {formatPhone(worker.phone) || "No phone"}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {workerPoint.lat.toFixed(4)}° N, {workerPoint.lng.toFixed(4)}° E
                </span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No Ustad is currently assigned to this booking. Once matched, the Ustad's live location and route distance will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

