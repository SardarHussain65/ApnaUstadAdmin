import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useState } from "react";
import {
  Download,
  Eye,
  Trash2,
  Users,
  Search,
  XCircle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { formatDate, formatPKR, shortId } from "@/lib/format";
import { useCategoryFilterOptions } from "@/lib/filter-options";
import { toast } from "sonner";
import {
  useDeleteJob,
  useCancelJob,
  useJobsPage,
} from "@/lib/api-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/jobs/")({
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
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [urg, setUrg] = useState("");
  const [cat, setCat] = useState("");
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

  const deleteJobMutation = useDeleteJob();
  const cancelJobMutation = useCancelJob();
  const { options: categoryOptions } = useCategoryFilterOptions();
  const rows = data?.items || [];

  const openJob = (j: any) => navigate({ to: "/jobs/$id", params: { id: j._id } });

  const handleDeleteConfirm = async (payload: ConfirmPayload) => {
    if (!deleteTarget) return;
    try {
      await deleteJobMutation.mutateAsync({
        id: deleteTarget._id,
        reason: payload.reason,
      });
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
      header: "Job Post",
      sortable: true,
      render: (j) => (
        <div className="max-w-xs">
          <div className="truncate font-semibold text-foreground">
            {j.description || j.category || "Job Post"}
          </div>
          <span className="font-mono text-[11px] font-semibold text-primary">
            {shortId(j._id)}
          </span>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (j) =>
        j.customer?._id ? (
          <Link
            to="/users/$id"
            params={{ id: j.customer._id }}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-foreground hover:text-primary transition"
          >
            {j.customer.fullName || "Customer"}
          </Link>
        ) : (
          <span className="font-semibold text-foreground">
            {j.customer?.fullName || "Anonymous"}
          </span>
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
      render: (j) => <StatusBadge status={j.urgency || "scheduled"} />,
    },
    {
      key: "status",
      header: "Status",
      render: (j) => <StatusBadge status={j.status} />,
    },
    {
      key: "clientOffer",
      header: "Customer Budget",
      sortable: true,
      render: (j) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
          {formatPKR(j.pricing?.clientOffer || j.amount || 0)}
        </span>
      ),
    },
    {
      key: "acceptedBid",
      header: "Agreed Rate",
      render: (j) =>
        j.acceptedBid ? (
          <span className="font-mono text-xs font-bold tabular-nums text-success">
            {formatPKR(j.acceptedBid.proposedPrice || 0)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
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
      className: "w-48 text-right",
      render: (j) => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            to="/jobs/$id"
            params={{ id: j._id }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline-strong px-2.5 text-xs font-semibold text-foreground transition hover:bg-surface"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Link>
          {j.status !== "cancelled" && j.status !== "closed" && (
            <button
              type="button"
              onClick={() => setCancelTarget(j)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-warning transition hover:bg-warning/10"
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteTarget(j)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
            title="Soft-Delete Job Post"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Customer Job Posts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, inspect, and manage open customer job posts and ustad quotes
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

          <select
            value={urg}
            onChange={(e) => setUrg(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Urgency</option>
            <option value="instant">Instant</option>
            <option value="scheduled">Scheduled</option>
          </select>

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
        onRowClick={openJob}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

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

