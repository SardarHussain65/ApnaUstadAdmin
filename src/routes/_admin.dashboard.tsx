import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
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
import {
  dashboardStats as mockStats,
  bookingStatusDistribution,
  fmtPKR
} from "@/lib/mock-data";
import {
  useDashboardStats,
  useBookings,
  useVerifyWorker,
  useWorkers,
  useSupportRequests,
  useWalletTopUpSummary
} from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  // Queries
  const { data: statsData, isLoading: statsLoading } = useDashboardStats();
  const { data: bookingsData } = useBookings({ limit: 100 }); // fetch more to populate trends and stats
  const { data: workersData } = useWorkers({ verified: false, limit: 10 });
  const { data: openTickets = [] } = useSupportRequests({ status: "open" });
  const { data: topUpSummary } = useWalletTopUpSummary();
  const verifyWorkerMutation = useVerifyWorker();

  const recentBookings = useMemo(() => {
    return ((bookingsData as any) || []).slice(0, 8);
  }, [bookingsData]);

  const pendingWorkers = useMemo(() => {
    return ((workersData as any) || []).filter((w: any) => !w.isVerified).slice(0, 5);
  }, [workersData]);

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
    return mockStats;
  }, [statsData]);

  // Dynamic Bookings Trend Chart based on actual bookings
  const bookingsTrendData = useMemo(() => {
    const bookings = (bookingsData as any) || [];
    if (bookings.length === 0) {
      return [
        { day: "Mon", bookings: 0 },
        { day: "Tue", bookings: 0 },
        { day: "Wed", bookings: 0 },
        { day: "Thu", bookings: 0 },
        { day: "Fri", bookings: 0 },
        { day: "Sat", bookings: 0 },
        { day: "Sun", bookings: 0 }
      ];
    }

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last7Days: { day: string; dateStr: string; count: number }[] = [];

    // Setup past 7 dates
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      last7Days.push({
        day: daysOfWeek[d.getDay()],
        dateStr,
        count: 0
      });
    }

    // Populate counts
    bookings.forEach((b: any) => {
      if (b.createdAt) {
        const bDateStr = new Date(b.createdAt).toDateString();
        const match = last7Days.find(dayObj => dayObj.dateStr === bDateStr);
        if (match) {
          match.count++;
        }
      }
    });

    return last7Days.map(item => ({
      day: item.day,
      bookings: item.count
    }));
  }, [bookingsData]);

  // Dynamic status distribution from fetched bookings
  const dynamicStatusDistribution = useMemo(() => {
    const bookings = (bookingsData as any) || [];
    if (bookings.length === 0) return bookingStatusDistribution;

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

  return (
    <div className="space-y-6">
      
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

      {/* 🚀 Quick Action / Critical Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Verifications */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col justify-between group hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] text-dim uppercase tracking-wider font-bold">Worker Verification</div>
              <h4 className="text-lg font-bold text-white mt-1">Pending Profiles</h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{pendingWorkers.length}</span>
            <span className="text-xs text-dim">workers waiting</span>
          </div>
          <Link
            to="/workers"
            className="mt-4 flex items-center gap-1.5 text-xs text-primary font-bold hover:underline self-start"
          >
            Go to Verifications <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Card 2: Wallet Top-ups */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col justify-between group hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] text-dim uppercase tracking-wider font-bold">Financial Overviews</div>
              <h4 className="text-lg font-bold text-white mt-1">Pending Top-ups</h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{pendingTopUpsCount}</span>
            <span className="text-xs text-dim">recharges in queue</span>
          </div>
          <Link
            to="/wallets"
            className="mt-4 flex items-center gap-1.5 text-xs text-primary font-bold hover:underline self-start"
          >
            Verify Wallet Recharges <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Card 3: Support Requests */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col justify-between group hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] text-dim uppercase tracking-wider font-bold">Customer Tickets</div>
              <h4 className="text-lg font-bold text-white mt-1">Open Support Desk</h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{openTickets.length}</span>
            <span className="text-xs text-dim">active complaints</span>
          </div>
          <Link
            to="/support"
            className="mt-4 flex items-center gap-1.5 text-xs text-primary font-bold hover:underline self-start"
          >
            Open Support Panel <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        
        {/* Bookings Trend */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-white">Bookings Trend</h3>
              <p className="text-xs text-dim">Daily bookings count (past week)</p>
            </div>
            <Badge variant="info" pulse>
              Live Data
            </Badge>
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
          <h3 className="font-bold text-lg text-white">Status Distribution</h3>
          <p className="text-xs text-dim mb-4">Bookings categorized by status</p>
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
        </div>

      </div>

      {/* Revenue by Category */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-white">Revenue by Category</h3>
            <p className="text-xs text-dim">Completed booking volumes by categories</p>
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        
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
            <Link to="/workers" className="text-xs text-primary font-semibold hover:underline">
              All Workers →
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

      </div>
    </div>
  );
}
