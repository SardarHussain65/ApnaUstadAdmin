import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  useRevenueReport,
  useBookingsReport,
  useWorkersReport,
  useUsersReport,
  useDashboardSummary,
  useAnalyticsTimeseries,
} from "@/lib/api-hooks";
import { api } from "@/lib/api";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Briefcase,
  Users,
  Award,
  Star,
  Download,
  Loader2,
  Building2,
  Sparkles,
  Percent,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  Wallet,
  Scale,
  FileText,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { rangeFromPreset, toQueryDate, type DateRange } from "@/lib/date-range";
import { fmtPKR, formatCompact, formatDate } from "@/lib/format";
import { RatingStars } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/reports")({
  component: ReportsPage,
});

const PIE_COLORS = ["#00F5FF", "#34C759", "#FF9500", "#BF5AF2", "#FF3B30", "#FFCC00", "#5AC8FA"];

const EXPORT_ENTITIES = [
  { id: "bookings", label: "Bookings", icon: Calendar, desc: "Status, amounts & fees" },
  { id: "payments", label: "Payments", icon: DollarSign, desc: "Receipts, status & breakdown" },
  { id: "workers", label: "Ustads", icon: Briefcase, desc: "Profiles, rating & earnings" },
  { id: "users", label: "Customers", icon: Users, desc: "Profiles & registration dates" },
  { id: "wallet-topups", label: "Wallet Top-ups", icon: Wallet, desc: "Manual proof requests" },
  { id: "disputes", label: "Disputes", icon: Scale, desc: "Resolution status & reasons" },
  { id: "audit-logs", label: "Audit Logs", icon: FileText, desc: "Admin actions & reasons" },
];

