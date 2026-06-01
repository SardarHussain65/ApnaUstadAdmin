import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, Power, Download, Filter, Search, Calendar, User, ShieldAlert } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge, StatusBadge } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Drawer";
import { CITIES, fmtPKR } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { format } from "date-fns";
import { toast } from "sonner";
import { useUsers, useToggleUserStatus, useBookings } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // "today", "week", "month", ""
  const [selected, setSelected] = useState<any | null>(null);

  // Queries
  const { data, isLoading } = useUsers({ search: q });
  const toggleUserMutation = useToggleUserStatus();

  const apiUsers = (data as any) || [];

  const rows = useMemo(() => {
    return apiUsers.filter((u: any) => {
      // 1. Status Filter
      const activeStatus = u.isActive ? "active" : "inactive";
      if (status && activeStatus !== status) return false;

      // 2. City Filter
      if (city && u.city !== city) return false;

      // 3. Date Filter (Joined within)
      if (dateFilter && u.createdAt) {
        const joinedDate = new Date(u.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - joinedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (dateFilter === "today" && diffDays > 1) return false;
        if (dateFilter === "week" && diffDays > 7) return false;
        if (dateFilter === "month" && diffDays > 30) return false;
      }

      return true;
    });
  }, [apiUsers, status, city, dateFilter]);

  const toggleStatus = (id: string) => {
    toggleUserMutation.mutate(id);
  };

  const stats = useMemo(() => {
    return {
      total: apiUsers.length,
      active: apiUsers.filter((u: any) => u.isActive).length,
      inactive: apiUsers.filter((u: any) => !u.isActive).length,
    };
  }, [apiUsers]);

  return (
    <div className="space-y-6">
      {/* 🚀 Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            User Accounts
          </h2>
          <p className="text-sm text-dim mt-1">
            Manage, authenticate, activate/deactivate customer profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="info">Total: {stats.total}</Badge>
          <Badge variant="success" pulse>Active: {stats.active}</Badge>
          <Badge variant="danger">Suspended: {stats.inactive}</Badge>
        </div>
      </div>

      {/* 🔍 Filters & Search */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-dim" />
          <input
            type="text"
            placeholder="Search users by name, phone or email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-input border border-border focus:border-primary/50 text-sm outline-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* City Select */}
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50"
          >
            <option value="">All Cities</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Date Select */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50"
          >
            <option value="">All Registrations</option>
            <option value="today">Joined Today</option>
            <option value="week">Joined This Week</option>
            <option value="month">Joined This Month</option>
          </select>

          {/* CSV Export Button */}
          <button
            onClick={() => {
              downloadCsv("users", rows, [
                { key: "_id", header: "User ID" },
                { key: "fullName", header: "Full Name" },
                { key: "phone", header: "Phone Number" },
                { key: "email", header: "Email Address" },
                { key: "city", header: "City" },
                { key: "isActive", header: "Status" },
                { key: "createdAt", header: "Joined Date" }
              ]);
              toast.success(`Exported ${rows.length} users successfully`);
            }}
            className="btn-press inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-surface-light hover:bg-primary/15 hover:text-primary border border-border text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* 📋 Data Table */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <DataTable
          isLoading={isLoading}
          rows={rows}
          onRowClick={(u) => setSelected(u)}
          columns={[
            {
              key: "user",
              header: "User",
              render: (u) => (
                <div className="flex items-center gap-3">
                  <Avatar src={u.profileImage} name={u.fullName} />
                  <div>
                    <div className="font-semibold text-white group-hover:text-primary transition">
                      {u.fullName}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      #{u._id.slice(-6)}
                    </div>
                  </div>
                </div>
              )
            },
            {
              key: "phone",
              header: "Phone",
              render: (u) => <span className="font-mono text-xs text-white">{u.phone}</span>
            },
            {
              key: "email",
              header: "Email",
              render: (u) => (
                <span className="text-xs text-muted-foreground">{u.email || "N/A"}</span>
              )
            },
            { key: "city", header: "City", render: (u) => u.city || "N/A" },
            {
              key: "status",
              header: "Status",
              render: (u) => <StatusBadge status={u.isActive ? "active" : "inactive"} />
            },
            {
              key: "joined",
              header: "Joined",
              render: (u) => (
                <span className="text-xs text-muted-foreground">
                  {u.createdAt ? format(new Date(u.createdAt), "dd MMM yyyy") : "N/A"}
                </span>
              )
            },
            {
              key: "actions",
              header: "",
              render: (u) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSelected(u)}
                    className="p-2 rounded-lg hover:bg-primary/15 hover:text-primary text-dim transition"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleStatus(u._id)}
                    className="p-2 rounded-lg hover:bg-accent/15 hover:text-accent text-dim transition"
                    title="Suspend / Activate"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* 🔍 Details Drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="User Details">
        {selected && (
          <UserDetail
            user={selected}
            onToggle={() => {
              toggleStatus(selected._id);
              setSelected({ ...selected, isActive: !selected.isActive });
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function UserDetail({ user, onToggle }: { user: any; onToggle: () => void }) {
  // Real bookings query for this user!
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings({
    customerId: user._id,
    limit: 10
  });

  const userBookings = (bookingsData as any) || [];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 p-4 bg-surface-light/20 border border-border rounded-2xl">
        <Avatar src={user.profileImage} name={user.fullName} size={64} />
        <div>
          <div className="text-lg font-bold text-white leading-tight">{user.fullName}</div>
          <div className="text-xs font-mono text-dim mt-1">ID: {user._id}</div>
          <div className="mt-2">
            <StatusBadge status={user.isActive ? "active" : "inactive"} />
          </div>
        </div>
      </div>

      {/* Profile Fields */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Phone" value={user.phone} />
        <Field label="Email" value={user.email || "N/A"} />
        <Field label="City" value={user.city || "N/A"} />
        <Field
          label="Joined"
          value={user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy") : "N/A"}
        />
        <Field label="Address" value={user.address || "N/A"} className="col-span-2" />
      </div>

      {/* Account Control */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-dim font-bold">Moderation Controls</div>
        <button
          onClick={onToggle}
          className={`btn-press w-full h-11 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
            user.isActive
              ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
              : "gradient-cyan text-background border-transparent glow-cyan"
          }`}
        >
          <Power className="w-4 h-4" />
          {user.isActive ? "Deactivate / Suspend Account" : "Activate Account"}
        </button>
      </div>

      {/* Recent Bookings Section */}
      <div className="space-y-3 pt-2">
        <div className="text-xs uppercase tracking-wider text-dim font-bold flex items-center justify-between">
          <span>Recent Bookings</span>
          <span className="text-[10px] text-primary">{userBookings.length} total</span>
        </div>

        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
          {bookingsLoading ? (
            <div className="text-center py-6 text-xs text-dim">Loading booking history...</div>
          ) : userBookings.length === 0 ? (
            <div className="text-xs text-dim py-6 text-center bg-surface-light/10 border border-border/40 rounded-xl">
              This customer hasn't placed any bookings yet.
            </div>
          ) : (
            userBookings.map((b: any) => (
              <div
                key={b._id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface-light/20 border border-border hover:bg-surface-light/35 transition"
              >
                <div>
                  <div className="text-xs font-bold text-white uppercase">{b.category || "General"}</div>
                  <div className="text-[10px] text-dim mt-1">
                    Booking #{b._id.slice(-6)} • {b.scheduledDate ? format(new Date(b.scheduledDate), "dd MMM yyyy") : "N/A"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-white">{fmtPKR(b.totalAmount || 0)}</div>
                  <div className="mt-1">
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`p-3.5 rounded-xl bg-surface-light/20 border border-border/50 ${className}`}>
      <div className="text-[10px] uppercase tracking-wider text-dim font-bold">{label}</div>
      <div className="mt-1 font-semibold text-white break-words">{value}</div>
    </div>
  );
}
