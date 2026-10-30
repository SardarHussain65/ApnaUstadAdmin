import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Download,
  Power,
  Search,
  Users,
  UserCheck,
  UserX,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowUpRight,
  LayoutGrid,
  Rows3,
  Heart,
  ShieldAlert,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/admin/ui";
import {
  formatDate,
  formatPhone,
  formatPKR,
  shortId,
} from "@/lib/format";
import { useCityFilterOptions } from "@/lib/filter-options";
import { toast } from "sonner";
import { useUsersPage, useToggleUserStatus } from "@/lib/api-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/users/")({
  component: UsersPage,
});

const DEACTIVATE_REASONS = [
  "Safety policy violation",
  "Rude or abusive behavior towards ustad",
  "Fake or duplicate account",
  "Refusing to settle complaint",
  "Customer asked to close account",
];

function UsersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const navigate = useNavigate();
  const openCustomer = (u: any) => navigate({ to: "/users/$id", params: { id: u._id } });
  const [statusTarget, setStatusTarget] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const deferredQ = useDeferredValue(q);

  const pageSize = 12;

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
    limit: pageSize,
    search: deferredQ,
    status: status || undefined,
    city: city || undefined,
    dateFrom,
  });

  const toggleUserMutation = useToggleUserStatus();
  const { options: cityOptions } = useCityFilterOptions();
  const rows = data?.items || [];
  const totalItems = data?.pagination.totalItems ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  // Summary metrics derived from loaded dataset & totals
  const summaryStats = useMemo(() => {
    const activeInView = rows.filter((u: any) => u.isActive !== false).length;
    const suspendedInView = rows.filter((u: any) => u.isActive === false).length;
    const withActivity = rows.filter(
      (u: any) => (u.totalBookings || 0) > 0 || (u.totalJobs || 0) > 0
    ).length;
    const totalSpendInView = rows.reduce(
      (sum: number, u: any) => sum + (Number(u.totalSpent) || 0),
      0
    );
    return {
      totalItems,
      activeInView,
      suspendedInView,
      withActivity,
      totalSpendInView,
    };
  }, [rows, totalItems]);

  const hasActiveFilters = Boolean(q || status || city || dateFilter);

  const clearAllFilters = () => {
    setQ("");
    setStatus("");
    setCity("");
    setDateFilter("");
  };

  const handleDeactivateConfirm = async (payload: ConfirmPayload) => {
    if (!statusTarget) return;
    try {
      await toggleUserMutation.mutateAsync({
        id: statusTarget._id,
        isActive: false,
        reason: payload.reason,
      });
      toast.success("User account suspended and reason logged to audit trail");
      setStatusTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate account");
      throw err;
    }
  };

  const handleReactivate = async (user: any) => {
    try {
      await toggleUserMutation.mutateAsync({
        id: user._id,
        isActive: true,
        reason: "Account reactivated by administrator review",
      });
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

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
            <Users className="h-3.5 w-3.5" />
            <span>Customer Directory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Customer Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inspect customer profiles, booking history, spending, and account status
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-sm transition hover:bg-surface disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-primary" />
            <span>Export Directory CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Customers
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {summaryStats.totalItems.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Registered platform accounts
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Standing
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {summaryStats.activeInView}
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                / {rows.length || 0} on page
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Verified & permitted to book
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Marketplace Engagement
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatPKR(summaryStats.totalSpendInView)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {summaryStats.withActivity} customers with bookings/jobs on page
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Suspended / Restricted
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              {summaryStats.suspendedInView}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Deactivated on current view
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <UserX className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Unified Command & Filter Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Status Segmented Tabs */}
          <div className="inline-flex items-center rounded-xl border border-border bg-surface p-1 self-start">
            {[
              { value: "", label: "All Customers" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Suspended" },
            ].map((tab) => {
              const active = status === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatus(tab.value)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-card text-foreground shadow-sm border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Controls: Search + Filters + View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search customer by name, phone (+92...), or email..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-surface pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* City Filter */}
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
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
              className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="">All Join Dates</option>
              <option value="today">Joined Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
              >
                Reset
              </button>
            )}

            {/* View Mode Switcher */}
            <div className="inline-flex h-10 items-center rounded-xl border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                  viewMode === "cards"
                    ? "bg-card text-primary shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Cards View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                  viewMode === "list"
                    ? "bg-card text-primary shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Structured Directory Rows"
              >
                <Rows3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Directory List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          className={
            viewMode === "cards"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-3"
          }
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="skeleton h-12 w-12 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-4 w-1/2 rounded" />
                  <div className="skeleton h-3 w-1/3 rounded" />
                </div>
              </div>
              <div className="skeleton h-16 w-full rounded-xl" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && rows.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <EmptyState
            variant={hasActiveFilters ? "search" : "empty"}
            query={q}
            title="No customer accounts found"
            description="No registered customers match your current filter criteria."
            onClearFilters={hasActiveFilters ? clearAllFilters : undefined}
          />
        </div>
      )}

      {/* VIEW MODE 1: Rich Customer Dossier Cards Grid */}
      {!isLoading && rows.length > 0 && viewMode === "cards" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((u: any) => {
            const totalBookings = u.totalBookings || 0;
            const completedBookings = u.completedBookings || 0;
            const totalSpent = u.totalSpent || 0;
            const totalJobs = u.totalJobs || 0;
            const favoritesCount = Array.isArray(u.favorites) ? u.favorites.length : 0;
            const isGoogleUser = Boolean(u.googleId || (u.email && !u.phone));

            return (
              <div
                key={u._id}
                onClick={() => openCustomer(u)}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md cursor-pointer"
              >
                <div>
                  {/* Card Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar src={u.profileImage} name={u.fullName} size={48} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${
                            u.isActive !== false ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          title={u.isActive !== false ? "Active account" : "Suspended account"}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-bold text-foreground group-hover:text-primary transition">
                            {u.fullName || "Unnamed Customer"}
                          </h3>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground border border-border/60">
                            {shortId(u._id)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            <Sparkles className="h-2.5 w-2.5" />
                            {isGoogleUser ? "Google Auth" : "Phone OTP"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <StatusBadge status={u.isActive !== false ? "active" : "inactive"} />
                    </div>
                  </div>

                  {/* Contact & Location Structured Panel */}
                  <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-border/70 bg-surface/60 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                        <Phone className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                        <span>Phone</span>
                      </span>
                      {u.phone ? (
                        <span className="font-mono font-semibold text-foreground">
                          {formatPhone(u.phone)}
                        </span>
                      ) : (
                        <span className="rounded bg-card px-2 py-0.5 text-[11px] text-muted-foreground border border-border/50">
                          Not linked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium shrink-0">
                        <Mail className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                        <span>Email</span>
                      </span>
                      <span className="truncate font-medium text-foreground max-w-[200px]" title={u.email || ""}>
                        {u.email || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                        <span>Location</span>
                      </span>
                      <span className="truncate font-medium text-foreground max-w-[200px]">
                        {u.city ? (
                          <>
                            <strong className="font-semibold">{u.city}</strong>
                            {u.address ? ` · ${u.address}` : ""}
                          </>
                        ) : (
                          <span className="text-muted-foreground">City not set</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                        <Calendar className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                        <span>Joined</span>
                      </span>
                      <span className="font-mono text-[11px] font-medium text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Marketplace Activity Mini-KPI Strip */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Bookings
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
                        {totalBookings}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {completedBookings} completed
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Total Spent
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPKR(totalSpent)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {totalJobs} job posts
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Saved Ustads
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold text-foreground inline-flex items-center gap-1">
                        <Heart className="h-3 w-3 text-rose-500" />
                        <span>{favoritesCount}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Favorites
                      </div>
                    </div>
                  </div>

                  {/* Suspension Reason Banner if Inactive */}
                  {u.isActive === false && u.deactivationReason && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/8 p-2.5 text-xs text-rose-600 dark:text-rose-300">
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="line-clamp-2">
                        <span className="font-bold">Suspended: </span>
                        {u.deactivationReason}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div
                  className="mt-4 flex items-center justify-between gap-2 border-t border-border/70 pt-3.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    to="/users/$id"
                    params={{ id: u._id }}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    <span>Open 360° Profile</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => requestStatusChange(u)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                      u.isActive !== false
                        ? "border-rose-500/25 bg-rose-500/5 text-rose-600 hover:bg-rose-500/15 dark:text-rose-400"
                        : "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>{u.isActive !== false ? "Suspend" : "Activate"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: Structured Rich Directory List (Non-spreadsheet Dossier Rows) */}
      {!isLoading && rows.length > 0 && viewMode === "list" && (
        <div className="space-y-2.5">
          {rows.map((u: any) => {
            const totalBookings = u.totalBookings || 0;
            const completedBookings = u.completedBookings || 0;
            const totalSpent = u.totalSpent || 0;
            const totalJobs = u.totalJobs || 0;

            return (
              <div
                key={u._id}
                onClick={() => openCustomer(u)}
                className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md lg:flex-row lg:items-center lg:justify-between cursor-pointer"
              >
                {/* Left: Identity */}
                <div className="flex items-center gap-3.5 min-w-[240px]">
                  <div className="relative shrink-0">
                    <Avatar src={u.profileImage} name={u.fullName} size={44} />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                        u.isActive !== false ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground group-hover:text-primary transition truncate">
                        {u.fullName || "Unnamed Customer"}
                      </span>
                      <StatusBadge status={u.isActive !== false ? "active" : "inactive"} />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{shortId(u._id)}</span>
                      <span>•</span>
                      <span>Joined {formatDate(u.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Middle-Left: Contact Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-xl text-xs">
                  <div className="flex items-center gap-2 rounded-xl bg-surface/70 px-3 py-2 border border-border/60">
                    <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Phone & Email
                      </div>
                      <div className="font-mono font-semibold text-foreground truncate">
                        {formatPhone(u.phone) || "No phone"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {u.email || "No email"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-surface/70 px-3 py-2 border border-border/60">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                        City & Address
                      </div>
                      <div className="font-semibold text-foreground truncate">
                        {u.city || "City not set"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {u.address || "No street address"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle-Right: Activity Badges */}
                <div className="flex items-center gap-4 border-t border-border/60 pt-3 lg:border-t-0 lg:pt-0">
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Activity
                    </div>
                    <div className="mt-0.5 text-xs font-bold text-foreground">
                      {totalBookings} bookings · {totalJobs} jobs
                    </div>
                    <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatPKR(totalSpent)} spent ({completedBookings} done)
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div
                    className="flex items-center gap-2 ml-auto lg:ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      to="/users/$id"
                      params={{ id: u._id }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <span>Profile</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => requestStatusChange(u)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                        u.isActive !== false
                          ? "border-rose-500/25 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                          : "border-emerald-500/25 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>{u.isActive !== false ? "Suspend" : "Activate"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Directory Pagination Footer */}
      {!isLoading && totalItems > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-medium text-muted-foreground">
            Showing{" "}
            <span className="font-bold text-foreground">
              {(page - 1) * pageSize + 1}–{Math.min((page - 1) * pageSize + rows.length, totalItems)}
            </span>{" "}
            of <span className="font-bold text-foreground">{totalItems}</span> customer accounts
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-3 text-xs font-bold text-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
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
