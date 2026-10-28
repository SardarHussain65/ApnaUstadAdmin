import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Download,
  ReceiptText,
  XCircle,
  ExternalLink,
  Calendar,
  Search,
  User,
  Briefcase,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailDrawer, type DrawerTab } from "@/components/ui/detail-drawer";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { CopyableId } from "@/components/ui/copyable-id";
import {
  formatDate,
  formatPKR,
  shortId,
} from "@/lib/format";
import { toast } from "sonner";
import {
  AdminPayment,
  useBookingsPage,
  useCancelBooking,
  useUpdateBookingStatus,
  usePaymentSummary,
} from "@/lib/api-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/bookings")({
  component: BookingsPage,
});

const CANCEL_REASONS = [
  "Client requested cancellation before work began",
  "Ustad failed to arrive (no-show violation)",
  "Scope of work cannot be safely completed",
  "Severe pricing disagreement between parties",
  "Administrative override due to fraud check",
];

function BookingsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pay, setPay] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [statusOverride, setStatusOverride] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const deferredQ = useDeferredValue(q);

  useEffect(() => {
    setPage(1);
  }, [deferredQ, status, pay, type, dateFrom, dateTo]);

  const { data, isLoading } = useBookingsPage({
    page,
    limit: 10,
    search: deferredQ,
    status: status || undefined,
    paymentStatus: pay || undefined,
    bookingType: type || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: paymentSummary = {} } = usePaymentSummary();
  const cancelMutation = useCancelBooking();
  const updateStatusMutation = useUpdateBookingStatus();

  const rows = data?.items || [];

  const handleCancelConfirm = async (payload: ConfirmPayload) => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync({
        id: cancelTarget._id,
        reason: payload.reason,
      });
      if (selected?._id === cancelTarget._id) {
        setSelected((curr: any) => curr ? { ...curr, status: "cancelled" } : curr);
      }
      setCancelTarget(null);
      toast.success("Booking cancelled and reason logged to audit trail");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel booking");
      throw err;
    }
  };

  const handleStatusOverride = () => {
    if (!selected || !statusOverride) return;
    updateStatusMutation.mutate(
      { id: selected._id, status: statusOverride },
      {
        onSuccess: () => {
          setSelected((curr: any) => curr ? { ...curr, status: statusOverride } : curr);
          toast.success(`Booking status changed to ${statusOverride}`);
          setStatusOverride("");
        },
      }
    );
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      toast.loading("Exporting bookings CSV...", { id: "bookings-export" });
      await api.downloadExport("bookings", {
        from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        to: dateTo ? new Date(dateTo).toISOString() : undefined,
      });
      toast.success("Bookings CSV export downloaded", { id: "bookings-export" });
    } catch (err: any) {
      toast.error(err.message || "Export failed", { id: "bookings-export" });
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "id",
      header: "Booking",
      sortable: true,
      render: (b) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {shortId(b._id)}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (b) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">
            {b.customer?.fullName || "Anonymous"}
          </span>
          {b.customer?._id && (
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
      key: "worker",
      header: "Ustad",
      render: (b) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">
            {b.worker?.fullName || "Unassigned"}
          </span>
          {b.worker?._id && (
            <Link
              to="/workers/$id"
              params={{ id: b.worker._id }}
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary transition"
              title="View Ustad"
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
      render: (b) => (
        <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {b.category || "General"}
        </span>
      ),
    },
    {
      key: "scheduled",
      header: "Scheduled",
      sortable: true,
      render: (b) => (
        <span className="text-xs text-muted-foreground font-mono">
          {b.scheduledDate ? formatDate(b.scheduledDate) : "—"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Cash Due",
      sortable: true,
      render: (b) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {formatPKR(b.agreement?.cashDue ?? b.totalAmount ?? 0)}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (b) => {
        const paymentState = b.payment?.status || b.paymentStatus || "pending";
        return (
          <div className="inline-flex items-center gap-1.5 text-xs">
            <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
            <StatusBadge status={paymentState} />
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (b) => <StatusBadge status={b.status} />,
    },
  ];

  // Drawer Tabs
  const drawerTabs: DrawerTab[] = selected
    ? [
        {
          value: "details",
          label: "Overview",
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>Customer</span>
                  </div>
                  <div className="mt-1 font-semibold text-foreground text-sm">
                    {selected.customer?.fullName || "Unknown"}
                  </div>
                  {selected.customer?._id && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                      {shortId(selected.customer._id)}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    <span>Ustad</span>
                  </div>
                  <div className="mt-1 font-semibold text-foreground text-sm">
                    {selected.worker?.fullName || "Unassigned"}
                  </div>
                  {selected.worker?._id && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                      {shortId(selected.worker._id)}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">Category</span>
                  <div className="mt-1 font-semibold text-foreground text-sm">{selected.category || "General"}</div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">Booking Type</span>
                  <div className="mt-1 font-semibold text-foreground text-sm capitalize">{selected.bookingType || "Standard"}</div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">Scheduled Date</span>
                  <div className="mt-1 font-mono text-sm text-foreground">
                    {selected.scheduledDate ? formatDate(selected.scheduledDate) : "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">Estimated Duration</span>
                  <div className="mt-1 text-sm text-foreground">{selected.estimatedHours || 1} hours</div>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-2.5">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Financial Agreement</span>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Gross Booking Value</span>
                  <span className="font-mono font-semibold text-foreground">{formatPKR(selected.totalAmount || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Platform Commission</span>
                  <span className="font-mono font-semibold text-emerald-400">{formatPKR(selected.platformFee || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ustad Net Income</span>
                  <span className="font-mono font-semibold text-foreground">{formatPKR(selected.workerEarning || 0)}</span>
                </div>
                <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-bold">
                  <span>Cash Due from Customer</span>
                  <span className="font-mono text-primary">{formatPKR(selected.agreement?.cashDue ?? selected.totalAmount ?? 0)}</span>
                </div>
              </div>
            </div>
          ),
        },
        {
          value: "moderation",
          label: "Admin Controls",
          content: (
            <div className="space-y-4">
              {/* Status Override */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Manual Status Override</span>
                <div className="flex items-center gap-2">
                  <select
                    value={statusOverride}
                    onChange={(e) => setStatusOverride(e.target.value)}
                    className="flex-1 h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none"
                  >
                    <option value="">Select New Status</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    type="button"
                    disabled={!statusOverride}
                    onClick={handleStatusOverride}
                    className="h-9 px-4 rounded-xl bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-50 transition"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Force Cancel */}
              {selected.status !== "cancelled" && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Force Cancel Booking</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cancels this booking, frees the assigned ustad, and logs the reason in the compliance audit.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCancelTarget(selected)}
                    className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl bg-destructive px-4 text-xs font-bold text-white transition hover:bg-destructive/90"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Cancel Booking</span>
                  </button>
                </div>
              )}
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
            Customer Bookings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, manage, and moderate scheduled and completed home service bookings
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
            placeholder="Search booking ID, customer or ustad..."
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
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment Status Select */}
          <select
            value={pay}
            onChange={(e) => setPay(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Payments</option>
            <option value="pending">Pending</option>
            <option value="paid">Cash Paid</option>
            <option value="payable">Awaiting Cash</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Booking Type Select */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Types</option>
            <option value="instant">Instant</option>
            <option value="scheduled">Scheduled</option>
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
        onRowClick={(b) => setSelected(b)}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Slide-over Detail Drawer */}
      {selected && (
        <DetailDrawer
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          title={`Booking #${shortId(selected._id)}`}
          subtitle={
            <div className="flex items-center gap-2">
              <CopyableId id={selected._id} label="ID" />
              <span>·</span>
              <StatusBadge status={selected.status} />
              <span>·</span>
              <span className="text-xs text-muted-foreground">{selected.category}</span>
            </div>
          }
          tabs={drawerTabs}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                {formatDate(selected.createdAt)}
              </span>
              {selected.status !== "cancelled" && (
                <button
                  type="button"
                  onClick={() => setCancelTarget(selected)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-destructive/10 px-3.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Cancel Booking</span>
                </button>
              )}
            </div>
          }
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel Service Booking"
        description={
          <div>
            <p>
              Are you sure you want to cancel booking{" "}
              <strong className="text-foreground">{shortId(cancelTarget?._id)}</strong>?
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              This will update the job state, alert the customer and ustad, and write a compliance record.
            </p>
          </div>
        }
        confirmLabel="Cancel Booking"
        tone="danger"
        requireReason={true}
        reasons={CANCEL_REASONS}
        notePlaceholder="Explain why this booking is being cancelled..."
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}
