import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Download,
  CheckCircle2,
  Power,
  Search,
  Star,
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  Phone,
  MapPin,
  Wrench,
  LayoutGrid,
  Rows3,
  ArrowUpRight,
  X,
  ChevronLeft,
  ChevronRight,
  Award,
} from "lucide-react";
import { Avatar, Badge } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CnicRevealModal } from "@/components/admin/CnicRevealModal";
import {
  formatPhone,
  formatPKR,
  shortId,
} from "@/lib/format";
import { useCategoryFilterOptions, useCityFilterOptions } from "@/lib/filter-options";
import { toast } from "sonner";
import {
  useWorkersPage,
  useVerifyWorker,
  useToggleWorkerStatus,
  type Worker,
} from "@/lib/api-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/workers/")({
  component: WorkersPage,
});

const DEACTIVATE_REASONS = [
  "Fake documents or CNIC verification failed",
  "Multiple customer complaints or no-shows",
  "Taking payments off-platform",
  "Poor work quality or rule violations",
  "Ustad requested account closure",
];

function WorkersPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState("");
  const [cat, setCat] = useState("");
  const [city, setCity] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [statusTarget, setStatusTarget] = useState<Worker | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<Worker | null>(null);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const deferredQ = useDeferredValue(q);

  const pageSize = 12;

  useEffect(() => {
    setPage(1);
  }, [deferredQ, verified, cat, city]);

  const { data, isLoading } = useWorkersPage({
    page,
    limit: pageSize,
    search: deferredQ,
    verified: verified === "yes" ? true : verified === "no" ? false : undefined,
    category: cat || undefined,
    city: city || undefined,
  });

  const toggleWorkerStatusMutation = useToggleWorkerStatus();
  const verifyWorkerMutation = useVerifyWorker();

  const { options: categoryOptions } = useCategoryFilterOptions();
  const { options: cityOptions } = useCityFilterOptions();

  const rows = data?.items || [];
  const totalItems = data?.pagination.totalItems ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  const summaryStats = useMemo(() => {
    const verifiedCount = rows.filter((w) => w.isVerified).length;
    const pendingCount = rows.filter((w) => !w.isVerified).length;
    const activeCount = rows.filter((w) => w.isActive !== false).length;
    const totalJobsInView = rows.reduce((sum, w) => sum + (w.totalJobs || 0), 0);
    return {
      totalItems,
      verifiedCount,
      pendingCount,
      activeCount,
      totalJobsInView,
    };
  }, [rows, totalItems]);

  const hasActiveFilters = Boolean(q || verified || cat || city);

  const clearAllFilters = () => {
    setQ("");
    setVerified("");
    setCat("");
    setCity("");
  };

  const handleDeactivateConfirm = async (payload: ConfirmPayload) => {
    if (!statusTarget) return;
    try {
      await toggleWorkerStatusMutation.mutateAsync({
        id: statusTarget._id,
        isActive: false,
        reason: payload.reason,
      });
      toast.success("Worker suspended and reason logged to audit trail");
      setStatusTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate worker");
      throw err;
    }
  };

  const handleReactivate = async (worker: Worker) => {
    try {
      await toggleWorkerStatusMutation.mutateAsync({
        id: worker._id,
        isActive: true,
        reason: "Worker account reactivated by admin review",
      });
      toast.success("Worker reactivated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate worker");
    }
  };

  const toggleStatus = (worker: Worker) => {
    if (worker.isActive) {
      setStatusTarget(worker);
    } else {
      handleReactivate(worker);
    }
  };

  const handleVerifyConfirm = async (_payload: ConfirmPayload) => {
    if (!verifyTarget) return;
    try {
      await verifyWorkerMutation.mutateAsync({
        id: verifyTarget._id,
        isVerified: true,
      });
      toast.success("Worker verified and badges updated");
      setVerifyTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to verify worker");
      throw err;
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      toast.loading("Exporting ustads CSV...", { id: "workers-export" });
      await api.downloadExport("workers");
      toast.success("Ustads CSV export downloaded", { id: "workers-export" });
    } catch (err: any) {
      toast.error(err.message || "Export failed", { id: "workers-export" });
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
            <Wrench className="h-3.5 w-3.5" />
            <span>Workforce & Credential Directory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ustads (Workers)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Directory of registered ustads, work categories, CNIC verification, and customer ratings
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
            <span>Export Ustads CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Ustads
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {summaryStats.totalItems.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Registered ustads
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wrench className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              CNIC Verified
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {summaryStats.verifiedCount}
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                / {rows.length || 0} on page
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              CNIC & work categories approved
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Pending CNIC Check
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {summaryStats.pendingCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Awaiting CNIC review
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Completed Jobs
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {summaryStats.totalJobsInView.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {summaryStats.activeCount} active ustads on page
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Award className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Unified Command & Filter Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Verification Segmented Tabs */}
          <div className="inline-flex items-center rounded-xl border border-border bg-surface p-1 self-start">
            {[
              { value: "", label: "All Ustads" },
              { value: "yes", label: "Verified Only" },
              { value: "no", label: "Pending Review" },
            ].map((tab) => {
              const active = verified === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setVerified(tab.value)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${active
                      ? "bg-card text-foreground shadow-sm border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Controls: Search + Category + City + View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by ustad name, phone, or specialty..."
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

            {/* Category Filter */}
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

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

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
              >
                Reset
              </button>
            )}

            {/* View Switcher */}
            <div className="inline-flex h-10 items-center rounded-xl border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${viewMode === "cards"
                    ? "bg-card text-primary shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${viewMode === "list"
                    ? "bg-card text-primary shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
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
            title="No professionals found"
            description="No ustad profiles match your active search or filter criteria."
            onClearFilters={hasActiveFilters ? clearAllFilters : undefined}
          />
        </div>
      )}

      {/* VIEW MODE 1: Rich Ustad Dossier Cards Grid */}
      {!isLoading && rows.length > 0 && viewMode === "cards" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((w) => {
            const skills = Array.isArray(w.skills) ? w.skills : [];
            return (
              <div
                key={w._id}
                onClick={() => navigate({ to: "/workers/$id", params: { id: w._id } })}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md cursor-pointer"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar src={w.profileImage} name={w.fullName} size={48} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${w.isActive !== false ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-base font-bold text-foreground group-hover:text-primary transition">
                            {w.fullName || "Unnamed Ustad"}
                          </h3>
                          {w.isVerified && (
                            <span title="NADRA Verified Ustad" className="inline-flex shrink-0">
                              <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                            <Briefcase className="h-3 w-3" />
                            {w.category || "General"}
                          </span>
                          <span className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground border border-border/60">
                            {shortId(w._id)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={w.isActive !== false ? "active" : "inactive"} />
                      <Badge variant={w.isVerified ? "success" : "warning"}>
                        {w.isVerified ? "✓ Verified" : "Pending"}
                      </Badge>
                    </div>
                  </div>

                  {/* Contact, Location & Audited CNIC Panel */}
                  <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-border/70 bg-surface/60 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                        <Phone className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                        <span>Phone</span>
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {formatPhone(w.phone) || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                        <MapPin className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                        <span>City & Exp</span>
                      </span>
                      <span className="font-semibold text-foreground truncate max-w-[190px]">
                        {w.city || "City not set"}
                        {w.experience ? ` · ${w.experience} yrs exp` : ""}
                      </span>
                    </div>

                    <div
                      className="flex items-center justify-between gap-2 pt-1 border-t border-border/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[11px] font-medium text-muted-foreground">
                        CNIC (Audited)
                      </span>
                      <CnicRevealModal
                        workerId={w._id}
                        maskedCnic={w.cnicNumber}
                        workerName={w.fullName}
                        showImages={false}
                      />
                    </div>
                  </div>

                  {/* Performance & Rate Mini-KPI Strip */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Rating
                      </div>
                      <div className="mt-0.5 inline-flex items-center gap-1 font-mono text-sm font-bold text-foreground">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{(w.rating || 0).toFixed(1)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {w.totalReviews || 0} reviews
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Jobs Done
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold text-foreground">
                        {w.totalJobs || 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Completed
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Hourly Rate
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPKR(w.hourlyRate || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Per hour
                      </div>
                    </div>
                  </div>

                  {/* Skills Preview */}
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {skills.slice(0, 3).map((skill, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-border/70 bg-surface px-2 py-0.5 text-[11px] font-medium text-foreground/85"
                        >
                          {skill}
                        </span>
                      ))}
                      {skills.length > 3 && (
                        <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          +{skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div
                  className="mt-4 flex items-center justify-between gap-2 border-t border-border/70 pt-3.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    to="/workers/$id"
                    params={{ id: w._id }}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    <span>Open Profile</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>

                  {!w.isVerified && (
                    <button
                      type="button"
                      onClick={() => setVerifyTarget(w)}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 transition"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Verify</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleStatus(w)}
                    className={`inline-flex h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-semibold transition ${w.isActive !== false
                        ? "border-rose-500/25 bg-rose-500/5 text-rose-600 hover:bg-rose-500/15 dark:text-rose-400"
                        : "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                      }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>{w.isActive !== false ? "Suspend" : "Activate"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: Structured Rich Directory List */}
      {!isLoading && rows.length > 0 && viewMode === "list" && (
        <div className="space-y-2.5">
          {rows.map((w) => (
            <div
              key={w._id}
              onClick={() => navigate({ to: "/workers/$id", params: { id: w._id } })}
              className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md lg:flex-row lg:items-center lg:justify-between cursor-pointer"
            >
              {/* Identity */}
              <div className="flex items-center gap-3.5 min-w-[240px]">
                <Avatar src={w.profileImage} name={w.fullName} size={44} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground group-hover:text-primary transition truncate">
                      {w.fullName}
                    </span>
                    {w.isVerified && <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />}
                    <StatusBadge status={w.isActive !== false ? "active" : "inactive"} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {w.category || "General"}
                    </span>
                    <span className="font-mono">{shortId(w._id)}</span>
                  </div>
                </div>
              </div>

              {/* Contact & CNIC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-xl text-xs">
                <div className="flex items-center gap-2 rounded-xl bg-surface/70 px-3 py-2 border border-border/60">
                  <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Phone & City
                    </div>
                    <div className="font-mono font-semibold text-foreground truncate">
                      {formatPhone(w.phone) || "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {w.city || "City not set"}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between gap-2 rounded-xl bg-surface/70 px-3 py-2 border border-border/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Audited Identity
                    </div>
                    <div className="mt-0.5">
                      <CnicRevealModal
                        workerId={w._id}
                        maskedCnic={w.cnicNumber}
                        workerName={w.fullName}
                        showImages={false}
                      />
                    </div>
                  </div>
                  <Badge variant={w.isVerified ? "success" : "warning"}>
                    {w.isVerified ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>

              {/* Performance + Actions */}
              <div className="flex items-center gap-4 border-t border-border/60 pt-3 lg:border-t-0 lg:pt-0">
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{(w.rating || 0).toFixed(1)}</span>
                    <span className="text-muted-foreground font-normal">
                      ({w.totalReviews || 0})
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatPKR(w.hourlyRate || 0)}/hr · {w.totalJobs || 0} jobs
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 ml-auto lg:ml-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    to="/workers/$id"
                    params={{ id: w._id }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    <span>Profile</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                  {!w.isVerified && (
                    <button
                      type="button"
                      onClick={() => setVerifyTarget(w)}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Verify</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleStatus(w)}
                    className={`inline-flex h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-semibold transition ${w.isActive !== false
                        ? "border-rose-500/25 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                        : "border-emerald-500/25 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                      }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>{w.isActive !== false ? "Suspend" : "Activate"}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
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
            of <span className="font-bold text-foreground">{totalItems}</span> professionals
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

      {/* Mandatory Reason Dialog for Deactivation */}
      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title="Suspend Ustad Profile"
        description={
          <div>
            <p>
              Are you sure you want to suspend{" "}
              <strong className="text-foreground">{statusTarget?.fullName}</strong>?
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              This will remove the worker from marketplace discovery and cancel active job matching.
              A mandatory reason must be logged.
            </p>
          </div>
        }
        confirmLabel="Suspend Ustad"
        tone="danger"
        requireReason={true}
        reasons={DEACTIVATE_REASONS}
        notePlaceholder="Explain why this ustad profile is being suspended..."
        onConfirm={handleDeactivateConfirm}
      />

      {/* Verification Confirmation Dialog */}
      <ConfirmDialog
        open={!!verifyTarget}
        onOpenChange={(open) => !open && setVerifyTarget(null)}
        title="Verify Ustad Profile"
        description={
          <div>
            <p>
              Confirm identity and skill verification for{" "}
              <strong className="text-foreground">{verifyTarget?.fullName}</strong>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              This will grant the worker verified status, badges, and premium job matching access.
            </p>
          </div>
        }
        confirmLabel="Confirm Verification"
        tone="default"
        requireReason={false}
        onConfirm={handleVerifyConfirm}
      />
    </div>
  );
}
