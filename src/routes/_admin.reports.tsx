import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  useRevenueReport,
  useBookingsReport,
  useWorkersReport,
  useUsersReport
} from "@/lib/api-hooks";
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
  Cell
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Briefcase,
  Users,
  Award,
  MapPin,
  Star
} from "lucide-react";
import { StatCard, RatingStars, Badge } from "@/components/admin/ui";
import { fmtPKR } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/reports")({
  component: ReportsPage,
});

const PIE_COLORS = ["#00F5FF", "#34C759", "#FF9500", "#BF5AF2", "#FF3B30", "#FFCC00"];

function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"revenue" | "bookings" | "growth" | "workers">("revenue");

  // Queries
  const { data: revenueData, isLoading: revLoading } = useRevenueReport();
  const { data: bookingsData, isLoading: bookLoading } = useBookingsReport();
  const { data: workersData, isLoading: workLoading } = useWorkersReport();
  const { data: usersData, isLoading: userLoading } = useUsersReport();

  // Loading state helper
  const isLoading = revLoading || bookLoading || workLoading || userLoading;

  // Stat calculations
  const stats = useMemo(() => {
    if (!revenueData) return { totalRevenue: 0, totalCommission: 0, totalWorkerEarnings: 0, count: 0 };
    return revenueData.summary || { totalRevenue: 0, totalCommission: 0, totalWorkerEarnings: 0, count: 0 };
  }, [revenueData]);

  // Transform User/Worker growth data for charts
  const growthChartData = useMemo(() => {
    if (!usersData || !usersData.users || !usersData.workers) return [];
    
    const uMap = new Map(usersData.users.map((u: any) => [u.month, u.count]));
    const wMap = new Map(usersData.workers.map((w: any) => [w.month, w.count]));
    
    // Combine months
    const allMonths = Array.from(new Set([
      ...usersData.users.map((u: any) => u.month),
      ...usersData.workers.map((w: any) => w.month)
    ])).sort();

    return allMonths.map(month => ({
      month,
      users: uMap.get(month) || 0,
      workers: wMap.get(month) || 0
    }));
  }, [usersData]);

  // Pie chart helper label
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
        {percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
      </text>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground gap-3">
        <div className="w-10 h-10 border-4 border-t-primary border-border rounded-full animate-spin" />
        <p className="text-sm font-semibold tracking-wider">GeneratingPlatform Reports & Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top statistics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={stats.totalRevenue || 0}
          isCurrency
          gradient="gradient-cyan"
          icon={<DollarSign className="w-5 h-5 text-background" />}
        />
        <StatCard
          label="Total Commissions"
          value={stats.totalCommission || 0}
          isCurrency
          gradient="gradient-purple"
          icon={<TrendingUp className="w-5 h-5 text-background" />}
        />
        <StatCard
          label="Worker Earnings"
          value={stats.totalWorkerEarnings || 0}
          isCurrency
          gradient="gradient-orange"
          icon={<Briefcase className="w-5 h-5 text-background" />}
        />
        <StatCard
          label="Total Bookings"
          value={stats.count || 0}
          gradient="gradient-pink"
          icon={<Calendar className="w-5 h-5 text-background" />}
        />
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border space-x-6">
        <button
          onClick={() => setActiveTab("revenue")}
          className={`pb-3 text-sm font-semibold tracking-wide transition-all relative ${
            activeTab === "revenue" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Revenue & Earnings
          {activeTab === "revenue" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary glow-cyan" />}
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`pb-3 text-sm font-semibold tracking-wide transition-all relative ${
            activeTab === "bookings" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Bookings Breakdown
          {activeTab === "bookings" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary glow-cyan" />}
        </button>
        <button
          onClick={() => setActiveTab("growth")}
          className={`pb-3 text-sm font-semibold tracking-wide transition-all relative ${
            activeTab === "growth" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Users & Workers Growth
          {activeTab === "growth" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary glow-cyan" />}
        </button>
        <button
          onClick={() => setActiveTab("workers")}
          className={`pb-3 text-sm font-semibold tracking-wide transition-all relative ${
            activeTab === "workers" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Workers Leaderboards
          {activeTab === "workers" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary glow-cyan" />}
        </button>
      </div>

      {/* Tabs content */}
      <div className="mt-4">
        {activeTab === "revenue" && (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <h3 className="font-bold text-lg text-white mb-1">Monthly Revenue Trends</h3>
              <p className="text-xs text-dim mb-6">Visual monthly breakdown of platform payments and fee commission earnings</p>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData?.monthlyTrend || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00F5FF" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00F5FF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#BF5AF2" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#BF5AF2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C1C2E" />
                    <XAxis dataKey="month" stroke="#5B5B5E" fontSize={11} />
                    <YAxis stroke="#5B5B5E" fontSize={11} tickFormatter={(val) => `₨${val}`} />
                    <Tooltip
                      contentStyle={{
                        background: "#0F0F1A",
                        border: "1px solid #1C1C2E",
                        borderRadius: 12,
                        color: "#fff"
                      }}
                      formatter={(val: number) => [fmtPKR(val), ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      name="Total Revenue"
                      dataKey="revenue"
                      stroke="#00F5FF"
                      strokeWidth={2.5}
                      fill="url(#colorRev)"
                    />
                    <Area
                      type="monotone"
                      name="Platform Commission"
                      dataKey="commission"
                      stroke="#BF5AF2"
                      strokeWidth={2.5}
                      fill="url(#colorComm)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bookings by Category */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col">
              <h3 className="font-bold text-lg text-white mb-1">Bookings by Category</h3>
              <p className="text-xs text-dim mb-4">Volume sharing across service categories</p>
              
              <div className="h-[280px] w-full flex-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bookingsData?.categoryBreakdown || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="category"
                    >
                      {(bookingsData?.categoryBreakdown || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0F0F1A",
                        border: "1px solid #1C1C2E",
                        borderRadius: 12
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bookings by City */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col">
              <h3 className="font-bold text-lg text-white mb-1">Bookings by City</h3>
              <p className="text-xs text-dim mb-4">Geographical distribution of bookings</p>
              
              <div className="h-[280px] w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingsData?.cityBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C1C2E" />
                    <XAxis dataKey="city" stroke="#5B5B5E" fontSize={11} />
                    <YAxis stroke="#5B5B5E" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#0F0F1A",
                        border: "1px solid #1C1C2E",
                        borderRadius: 12,
                        color: "#fff"
                      }}
                    />
                    <Bar name="Bookings Count" dataKey="count" fill="#FF9500" radius={[4, 4, 0, 0]}>
                      {(bookingsData?.cityBreakdown || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 1) % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bookings by Status */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-card">
              <h3 className="font-bold text-lg text-white mb-1">Bookings Status Distributions</h3>
              <p className="text-xs text-dim mb-4">Completed, cancelled, and ongoing booking breakdowns</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                {(bookingsData?.statusBreakdown || []).map((statusObj: any) => (
                  <div key={statusObj.status} className="bg-surface p-4 rounded-xl border border-border text-center">
                    <div className="text-2xl font-black text-white">{statusObj.count}</div>
                    <div className="text-xs text-muted-foreground uppercase mt-1">
                      <Badge variant={statusObj.status === "completed" ? "success" : statusObj.status === "cancelled" ? "danger" : "warning"}>
                        {statusObj.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!bookingsData?.statusBreakdown || bookingsData.statusBreakdown.length === 0) && (
                  <div className="col-span-4 text-center py-4 text-muted-foreground text-sm">No data available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "growth" && (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <h3 className="font-bold text-lg text-white mb-1">Registration Growth</h3>
              <p className="text-xs text-dim mb-6">User and Worker registrations monthly growth trends</p>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C1C2E" />
                    <XAxis dataKey="month" stroke="#5B5B5E" fontSize={11} />
                    <YAxis stroke="#5B5B5E" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#0F0F1A",
                        border: "1px solid #1C1C2E",
                        borderRadius: 12,
                        color: "#fff"
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar name="Customers" dataKey="users" fill="#BF5AF2" radius={[4, 4, 0, 0]} />
                    <Bar name="Workers" dataKey="workers" fill="#34C759" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "workers" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Top Earners */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-5 h-5 text-gold" />
                <h3 className="font-bold text-lg text-white">Top 10 Earners</h3>
              </div>
              <p className="text-xs text-dim mb-4">Workers with the highest total platform earnings</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                      <th className="text-left py-3 px-3">Name</th>
                      <th className="text-left py-3 px-3">Category</th>
                      <th className="text-center py-3 px-3">Jobs</th>
                      <th className="text-center py-3 px-3">Rating</th>
                      <th className="text-right py-3 px-3">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(workersData?.topEarners || []).map((w: any, index: number) => (
                      <tr key={w._id} className="border-b border-border/40 hover:bg-surface-light/40 transition">
                        <td className="py-3 px-3 flex items-center gap-2">
                          <span className="text-xs font-bold text-dim w-4">{index + 1}.</span>
                          <div className="font-semibold text-white">{w.fullName}</div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{w.category || "General"}</td>
                        <td className="py-3 px-3 text-center text-white">{w.totalJobs || 0}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                            <span className="text-xs font-semibold text-white">{w.rating?.toFixed(1) || "0.0"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-success">{fmtPKR(w.totalEarnings || 0)}</td>
                      </tr>
                    ))}
                    {(!workersData?.topEarners || workersData.topEarners.length === 0) && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No worker leaderboard data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Rated */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5 text-gold fill-gold" />
                <h3 className="font-bold text-lg text-white">Top 10 Highest Rated</h3>
              </div>
              <p className="text-xs text-dim mb-4">Workers with highest ratings and review volumes</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                      <th className="text-left py-3 px-3">Name</th>
                      <th className="text-left py-3 px-3">Category</th>
                      <th className="text-center py-3 px-3">Jobs</th>
                      <th className="text-center py-3 px-3">Rating</th>
                      <th className="text-right py-3 px-3">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(workersData?.topRated || []).map((w: any, index: number) => (
                      <tr key={w._id} className="border-b border-border/40 hover:bg-surface-light/40 transition">
                        <td className="py-3 px-3 flex items-center gap-2">
                          <span className="text-xs font-bold text-dim w-4">{index + 1}.</span>
                          <div className="font-semibold text-white">{w.fullName}</div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{w.category || "General"}</td>
                        <td className="py-3 px-3 text-center text-white">{w.totalJobs || 0}</td>
                        <td className="py-3 px-3 text-center">
                          <RatingStars rating={w.rating || 0} />
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-success">{fmtPKR(w.totalEarnings || 0)}</td>
                      </tr>
                    ))}
                    {(!workersData?.topRated || workersData.topRated.length === 0) && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No worker rating leaderboard data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
