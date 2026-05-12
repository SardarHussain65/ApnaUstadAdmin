import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, Mail, MapPin, Phone, Power, RotateCcw, X, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Avatar, Badge, StatusBadge } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Drawer";
import { fmtPKR } from "@/lib/mock-data";
import { useBookings, useToggleWorkerStatus, useVerifyWorker, useWorkerDetails } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/workers/$id")({ component: WorkerDetail });

function WorkerDetail() {
  const { id } = Route.useParams();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"verify" | "reject" | null>(null);
  const [reason, setReason] = useState("");

  const { data: worker, isLoading, isError, error, refetch } = useWorkerDetails(id, !!id);
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings({ workerId: id, limit: 10 });
  const verifyWorkerMutation = useVerifyWorker();
  const toggleWorkerStatusMutation = useToggleWorkerStatus();

  const recentBookings = useMemo(() => bookings.slice(0, 10), [bookings]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Link to="/workers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Workers
        </Link>
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground shadow-card">
          Loading worker details...
        </div>
      </div>
    );
  }

  if (isError || !worker) {
    return (
      <div className="space-y-5">
        <Link to="/workers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Workers
        </Link>
        <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-card">
          <div className="text-lg font-bold">Worker not found</div>
          <p className="mt-2 text-sm text-muted-foreground">{error?.message || "The worker may have been removed or the link is invalid."}</p>
          <button
            onClick={() => refetch()}
            className="mt-5 inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary/15 text-primary border border-primary/30 font-semibold"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const completeVerification = () => {
    if (!confirm) return;
    verifyWorkerMutation.mutate(
      { id: worker._id, isVerified: confirm === "verify" },
      {
        onSuccess: () => {
          setConfirm(null);
          setReason("");
        },
      }
    );
  };

  const toggleActiveStatus = () => {
    toggleWorkerStatusMutation.mutate({ id: worker._id, isActive: !worker.isActive });
  };

  return (
    <div className="space-y-5">
      <Link to="/workers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Back to Workers
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card text-center">
          <div className="relative inline-block">
            <Avatar src={worker.profileImage} name={worker.fullName || "Worker"} size={120} />
            {worker.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full gradient-success flex items-center justify-center border-4 border-card">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold mt-4">{worker.fullName || "Unnamed Worker"}</h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="orange">{worker.category || "No category"}</Badge>
            <StatusBadge status={worker.isActive ? "active" : "inactive"} />
          </div>
          <p className="text-sm text-muted-foreground mt-3">{worker.bio || "No bio provided."}</p>

          <div className="mt-4 space-y-2 text-sm text-left">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {worker.phone || "N/A"}</div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> <span className="truncate">{worker.email || "N/A"}</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {worker.city || "N/A"}</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-surface-light">
              <div className="text-[10px] uppercase text-muted-foreground">Rate</div>
              <div className="text-accent font-bold">{fmtPKR(worker.hourlyRate || 0)}/hr</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-light">
              <div className="text-[10px] uppercase text-muted-foreground">Experience</div>
              <div className="font-bold">{worker.experience || 0} years</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            {(worker.skills || []).length > 0
              ? worker.skills.map((skill) => <span key={skill} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">{skill}</span>)
              : <span className="text-xs text-muted-foreground">No skills listed</span>}
          </div>

          <button
            disabled={toggleWorkerStatusMutation.isPending}
            onClick={toggleActiveStatus}
            className="mt-5 btn-press w-full h-11 rounded-xl bg-surface-light hover:bg-accent/15 hover:text-accent border border-border font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Power className="w-4 h-4" /> {worker.isActive ? "Deactivate Worker" : "Activate Worker"}
          </button>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total Jobs" value={(worker.totalJobs || 0).toString()} />
            <Stat label="Earnings" value={fmtPKR(worker.totalEarnings || 0)} />
            <Stat label="Rating" value={`${(worker.rating || 0).toFixed(1)}★`} />
            <Stat label="Reviews" value={(worker.totalReviews || 0).toString()} />
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <h3 className="font-bold">Identity Verification</h3>
              <div className="flex flex-wrap gap-2">
                {worker.isVerified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning" pulse>Pending</Badge>}
                <Badge variant={worker.isAvailable ? "info" : "muted"}>{worker.isAvailable ? "Available" : "Unavailable"}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Info label="CNIC Number" value={worker.cnicNumber || "Not provided"} mono />
              <Info label="Address" value={worker.address || "Not provided"} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DocumentImage label="CNIC Front" src={worker.cnicFrontImage} onOpen={setLightbox} />
              <DocumentImage label="CNIC Back" src={worker.cnicBackImage} onOpen={setLightbox} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!worker.isVerified && (
                <button
                  onClick={() => setConfirm("verify")}
                  className="btn-press flex-1 min-w-[180px] h-11 rounded-xl gradient-cyan text-background font-bold glow-cyan flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Verify Worker
                </button>
              )}
              <button
                onClick={() => setConfirm("reject")}
                className="btn-press flex-1 min-w-[180px] h-11 rounded-xl bg-destructive/20 text-destructive border border-destructive/40 font-bold flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> {worker.isVerified ? "Revoke Verification" : "Reject"}
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h3 className="font-bold">Recent Bookings</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2">Customer</th>
                  <th className="text-left px-4 py-2">Category</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookingsLoading && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Loading bookings...</td></tr>}
                {!bookingsLoading && recentBookings.map((booking) => (
                  <tr key={booking._id} className="border-b border-border/60 hover:bg-surface-light/40">
                    <td className="px-4 py-2.5">{booking.customer?.fullName || "N/A"}</td>
                    <td className="px-4 py-2.5">{booking.category || "N/A"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(booking.scheduledDate)}</td>
                    <td className="px-4 py-2.5 font-semibold">{fmtPKR(booking.totalAmount || 0)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={booking.status || "pending"} /></td>
                  </tr>
                ))}
                {!bookingsLoading && recentBookings.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No bookings</td></tr>}
              </tbody>
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
          {confirm === "verify"
            ? `Confirm verification of ${worker.fullName || "this worker"}? This will mark them as a trusted Ustad on the platform.`
            : "This will mark the worker as unverified. The reason is for admin review until notification support is connected."}
        </p>
        {confirm === "reject" && (
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full h-24 rounded-xl bg-input border border-border p-3 text-sm focus:border-primary focus:outline-none"
            placeholder="Reason..."
          />
        )}
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={() => setConfirm(null)} className="px-4 h-10 rounded-xl border border-border">Cancel</button>
          <button
            disabled={verifyWorkerMutation.isPending}
            onClick={completeVerification}
            className={`px-5 h-10 rounded-xl font-bold disabled:opacity-50 ${confirm === "verify" ? "gradient-cyan text-background glow-cyan" : "bg-destructive text-destructive-foreground"}`}
          >
            Confirm
          </button>
        </div>
      </Modal>
    </div>
  );
}

function DocumentImage({ label, src, onOpen }: { label: string; src?: string; onOpen: (src: string) => void }) {
  return (
    <button
      type="button"
      disabled={!src}
      onClick={() => src && onOpen(src)}
      className="aspect-video rounded-xl bg-surface-light border border-border overflow-hidden hover:border-primary transition disabled:cursor-not-allowed disabled:hover:border-border"
    >
      {src ? <img src={src} alt={label} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">{label} not uploaded</div>}
    </button>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground mb-1">{label}</div>
      <div className={`font-semibold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-card card-hover">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return format(date, "dd MMM yyyy");
}
