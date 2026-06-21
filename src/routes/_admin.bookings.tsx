import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useState } from "react";
import { Banknote, Download, ReceiptText, XCircle, ExternalLink, CalendarIcon } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Badge, StatusBadge } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Drawer";
import { BookingContextPanel } from "@/components/admin/BookingContextPanel";
import { fmtPKR } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { format } from "date-fns";
import { toast } from "sonner";
import { AdminPayment, useBookingsPage, useCancelBooking, useUpdateBookingStatus, usePayments, usePaymentSummary } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/bookings")({ component: BookingsPage });

function BookingsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pay, setPay] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [statusOverride, setStatusOverride] = useState("");
  const [page, setPage] = useState(1);
  const deferredQ = useDeferredValue(q);

  useEffect(() => { setPage(1); }, [deferredQ, status, pay, type, dateFrom, dateTo]);

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
  const { data: paymentsData = [] } = usePayments({ limit: 10 });
  const { data: paymentSummary = {} } = usePaymentSummary();
  const cancelMutation = useCancelBooking();
  const updateStatusMutation = useUpdateBookingStatus();

  const rows = data?.items || [];
  const latestPayments = (paymentsData as AdminPayment[]) || [];

  const stats = {
    total: data?.pagination.totalItems ?? 0,
    pending: rows.filter((b: any) => b.status === "pending").length,
    ongoing: rows.filter((b: any) => b.status === "ongoing").length,
    completed: rows.filter((b: any) => b.status === "completed").length,
    cancelled: rows.filter((b: any) => b.status === "cancelled").length,
    revenue: (paymentSummary as any)?.paid?.totalAmount || 0,
    payable: (paymentSummary as any)?.payable?.totalAmount || 0,
  };

  const handleCancel = () => {
    if (!selected) return;
    cancelMutation.mutate(
      { id: selected._id, reason: "Cancelled by admin" },
      {
        onSuccess: () => {
          setCancelConfirm(false);
          setSelected(null);
          toast.success("Booking cancelled successfully");
        },
      }
    );
  };

  const handleStatusOverride = () => {
    if (!selected || !statusOverride) return;
    updateStatusMutation.mutate(
      { id: selected._id, status: statusOverride },
      {
        onSuccess: () => {
          toast.success(`Status updated to ${statusOverride}`);
          setStatusOverride("");
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <MiniStat label="Matching" value={stats.total.toString()} />
        <MiniStat label="Visible Pending" value={stats.pending.toString()} color="text-gold" />
        <MiniStat label="Visible Ongoing" value={stats.ongoing.toString()} color="text-accent" />
        <MiniStat label="Visible Completed" value={stats.completed.toString()} color="text-success" />
        <MiniStat label="Visible Cancelled" value={stats.cancelled.toString()} color="text-destructive" />
        <MiniStat label="Cash Paid" value={fmtPKR(stats.revenue)} color="text-primary" />
        <MiniStat label="Awaiting Cash" value={fmtPKR(stats.payable)} color="text-accent" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by ID, customer or worker..." />
        <Select value={status} onChange={setStatus} label="All Status" options={["pending","accepted","ongoing","completed","cancelled"].map(s=>({value:s,label:s}))} />
        <Select value={pay} onChange={setPay} label="Payment" options={[{value:"pending",label:"Pending"},{value:"payable",label:"Awaiting Cash"},{value:"paid",label:"Cash Paid"},{value:"cancelled",label:"Cancelled"}]} />
        <Select value={type} onChange={setType} label="Type" options={[{value:"instant",label:"Instant"},{value:"scheduled",label:"Scheduled"}]} />
        {/* Date range */}
        <div className="flex items-center gap-1 bg-surface-light border border-border rounded-xl h-10 px-3 text-sm">
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent outline-none text-xs cursor-pointer"
            placeholder="From"
          />
          <span className="text-muted-foreground text-xs">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-transparent outline-none text-xs cursor-pointer"
            placeholder="To"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="ml-1 text-muted-foreground hover:text-foreground">×</button>
          )}
        </div>
        <button
          onClick={() => {
            const exportRows = rows.map(booking => ({
              ...booking,
              customerName: booking.customer?.fullName || "Unknown",
              workerName: booking.worker?.fullName || "Unknown",
              scheduledAt: booking.scheduledDate,
              cashDue: booking.agreement?.cashDue ?? booking.totalAmount ?? 0,
              paymentState: booking.payment?.status || booking.paymentStatus || "pending",
            }));
            downloadCsv("bookings", exportRows, [
              { key: "_id", header: "ID" }, { key: "customerName", header: "Customer" }, { key: "workerName", header: "Worker" },
              { key: "category", header: "Category" }, { key: "scheduledAt", header: "Scheduled" }, { key: "cashDue", header: "Cash Due" },
              { key: "paymentMethod", header: "Payment Method" }, { key: "paymentState", header: "Payment Status" }, { key: "status", header: "Booking Status" },
            ]);
            toast.success(`Exported ${rows.length} bookings`);
          }}
          className="btn-press inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-surface-light hover:bg-primary/15 hover:text-primary border border-border text-sm font-semibold transition"
        ><Download className="w-4 h-4" /> Export Page CSV</button>
      </div>

      <DataTable isLoading={isLoading} rows={rows} pagination={{
        page,
        totalPages: data?.pagination.totalPages ?? 1,
        totalItems: data?.pagination.totalItems ?? 0,
        onPageChange: setPage,
      }} onRowClick={b => setSelected(b)} columns={[
        { key: "id", header: "Booking", render: b => <span className="font-mono text-xs text-primary">#{b._id.slice(-6)}</span> },
        {
          key: "c", header: "Customer", render: b => (
            <div className="flex items-center gap-1">
              <span>{b.customer?.fullName || 'Unknown'}</span>
              {b.customer?._id && (
                <Link to="/users" onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary transition" title={`User: ${b.customer._id}`}>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          )
        },
        {
          key: "w", header: "Worker", render: b => (
            <div className="flex items-center gap-1">
              <span className="text-accent">{b.worker?.fullName || 'Unknown'}</span>
              {b.worker?._id && (
                <Link to="/workers/$id" params={{ id: b.worker._id }} onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary transition">
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          )
        },
        { key: "cat", header: "Category", render: b => <Badge variant="orange">{b.category || 'N/A'}</Badge> },
        { key: "d", header: "Scheduled", render: b => <span className="text-xs text-muted-foreground">{b.scheduledDate ? format(new Date(b.scheduledDate), "dd MMM, HH:mm") : 'N/A'}</span> },
        { key: "tot", header: "Cash Due", render: b => <span className="font-semibold">{fmtPKR(b.agreement?.cashDue ?? b.totalAmount ?? 0)}</span> },
        { key: "p", header: "Payment", render: b => {
          const paymentState = b.payment?.status || b.paymentStatus || 'pending';
          return <span className="inline-flex items-center gap-1.5 text-xs"><Banknote className="w-3.5 h-3.5" /> <StatusBadge status={paymentState} /></span>;
        }},
        { key: "s", header: "Status", render: b => <StatusBadge status={b.status} /> },
      ]} />

      {/* Booking Detail Drawer */}
      <Drawer open={!!selected} onClose={() => { setSelected(null); setCancelConfirm(false); setStatusOverride(""); }} title={`Booking #${selected?._id?.slice(-6) ?? ""}`} width="max-w-2xl">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Card label="Customer" value={selected.customer?.fullName || 'Unknown'} sub={selected.customer?._id} />
              <Card label="Worker" value={selected.worker?.fullName || 'Unknown'} sub={selected.worker?._id} accent />
              <Card label="Category" value={selected.category || 'N/A'} />
              <Card label="Type" value={selected.bookingType || 'N/A'} />
              <Card label="Scheduled" value={selected.scheduledDate ? format(new Date(selected.scheduledDate), "dd MMM yyyy, HH:mm") : 'N/A'} />
              <Card label="Duration" value={`${selected.estimatedHours || 1} hours`} />
              <Card label="Address" value={selected.address || 'N/A'} className="col-span-2" />
              <Card label="Description" value={selected.description || 'N/A'} className="col-span-2" />
            </div>
            <div className="bg-surface-light rounded-2xl p-4">
              <div className="text-xs uppercase text-muted-foreground font-semibold mb-3">Financial Breakdown</div>
              <Line label="Client Offer" value={fmtPKR(selected.agreement?.clientOffer ?? selected.subtotal ?? 0)} />
              <Line label="Agreed Job Price" value={fmtPKR(selected.agreement?.agreedPrice ?? selected.subtotal ?? 0)} />
              <Line label={`Wallet Commission (${selected.agreement?.commissionRateSnapshot ?? 0}%)`} value={fmtPKR(selected.agreement?.commissionAmount ?? selected.platformFee ?? 0)} />
              <Line label="Worker Net Income" value={fmtPKR(selected.agreement?.workerNetIncome ?? selected.workerEarning ?? 0)} accent />
              <div className="border-t border-border mt-2 pt-2"><Line label="Client Cash Due" value={fmtPKR(selected.agreement?.cashDue ?? selected.totalAmount ?? 0)} bold /></div>
              <div className="mt-2 text-xs text-muted-foreground">Price source: {(selected.agreement?.priceSource || "legacy").replaceAll("_", " ")}</div>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">Payment</span><div className="flex gap-2"><Badge variant="info">cash</Badge><StatusBadge status={selected.payment?.status || selected.paymentStatus || 'pending'} /></div></div>
              {selected.payment?.receiptNumber && <Line label="Receipt" value={selected.payment.receiptNumber} />}
              {selected.payment?.paidAt && <Line label="Paid At" value={format(new Date(selected.payment.paidAt), "dd MMM yyyy, HH:mm")} />}
            </div>
            <BookingContextPanel bookingId={selected._id} />
            <div>
              <div className="text-xs uppercase text-muted-foreground font-semibold mb-2">Status Timeline</div>
              <div className="flex items-center justify-between">
                {["pending","accepted","ongoing","completed"].map((s, i, arr) => {
                  const idx = arr.indexOf(selected.status);
                  const reached = idx >= i || selected.status === "completed";
                  return (
                    <div key={s} className="flex-1 flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${reached ? "gradient-cyan text-background glow-cyan" : "bg-surface-light text-muted-foreground"}`}>{i+1}</div>
                      {i < arr.length - 1 && <div className={`flex-1 h-0.5 ${reached ? "bg-primary" : "bg-border"}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Pending</span><span>Accepted</span><span>Ongoing</span><span>Completed</span>
              </div>
            </div>

            {/* Quick nav links */}
            <div className="flex flex-wrap gap-2">
              {selected.customer?._id && (
                <Link to="/users"
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl bg-surface border border-border text-xs font-semibold hover:border-primary hover:text-primary transition">
                  <ExternalLink className="w-3 h-3" /> View Customer
                </Link>
              )}
              {selected.worker?._id && (
                <Link to="/workers/$id" params={{ id: selected.worker._id }}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl bg-surface border border-border text-xs font-semibold hover:border-accent hover:text-accent transition">
                  <ExternalLink className="w-3 h-3" /> View Worker
                </Link>
              )}
            </div>

            {/* Status Override */}
            {!["cancelled", "completed"].includes(selected.status) && (
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="text-xs uppercase text-muted-foreground font-semibold">Admin Status Override</div>
                <div className="flex gap-2">
                  <select
                    value={statusOverride}
                    onChange={e => setStatusOverride(e.target.value)}
                    className="flex-1 bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">Select new status...</option>
                    {["pending","accepted","ongoing","completed"].filter(s => s !== selected.status).map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    disabled={!statusOverride || updateStatusMutation.isPending}
                    onClick={handleStatusOverride}
                    className="px-4 h-10 rounded-xl gradient-cyan text-background font-bold disabled:opacity-50 text-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Cancel Action */}
            {selected.status !== "cancelled" && selected.status !== "completed" && (
              !cancelConfirm ? (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="btn-press w-full h-11 rounded-xl bg-destructive/15 text-destructive border border-destructive/30 font-bold flex items-center justify-center gap-2 hover:bg-destructive/25"
                >
                  <XCircle className="w-4 h-4" /> Cancel Booking
                </button>
              ) : (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive font-semibold mb-3">⚠ Confirm cancellation of booking #{selected._id.slice(-6)}?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setCancelConfirm(false)} className="flex-1 h-9 rounded-xl border border-border text-sm font-semibold">No, keep it</button>
                    <button
                      disabled={cancelMutation.isPending}
                      onClick={handleCancel}
                      className="flex-1 h-9 rounded-xl bg-destructive text-white text-sm font-bold disabled:opacity-60"
                    >
                      {cancelMutation.isPending ? "Cancelling..." : "Yes, cancel"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Drawer>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <ReceiptText className="w-4 h-4 text-primary" />
            Cash Payment Ledger
          </div>
          <span className="text-xs text-muted-foreground">Latest 10 records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-light text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Receipt</th>
                <th className="px-4 py-3 text-left">Booking</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Worker</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Worker</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {latestPayments.map(payment => {
                const booking = typeof payment.booking === 'object' ? payment.booking : null;
                return (
                  <tr key={payment._id} className="border-t border-border/60 hover:bg-surface-light/35">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{payment.receiptNumber || payment._id.slice(-6)}</td>
                    <td className="px-4 py-3">{booking?.category || "Booking"}</td>
                    <td className="px-4 py-3">{payment.customer?.fullName || "N/A"}</td>
                    <td className="px-4 py-3 text-accent">{payment.worker?.fullName || "N/A"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtPKR(payment.amount || 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-success">{fmtPKR(payment.workerEarning || 0)}</td>
                    <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
                  </tr>
                );
              })}
              {latestPayments.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No cash payments recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return <div className="bg-card border border-border rounded-2xl p-3 shadow-card card-hover"><div className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</div><div className={`mt-1 text-lg font-extrabold ${color ?? ""}`}>{value}</div></div>;
}
function Card({ label, value, sub, accent, className = "" }: { label: string; value: string; sub?: string; accent?: boolean; className?: string }) {
  return <div className={`p-3 rounded-xl bg-surface-light ${className}`}><div className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</div><div className={`mt-0.5 font-semibold ${accent ? "text-accent" : ""}`}>{value}</div>{sub && <div className="text-[10px] text-dim font-mono">{sub}</div>}</div>;
}
function Line({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return <div className={`flex justify-between text-sm py-1 ${bold ? "font-bold text-base" : ""} ${accent ? "text-accent" : ""}`}><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}
