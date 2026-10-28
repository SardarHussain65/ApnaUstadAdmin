import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Users,
  Wrench,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Scale,
  Wallet,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { rangeFromPreset, toQueryDate, type DateRange } from "@/lib/date-range";
import { fmtPKR, formatCompact, formatDate, formatPKR, shortId } from "@/lib/format";
import { ActionCenter } from "@/components/admin/ActionCenter";
import { EmptyState } from "@/components/ui/empty-state";
import { LiveOpsMap } from "@/components/admin/LiveOpsMap";
import {
  useDashboardSummary,
  useAnalyticsTimeseries,
  useBookings,
} from "@/lib/api-hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

const CATEGORY_COLORS = ["#00F5FF", "#34C759", "#FF9500", "#BF5AF2", "#FF3B30", "#FFCC00", "#5AC8FA"];

function DashboardPage() {
  const [range, setRange] = useState<DateRange>(() => rangeFromPreset("30d"));
  const [compare, setCompare] = useState<boolean>(true);
  const [trendMetric, setTrendMetric] = useState<"finance" | "volume">("finance");

  const queryParams = useMemo(() => ({
    from: toQueryDate(range.from),
    to: toQueryDate(range.to),
    compare,
  }), [range, compare]);

  const { data: summaryData, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useDashboardSummary(queryParams);

  const timeseriesParams = useMemo(() => ({
    metrics: trendMetric === "finance"
      ? ["revenue", "commission"]
      : ["bookings", "completedBookings", "cancelledBookings"],
    from: toQueryDate(range.from),
    to: toQueryDate(range.to),
    interval: range.preset === "90d" ? ("week" as const) : ("day" as const),
  }), [trendMetric, range]);

  const { data: timeseriesData, isLoading: timeseriesLoading } = useAnalyticsTimeseries(timeseriesParams);

  // Recent bookings for live operations list
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings({ limit: 8 });

  const metrics = summaryData?.metrics;
  const rangeInfo = summaryData?.range;

  // Transform timeseries points for chart display
  const chartPoints = useMemo(() => {
    if (!timeseriesData?.points || timeseriesData.points.length === 0) return [];
    return timeseriesData.points.map((p) => {
      let label = p.date;
      if (p.date && p.date.length === 10) {
        const [year, month, day] = p.date.split("-");
        label = range.preset === "7d"
          ? new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("en-US", { weekday: "short" })
          : `${day} ${new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("en-US", { month: "short" })}`;
      }
      return {
        ...p,
        label,
      };
    });
  }, [timeseriesData, range.preset]);

  // Category breakdown aggregated from real bookings
  const categoryBreakdown = useMemo(() => {
    const list = (bookingsData as any) || [];
    if (!list.length) return [];
    const counts: Record<string, number> = {};
    let total = 0;
    list.forEach((b: any) => {
      const cat = b.category || "General";
      counts[cat] = (counts[cat] || 0) + (b.totalAmount || 1);
      total += b.totalAmount || 1;
    });

    const entries = Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      pct: total > 0 ? Math.round((value / total) * 100) : 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

    return entries.sort((a, b) => b.value - a.value);
  }, [bookingsData]);

  const categoryTotal = useMemo(() => {
    return categoryBreakdown.reduce((sum, item) => sum + item.value, 0);
  }, [categoryBreakdown]);

  return (
    <div className="space-y-6">
      {/* Top Filter Controls: Date Range + Compare Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Platform Overview</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live Ops
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time analytics for Pakistan operations (PKT UTC+5)
            {rangeInfo && compare && rangeInfo.previousFrom && (
              <span className="hidden md:inline">
                {" "}· Comparing with previous {rangeInfo.days} days
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />

          <button
            type="button"
            onClick={() => setCompare(!compare)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-13 font-semibold transition",
              compare
                ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                : "border-hairline bg-surface/70 text-muted-foreground hover:text-foreground"
            )}
            title="Toggle period-over-period comparison"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Compare</span>
          </button>
        </div>
      </div>

      {summaryError && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>Failed to load live dashboard summary. Showing default figures.</span>
          <button
            type="button"
            onClick={() => refetchSummary()}
            className="text-xs font-bold underline underline-offset-2 hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary Financial & Core Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross Revenue"
          value={metrics?.revenue?.current ?? 0}
          previous={compare ? (metrics?.revenue?.previous ?? null) : undefined}
          sparkline={metrics?.revenue?.sparkline}
          format="currency"
          icon={<DollarSign className="h-5 w-5 text-cyan-400" />}
          iconClassName="bg-cyan-500/10 border border-cyan-500/20"
          tooltip="Total value of settled service payments in selected period"
          loading={summaryLoading}
          index={0}
        />
        <StatCard
          label="Platform Commission"
          value={metrics?.commission?.current ?? 0}
          previous={compare ? (metrics?.commission?.previous ?? null) : undefined}
          sparkline={metrics?.commission?.sparkline}
          format="currency"
          icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
          iconClassName="bg-emerald-500/10 border border-emerald-500/20"
          tooltip="Gross revenue retained by ApnaUstad platform (commission fees)"
          loading={summaryLoading}
          index={1}
        />
        <StatCard
          label="Service Bookings"
          value={metrics?.bookings?.current ?? 0}
          previous={compare ? (metrics?.bookings?.previous ?? null) : undefined}
          sparkline={metrics?.bookings?.sparkline}
          format="number"
          icon={<Calendar className="h-5 w-5 text-amber-400" />}
          iconClassName="bg-amber-500/10 border border-amber-500/20"
          tooltip="Total client service bookings initiated during the window"
          loading={summaryLoading}
          index={2}
        />
        <StatCard
          label="Cancellation Rate"
          value={metrics?.cancellationRate?.current ?? 0}
          previous={compare ? (metrics?.cancellationRate?.previous ?? null) : undefined}
          sparkline={metrics?.cancellationRate?.sparkline}
          format="percent"
          decimals={1}
          invertDelta={true}
          icon={<AlertTriangle className="h-5 w-5 text-rose-400" />}
          iconClassName="bg-rose-500/10 border border-rose-500/20"
          tooltip="% of created bookings that ended in cancellation (lower is better)"
          loading={summaryLoading}
          index={3}
        />
      </div>

      {/* Secondary Operational Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-hairline bg-surface/60 p-3.5 backdrop-blur-sm transition hover:border-hairline-strong">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>New Clients</span>
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono tracking-tight text-foreground">
            {metrics?.newUsers?.current ?? 0}
          </div>
          {compare && metrics?.newUsers?.deltaPct !== null && (
            <div className={cn("text-[11px] font-semibold mt-0.5", (metrics?.newUsers?.deltaPct ?? 0) >= 0 ? "text-success" : "text-destructive")}>
              {(metrics?.newUsers?.deltaPct ?? 0) > 0 ? "+" : ""}{metrics?.newUsers?.deltaPct}% vs prev
            </div>
          )}
        </div>

        <div className="rounded-xl border border-hairline bg-surface/60 p-3.5 backdrop-blur-sm transition hover:border-hairline-strong">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>New Ustads</span>
            <Wrench className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono tracking-tight text-foreground">
            {metrics?.newWorkers?.current ?? 0}
          </div>
          {compare && metrics?.newWorkers?.deltaPct !== null && (
            <div className={cn("text-[11px] font-semibold mt-0.5", (metrics?.newWorkers?.deltaPct ?? 0) >= 0 ? "text-success" : "text-destructive")}>
              {(metrics?.newWorkers?.deltaPct ?? 0) > 0 ? "+" : ""}{metrics?.newWorkers?.deltaPct}% vs prev
            </div>
          )}
        </div>

        <div className="rounded-xl border border-hairline bg-surface/60 p-3.5 backdrop-blur-sm transition hover:border-hairline-strong">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Top-up Volume</span>
            <Wallet className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono tracking-tight text-foreground">
            {fmtPKR(metrics?.topupVolume?.current ?? 0)}
          </div>
          {compare && metrics?.topupVolume?.deltaPct !== null && (
            <div className={cn("text-[11px] font-semibold mt-0.5", (metrics?.topupVolume?.deltaPct ?? 0) >= 0 ? "text-success" : "text-destructive")}>
              {(metrics?.topupVolume?.deltaPct ?? 0) > 0 ? "+" : ""}{metrics?.topupVolume?.deltaPct}% vs prev
            </div>
          )}
        </div>

        <div className="rounded-xl border border-hairline bg-surface/60 p-3.5 backdrop-blur-sm transition hover:border-hairline-strong">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Disputes Raised</span>
            <Scale className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono tracking-tight text-foreground">
            {metrics?.disputes?.current ?? 0}
          </div>
          {compare && metrics?.disputes?.deltaPct !== null && (
            <div className={cn("text-[11px] font-semibold mt-0.5", (metrics?.disputes?.deltaPct ?? 0) <= 0 ? "text-success" : "text-destructive")}>
              {(metrics?.disputes?.deltaPct ?? 0) > 0 ? "+" : ""}{metrics?.disputes?.deltaPct}% vs prev
            </div>
          )}
        </div>
      </div>

      {/* Action Center Banner */}
      <ActionCenter />

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Main Timeseries Chart (3 Cols) */}
        <div className="rounded-2xl border border-hairline bg-card p-5 shadow-card lg:col-span-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Performance Timeseries</h3>
              <p className="text-xs text-muted-foreground">
                {trendMetric === "finance"
                  ? "Daily Gross Revenue vs Platform Commission"
                  : "Daily Bookings volume: requested, completed and cancelled"}
              </p>
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl border border-hairline bg-surface/70 p-1">
              <button
                type="button"
                onClick={() => setTrendMetric("finance")}
                className={cn(
                  "h-7 rounded-lg px-2.5 text-xs font-semibold transition",
                  trendMetric === "finance"
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric("volume")}
                className={cn(
                  "h-7 rounded-lg px-2.5 text-xs font-semibold transition",
                  trendMetric === "volume"
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Bookings
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {timeseriesLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : chartPoints.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  title="No activity in period"
                  description="Try selecting a wider date range or clearing filters."
                  variant="empty"
                />
              </div>
            ) : chartPoints.length < 3 ? (
              // Bar chart fallback for sparse data points
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis dataKey="label" stroke="#888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888" fontSize={11} tickLine={false} tickFormatter={(v) => trendMetric === "finance" ? formatCompact(v) : String(v)} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-hairline-strong bg-card/95 p-3 shadow-xl backdrop-blur-md">
                          <div className="text-xs font-bold text-foreground mb-1">{item.date}</div>
                          {payload.map((entry: any) => (
                            <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
                              <span className="text-muted-foreground capitalize">{entry.name}:</span>
                              <span className="font-mono font-bold text-foreground">
                                {trendMetric === "finance" ? formatPKR(entry.value) : entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {trendMetric === "finance" ? (
                    <>
                      <Bar dataKey="revenue" fill="#00F5FF" radius={[6, 6, 0, 0]} name="Gross Revenue" />
                      <Bar dataKey="commission" fill="#34C759" radius={[6, 6, 0, 0]} name="Commission" />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="bookings" fill="#FF9500" radius={[6, 6, 0, 0]} name="Requested" />
                      <Bar dataKey="completedBookings" fill="#34C759" radius={[6, 6, 0, 0]} name="Completed" />
                      <Bar dataKey="cancelledBookings" fill="#FF3B30" radius={[6, 6, 0, 0]} name="Cancelled" />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              // Smooth area chart for dense data points
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F5FF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00F5FF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34C759" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#34C759" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorBook" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9500" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FF9500" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis dataKey="label" stroke="#888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888" fontSize={11} tickLine={false} tickFormatter={(v) => trendMetric === "finance" ? formatCompact(v) : String(v)} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-hairline-strong bg-card/95 p-3 shadow-xl backdrop-blur-md">
                          <div className="text-xs font-bold text-foreground mb-1">{item.date}</div>
                          {payload.map((entry: any) => (
                            <div key={entry.name} className="flex items-center justify-between gap-4 text-xs py-0.5">
                              <span className="text-muted-foreground capitalize">{entry.name}:</span>
                              <span className="font-mono font-bold text-foreground">
                                {trendMetric === "finance" ? formatPKR(entry.value) : entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {trendMetric === "finance" ? (
                    <>
                      <Area type="monotone" dataKey="revenue" stroke="#00F5FF" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                      <Area type="monotone" dataKey="commission" stroke="#34C759" strokeWidth={2} fillOpacity={1} fill="url(#colorComm)" name="Commission" />
                    </>
                  ) : (
                    <>
                      <Area type="monotone" dataKey="bookings" stroke="#FF9500" strokeWidth={2} fillOpacity={1} fill="url(#colorBook)" name="Bookings" />
                      <Area type="monotone" dataKey="completedBookings" stroke="#34C759" strokeWidth={2} fillOpacity={0} name="Completed" />
                      <Area type="monotone" dataKey="cancelledBookings" stroke="#FF3B30" strokeWidth={2} fillOpacity={0} name="Cancelled" />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut (2 Cols) */}
        <div className="rounded-2xl border border-hairline bg-card p-5 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-foreground">Category Share</h3>
              <p className="text-xs text-muted-foreground">Volume distribution by service</p>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              {categoryBreakdown.length} Services
            </span>
          </div>

          <div className="relative h-[200px] w-full flex items-center justify-center">
            {categoryBreakdown.length === 0 ? (
              <EmptyState title="No category data" description="Bookings will appear here." variant="empty" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={categoryBreakdown.length > 1 ? 3 : 0}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-hairline-strong bg-card/95 p-2.5 shadow-xl text-xs backdrop-blur-md">
                            <div className="font-bold text-foreground">{data.name}</div>
                            <div className="font-mono text-muted-foreground mt-0.5">
                              {fmtPKR(data.value)} ({data.pct}%)
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center total */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">Total</span>
                  <span className="font-mono text-base font-bold text-foreground">
                    {formatCompact(categoryTotal)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Legend Chips */}
          <div className="mt-3 space-y-1.5 max-h-[90px] overflow-y-auto scrollbar-thin pr-1">
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate text-foreground font-medium">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="text-muted-foreground">{cat.pct}%</span>
                  <span className="font-semibold text-foreground">{fmtPKR(cat.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🇵🇰 Pakistan Operations Radar Map */}
      <LiveOpsMap />

      {/* Recent Bookings Queue Table */}
      <div className="rounded-2xl border border-hairline bg-card overflow-hidden shadow-card">
        <div className="flex items-center justify-between border-b border-hairline p-5">
          <div>
            <h3 className="text-base font-bold text-foreground">Recent Bookings Queue</h3>
            <p className="text-xs text-muted-foreground">Latest client booking requests across all service areas</p>
          </div>
          <Link
            to="/bookings"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline underline-offset-4"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-surface/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Booking ID</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Assigned Ustad</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Scheduled</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-13">
              {bookingsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-5 py-3.5">
                      <div className="h-4 rounded bg-surface-light/40" />
                    </td>
                  </tr>
                ))
              ) : ((bookingsData as any) || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No recent bookings found.
                  </td>
                </tr>
              ) : (
                ((bookingsData as any) || []).slice(0, 8).map((b: any) => (
                  <tr key={String(b._id)} className="transition hover:bg-surface-light/10">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-primary">
                      {shortId(b._id)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      {b.customer?.fullName || "Anonymous"}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {b.worker?.fullName ? (
                        <span className="text-foreground font-medium">{b.worker.fullName}</span>
                      ) : (
                        <span className="italic text-dim text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {b.category || "General"}
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-foreground">
                      {fmtPKR(b.totalAmount || 0)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {b.scheduledDate ? formatDate(b.scheduledDate, "dd MMM yyyy") : "ASAP"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to="/bookings/$id"
                        params={{ id: String(b._id) }}
                        className="inline-flex h-7 items-center justify-center rounded-lg border border-hairline px-2.5 text-xs font-semibold text-foreground hover:bg-surface-light transition"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
