import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useState } from "react";
import { Download, ReceiptText, Wallet } from "lucide-react";
import { DataTable, FilterToolbar, SearchInput, Select } from "@/components/admin/DataTable";
import { Button, StatusBadge } from "@/components/admin/ui";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { fmtPKR } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { format } from "date-fns";
import { usePaymentSummary, usePaymentsPage } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);

  useEffect(() => { setPage(1); }, [status, deferredQ]);

  const { data, isLoading } = usePaymentsPage({
    page,
    limit: 15,
    status: status || undefined,
  });
  const { data: paymentSummary = {} } = usePaymentSummary();

  const rows = (data?.items || []).filter((payment: any) => {
    if (!deferredQ) return true;
    const term = deferredQ.toLowerCase();
    return [
      payment._id,
      payment.booking?._id,
      payment.customer?.fullName,
      payment.worker?.fullName,
    ].some((value) => String(value || "").toLowerCase().includes(term));
  });

  const summary = paymentSummary as Record<string, { count: number; totalAmount: number; platformFees: number }>;

  const exportRows = rows.map((payment: any) => ({
    id: payment._id,
    status: payment.status,
    amount: payment.amount,
    platformFee: payment.platformFee,
    workerEarning: payment.workerEarning,
    customer: payment.customer?.fullName,
    worker: payment.worker?.fullName,
    updatedAt: payment.updatedAt,
  }));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Payments Ledger"
        description="Reconcile cash payments, platform commission, and worker earnings in one finance view."
        icon={<ReceiptText className="h-3.5 w-3.5" />}
        actions={
          <>
            <Link to="/wallets" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-foreground hover:border-primary/35 hover:bg-primary/8">
              <Wallet className="h-4 w-4 text-primary" />
              Wallet ops
            </Link>
            <Button
              variant="primary"
              onClick={() => downloadCsv("payments", exportRows, [
                { key: "id", header: "Payment ID" },
                { key: "status", header: "Status" },
                { key: "amount", header: "Amount" },
                { key: "platformFee", header: "Commission" },
                { key: "workerEarning", header: "Worker Earning" },
                { key: "customer", header: "Customer" },
                { key: "worker", header: "Worker" },
                { key: "updatedAt", header: "Updated" },
              ])}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </>
        }
        stats={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard label="Cash paid" value={fmtPKR(summary.paid?.totalAmount || 0)} hint={`${summary.paid?.count || 0} payments`} />
            <SummaryCard label="Awaiting cash" value={fmtPKR(summary.payable?.totalAmount || 0)} hint={`${summary.payable?.count || 0} bookings`} />
            <SummaryCard label="Commission earned" value={fmtPKR(summary.paid?.platformFees || 0)} hint="Platform fees collected" />
          </div>
        }
      />

      <FilterToolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search payment, customer, worker..." />
        <Select
          value={status}
          onChange={setStatus}
          label="Status"
          options={[
            { value: "", label: "All statuses" },
            { value: "paid", label: "Paid" },
            { value: "payable", label: "Payable" },
            { value: "pending", label: "Pending" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </FilterToolbar>

      <DataTable
        isLoading={isLoading}
        rows={rows}
        pageSize={15}
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          totalItems: data?.pagination.totalItems ?? 0,
          onPageChange: setPage,
        }}
        columns={[
          {
            key: "id",
            header: "Payment",
            render: (payment: any) => <span className="font-mono text-xs text-primary">#{String(payment._id).slice(-8)}</span>,
          },
          {
            key: "booking",
            header: "Booking",
            render: (payment: any) => (
              <Link to="/bookings" className="font-mono text-xs text-primary hover:underline">
                #{String(payment.booking?._id || payment.booking || "").slice(-8)}
              </Link>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            render: (payment: any) => <span className="font-medium">{payment.customer?.fullName || "N/A"}</span>,
          },
          {
            key: "worker",
            header: "Worker",
            render: (payment: any) => payment.worker?.fullName || "N/A",
          },
          {
            key: "amount",
            header: "Amount",
            render: (payment: any) => <span className="font-bold text-white">{fmtPKR(payment.amount || 0)}</span>,
          },
          {
            key: "commission",
            header: "Commission",
            render: (payment: any) => fmtPKR(payment.platformFee || 0),
          },
          {
            key: "status",
            header: "Status",
            render: (payment: any) => <StatusBadge status={payment.status} />,
          },
          {
            key: "updated",
            header: "Updated",
            render: (payment: any) => (
              <span className="text-xs text-dim">
                {payment.updatedAt ? format(new Date(payment.updatedAt), "dd MMM yyyy") : "—"}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-light/20 p-4 backdrop-blur-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-dim">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-white">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
