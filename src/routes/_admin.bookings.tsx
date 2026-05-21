import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Banknote, Download, ReceiptText } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Badge, StatusBadge } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Drawer";
import { fmtPKR } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { format } from "date-fns";
import { toast } from "sonner";
import { AdminPayment, useBookings, usePayments, usePaymentSummary } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/bookings")({ component: BookingsPage });

function BookingsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pay, setPay] = useState("");
  const [type, setType] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const { data, isLoading } = useBookings({ status: status || undefined });
  const { data: paymentsData = [] } = usePayments({ limit: 10 });
  const { data: paymentSummary = {} } = usePaymentSummary();

  const apiBookings = (data as any) || [];
  const latestPayments = (paymentsData as AdminPayment[]) || [];

  const rows = useMemo(() => apiBookings.filter((b: any) => {
    // Client side filtering for search & custom fields
    if (q && !`${b._id}${b.customer?.fullName}`.toLowerCase().includes(q.toLowerCase())) return false;
    const paymentState = b.payment?.status || b.paymentStatus || 'pending';
    if (pay && paymentState !== pay) return false;
    if (type && b.bookingType !== type) return false;
    return true;
  }), [apiBookings, q, pay, type]);

  const stats = {
    total: apiBookings.length,
    pending: apiBookings.filter((b:any) => b.status === "pending").length,
    ongoing: apiBookings.filter((b:any) => b.status === "ongoing").length,
    completed: apiBookings.filter((b:any) => b.status === "completed").length,
    cancelled: apiBookings.filter((b:any) => b.status === "cancelled").length,
    revenue: (paymentSummary as any)?.paid?.totalAmount || 0,
    payable: (paymentSummary as any)?.payable?.totalAmount || 0,
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <MiniStat label="Total" value={stats.total.toString()} />
        <MiniStat label="Pending" value={stats.pending.toString()} color="text-gold" />
        <MiniStat label="Ongoing" value={stats.ongoing.toString()} color="text-accent" />
        <MiniStat label="Completed" value={stats.completed.toString()} color="text-success" />
        <MiniStat label="Cancelled" value={stats.cancelled.toString()} color="text-destructive" />
        <MiniStat label="Cash Paid" value={fmtPKR(stats.revenue)} color="text-primary" />
        <MiniStat label="Awaiting Cash" value={fmtPKR(stats.payable)} color="text-accent" />
      </div>

      <div className="flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by booking ID or customer..." />
        <Select value={status} onChange={setStatus} label="All Status" options={["pending","accepted","ongoing","completed","cancelled"].map(s=>({value:s,label:s}))} />
        <Select value={pay} onChange={setPay} label="Payment" options={[{value:"pending",label:"Pending"},{value:"payable",label:"Awaiting Cash"},{value:"paid",label:"Cash Paid"},{value:"cancelled",label:"Cancelled"}]} />
        <Select value={type} onChange={setType} label="Type" options={[{value:"instant",label:"Instant"},{value:"scheduled",label:"Scheduled"}]} />
        <button
          onClick={() => {
            downloadCsv("bookings", rows, [
              { key: "id", header: "ID" }, { key: "customerName", header: "Customer" }, { key: "workerName", header: "Worker" },
              { key: "category", header: "Category" }, { key: "scheduledAt", header: "Scheduled" }, { key: "total", header: "Total" },
              { key: "paymentMethod", header: "Payment" }, { key: "paymentStatus", header: "Paid" }, { key: "status", header: "Status" },
            ]);
            toast.success(`Exported ${rows.length} bookings`);
          }}
          className="btn-press inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-surface-light hover:bg-primary/15 hover:text-primary border border-border text-sm font-semibold transition"
        ><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      <DataTable isLoading={isLoading} rows={rows} onRowClick={b => setSelected(b)} columns={[
        { key: "id", header: "Booking", render: b => <span className="font-mono text-xs text-primary">{b._id.slice(-6)}</span> },
        { key: "c", header: "Customer", render: b => b.customer?.fullName || 'Unknown' },
        { key: "w", header: "Worker", render: b => <span className="text-accent">{b.worker?.fullName || 'Unknown'}</span> },
        { key: "cat", header: "Category", render: b => <Badge variant="orange">{b.category || 'N/A'}</Badge> },
        { key: "d", header: "Date", render: b => <span className="text-xs text-muted-foreground">{b.createdAt ? format(new Date(b.createdAt), "dd MMM, HH:mm") : 'N/A'}</span> },
        { key: "tot", header: "Total", render: b => <span className="font-semibold">{fmtPKR(b.totalAmount || 0)}</span> },
        { key: "p", header: "Payment", render: b => {
          const paymentState = b.payment?.status || b.paymentStatus || 'pending';
          return <span className="inline-flex items-center gap-1.5 text-xs"><Banknote className="w-3.5 h-3.5" /> <StatusBadge status={paymentState} /></span>;
        }},
        { key: "s", header: "Status", render: b => <StatusBadge status={b.status} /> },
      ]} />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={`Booking ${selected?._id?.slice(-6) ?? ""}`} width="max-w-2xl">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Card label="Customer" value={selected.customer?.fullName || 'Unknown'} sub={selected.customer?._id} />
              <Card label="Worker" value={selected.worker?.fullName || 'Unknown'} sub={selected.worker?._id} accent />
              <Card label="Category" value={selected.category || 'N/A'} />
              <Card label="Type" value={selected.bookingType || 'N/A'} />
              <Card label="Scheduled" value={selected.createdAt ? format(new Date(selected.createdAt), "dd MMM yyyy, HH:mm") : 'N/A'} />
              <Card label="Duration" value={`${selected.estimatedHours || 1} hours`} />
              <Card label="Address" value={selected.address || 'N/A'} className="col-span-2" />
              <Card label="Description" value={selected.description || 'N/A'} className="col-span-2" />
            </div>
            <div className="bg-surface-light rounded-2xl p-4">
              <div className="text-xs uppercase text-muted-foreground font-semibold mb-3">Financial Breakdown</div>
              <Line label="Subtotal" value={fmtPKR(selected.subtotal || 0)} />
              <Line label="Platform Fee" value={fmtPKR(selected.platformFee || 0)} />
              <Line label="Worker Earning" value={fmtPKR(selected.workerEarning || 0)} accent />
              <div className="border-t border-border mt-2 pt-2"><Line label="Total" value={fmtPKR(selected.totalAmount || 0)} bold /></div>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">Payment</span><div className="flex gap-2"><Badge variant="info">cash</Badge><StatusBadge status={selected.payment?.status || selected.paymentStatus || 'pending'} /></div></div>
              {selected.payment?.receiptNumber && <Line label="Receipt" value={selected.payment.receiptNumber} />}
              {selected.payment?.paidAt && <Line label="Paid At" value={format(new Date(selected.payment.paidAt), "dd MMM yyyy, HH:mm")} />}
            </div>
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
