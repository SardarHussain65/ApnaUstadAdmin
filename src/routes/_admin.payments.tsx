import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Download,
  ReceiptText,
  Wallet,
  Search,
  ExternalLink,
  DollarSign,
  TrendingUp,
  CreditCard,
  User,
  Briefcase,
  Calendar,
} from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailDrawer, type DrawerTab } from "@/components/ui/detail-drawer";
import { CopyableId } from "@/components/ui/copyable-id";
import {
  formatDate,
  formatPKR,
  shortId,
} from "@/lib/format";
import { toast } from "sonner";
import { usePaymentSummary, usePaymentsPage } from "@/lib/api-hooks";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const deferredQ = useDeferredValue(q);

  useEffect(() => {
    setPage(1);
  }, [status, deferredQ]);

  const { data, isLoading } = usePaymentsPage({
    page,
    limit: 15,
    status: status || undefined,
  });

  const { data: paymentSummary = {} } = usePaymentSummary();
  const summary = paymentSummary as Record<string, { count: number; totalAmount: number; platformFees: number }>;

  const rawRows = data?.items || [];
  const rows = useMemo(() => {
    if (!deferredQ) return rawRows;
    const term = deferredQ.toLowerCase();
    return rawRows.filter((payment: any) =>
      [
        payment._id,
        payment.receiptNumber,
        payment.booking?._id,
        payment.customer?.fullName,
        payment.worker?.fullName,
      ].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [rawRows, deferredQ]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      toast.loading("Exporting payments CSV...", { id: "payments-export" });
      await api.downloadExport("payments");
      toast.success("Payments CSV export downloaded", { id: "payments-export" });
    } catch (err: any) {
      toast.error(err.message || "Export failed", { id: "payments-export" });
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "id",
      header: "Payment ID",
      sortable: true,
      render: (p: any) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {shortId(p._id)}
        </span>
      ),
    },
    {
      key: "booking",
      header: "Booking",
      render: (p: any) => {
        const bookingId = p.booking?._id || p.booking;
        return bookingId ? (
          <Link
            to="/bookings/$id"
            params={{ id: String(bookingId) }}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-xs font-semibold text-primary hover:underline"
          >
            #{shortId(String(bookingId))}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "customer",
      header: "Customer",
      render: (p: any) =>
        p.customer?._id ? (
          <Link
            to="/users/$id"
            params={{ id: String(p.customer._id) }}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-foreground hover:text-primary hover:underline"
          >
            {p.customer.fullName || "Customer"}
          </Link>
        ) : (
          <span className="font-semibold text-foreground">
            {p.customer?.fullName || "—"}
          </span>
        ),
    },
    {
      key: "worker",
      header: "Ustad",
      render: (p: any) =>
        p.worker?._id ? (
          <Link
            to="/workers/$id"
            params={{ id: String(p.worker._id) }}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-foreground/90 hover:text-primary hover:underline"
          >
            {p.worker.fullName || "Ustad"}
          </Link>
        ) : (
          <span className="font-medium text-foreground/90">
            {p.worker?.fullName || "—"}
          </span>
        ),
    },
    {
      key: "amount",
      header: "Total Amount",
      sortable: true,
      render: (p: any) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {formatPKR(p.amount || 0)}
        </span>
      ),
    },
    {
      key: "commission",
      header: "App Fee",
      sortable: true,
      render: (p: any) => (
        <span className="font-mono text-xs font-semibold text-emerald-400">
          {formatPKR(p.platformFee || 0)}
        </span>
      ),
    },
    {
      key: "workerEarning",
      header: "Ustad Net",
      render: (p: any) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatPKR(p.workerEarning || 0)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p: any) => <StatusBadge status={p.status} />,
    },
    {
      key: "updated",
      header: "Updated",
      sortable: true,
      render: (p: any) => (
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(p.updatedAt || p.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (p: any) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setSelectedPayment(p)}
            className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary"
          >
            <ReceiptText className="h-3.5 w-3.5" /> Receipt
          </button>
          {(p.booking?._id || p.booking) && (
            <Link
              to="/bookings/$id"
              params={{ id: String(p.booking?._id || p.booking) }}
              className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary"
            >
              Booking <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      ),
    },
  ];

  // Drawer Tabs
  const drawerTabs: DrawerTab[] = selectedPayment
    ? [
        {
          value: "overview",
          label: "Transaction Details",
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5 text-primary" />
                    <span>Total Cash Amount</span>
                  </div>
                  <div className="mt-1 font-mono text-base font-bold text-foreground">
                    {formatPKR(selectedPayment.amount || 0)}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span>App Fee (Commission)</span>
                  </div>
                  <div className="mt-1 font-mono text-base font-bold text-emerald-400">
                    {formatPKR(selectedPayment.platformFee || 0)}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>Customer</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {selectedPayment.customer?.fullName || "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    <span>Assigned Ustad</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {selectedPayment.worker?.fullName || "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                    <span>Payment Method</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground capitalize">
                    {selectedPayment.method || "Cash Payment"}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Payment Date & Time</span>
                  </div>
                  <div className="mt-1 font-mono text-sm text-foreground">
                    {selectedPayment.paidAt ? formatDate(selectedPayment.paidAt, "dd MMM yyyy, h:mm a") : "Pending"}
                  </div>
                </div>
              </div>

              {selectedPayment.receiptNumber && (
                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">Receipt Number</span>
                  <div className="mt-1 font-mono text-sm text-foreground">{selectedPayment.receiptNumber}</div>
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
            Payments & Cash Records
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Check cash payments, app fees, and ustad earnings in real time
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/wallets"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-accent"
          >
            <Wallet className="h-4 w-4 text-primary" />
            <span>Wallet Operations</span>
          </Link>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="app-glass rounded-2xl border border-border bg-card p-5 shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Cash Paid</span>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums font-mono">
            {formatPKR(summary.paid?.totalAmount || 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.paid?.count || 0} completed bookings
          </p>
        </div>

        <div className="app-glass rounded-2xl border border-border bg-card p-5 shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Awaiting Payment</span>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-400 tabular-nums font-mono">
            {formatPKR(summary.payable?.totalAmount || 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.payable?.count || 0} bookings in progress
          </p>
        </div>

        <div className="app-glass rounded-2xl border border-border bg-card p-5 shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">App Fees Earned</span>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-400 tabular-nums font-mono">
            {formatPKR(summary.paid?.platformFees || 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            App commission on bookings
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="app-glass rounded-2xl border border-border bg-card p-4 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search payment ID, receipt, customer or ustad..."
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
            <option value="paid">Paid</option>
            <option value="payable">Payable</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        rows={rows}
        columns={columns}
        isLoading={isLoading}
        pageSize={15}
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          totalItems: data?.pagination.totalItems ?? 0,
          onPageChange: setPage,
        }}
        onRowClick={(p) => setSelectedPayment(p)}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Detail Drawer */}
      {selectedPayment && (
        <DetailDrawer
          open={!!selectedPayment}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
          title={`Payment #${shortId(selectedPayment._id)}`}
          subtitle={
            <div className="flex items-center gap-2">
              <CopyableId id={selectedPayment._id} label="ID" />
              <span>·</span>
              <StatusBadge status={selectedPayment.status} />
            </div>
          }
          tabs={drawerTabs}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                {formatDate(selectedPayment.createdAt)}
              </span>
              <span className="text-xs text-muted-foreground">
                Recorded automatically
              </span>
            </div>
          }
        />
      )}
    </div>
  );
}
