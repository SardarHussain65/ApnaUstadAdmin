import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Users,
  Wrench,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Inbox,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Award
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
  Legend,
  BarChart,
  Bar
} from "recharts";
import { StatCard, StatusBadge, Avatar, Badge } from "@/components/admin/ui";
import { fmtPKR } from "@/lib/format";
import { ActionCenter } from "@/components/admin/ActionCenter";
import {
  useDashboardStats,
  useBookings,
  useVerifyWorker,
  useWorkersPage,
  useSupportRequests,
  useWalletTopUpSummary
} from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d");

  // Queries
  const { data: statsData, isError: statsError } = useDashboardStats();
  const { data: bookingsData } = useBookings({ limit: 100 }); // fetch more to populate trends and stats
  const { data: workersData } = useWorkersPage({ verified: false, limit: 5 });
  const { data: openTickets = [] } = useSupportRequests({ status: "open" });
  const { data: topUpSummary } = useWalletTopUpSummary();
  const verifyWorkerMutation = useVerifyWorker();

  const recentBookings = useMemo(() => {
    return ((bookingsData as any) || []).slice(0, 8);
  }, [bookingsData]);

  const pendingWorkers = useMemo(() => {
    return (workersData?.items || []).filter((w: any) => !w.isVerified).slice(0, 5);
  }, [workersData]);

  // Dynamic Real-time Activity Logs Ticker
  const liveActivityLogs = useMemo(() => {
    const logs: { id: string; type: 'booking' | 'user' | 'worker' | 'finance'; text: string; time: string; color: string }[] = [];
    
    // Add bookings events
    const bookings = (bookingsData as any) || [];
    bookings.slice(0, 5).forEach((b: any) => {
      const timeStr = b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
      const customer = b.customer?.fullName || "A client";
      const total = fmtPKR(b.totalAmount || 0);
      if (b.status === 'completed') {
        logs.push({
          id: `b-c-${b._id}`,
          type: 'finance',
          text: `Booking completed: ${customer} paid ${total} to worker`,
          time: timeStr,
          color: 'text-success'
        });
      } else if (b.status === 'ongoing') {
        logs.push({
          id: `b-o-${b._id}`,
          type: 'booking',
          text: `Ustad assigned: Job #${b._id.slice(-4)} is now in progress`,
          time: timeStr,
          color: 'text-accent'
        });
      } else {
        logs.push({
          id: `b-p-${b._id}`,
          type: 'booking',
          text: `New job request: ${customer} requested ${b.category || 'service'}`,
          time: timeStr,
          color: 'text-primary'
        });
      }
    });

    // Add support tickets events
    openTickets.slice(0, 3).forEach((t: any) => {
      const timeStr = t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '2h ago';
      logs.push({
        id: `t-${t._id}`,
        type: 'user',
        text: `Support ticket: "${t.subject || 'Dispute raising'}" under review`,
        time: timeStr,
        color: 'text-secondary'
      });
    });

    if (logs.length === 0) {
      return [
        { id: 'empty', type: 'booking', text: 'No recent booking or support activity.', time: 'Now', color: 'text-muted-foreground' }
      ];
    }

    return logs;
  }, [bookingsData, openTickets]);

  // Real % Growth Calculation
  const calculateGrowthPct = (total: number, newLastMonth: number) => {
    if (!total || total === 0) return 0;
    const previous = total - newLastMonth;
    if (previous <= 0) return 100;
    return Math.round((newLastMonth / previous) * 100);
  };

  const stats = useMemo(() => {
    if (statsData?.counts) {
      const usersGrowth = calculateGrowthPct(statsData.counts.users, statsData.growth.newUsersLastMonth);
      const workersGrowth = calculateGrowthPct(statsData.counts.workers, statsData.growth.newWorkersLastMonth);
      const bookingsGrowth = calculateGrowthPct(statsData.counts.bookings, statsData.growth.newBookingsLastMonth);
      const revenueGrowth = calculateGrowthPct(statsData.counts.revenue, statsData.growth.newRevenueLastMonth);
      
      return {
        totalUsers: statsData.counts.users,
        usersChange: usersGrowth,
        totalWorkers: statsData.counts.workers,
        workersChange: workersGrowth,
        totalBookings: statsData.counts.bookings,
        bookingsChange: bookingsGrowth,
        totalRevenue: statsData.counts.revenue,
        revenueChange: revenueGrowth
      };
    }
    return {
      totalUsers: 0,
      usersChange: 0,
      totalWorkers: 0,
      workersChange: 0,
      totalBookings: 0,
      bookingsChange: 0,
      totalRevenue: 0,
      revenueChange: 0
    };
  }, [statsData]);

  // Dynamic Bookings Trend Chart based on actual bookings
  const bookingsTrendData = useMemo(() => {
    const bookings = (bookingsData as any) || [];
    const limitDays = timeRange === "7d" ? 7 : 30;
    
    if (bookings.length === 0) {
      return Array.from({ length: limitDays }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (limitDays - 1 - i));
        return {
          day: timeRange === "7d" ? d.toLocaleDateString('en-US', { weekday: 'short' }) : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          bookings: 0
        };
      });
    }

    const lastNDays: { day: string; dateStr: string; count: number }[] = [];

    // Setup past N dates
    for (let i = limitDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const label = timeRange === "7d" 
        ? d.toLocaleDateString('en-US', { weekday: 'short' }) 
        : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      
      lastNDays.push({
        day: label,
        dateStr,
        count: 0
      });
    }

    // Populate counts
    bookings.forEach((b: any) => {
      if (b.createdAt) {
        const bDateStr = new Date(b.createdAt).toDateString();
        const match = lastNDays.find(dayObj => dayObj.dateStr === bDateStr);
        if (match) {
          match.count++;
        }
      }
    });

    return lastNDays.map(item => ({
      day: item.day,
      bookings: item.count
    }));
  }, [bookingsData, timeRange]);

  // Dynamic status distribution from fetched bookings
  const dynamicStatusDistribution = useMemo(() => {
    const bookings = (bookingsData as any) || [];
    if (bookings.length === 0) return [];

    const counts: Record<string, number> = {
      completed: 0,
      ongoing: 0,
      pending: 0,
      cancelled: 0
    };

    bookings.forEach((b: any) => {
      if (b.status && counts[b.status] !== undefined) {
        counts[b.status]++;
      }
    });

    const colors = {
      completed: "#34C759", // green
      ongoing: "#FF9500", // orange
      pending: "#FFCC00", // yellow
      cancelled: "#FF3B30" // red
    } as any;

    return Object.entries(counts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      color: colors[name] || "#8E8E93"
    })).filter(item => item.value > 0);
  }, [bookingsData]);

  // Revenue by Category based on real bookings
  const revenueByCategory = useMemo(() => {
    const bookings = (bookingsData as any) || [];
    const grouped = bookings
      .filter((b: any) => b.status === "completed")
      .reduce((acc: Record<string, number>, b: any) => {
        const cat = b.category || "General";
        acc[cat] = (acc[cat] ?? 0) + (b.totalAmount || 0);
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [bookingsData]);

  const pendingTopUpsCount = topUpSummary?.pending?.count || 0;
  const pendingWorkersCount = workersData?.pagination.totalItems ?? 0;

  return (
    <div className="space-y-6">
      {statsError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Live dashboard totals are temporarily unavailable. Values remain at zero until the API responds.
        </div>
      )}
      
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={Number(stats.totalUsers) || 0}
          change={stats.usersChange}
          gradient="gradient-cyan glow-cyan"
          icon={<Users className="w-6 h-6 text-background" />}
        />
        <StatCard
          label="Total Workers"
          value={Number(stats.totalWorkers) || 0}
          change={stats.workersChange}
          gradient="gradient-orange glow-orange"
          icon={<Wrench className="w-6 h-6 text-white" />}
        />
        <StatCard
          label="Total Bookings"
          value={Number(stats.totalBookings) || 0}
          change={stats.bookingsChange}
          gradient="gradient-purple glow-purple"
          icon={<Calendar className="w-6 h-6 text-white" />}
        />
        <StatCard
          label="Total Revenue"
          value={Number(stats.totalRevenue) || 0}
          change={stats.revenueChange}
          isCurrency
          gradient="gradient-success"
          icon={<DollarSign className="w-6 h-6 text-white" />}
        />
      </div>

      <ActionCenter />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        
        {/* Bookings Trend */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-white">Recent Bookings Trend</h3>
              <p className="text-xs text-dim">Daily count from the latest 100 bookings ({timeRange === "7d" ? "past week" : "past month"})</p>
            </div>
            
            <div className="flex items-center gap-1 bg-surface-light/40 border border-border/60 p-0.5 rounded-xl">
              <button
                onClick={() => setTimeRange("7d")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  timeRange === "7d" ? "bg-primary text-background shadow-md" : "text-muted-foreground hover:text-white"
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange("30d")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  timeRange === "30d" ? "bg-primary text-background shadow-md" : "text-muted-foreground hover:text-white"
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={bookingsTrendData}>
              <defs>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F5FF" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#00F5FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C1C2E" />
              <XAxis dataKey="day" stroke="#5B5B5E" fontSize={11} />
              <YAxis stroke="#5B5B5E" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#0F0F1A",
                  border: "1px solid #1C1C2E",
                  borderRadius: 12,
                  color: "#fff"
                }}
              />
              <Area
                type="monotone"
                dataKey="bookings"
                stroke="#00F5FF"
                strokeWidth={2.5}
                fill="url(#colorBookings)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-card">
          <h3 className="font-bold text-lg text-white">Recent Status Distribution</h3>
          <p className="text-xs text-dim mb-4">Latest 100 bookings categorized by status</p>
          {dynamicStatusDistribution.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No booking data available</div>
          ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dynamicStatusDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {dynamicStatusDistribution.map(s => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0F0F1A",
                  border: "1px solid #1C1C2E",
                  borderRadius: 12
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#8E8E93" }} />
            </PieChart>
          </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* Revenue by Category */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-white">Recent Revenue by Category</h3>
            <p className="text-xs text-dim">Completed totals from the latest 100 bookings</p>
          </div>
          <Badge variant="orange">PKR ₨</Badge>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={
              revenueByCategory.length > 0
                ? revenueByCategory
                : [{ category: "No Data", revenue: 0 }]
            }
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF8C00" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#BF5AF2" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C1C2E" />
            <XAxis dataKey="category" stroke="#5B5B5E" fontSize={11} />
            <YAxis stroke="#5B5B5E" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                background: "#0F0F1A",
                border: "1px solid #1C1C2E",
                borderRadius: 12,
                color: "#fff"
              }}
              formatter={(v: number) => fmtPKR(v)}
            />
            <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent bookings + pending workers */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        
        {/* Recent Bookings */}
        <div className="xl:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-bold text-white">Recent Bookings</h3>
            <Link to="/bookings" className="text-xs text-primary font-semibold hover:underline">
              View All Bookings →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-dim border-b border-border/80 bg-surface-light/10">
                  <th className="px-5 py-3">Booking ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Worker</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentBookings.map((b: any, i: number) => (
                  <tr
                    key={b._id}
                    className="hover:bg-surface-light/10 transition animate-fade-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-primary">
                      #{b._id.slice(-6)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-white">
                      {b.customer?.fullName || "Anonymous"}
                    </td>
                    <td className="px-5 py-3.5 text-accent font-medium">
                      {b.worker?.fullName || "Pending"}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-white">
                      {fmtPKR(b.totalAmount || 0)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
                {recentBookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-dim">
                      No bookings have been made yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="bg-card border border-border rounded-2xl shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-white">Pending Verifications</h3>
            <Link to="/verification" className="text-xs text-primary font-semibold hover:underline">
              Review Queue →
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {pendingWorkers.map((w: any, i: number) => (
              <div
                key={w._id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-light/20 hover:bg-surface-light/45 transition border border-border/20 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Avatar src={w.profileImage} name={w.fullName} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white truncate leading-snug">
                    {w.fullName}
                  </div>
                  <div className="text-[10px] text-dim flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold">{w.category}</span>
                    <span>•</span>
                    <span>{w.city}</span>
                  </div>
                </div>
                <button
                  onClick={() => verifyWorkerMutation.mutate({ id: w._id, isVerified: true })}
                  disabled={verifyWorkerMutation.isPending}
                  className="btn-press px-2.5 py-1.5 rounded-lg gradient-cyan text-background text-[11px] font-bold flex items-center gap-1 disabled:opacity-60 shadow-md"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                </button>
              </div>
            ))}
            {pendingWorkers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-dim space-y-2">
                <Award className="w-8 h-8 text-gold opacity-45" />
                <div className="text-xs font-semibold text-white">All Clear!</div>
                <div className="text-[10px] max-w-[180px]">All worker profiles have been verified.</div>
              </div>
            )}
          </div>
        </div>

        {/* Live Operations Feed Ticker */}
        <div className="bg-card border border-border rounded-2xl shadow-card flex flex-col h-[380px] xl:h-auto">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-ping" />
              Live Operations
            </h3>
            <Badge variant="info">Telemetry</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px] leading-relaxed">
            {liveActivityLogs.map((log) => (
              <div key={log.id} className="flex gap-2.5 p-2 rounded-lg bg-surface-light/10 border border-white/[0.02] hover:bg-surface-light/20 transition-all">
                <span className="text-[10px] text-dim flex-shrink-0">{log.time}</span>
                <span className="text-muted-foreground flex-shrink-0">|</span>
                <span className={`flex-1 ${log.color} break-all`}>{log.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
