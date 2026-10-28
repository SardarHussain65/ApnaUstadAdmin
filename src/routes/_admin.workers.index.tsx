import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  CheckCircle2,
  Power,
  Search,
  Star,
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Avatar, Badge, RatingStars } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { DetailDrawer, type DrawerTab } from "@/components/ui/detail-drawer";
import { CopyableId } from "@/components/ui/copyable-id";
import { CnicRevealModal } from "@/components/admin/CnicRevealModal";
import {
  formatDate,
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
  useBookings,
  type Worker,
} from "@/lib/api-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/workers/")({
  component: WorkersPage,
});

const DEACTIVATE_REASONS = [
  "Document forgery or identity verification failure",
  "Repeated client complaints or no-show violations",
  "Off-platform cash payment evasion",
  "Substandard workmanship or policy breach",
  "Worker-requested account closure",
];

function WorkersPage() {
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState("");
  const [cat, setCat] = useState("");
  const [city, setCity] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [statusTarget, setStatusTarget] = useState<Worker | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<Worker | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const deferredQ = useDeferredValue(q);

  useEffect(() => {
    setPage(1);
  }, [deferredQ, verified, cat, city]);

  const { data, isLoading } = useWorkersPage({
    page,
    limit: 10,
    search: deferredQ,
    verified: verified === "yes" ? true : verified === "no" ? false : undefined,
    category: cat || undefined,
    city: city || undefined,
  });

  const toggleWorkerStatusMutation = useToggleWorkerStatus();
  const verifyWorkerMutation = useVerifyWorker();

  const { options: categoryOptions } = useCategoryFilterOptions();
  const { options: cityOptions } = useCityFilterOptions();

  const apiWorkers = data?.items || [];
  const rows = useMemo(() => apiWorkers.map((w) => ({ ...w, id: w._id })), [apiWorkers]);

  const handleDeactivateConfirm = async (payload: ConfirmPayload) => {
    if (!statusTarget) return;
    try {
      await toggleWorkerStatusMutation.mutateAsync({
        id: statusTarget._id,
        isActive: false,
        reason: payload.reason,
      });
      setSelectedWorker((curr) =>
        curr?._id === statusTarget._id ? { ...curr, isActive: false } : curr
      );
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
      setSelectedWorker((curr) =>
        curr?._id === worker._id ? { ...curr, isActive: true } : curr
      );
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

  const handleVerifyConfirm = async (payload: ConfirmPayload) => {
    if (!verifyTarget) return;
    try {
      await verifyWorkerMutation.mutateAsync({
        id: verifyTarget._id,
        isVerified: true,
      });
      setSelectedWorker((curr) =>
        curr?._id === verifyTarget._id ? { ...curr, isVerified: true } : curr
      );
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

  const columns: Column<Worker>[] = [
    {
      key: "worker",
      header: "Ustad",
      sortable: true,
      render: (w) => (
        <div className="flex items-center gap-3">
          <Avatar src={w.profileImage} name={w.fullName} />
          <div>
            <div className="font-semibold text-foreground group-hover:text-primary transition flex items-center gap-1.5">
              <span>{w.fullName}</span>
              {w.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {shortId(w._id)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (w) => (
        <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {w.category || "General"}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (w) => (
        <span className="font-mono text-xs text-foreground">
          {formatPhone(w.phone) || "—"}
        </span>
      ),
    },
    {
      key: "cnic",
      header: "CNIC (Audited)",
      render: (w) => (
        <div onClick={(e) => e.stopPropagation()}>
          <CnicRevealModal
            workerId={w._id}
            maskedCnic={w.cnicNumber}
            workerName={w.fullName}
            showImages={false}
          />
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      sortable: true,
      render: (w) => (
        <div className="flex items-center gap-1">
          <RatingStars rating={w.rating || 0} />
          <span className="text-[11px] text-muted-foreground font-mono">
            ({w.totalReviews || 0})
          </span>
        </div>
      ),
    },
    {
      key: "jobs",
      header: "Jobs",
      sortable: true,
      render: (w) => (
        <span className="font-mono font-semibold text-foreground text-xs">
          {w.totalJobs || 0}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Rate",
      render: (w) => (
        <span className="font-mono text-xs font-bold text-emerald-400">
          {formatPKR(w.hourlyRate || 0)}/hr
        </span>
      ),
    },
    {
      key: "verified",
      header: "Verification",
      render: (w) => (
        <Badge variant={w.isVerified ? "success" : "warning"}>
          {w.isVerified ? "✓ Verified" : "Pending"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (w) => <StatusBadge status={w.isActive ? "active" : "inactive"} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      render: (w) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setSelectedWorker(w)}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
            title="Inspect Drawer"
          >
            <Eye className="h-4 w-4" />
          </button>
          {!w.isVerified && (
            <button
              type="button"
              onClick={() => setVerifyTarget(w)}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-emerald-500/10 hover:text-emerald-400"
              title="Verify Ustad"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleStatus(w)}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            title={w.isActive ? "Suspend Ustad" : "Reactivate Ustad"}
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Drawer Tabs
  const drawerTabs: DrawerTab[] = selectedWorker
    ? [
        {
          value: "profile",
          label: "Profile",
          content: <WorkerProfileTab worker={selectedWorker} />,
        },
        {
          value: "identity",
          label: "CNIC & Documents",
          content: (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-4">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Government Identity</span>
                <div className="mt-2">
                  <CnicRevealModal
                    workerId={selectedWorker._id}
                    maskedCnic={selectedWorker.cnicNumber}
                    workerName={selectedWorker.fullName}
                    showImages={true}
                  />
                </div>
              </div>
            </div>
          ),
        },
        {
          value: "bookings",
          label: "Recent Jobs",
          content: <WorkerJobsTab workerId={selectedWorker._id} />,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Professionals & Ustads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Directory of vetted service providers, credentials, and verification statuses
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
            placeholder="Search by name, phone, or specialty..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Verification Filter */}
          <select
            value={verified}
            onChange={(e) => setVerified(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Verifications</option>
            <option value="yes">Verified Only</option>
            <option value="no">Pending Verification</option>
          </select>

          {/* Category Filter */}
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
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
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Cities</option>
            {cityOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DataTable */}
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
        onRowClick={(w) => setSelectedWorker(w)}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Slide-over Detail Drawer */}
      {selectedWorker && (
        <DetailDrawer
          open={!!selectedWorker}
          onOpenChange={(open) => !open && setSelectedWorker(null)}
          title={selectedWorker.fullName || "Ustad Details"}
          subtitle={
            <div className="flex items-center gap-2">
              <CopyableId id={selectedWorker._id} label="ID" />
              <span>·</span>
              <StatusBadge status={selectedWorker.isActive ? "active" : "inactive"} />
              <span>·</span>
              <Badge variant={selectedWorker.isVerified ? "success" : "warning"}>
                {selectedWorker.isVerified ? "Verified" : "Pending"}
              </Badge>
            </div>
          }
          leading={<Avatar src={selectedWorker.profileImage} name={selectedWorker.fullName} size={48} />}
          headerActions={
            <Link
              to="/workers/$id"
              params={{ id: selectedWorker._id }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-accent transition"
            >
              <span>Full Page</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          }
          tabs={drawerTabs}
          footer={
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground font-mono">
                {selectedWorker.totalJobs || 0} jobs completed
              </div>
              <div className="flex items-center gap-2">
                {!selectedWorker.isVerified && (
                  <button
                    type="button"
                    onClick={() => setVerifyTarget(selectedWorker)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verify Ustad</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleStatus(selectedWorker)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition ${
                    selectedWorker.isActive
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  <Power className="h-4 w-4" />
                  <span>{selectedWorker.isActive ? "Suspend Account" : "Reactivate"}</span>
                </button>
              </div>
            </div>
          }
        />
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

// Drawer Sub-component: Worker Profile Tab
function WorkerProfileTab({ worker }: { worker: Worker }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-primary" />
            <span>Phone Number</span>
          </div>
          <div className="mt-1 font-mono text-sm font-semibold text-foreground">
            {formatPhone(worker.phone) || "Not provided"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            <span>Category & Rate</span>
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {worker.category || "General"} · {formatPKR(worker.hourlyRate || 0)}/hr
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Location & City</span>
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {worker.city || "Not set"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-amber-400" />
            <span>Rating & Reviews</span>
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1.5">
            <span>{worker.rating?.toFixed(1) || "0.0"}</span>
            <span className="text-xs text-muted-foreground font-mono">({worker.totalReviews || 0} reviews)</span>
          </div>
        </div>
      </div>

      {worker.bio && (
        <div className="rounded-xl border border-border bg-surface p-3.5">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Bio / Experience</span>
          <p className="mt-1 text-xs text-foreground/90">{worker.bio}</p>
        </div>
      )}

      {worker.skills && worker.skills.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-3.5">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">Specialties & Skills</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {worker.skills.map((s, idx) => (
              <span
                key={idx}
                className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Drawer Sub-component: Worker Jobs Tab
function WorkerJobsTab({ workerId }: { workerId: string }) {
  const { data: bookingsData, isLoading } = useBookings({
    workerId,
    limit: 10,
  });

  const list = (bookingsData as any) || [];

  if (isLoading) {
    return <div className="py-8 text-center text-xs text-muted-foreground">Loading recent jobs…</div>;
  }

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No completed bookings or jobs recorded for this ustad yet.
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
              {b.category || "Service"}
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
