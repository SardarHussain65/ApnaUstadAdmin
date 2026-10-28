import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  Power,
  Search,
  ShieldAlert,
  Star,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailDrawer, type DrawerTab } from "@/components/ui/detail-drawer";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { CopyableId } from "@/components/ui/copyable-id";
import { Avatar } from "@/components/admin/ui";
import {
  formatDate,
  formatPhone,
  formatPKR,
  shortId,
} from "@/lib/format";
import { useCityFilterOptions } from "@/lib/filter-options";
import { toast } from "sonner";
import { useUsersPage, useToggleUserStatus, useBookings } from "@/lib/api-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/users")({
  component: UsersPage,
});

const DEACTIVATE_REASONS = [
  "Violation of platform safety policies",
  "Abusive conduct towards ustads or staff",
  "Suspected fraudulent or duplicate profile",
  "Unpaid service dispute non-compliance",
  "User-requested account termination",
];

function UsersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [statusTarget, setStatusTarget] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const deferredQ = useDeferredValue(q);

  const dateFrom = useMemo(() => {
    if (!dateFilter) return undefined;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    if (dateFilter === "week") from.setDate(from.getDate() - 7);
    if (dateFilter === "month") from.setDate(from.getDate() - 30);
    return from.toISOString();
  }, [dateFilter]);

  useEffect(() => {
    setPage(1);
  }, [deferredQ, status, city, dateFilter]);

  const { data, isLoading } = useUsersPage({
    page,
    limit: 10,
    search: deferredQ,
    status: status || undefined,
    city: city || undefined,
    dateFrom,
  });

  const toggleUserMutation = useToggleUserStatus();
  const { options: cityOptions } = useCityFilterOptions();
  const rows = data?.items || [];

  const handleDeactivateConfirm = async (payload: ConfirmPayload) => {
    if (!statusTarget) return;
    try {
      const res: any = await toggleUserMutation.mutateAsync({
        id: statusTarget._id,
        isActive: false,
        reason: payload.reason,
      });
      const updated = res?.data || res;
      setSelected((curr: any) =>
        curr?._id === statusTarget._id ? { ...curr, ...updated, isActive: false } : curr
      );
      toast.success("User account suspended and reason logged to audit trail");
      setStatusTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate account");
      throw err;
    }
  };

  const handleReactivate = async (user: any) => {
    try {
      const res: any = await toggleUserMutation.mutateAsync({
        id: user._id,
        isActive: true,
        reason: "Account reactivated by administrator review",
      });
      const updated = res?.data || res;
      setSelected((curr: any) =>
        curr?._id === user._id ? { ...curr, ...updated, isActive: true } : curr
      );
      toast.success("User account reactivated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate account");
    }
  };

  const requestStatusChange = (user: any) => {
    if (user.isActive) {
      setStatusTarget(user);
    } else {
      handleReactivate(user);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      toast.loading("Exporting customers CSV...", { id: "users-export" });
      await api.downloadExport("users");
      toast.success("Customers CSV export downloaded", { id: "users-export" });
    } catch (err: any) {
      toast.error(err.message || "Export failed", { id: "users-export" });
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "user",
      header: "Customer",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar src={u.profileImage} name={u.fullName} />
          <div>
            <div className="font-semibold text-foreground group-hover:text-primary transition">
              {u.fullName || "Unnamed customer"}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {shortId(u._id)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (u) => (
        <span className="font-mono text-xs text-foreground">
          {formatPhone(u.phone) || "—"}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (u) => (
        <span className="text-xs text-muted-foreground">{u.email || "—"}</span>
      ),
    },
    {
      key: "city",
      header: "City",
      render: (u) => (
        <span className="text-xs text-foreground/80">{u.city || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => <StatusBadge status={u.isActive ? "active" : "inactive"} />,
    },
    {
      key: "joined",
      header: "Joined",
      sortable: true,
      render: (u) => (
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(u.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      render: (u) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setSelected(u)}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => requestStatusChange(u)}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            title={u.isActive ? "Deactivate Account" : "Reactivate Account"}
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Drawer tabs definition
  const drawerTabs: DrawerTab[] = selected
    ? [
        {
          value: "overview",
          label: "Overview",
          content: <UserOverviewTab user={selected} onToggle={() => requestStatusChange(selected)} />,
        },
        {
          value: "bookings",
          label: "Bookings",
          content: <UserBookingsTab customerId={selected._id} />,
        },
        {
          value: "moderation",
          label: "Moderation",
          content: (
            <UserModerationTab
              user={selected}
              onToggle={() => requestStatusChange(selected)}
            />
          ),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Customer Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, manage, and moderate registered platform customer profiles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="app-glass rounded-2xl border border-border bg-card p-4 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Suspended</option>
          </select>

          {/* City Filter */}
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Cities</option>
            {cityOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Registration Window */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Join Dates</option>
            <option value="today">Joined Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        rows={rows}
        columns={columns}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          totalItems: data?.pagination.totalItems ?? 0,
          onPageChange: setPage,
        }}
        onRowClick={(u) => setSelected(u)}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={(ids, clear) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                toast.info(`Bulk operations prepared for ${ids.length} customers`);
                clear();
              }}
              className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20"
            >
              Suspend Selected
            </button>
          </div>
        )}
      />

      {/* Slide-over Detail Drawer */}
      {selected && (
        <DetailDrawer
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          title={selected.fullName || "Customer Profile"}
          subtitle={
            <div className="flex items-center gap-2">
              <CopyableId id={selected._id} label="ID" />
              <span>·</span>
              <StatusBadge status={selected.isActive ? "active" : "inactive"} />
            </div>
          }
          leading={<Avatar src={selected.profileImage} name={selected.fullName} size={48} />}
          tabs={drawerTabs}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Joined {formatDate(selected.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => requestStatusChange(selected)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition ${
                  selected.isActive
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                <Power className="h-4 w-4" />
                <span>{selected.isActive ? "Suspend Account" : "Reactivate Account"}</span>
              </button>
            </div>
          }
        />
      )}

      {/* Mandatory Reason Confirmation Dialog for Deactivation */}
      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title="Suspend Customer Account"
        description={
          <div>
            <p>
              Are you sure you want to deactivate{" "}
              <strong className="text-foreground">{statusTarget?.fullName}</strong>?
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              The user will immediately lose booking access and must contact support. A formal
              justification is required for the audit record.
            </p>
          </div>
        }
        confirmLabel="Suspend Account"
        tone="danger"
        requireReason={true}
        reasons={DEACTIVATE_REASONS}
        notePlaceholder="Explain why this account is being suspended..."
        onConfirm={handleDeactivateConfirm}
      />
    </div>
  );
}

// Drawer Sub-component: Overview Tab
function UserOverviewTab({ user }: { user: any; onToggle: () => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-primary" />
            <span>Phone Number</span>
          </div>
          <div className="mt-1 font-mono text-sm font-semibold text-foreground">
            {formatPhone(user.phone) || "Not provided"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
            <Mail className="h-3.5 w-3.5 text-primary" />
            <span>Email Address</span>
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground truncate">
            {user.email || "Not provided"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>City & Location</span>
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {user.city || "Not set"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Registration Date</span>
          </div>
          <div className="mt-1 font-mono text-sm font-semibold text-foreground">
            {formatDate(user.createdAt)}
          </div>
        </div>
      </div>

      {user.address && (
        <div className="rounded-xl border border-border bg-surface p-3.5">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Delivery Address</span>
          <p className="mt-1 text-sm text-foreground">{user.address}</p>
        </div>
      )}

      {/* Favorite Ustads */}
      {(() => {
        const favs = (user.favorites || []).filter((w: any) => w && typeof w === "object" && w.fullName);
        if (favs.length === 0) return null;
        return (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Saved Favorite Ustads</span>
              <span className="text-[11px] text-primary">{favs.length} saved</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {favs.map((w: any) => (
                <div
                  key={w._id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                >
                  <Avatar src={w.profileImage} name={w.fullName} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">{w.fullName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {w.category} • Rs {w.hourlyRate}/hr
                    </div>
                  </div>
                  {w.rating > 0 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span>{w.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Drawer Sub-component: Bookings Tab
function UserBookingsTab({ customerId }: { customerId: string }) {
  const { data: bookingsData, isLoading } = useBookings({
    customerId,
    limit: 10,
  });

  const list = (bookingsData as any) || [];

  if (isLoading) {
    return <div className="py-8 text-center text-xs text-muted-foreground">Loading customer bookings…</div>;
  }

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No booking history recorded for this customer.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {list.map((b: any) => (
        <div
          key={b._id}
          className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 transition hover:border-primary/40"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-foreground">
              {b.category || "General Service"}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground font-mono">
              {shortId(b._id)} • {formatDate(b.scheduledDate)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-foreground tabular-nums font-mono">
              {formatPKR(b.totalAmount || 0)}
            </div>
            <div className="mt-1 flex justify-end">
              <StatusBadge status={b.status} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Drawer Sub-component: Moderation Tab
function UserModerationTab({ user, onToggle }: { user: any; onToggle: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Account Standing</div>
        <div className="mt-2 flex items-center gap-2">
          {user.isActive ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Good Standing (Active)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <XCircle className="h-4 w-4" />
              <span>Suspended (Deactivated)</span>
            </div>
          )}
        </div>
      </div>

      {!user.isActive && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <span>Suspension Details</span>
          </div>
          <p className="mt-2 text-sm text-foreground">
            {user.deactivationReason || "No explanation provided during suspension."}
          </p>
          {user.deactivatedAt && (
            <p className="mt-2 text-xs text-muted-foreground font-mono">
              Enforced on {formatDate(user.deactivatedAt, "dd MMM yyyy, h:mm a")}
            </p>
          )}
        </div>
      )}

      <div className="pt-2">
        <button
          type="button"
          onClick={onToggle}
          className={`w-full h-11 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
            user.isActive
              ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
          }`}
        >
          <Power className="h-4 w-4" />
          <span>{user.isActive ? "Deactivate Customer Account" : "Reactivate Customer Account"}</span>
        </button>
      </div>
    </div>
  );
}
