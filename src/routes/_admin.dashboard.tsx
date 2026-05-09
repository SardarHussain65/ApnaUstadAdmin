import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Wrench, Calendar, DollarSign, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";
import { StatCard, StatusBadge, Avatar, Badge } from "@/components/admin/ui";
import { dashboardStats, bookingsLast30Days, bookingStatusDistribution, bookings, workers, fmtPKR } from "@/lib/mock-data";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const recentBookings = [...bookings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 10);
  const pendingWorkers = workers.filter(w => !w.isVerified).slice(0, 5);

  const revenueByCategory = Object.entries(
    bookings.filter(b => b.status === "completed").reduce<Record<string, number>>((acc, b) => {
      acc[b.category] = (acc[b.category] ?? 0) + b.total;
      return acc;
    }, {})
  ).map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={dashboardStats.totalUsers} change={dashboardStats.usersChange} gradient="gradient-cyan glow-cyan" icon={<Users className="w-6 h-6 text-background" />} />
        <StatCard label="Total Workers" value={dashboardStats.totalWorkers} change={dashboardStats.workersChange} gradient="gradient-orange glow-orange" icon={<Wrench className="w-6 h-6 text-white" />} />
        <StatCard label="Total Bookings" value={dashboardStats.totalBookings} change={dashboardStats.bookingsChange} gradient="gradient-purple glow-purple" icon={<Calendar className="w-6 h-6 text-white" />} />
        <StatCard label="Total Revenue" value={dashboardStats.totalRevenue} change={dashboardStats.revenueChange} isCurrency gradient="gradient-success" icon={<DollarSign className="w-6 h-6 text-white" />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg">Bookings Trend</h3>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
            <Badge variant="info" pulse>Live</Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={bookingsLast30Days}>
              <defs>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F5FF" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#00F5FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C1C2E" />
              <XAxis dataKey="day" stroke="#5B5B5E" fontSize={11} />
              <YAxis stroke="#5B5B5E" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0F0F1A", border: "1px solid #1C1C2E", borderRadius: 12, color: "#fff" }} />
              <Area type="monotone" dataKey="bookings" stroke="#00F5FF" strokeWidth={2.5} fill="url(#colorBookings)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-card">
          <h3 className="font-bold text-lg">Status Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Bookings by status</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={bookingStatusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                {bookingStatusDistribution.map(s => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0F0F1A", border: "1px solid #1C1C2E", borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#8E8E93" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Category */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">Revenue by Category</h3>
            <p className="text-xs text-muted-foreground">Completed bookings · all time</p>
          </div>
          <Badge variant="orange">PKR</Badge>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={revenueByCategory}>
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
              contentStyle={{ background: "#0F0F1A", border: "1px solid #1C1C2E", borderRadius: 12, color: "#fff" }}
              formatter={(v: number) => fmtPKR(v)}
            />
            <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent bookings + pending workers */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-bold">Recent Bookings</h3>
            <Link to="/bookings" className="text-xs text-primary font-semibold hover:underline">View All →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2.5">Booking</th>
                  <th className="text-left px-4 py-2.5">Customer</th>
                  <th className="text-left px-4 py-2.5">Worker</th>
                  <th className="text-left px-4 py-2.5">Amount</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b, i) => (
                  <tr key={b.id} className="border-b border-border/60 hover:bg-surface-light/40 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-4 py-2.5 font-mono text-xs text-primary">{b.id}</td>
                    <td className="px-4 py-2.5">{b.customerName}</td>
                    <td className="px-4 py-2.5 text-accent">{b.workerName}</td>
                    <td className="px-4 py-2.5 font-semibold">{fmtPKR(b.total)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold">Pending Verifications</h3>
            <Link to="/workers" className="text-xs text-primary font-semibold hover:underline">All →</Link>
          </div>
          <div className="p-3 space-y-2">
            {pendingWorkers.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-light/50 hover:bg-surface-light transition animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <Avatar src={w.avatar} name={w.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{w.name}</div>
                  <div className="text-[11px] text-muted-foreground">{w.category} · {w.city}</div>
                </div>
                <button
                  onClick={() => toast.success(`${w.name} verified successfully`)}
                  className="btn-press px-3 py-1.5 rounded-lg gradient-cyan text-background text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                </button>
              </div>
            ))}
            {pendingWorkers.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">All workers verified ✨</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