function ReportsPage() {
  const [range, setRange] = useState<DateRange>(() => rangeFromPreset("30d"));
  const [activeTab, setActiveTab] = useState<"revenue" | "bookings" | "growth" | "workers">("revenue");
  const [exportingEntity, setExportingEntity] = useState<string | null>(null);
  const [revenueView, setRevenueView] = useState<"timeseries" | "historical">("timeseries");

  // Query params formatted in PKT calendar strings
  const summaryParams = useMemo(() => ({
    from: toQueryDate(range.from),
    to: toQueryDate(range.to),
    compare: true,
  }), [range]);

  const timeseriesParams = useMemo(() => ({
    metrics: ["revenue", "commission"],
    from: toQueryDate(range.from),
    to: toQueryDate(range.to),
    interval: range.preset === "90d" ? ("week" as const) : ("day" as const),
  }), [range]);

  // Synchronized dashboard analytics queries
  const { data: summaryData, isLoading: summaryLoading } = useDashboardSummary(summaryParams);
  const { data: timeseriesData, isLoading: timeseriesLoading } = useAnalyticsTimeseries(timeseriesParams);

  // Specialized platform report queries
  const { data: revenueData, isLoading: revLoading } = useRevenueReport();
  const { data: bookingsData, isLoading: bookLoading } = useBookingsReport();
  const { data: workersData, isLoading: workLoading } = useWorkersReport();
  const { data: usersData, isLoading: userLoading } = useUsersReport();

  const isInitialLoading = summaryLoading && revLoading && bookLoading;
  const metrics = summaryData?.metrics;

  // CSV Export Streaming Handler
  const handleExport = async (entityId: string, entityLabel: string) => {
    try {
      setExportingEntity(entityId);
      toast.loading(`Streaming ${entityLabel} CSV export...`, { id: "export-csv" });
      await api.downloadExport(entityId, {
        from: toQueryDate(range.from),
        to: toQueryDate(range.to),
      });
      toast.success(`${entityLabel} CSV downloaded successfully`, { id: "export-csv" });
    } catch (err: any) {
      toast.error(err.message || `Failed to export ${entityLabel}`, { id: "export-csv" });
    } finally {
      setExportingEntity(null);
    }
  };

  // Efficiency KPI metrics
  const currentGross = metrics?.grossRevenue?.current || 0;
  const currentComm = metrics?.platformCommission?.current || 0;
  const currentBookings = metrics?.totalBookings?.current || 0;
  const aov = currentBookings > 0 ? currentGross / currentBookings : 0;
  const takeRate = currentGross > 0 ? (currentComm / currentGross) * 100 : 0;

  // Timeseries chart points with friendly date formatting
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

  // Transform User/Worker growth data for charts
  const growthChartData = useMemo(() => {
    if (!usersData || !usersData.users || !usersData.workers) return [];

    const uMap = new Map(usersData.users.map((u: any) => [u.month, u.count]));
    const wMap = new Map(usersData.workers.map((w: any) => [w.month, w.count]));

    const allMonths = Array.from(
      new Set([
        ...usersData.users.map((u: any) => u.month),
        ...usersData.workers.map((w: any) => w.month),
      ])
    ).sort();

    return allMonths.map((month) => ({
      month,
      users: uMap.get(month) || 0,
      workers: wMap.get(month) || 0,
    }));
  }, [usersData]);

  const totalGrowthUsers = useMemo(
    () => (usersData?.users || []).reduce((acc: number, cur: any) => acc + (cur.count || 0), 0),
    [usersData]
  );
  const totalGrowthWorkers = useMemo(
    () => (usersData?.workers || []).reduce((acc: number, cur: any) => acc + (cur.count || 0), 0),
    [usersData]
  );

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground gap-3">
        <div className="w-10 h-10 border-4 border-t-primary border-border rounded-full animate-spin" />
        <p className="text-sm font-semibold tracking-wider">Generating Platform Reports & Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Title, DateRangePicker, and Quick Export Dropdown */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Platform Analytics & Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time performance metrics, financial breakdowns, and operational CSV exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Synchronized Date Range Picker */}
          <DateRangePicker value={range} onChange={setRange} />

          {/* Quick Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={exportingEntity !== null}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
              >
                {exportingEntity ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Export CSV</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 border-border bg-card p-1.5 shadow-xl">
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Filtered by Active Window
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {EXPORT_ENTITIES.map((ent) => {
                const Icon = ent.icon;
                const isCurrent = exportingEntity === ent.id;
                return (
                  <DropdownMenuItem
                    key={ent.id}
                    disabled={exportingEntity !== null}
                    onClick={() => handleExport(ent.id, ent.label)}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs transition hover:bg-accent focus:bg-accent"
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>{ent.label}</span>
                        {isCurrent && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{ent.desc}</p>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Top 4 Performance StatCards Synced to Period */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Gross Revenue"
          value={metrics?.grossRevenue?.current ?? 0}
          previous={metrics?.grossRevenue?.previous}
          format="currency"
          sparkline={metrics?.grossRevenue?.sparkline}
          icon={<DollarSign className="h-5 w-5 text-brand" />}
          loading={summaryLoading}
          index={0}
        />
        <StatCard
          label="Platform Commission"
          value={metrics?.platformCommission?.current ?? 0}
          previous={metrics?.platformCommission?.previous}
          format="currency"
          sparkline={metrics?.platformCommission?.sparkline}
          icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
          loading={summaryLoading}
          index={1}
        />
        <StatCard
          label="Completed Bookings"
          value={metrics?.completedBookings?.current ?? 0}
          previous={metrics?.completedBookings?.previous}
          format="number"
          sparkline={metrics?.completedBookings?.sparkline}
          icon={<Calendar className="h-5 w-5 text-purple-400" />}
          loading={summaryLoading}
          index={2}
        />
        <StatCard
          label="Worker Net Earnings"
          value={metrics?.workerNetIncome?.current ?? 0}
          previous={metrics?.workerNetIncome?.previous}
          format="currency"
          sparkline={metrics?.workerNetIncome?.sparkline}
          icon={<Briefcase className="h-5 w-5 text-amber-400" />}
          loading={summaryLoading}
          index={3}
        />
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("revenue")}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-wide transition-all",
            activeTab === "revenue"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <DollarSign className="h-4 w-4" />
          <span>Revenue & Earnings</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-wide transition-all",
            activeTab === "bookings"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers className="h-4 w-4" />
          <span>Bookings Breakdown</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("growth")}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-wide transition-all",
            activeTab === "growth"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Users & Workers Growth</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("workers")}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-wide transition-all",
            activeTab === "workers"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Award className="h-4 w-4" />
          <span>Worker Leaderboards</span>
        </button>
      </div>

      {/* Tab 1: Revenue & Earnings */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          <div className="app-glass rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Revenue & Platform Commission Trends</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {revenueView === "timeseries"
                    ? "Zero-filled progression for selected period"
                    : "12-month historical platform financial earnings"}
                </p>
              </div>

              <div className="inline-flex items-center rounded-lg border border-border bg-surface p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setRevenueView("timeseries")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-semibold transition",
                    revenueView === "timeseries"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Period Timeseries
                </button>
                <button
                  type="button"
                  onClick={() => setRevenueView("historical")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-semibold transition",
                    revenueView === "historical"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  12-Month Historical
                </button>
              </div>
            </div>

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={
                    revenueView === "timeseries"
                      ? chartPoints
                      : revenueData?.monthlyTrend || []
                  }
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F5FF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00F5FF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="commArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#BF5AF2" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#BF5AF2" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey={revenueView === "timeseries" ? "label" : "month"}
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickFormatter={(val) => `₨${formatCompact(val)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 15, 26, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      color: "#fff",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                    }}
                    formatter={(val: number) => [fmtPKR(val), ""]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Area
                    type="monotone"
                    name="Gross Revenue"
                    dataKey={revenueView === "timeseries" ? "revenue" : "revenue"}
                    stroke="#00F5FF"
                    strokeWidth={2.5}
                    fill="url(#revArea)"
                  />
                  <Area
                    type="monotone"
                    name="Platform Commission"
                    dataKey={revenueView === "timeseries" ? "commission" : "commission"}
                    stroke="#BF5AF2"
                    strokeWidth={2.5}
                    fill="url(#commArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Efficiency Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="app-glass rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Average Order Value (AOV)</span>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums font-mono">
                {fmtPKR(aov)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Average booking value in selected window</p>
            </div>

            <div className="app-glass rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Effective Take Rate</span>
                <Percent className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-400 tabular-nums font-mono">
                {takeRate.toFixed(1)}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Platform commission as % of gross turnover</p>
            </div>

            <div className="app-glass rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Historical Total Paid Volume</span>
                <Clock className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums font-mono">
                {fmtPKR(revenueData?.summary?.totalRevenue || 0)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">All-time settled volume across platform</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Bookings Breakdown */}
      {activeTab === "bookings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution Donut */}
          <div className="app-glass rounded-2xl border border-border bg-card p-5 shadow-card flex flex-col">
            <h3 className="font-bold text-base text-foreground mb-1">Bookings by Category</h3>
            <p className="text-xs text-muted-foreground mb-4">Volume distribution across service categories</p>

            <div className="h-[300px] w-full flex-1 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingsData?.categoryBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="category"
                  >
                    {(bookingsData?.categoryBreakdown || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 15, 26, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bookings by City BarChart */}
          <div className="app-glass rounded-2xl border border-border bg-card p-5 shadow-card flex flex-col">
            <h3 className="font-bold text-base text-foreground mb-1">Bookings by City</h3>
            <p className="text-xs text-muted-foreground mb-4">Geographical booking demand distribution</p>

            <div className="h-[300px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsData?.cityBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="city" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 15, 26, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                  />
                  <Bar name="Bookings" dataKey="count" fill="#FF9500" radius={[6, 6, 0, 0]}>
                    {(bookingsData?.cityBreakdown || []).map((entry: any, index: number) => (
                      <Cell key={`cell-city-${index}`} fill={PIE_COLORS[(index + 1) % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Breakdown Grid */}
          <div className="lg:col-span-2 app-glass rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-bold text-base text-foreground mb-1">Booking Status Distributions</h3>
            <p className="text-xs text-muted-foreground mb-4">Overall completed, ongoing, and cancelled booking counts</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
              {(bookingsData?.statusBreakdown || []).map((statusObj: any) => (
                <div
                  key={statusObj.status}
                  className="rounded-xl border border-border bg-surface p-4 text-center transition hover:border-primary/40"
                >
                  <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums font-mono">
                    {statusObj.count}
                  </div>
                  <div className="mt-2 flex justify-center">
                    <StatusBadge status={statusObj.status} />
                  </div>
                </div>
              ))}
              {(!bookingsData?.statusBreakdown || bookingsData.statusBreakdown.length === 0) && (
                <div className="col-span-4 py-8">
                  <EmptyState title="No booking records found" description="No status data recorded yet." />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Users & Workers Growth */}
      {activeTab === "growth" && (
        <div className="space-y-6">
          <div className="app-glass rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-bold text-base text-foreground mb-1">Registration Growth Trends</h3>
            <p className="text-xs text-muted-foreground mb-6">Monthly customer and ustad registration acquisitions</p>

            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 15, 26, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar name="Customers" dataKey="users" fill="#BF5AF2" radius={[6, 6, 0, 0]} />
                  <Bar name="Ustads" dataKey="workers" fill="#34C759" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="app-glass rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">New Customers (12M)</span>
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums font-mono">
                {totalGrowthUsers}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Platform customer accounts registered</p>
            </div>

            <div className="app-glass rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">New Ustads (12M)</span>
                <Briefcase className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums font-mono">
                {totalGrowthWorkers}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Service workers onboarded</p>
            </div>

            <div className="app-glass rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Customer / Ustad Ratio</span>
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-primary tabular-nums font-mono">
                {totalGrowthWorkers > 0 ? (totalGrowthUsers / totalGrowthWorkers).toFixed(1) : "0"} : 1
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Acquisition demand to supply multiplier</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Worker Leaderboards */}
      {activeTab === "workers" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top 10 Earners */}
          <div className="app-glass rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-5 w-5 text-amber-400" />
              <h3 className="font-bold text-base text-foreground">Top 10 Earners</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Workers with the highest total platform revenue</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="text-left py-3 px-3">Rank</th>
                    <th className="text-left py-3 px-3">Ustad Name</th>
                    <th className="text-left py-3 px-3">Category</th>
                    <th className="text-center py-3 px-3">Jobs</th>
                    <th className="text-center py-3 px-3">Rating</th>
                    <th className="text-right py-3 px-3">Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(workersData?.topEarners || []).map((w: any, index: number) => {
                    const rankColor =
                      index === 0
                        ? "bg-amber-400/20 text-amber-400 border-amber-400/30"
                        : index === 1
                        ? "bg-slate-300/20 text-slate-300 border-slate-300/30"
                        : index === 2
                        ? "bg-amber-700/20 text-amber-600 border-amber-700/30"
                        : "bg-surface text-muted-foreground border-border";

                    return (
                      <tr key={w._id} className="hover:bg-surface/50 transition">
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold",
                              rankColor
                            )}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-foreground">{w.fullName}</div>
                          {w.phone && <div className="text-[11px] text-muted-foreground font-mono">{w.phone}</div>}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground text-xs">{w.category || "General"}</td>
                        <td className="py-3 px-3 text-center text-foreground font-semibold">{w.totalJobs || 0}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-semibold text-xs text-foreground">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {w.rating?.toFixed(1) || "0.0"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400 tabular-nums font-mono">
                          {fmtPKR(w.totalEarnings || 0)}
                        </td>
                      </tr>
                    );
                  })}
                  {(!workersData?.topEarners || workersData.topEarners.length === 0) && (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <EmptyState title="No earner records found" description="No worker earnings tracked yet." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top 10 Highest Rated */}
          <div className="app-glass rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              <h3 className="font-bold text-base text-foreground">Top 10 Highest Rated</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Workers with stellar client reviews and ratings</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="text-left py-3 px-3">Rank</th>
                    <th className="text-left py-3 px-3">Ustad Name</th>
                    <th className="text-left py-3 px-3">Category</th>
                    <th className="text-center py-3 px-3">Jobs</th>
                    <th className="text-center py-3 px-3">Rating</th>
                    <th className="text-right py-3 px-3">Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(workersData?.topRated || []).map((w: any, index: number) => {
                    const rankColor =
                      index === 0
                        ? "bg-amber-400/20 text-amber-400 border-amber-400/30"
                        : index === 1
                        ? "bg-slate-300/20 text-slate-300 border-slate-300/30"
                        : index === 2
                        ? "bg-amber-700/20 text-amber-600 border-amber-700/30"
                        : "bg-surface text-muted-foreground border-border";

                    return (
                      <tr key={w._id} className="hover:bg-surface/50 transition">
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold",
                              rankColor
                            )}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-foreground">{w.fullName}</div>
                          {w.phone && <div className="text-[11px] text-muted-foreground font-mono">{w.phone}</div>}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground text-xs">{w.category || "General"}</td>
                        <td className="py-3 px-3 text-center text-foreground font-semibold">{w.totalJobs || 0}</td>
                        <td className="py-3 px-3 text-center">
                          <RatingStars rating={w.rating || 0} />
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400 tabular-nums font-mono">
                          {fmtPKR(w.totalEarnings || 0)}
                        </td>
                      </tr>
                    );
                  })}
                  {(!workersData?.topRated || workersData.topRated.length === 0) && (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <EmptyState title="No rating records found" description="No worker review data available." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
