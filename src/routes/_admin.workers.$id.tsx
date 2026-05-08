import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Phone, Mail, MapPin, X } from "lucide-react";
import { workers, bookings, fmtPKR } from "@/lib/mock-data";
import { Avatar, Badge, RatingStars, StatusBadge } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Drawer";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/workers/$id")({ component: WorkerDetail });

function WorkerDetail() {
  const { id } = Route.useParams();
  const [worker, setWorker] = useState(() => workers.find(w => w.id === id));
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"verify" | "reject" | null>(null);
  const [reason, setReason] = useState("");

  if (!worker) return <div className="text-center py-20 text-muted-foreground">Worker not found. <Link to="/workers" className="text-primary">Go back</Link></div>;

  const wb = bookings.filter(b => b.workerId === worker.id).slice(0, 10);

  return (
    <div className="space-y-5">
      <Link to="/workers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="w-4 h-4" /> Back to Workers</Link>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card text-center">
          <div className="relative inline-block">
            <Avatar src={worker.avatar} name={worker.name} size={120} />
            {worker.isVerified && <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full gradient-success flex items-center justify-center border-4 border-card"><CheckCircle2 className="w-5 h-5 text-white" /></div>}
          </div>
          <h2 className="text-2xl font-bold mt-4">{worker.name}</h2>
          <div className="mt-1"><Badge variant="orange">{worker.category}</Badge></div>
          <p className="text-sm text-muted-foreground mt-3">{worker.bio}</p>
          <div className="mt-4 space-y-2 text-sm text-left">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {worker.phone}</div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> <span className="truncate">{worker.email}</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {worker.city}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Rate</div><div className="text-accent font-bold">{fmtPKR(worker.hourlyRate)}/hr</div></div>
            <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Experience</div><div className="font-bold">{worker.experience} years</div></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            {worker.skills.map(s => <span key={s} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">{s}</span>)}
          </div>
        </div>

        {/* Right */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total Jobs" value={worker.totalJobs.toString()} />
            <Stat label="Earnings" value={fmtPKR(worker.totalEarnings)} />
            <Stat label="Rating" value={worker.rating.toFixed(1) + "★"} />
            <Stat label="Reviews" value={worker.totalReviews.toString()} />
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <h3 className="font-bold mb-4">Identity Verification</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><div className="text-[10px] uppercase text-muted-foreground mb-1">CNIC Number</div><div className="font-mono font-semibold">{worker.cnic}</div></div>
              <div><div className="text-[10px] uppercase text-muted-foreground mb-1">Status</div>{worker.isVerified ? <Badge variant="success">✓ Verified</Badge> : <Badge variant="warning" pulse>Pending</Badge>}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setLightbox(worker.cnicFront)} className="aspect-video rounded-xl bg-surface-light border border-border overflow-hidden hover:border-primary transition">
                <img src={worker.cnicFront} alt="CNIC Front" className="w-full h-full object-cover" />
              </button>
              <button onClick={() => setLightbox(worker.cnicBack)} className="aspect-video rounded-xl bg-surface-light border border-border overflow-hidden hover:border-primary transition">
                <img src={worker.cnicBack} alt="CNIC Back" className="w-full h-full object-cover" />
              </button>
            </div>
            {!worker.isVerified && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setConfirm("verify")} className="btn-press flex-1 h-11 rounded-xl gradient-cyan text-background font-bold glow-cyan flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Verify Worker</button>
                <button onClick={() => setConfirm("reject")} className="btn-press flex-1 h-11 rounded-xl bg-destructive/20 text-destructive border border-destructive/40 font-bold flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">Recent Bookings</h3></div>
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] uppercase text-muted-foreground border-b border-border">
                <th className="text-left px-4 py-2">Customer</th><th className="text-left px-4 py-2">Category</th><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Amount</th><th className="text-left px-4 py-2">Status</th>
              </tr></thead>
              <tbody>{wb.map(b => (
                <tr key={b.id} className="border-b border-border/60 hover:bg-surface-light/40">
                  <td className="px-4 py-2.5">{b.customerName}</td>
                  <td className="px-4 py-2.5">{b.category}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{format(new Date(b.scheduledAt), "dd MMM yyyy")}</td>
                  <td className="px-4 py-2.5 font-semibold">{fmtPKR(b.total)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
                </tr>
              ))}{wb.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No bookings</td></tr>}</tbody>
            </table>
          </div>
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-fade-in" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-xl glass"><X className="w-5 h-5" /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm === "verify" ? "Verify Worker" : "Reject Verification"}>
        <p className="text-sm text-muted-foreground mb-4">
          {confirm === "verify" ? `Confirm verification of ${worker.name}? This will mark them as a trusted Ustad on the platform.` : `Provide a reason for rejecting this verification request.`}
        </p>
        {confirm === "reject" && <textarea value={reason} onChange={e => setReason(e.target.value)} className="w-full h-24 rounded-xl bg-input border border-border p-3 text-sm focus:border-primary focus:outline-none" placeholder="Reason..." />}
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={() => setConfirm(null)} className="px-4 h-10 rounded-xl border border-border">Cancel</button>
          <button onClick={() => {
            if (confirm === "verify") { setWorker({ ...worker, isVerified: true }); toast.success("Worker verified"); }
            else { toast.success("Rejected. Worker notified."); }
            setConfirm(null); setReason("");
          }} className={`px-5 h-10 rounded-xl font-bold ${confirm === "verify" ? "gradient-cyan text-background glow-cyan" : "bg-destructive text-destructive-foreground"}`}>Confirm</button>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-card border border-border rounded-2xl p-4 shadow-card card-hover"><div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div><div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div></div>;
}
