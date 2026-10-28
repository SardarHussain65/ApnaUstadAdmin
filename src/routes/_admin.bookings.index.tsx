import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useState } from "react";
import {
  Banknote,
  Download,
  Eye,
  XCircle,
  Search,
  MapPin,
  Navigation,
  X,
  ArrowUpRight,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import {
  BookingTrackingMap,
  haversineDistanceKm,
  resolveLocationFromRecord,
} from "@/components/admin/BookingTrackingMap";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import {
  formatDate,
  formatPKR,
  shortId,
} from "@/lib/format";
import { toast } from "sonner";
import {
  useBookingsPage,
  useCancelBooking,
} from "@/lib/api-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/bookings/")({
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
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pay, setPay] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [trackedBooking, setTrackedBooking] = useState<any | null>(null);
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

  const cancelMutation = useCancelBooking();
  const rows = data?.items || [];

  const openBooking = (b: any) => navigate({ to: "/bookings/$id", params: { id: b._id } });

  const handleCancelConfirm = async (payload: ConfirmPayload) => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync({
        id: cancelTarget._id,
        reason: payload.reason,
      });
      setCancelTarget(null);
      toast.success("Booking cancelled and reason logged to audit trail");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel booking");
      throw err;
    }
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
        <div>
          <span className="font-mono text-xs font-semibold text-primary">
            {shortId(b._id)}
          </span>
          <div className="text-[11px] capitalize text-muted-foreground">
            {b.bookingType || "scheduled"}
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (b) =>
        b.customer?._id ? (
          <Link
            to="/users/$id"
            params={{ id: b.customer._id }}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-foreground hover:text-primary transition"
          >
            {b.customer.fullName || "Customer"}
          </Link>
        ) : (
          <span className="font-semibold text-foreground">
            {b.customer?.fullName || "Anonymous"}
          </span>
        ),
    },
    {
      key: "worker",
      header: "Ustad",
      render: (b) =>
        b.worker?._id ? (
          <Link
            to="/workers/$id"
            params={{ id: b.worker._id }}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-foreground hover:text-primary transition"
          >
            {b.worker.fullName || "Ustad"}
          </Link>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "location",
      header: "Location & Distance",
      render: (b) => {
        const jobPt = resolveLocationFromRecord({
          id: String(b._id),
          primaryLocation: b.location,
          secondaryLocation: b.customer?.location,
          address: b.address || b.customer?.address,
          city: b.customer?.city || b.worker?.city,
        });
        const workerPt = b.worker
          ? resolveLocationFromRecord({
              id: String(b.worker._id || "w"),
              primaryLocation: b.worker.location,
              address: b.worker.address,
              city: b.worker.city,
              fallbackNear: jobPt,
            })
          : null;
        const distKm = workerPt ? haversineDistanceKm(jobPt, workerPt) : null;

        return (
          <div className="max-w-[210px]">
            <div className="flex items-center gap-1 text-xs font-medium text-foreground truncate">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">
                {b.address || b.customer?.address || b.customer?.city || "Lahore"}
              </span>
            </div>
            {distKm !== null && (
              <div className="mt-0.5 text-[11px] font-mono text-muted-foreground">
                Ustad {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)} km`} away
              </div>
            )}
          </div>
        );
      },
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
        <span className="font-mono text-xs font-bold tabular-nums text-foreground">
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
    {
      key: "actions",
      header: "",
      className: "w-56 text-right",
      render: (b) => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() =>
              setTrackedBooking((curr: any) => (curr?._id === b._id ? null : b))
            }
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
              trackedBooking?._id === b._id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-primary/30 bg-primary/8 text-primary hover:bg-primary/15"
            }`}
            title="Track Customer & Ustad on Live Map"
          >
            <Navigation className="h-3.5 w-3.5" /> Map
          </button>
          <Link
            to="/bookings/$id"
            params={{ id: b._id }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline-strong px-2.5 text-xs font-semibold text-foreground transition hover:bg-surface"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Link>
          {b.status !== "cancelled" && b.status !== "completed" && (
            <button
              type="button"
              onClick={() => setCancelTarget(b)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
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
            Customer Bookings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, inspect, and track live Ustad & customer locations across all service bookings
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

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            <option value="">All Types</option>
            <option value="instant">Instant</option>
            <option value="scheduled">Scheduled</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
            className="h-9 rounded-xl border border-border bg-surface px-2.5 text-xs font-mono text-foreground outline-none focus:border-primary/60"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="To date"
            className="h-9 rounded-xl border border-border bg-surface px-2.5 text-xs font-mono text-foreground outline-none focus:border-primary/60"
          />
        </div>
      </div>

      {/* Expandable Live Booking Map Panel when a booking's "Map" button is clicked */}
      {trackedBooking && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between rounded-t-2xl border border-b-0 border-primary/30 bg-primary/8 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Navigation className="h-4 w-4 text-primary" />
              <span>
                Tracking Booking {shortId(trackedBooking._id)} ({trackedBooking.category})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/bookings/$id"
                params={{ id: trackedBooking._id }}
                className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-[11px] font-bold text-primary-foreground"
              >
                <span>Open Full Booking Page</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <button
                type="button"
                onClick={() => setTrackedBooking(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                title="Close map preview"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <BookingTrackingMap booking={trackedBooking} compact />
        </div>
      )}

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
        onRowClick={openBooking}
      />

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
