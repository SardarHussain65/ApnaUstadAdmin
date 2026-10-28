import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Download,
  Trash2,
  ExternalLink,
  Users,
  Search,
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailDrawer, type DrawerTab } from "@/components/ui/detail-drawer";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { CopyableId } from "@/components/ui/copyable-id";
import { formatDate, formatPKR, shortId } from "@/lib/format";
import { useCategoryFilterOptions } from "@/lib/filter-options";
import { toast } from "sonner";
import {
  useDeleteJob,
  useCancelJob,
  useJobsPage,
  useJobDetails,
  useUpdateJobStatus,
} from "@/lib/api-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/jobs")({
  component: JobsPage,
});

const DELETE_REASONS = [
  "Spam, abusive, or prohibited job description",
  "Duplicate or fraudulent job posting",
  "Customer requested cancellation/removal",
  "Solicitation of off-platform illegal activities",
  "Expired or abandoned with invalid contact info",
];

function JobsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [urg, setUrg] = useState("");
  const [cat, setCat] = useState("");
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const deferredQ = useDeferredValue(q);

  useEffect(() => {
    setPage(1);
  }, [deferredQ, status, urg, cat]);

  const { data, isLoading } = useJobsPage({
    page,
    limit: 10,
    search: deferredQ,
    status: status || undefined,
    urgency: urg || undefined,
    category: cat || undefined,
  });

  const { data: jobDetails, isLoading: detailsLoading } = useJobDetails(
    selectedJob?._id || "",
    !!selectedJob
  );

  const deleteJobMutation = useDeleteJob();
  const cancelJobMutation = useCancelJob();
  const updateStatusMutation = useUpdateJobStatus();

  const { options: categoryOptions } = useCategoryFilterOptions();
  const rows = data?.items || [];
  const enrichedJob = (jobDetails as any) || selectedJob;
  const bids = enrichedJob?.bids || [];

  const handleDeleteConfirm = async (payload: ConfirmPayload) => {
    if (!deleteTarget) return;
    try {
      await deleteJobMutation.mutateAsync({
        id: deleteTarget._id,
        reason: payload.reason,
      });
      setSelectedJob(null);
      setDeleteTarget(null);
      toast.success("Job post soft-deleted and logged to compliance audit");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete job post");
      throw err;
    }
  };

  const handleCancelConfirm = async (payload: ConfirmPayload) => {
    if (!cancelTarget) return;
    try {
      await cancelJobMutation.mutateAsync({
        id: cancelTarget._id,
        reason: payload.reason,
      });
      if (selectedJob?._id === cancelTarget._id) {
        setSelectedJob((curr: any) => curr ? { ...curr, status: "cancelled" } : curr);
      }
      setCancelTarget(null);
      toast.success("Job post marked as cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel job post");
      throw err;
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      toast.loading("Exporting jobs CSV...", { id: "jobs-export" });
      await api.downloadExport("bookings");
      toast.success("Jobs CSV export downloaded", { id: "jobs-export" });
    } catch (err: any) {
      toast.error(err.message || "Export failed", { id: "jobs-export" });
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "id",
      header: "Job ID",
      sortable: true,
      render: (j) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {shortId(j._id)}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (j) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">
            {j.customer?.fullName || "Anonymous"}
          </span>
          {j.customer?._id && (
            <Link
              to="/users"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary transition"
              title="View Customer"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (j) => (
        <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {j.category || "General"}
        </span>
      ),
    },
    {
      key: "urgency",
      header: "Urgency",
      render: (j) => <StatusBadge status={j.urgency || "standard"} />,
    },
    {
      key: "status",
      header: "Status",
      render: (j) => <StatusBadge status={j.status} />,
    },
    {
      key: "clientOffer",
      header: "Client Budget",
      sortable: true,
      render: (j) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatPKR(j.pricing?.clientOffer || j.amount || 0)}
        </span>
      ),
    },
    {
      key: "bids",
      header: "Bids",
      sortable: true,
      render: (j) => (
        <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-xs font-mono font-bold text-foreground">
          <Users className="h-3 w-3 text-primary" />
          <span>{j.bidsCount || 0}</span>
        </span>
      ),
    },
    {
      key: "created",
      header: "Posted",
      sortable: true,
      render: (j) => (
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(j.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      render: (j) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setDeleteTarget(j)}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            title="Delete Job"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Drawer Tabs
  const drawerTabs: DrawerTab[] = selectedJob
    ? [
        {
          value: "details",
          label: "Job Details",
          content: (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-4">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">Description</span>
                <p className="mt-1 text-sm text-foreground whitespace-pre-line">
                  {enrichedJob.description || selectedJob.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">Category</span>
                  <div className="mt-1 text-sm font-semibold text-foreground">{enrichedJob.category}</div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">Urgency</span>
                  <div className="mt-1">
                    <StatusBadge status={enrichedJob.urgency || "standard"} />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">Client Offer</span>
                  <div className="mt-1 font-mono text-sm font-bold text-foreground">
                    {formatPKR(enrichedJob.pricing?.clientOffer || selectedJob.amount || 0)}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">Selected Quote</span>
                  <div className="mt-1 font-mono text-sm font-bold text-emerald-400">
                    {enrichedJob.acceptedBid
                      ? formatPKR(enrichedJob.acceptedBid.proposedPrice || 0)
                      : "Not assigned"}
                  </div>
                </div>

                <div className="col-span-2 rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">Service Address</span>
                  <div className="mt-1 text-sm text-foreground">
                    {enrichedJob.address || selectedJob.address || "Address visible on map"}
                  </div>
                </div>
              </div>
            </div>
          ),
        },
        {
          value: "bids",
          label: `Bids (${detailsLoading ? "…" : bids.length})`,
          content: (
            <div className="space-y-3">
              {detailsLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Loading submitted bids…</div>
              ) : bids.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No ustads have submitted bids for this post yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-card/60 text-[10px] font-semibold uppercase text-muted-foreground">
                        <th className="px-3.5 py-2.5 text-left">Ustad</th>
                        <th className="px-3.5 py-2.5 text-right">Offer</th>
                        <th className="px-3.5 py-2.5 text-left">Status</th>
                        <th className="px-3.5 py-2.5 text-left">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {bids.map((b: any) => (
                        <tr key={b._id} className="hover:bg-accent/40 transition">
                          <td className="px-3.5 py-2.5 font-semibold text-foreground">
                            {b.worker?.fullName || "Ustad"}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-400">
                            {formatPKR(b.proposedPrice || 0)}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground font-mono">
                            {formatDate(b.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ),
        },
        {
          value: "moderation",
          label: "Moderation",
          content: (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-4">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Moderation Actions</span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cancel or soft-delete this job post. Actions are recorded in the compliance audit log.
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  {enrichedJob.status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(enrichedJob)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/10 text-xs font-semibold text-warning hover:bg-warning/20 transition"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Cancel Job Post</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(enrichedJob)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Soft-Delete Job Post</span>
                  </button>
                </div>
              </div>
            </div>
          ),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Customer Job Posts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, manage, and moderate open client requests and worker quotes
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
            placeholder="Search job description or category..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="reviewing">Reviewing</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Urgency Select */}
          <select
            value={urg}
            onChange={(e) => setUrg(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Urgency</option>
            <option value="instant">Instant</option>
            <option value="scheduled">Scheduled</option>
          </select>

          {/* Category Select */}
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
        onRowClick={(j) => setSelectedJob(j)}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Slide-over Detail Drawer */}
      {selectedJob && (
        <DetailDrawer
          open={!!selectedJob}
          onOpenChange={(open) => !open && setSelectedJob(null)}
          title={`Job #${shortId(selectedJob._id)}`}
          subtitle={
            <div className="flex items-center gap-2">
              <CopyableId id={selectedJob._id} label="ID" />
              <span>·</span>
              <StatusBadge status={enrichedJob.status || selectedJob.status} />
              <span>·</span>
              <span className="text-xs text-muted-foreground">{enrichedJob.category}</span>
            </div>
          }
          tabs={drawerTabs}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Posted {formatDate(selectedJob.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedJob)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-destructive/10 px-3.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
              >
                <Trash2 className="h-4 w-4" />
                <span>Soft-Delete Post</span>
              </button>
            </div>
          }
        />
      )}

      {/* Soft-Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Soft-Delete Job Post"
        description={
          <div>
            <p>
              Are you sure you want to delete job post{" "}
              <strong className="text-foreground">{shortId(deleteTarget?._id)}</strong>?
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              This will hide the post from the marketplace and reject all pending worker bids. A
              formal compliance reason must be logged.
            </p>
          </div>
        }
        confirmLabel="Delete Job Post"
        tone="danger"
        requireReason={true}
        reasons={DELETE_REASONS}
        notePlaceholder="Explain why this job post is being deleted..."
        onConfirm={handleDeleteConfirm}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel Job Post"
        description="Cancel this active job post and notify involved customers and workers."
        confirmLabel="Cancel Post"
        tone="warning"
        requireReason={true}
        reasons={[
          "Customer request",
          "Service no longer needed",
          "Duplicate posting",
          "Other",
        ]}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}
