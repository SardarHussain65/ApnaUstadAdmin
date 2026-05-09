import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreditCard, Banknote, Smartphone, Download } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Badge, StatusBadge } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Drawer";
import { bookings as initial, fmtPKR, type Booking } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/bookings")({ component: BookingsPage });

const PAY_ICON = { card: CreditCard, cash: Banknote, easypaisa: Smartphone };

function BookingsPage() {
  const [bookings, setBookings] = useState(initial);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pay, setPay] = useState("");
  const [type, setType] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [reason, setReason] = useState("");

  const rows = useMemo(() => bookings.filter(b => {
    if (q && !`${b.id}${b.customerName}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (status && b.status !== status) return false;
    if (pay && b.paymentMethod !== pay) return false;
    if (type && b.type !== type) return false;
    return true;
  }), [bookings, q, status, pay, type]);

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    ongoing: bookings.filter(b => b.status === "ongoing").length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
    revenue: bookings.filter(b => b.status === "completed").reduce((s, b) => s + b.total, 0),
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStat label="Total" value={stats.total.toString()} />
        <MiniStat label="Pending" value={stats.pending.toString()} color="text-gold" />
        <MiniStat label="Ongoing" value={stats.ongoing.toString()} color="text-accent" />
        <MiniStat label="Completed" value={stats.completed.toString()} color="text-success" />
        <MiniStat label="Cancelled" value={stats.cancelled.toString()} color="text-destructive" />
        <MiniStat label="Revenue" value={fmtPKR(stats.revenue)} color="text-primary" />
      </div>

      <div className="flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by booking ID or customer..." />
        <Select value={status} onChange={setStatus} label="All Status" options={["pending","accepted","ongoing","completed","cancelled"].map(s=>({value:s,label:s}))} />
        <Select value={pay} onChange={setPay} label="Payment" options={[{value:"card",label:"Card"},{value:"cash",label:"Cash"},{value:"easypaisa",label:"EasyPaisa"}]} />
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

      <DataTable rows={rows} onRowClick={b => setSelected(b)} columns={[
        { key: "id", header: "Booking", render: b => <span className="font-mono text-xs text-primary">{b.id}</span> },
        { key: "c", header: "Customer", render: b => b.customerName },
        { key: "w", header: "Worker", render: b => <span className="text-accent">{b.workerName}</span> },
        { key: "cat", header: "Category", render: b => <Badge variant="orange">{b.category}</Badge> },
        { key: "d", header: "Date", render: b => <span className="text-xs text-muted-foreground">{format(new Date(b.scheduledAt), "dd MMM, HH:mm")}</span> },
        { key: "tot", header: "Total", render: b => <span className="font-semibold">{fmtPKR(b.total)}</span> },
        { key: "p", header: "Payment", render: b => {
          const Icon = PAY_ICON[b.paymentMethod];
          return <span className="inline-flex items-center gap-1.5 text-xs"><Icon className="w-3.5 h-3.5" /> <StatusBadge status={b.paymentStatus} /></span>;
        }},
        { key: "s", header: "Status", render: b => <StatusBadge status={b.status} /> },
      ]} />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={`Booking ${selected?.id ?? ""}`} width="max-w-2xl">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Card label="Customer" value={selected.customerName} sub={selected.customerId} />
              <Card label="Worker" value={selected.workerName} sub={selected.workerId} accent />
              <Card label="Category" value={selected.category} />
              <Card label="Type" value={selected.type} />
              <Card label="Scheduled" value={format(new Date(selected.scheduledAt), "dd MMM yyyy, HH:mm")} />
              <Card label="Duration" value={`${selected.duration} hours`} />
              <Card label="Address" value={selected.address} className="col-span-2" />
              <Card label="Description" value={selected.description} className="col-span-2" />
            </div>
            <div className="bg-surface-light rounded-2xl p-4">
              <div className="text-xs uppercase text-muted-foreground font-semibold mb-3">Financial Breakdown</div>
              <Line label="Subtotal" value={fmtPKR(selected.subtotal)} />
              <Line label="Platform Fee" value={fmtPKR(selected.platformFee)} />
              <Line label="Worker Earning" value={fmtPKR(selected.workerEarning)} accent />
              <div className="border-t border-border mt-2 pt-2"><Line label="Total" value={fmtPKR(selected.total)} bold /></div>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">Payment</span><div className="flex gap-2"><Badge variant="info">{selected.paymentMethod}</Badge><StatusBadge status={selected.paymentStatus} /></div></div>
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
            {selected.status !== "completed" && selected.status !== "cancelled" && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
                <div className="font-semibold text-destructive mb-2">Cancel Booking</div>
                <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for cancellation..." className="w-full h-20 rounded-xl bg-input border border-border p-3 text-sm" />
                <button onClick={() => {
                  setBookings(prev => prev.map(b => b.id === selected.id ? { ...b, status: "cancelled" } : b));
                  setSelected({ ...selected, status: "cancelled" });
                  toast.success("Booking cancelled");
                  setReason("");
                }} className="btn-press mt-2 w-full h-10 rounded-xl bg-destructive text-destructive-foreground font-bold">Cancel Booking</button>
              </div>
            )}
          </div>
        )}
      </Drawer>
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
