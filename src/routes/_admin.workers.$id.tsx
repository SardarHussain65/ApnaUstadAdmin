import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Mail, MapPin, Phone, Power,
  RotateCcw, X, XCircle, Wallet, Star, Edit, Save, Loader
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, Badge, StatusBadge, RatingStars } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Drawer";
import { fmtPKR } from "@/lib/mock-data";
import {
  useBookings, useToggleWorkerStatus, useVerifyWorker,
  useWorkerDetails, useWorkerWalletDetails, useWorkerReviews,
  useUpdateWorkerProfile, useCategories
} from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/workers/$id")({ component: WorkerDetail });

function WorkerDetail() {
  const { id } = Route.useParams();
  const [activeTab, setActiveTab] = useState<"bookings" | "wallet" | "reviews">("bookings");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"verify" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: "", phone: "", email: "", category: "", hourlyRate: "",
    bio: "", experience: "", city: "", address: ""
  });

  const { data: worker, isLoading, isError, error, refetch } = useWorkerDetails(id, !!id);
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings({ workerId: id, limit: 10 });
  const { data: walletData, isLoading: walletLoading } = useWorkerWalletDetails(id, 1, 10);
  const { data: reviewsData, isLoading: reviewsLoading } = useWorkerReviews(id, activeTab === "reviews");
  const { data: categories = [] } = useCategories({ limit: 100 });

  const verifyWorkerMutation = useVerifyWorker();
  const toggleWorkerStatusMutation = useToggleWorkerStatus();
  const updateProfileMutation = useUpdateWorkerProfile();

  const recentBookings = useMemo(() => (bookings as any[]).slice(0, 10), [bookings]);
  const reviews = useMemo(() => (reviewsData as any)?.data || (Array.isArray(reviewsData) ? reviewsData : []), [reviewsData]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Link to="/workers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Workers
        </Link>
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground shadow-card">
          <div className="w-8 h-8 border-4 border-t-primary border-border rounded-full animate-spin mx-auto mb-3" />
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
          <p className="mt-2 text-sm text-muted-foreground">{(error as any)?.message || "The worker may have been removed or the link is invalid."}</p>
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

  const openEditModal = () => {
    setEditForm({
      fullName: worker.fullName || "",
      phone: worker.phone || "",
      email: worker.email || "",
      category: worker.category || "",
      hourlyRate: String(worker.hourlyRate || ""),
      bio: worker.bio || "",
      experience: String(worker.experience || ""),
      city: worker.city || "",
      address: worker.address || ""
    });
    setEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(
      {
        id: worker._id,
        fullName: editForm.fullName || undefined,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
        category: editForm.category || undefined,
        hourlyRate: editForm.hourlyRate ? Number(editForm.hourlyRate) : undefined,
        bio: editForm.bio !== undefined ? editForm.bio : undefined,
        experience: editForm.experience ? Number(editForm.experience) : undefined,
        city: editForm.city || undefined,
        address: editForm.address !== undefined ? editForm.address : undefined
      },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  const completeVerification = () => {
    if (!confirm) return;
    verifyWorkerMutation.mutate(
      { id: worker._id, isVerified: confirm === "verify" },
      { onSuccess: () => { setConfirm(null); setReason(""); } }
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
        {/* Worker Profile Card */}
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
              ? worker.skills.map((skill: string) => <span key={skill} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">{skill}</span>)
              : <span className="text-xs text-muted-foreground">No skills listed</span>}
          </div>

          {/* Action buttons */}
          <button
            onClick={openEditModal}
            className="mt-5 btn-press w-full h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 font-bold flex items-center justify-center gap-2 transition"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </button>

          <button
            disabled={toggleWorkerStatusMutation.isPending}
            onClick={toggleActiveStatus}
            className="mt-2 btn-press w-full h-11 rounded-xl bg-surface-light hover:bg-accent/15 hover:text-accent border border-border font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Power className="w-4 h-4" /> {worker.isActive ? "Deactivate Worker" : "Activate Worker"}
          </button>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total Jobs" value={(worker.totalJobs || 0).toString()} />
            <Stat label="Earnings" value={fmtPKR(worker.totalEarnings || 0)} />
            <Stat label="Rating" value={`${(worker.rating || 0).toFixed(1)}★`} />
            <Stat label="Reviews" value={(worker.totalReviews || 0).toString()} />
          </div>

          {/* Identity Verification */}
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

          {/* Tabbed Content */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
            <div className="flex border-b border-border">
              {(["bookings", "wallet", "reviews"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-semibold capitalize transition relative ${activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {tab === "bookings" && <CalendarDays className="w-4 h-4" />}
                  {tab === "wallet" && <Wallet className="w-4 h-4" />}
                  {tab === "reviews" && <Star className="w-4 h-4" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              ))}
            </div>

            {/* Bookings Tab */}
            {activeTab === "bookings" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase text-muted-foreground border-b border-border bg-surface">
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingsLoading && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-t-primary border-border rounded-full animate-spin mx-auto" />
                  </td></tr>}
                  {!bookingsLoading && recentBookings.map((booking: any) => (
                    <tr key={booking._id} className="border-b border-border/60 hover:bg-surface-light/40 transition">
                      <td className="px-4 py-2.5 font-medium">{booking.customer?.fullName || "N/A"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{booking.category || "N/A"}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(booking.scheduledDate)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{fmtPKR(booking.totalAmount || 0)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={booking.status || "pending"} /></td>
                    </tr>
                  ))}
                  {!bookingsLoading && recentBookings.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No bookings found</td></tr>}
                </tbody>
              </table>
            )}

            {/* Wallet Tab */}
            {activeTab === "wallet" && (
              <div className="p-5 space-y-4">
                {walletLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-t-primary border-border rounded-full animate-spin mx-auto mb-2" />
                    Loading wallet data...
                  </div>
                ) : walletData ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl bg-surface border border-border">
                        <div className="text-xs text-muted-foreground uppercase font-semibold">Balance</div>
                        <div className="text-2xl font-extrabold text-primary mt-1">{fmtPKR(walletData.wallet?.balance || 0)}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-surface border border-border">
                        <div className="text-xs text-muted-foreground uppercase font-semibold">Total Recharged</div>
                        <div className="text-2xl font-extrabold text-success mt-1">{fmtPKR(walletData.wallet?.totalRecharged || 0)}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-surface border border-border">
                        <div className="text-xs text-muted-foreground uppercase font-semibold">Commission Deducted</div>
                        <div className="text-2xl font-extrabold text-destructive mt-1">{fmtPKR(walletData.wallet?.totalCommissionDeducted || 0)}</div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] uppercase text-muted-foreground border-b border-border bg-surface">
                            <th className="text-left px-4 py-3">Type</th>
                            <th className="text-left px-4 py-3">Description</th>
                            <th className="text-right px-4 py-3">Amount</th>
                            <th className="text-right px-4 py-3">Balance After</th>
                            <th className="text-left px-4 py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(walletData.transactions || []).map((tx: any) => (
                            <tr key={tx._id} className="border-b border-border/60 hover:bg-surface-light/40 transition">
                              <td className="px-4 py-2.5">
                                <Badge variant={tx.type === 'recharge' ? 'success' : tx.type === 'commission_deduction' ? 'danger' : 'info'}>
                                  {tx.type?.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[200px]">{tx.description || "—"}</td>
                              <td className={`px-4 py-2.5 text-right font-bold ${tx.type === 'commission_deduction' ? 'text-destructive' : 'text-success'}`}>
                                {tx.type === 'commission_deduction' ? '-' : '+'}{fmtPKR(tx.amount || 0)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold">{fmtPKR(tx.balanceAfter || 0)}</td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(tx.createdAt)}</td>
                            </tr>
                          ))}
                          {(walletData.transactions || []).length === 0 && (
                            <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No wallet transactions yet</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No wallet data available for this worker</div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="p-5 space-y-3">
                {reviewsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-t-primary border-border rounded-full animate-spin mx-auto mb-2" />
                    Loading reviews...
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No reviews yet for this worker</div>
                ) : (
                  reviews.map((review: any) => (
                    <div key={review._id} className="p-4 rounded-xl bg-surface border border-border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-surface-light flex items-center justify-center font-bold text-sm">
                            {review.customer?.fullName?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-white">{review.customer?.fullName || "Anonymous User"}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</div>
                          </div>
                        </div>
                        <RatingStars rating={review.rating || 0} />
                      </div>
                      {review.comment && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
                      {review.isFlagged && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 uppercase">
                          ⚑ Flagged
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-fade-in" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-xl glass"><X className="w-5 h-5" /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}

      {/* Verification Modal */}
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
            className={`px-5 h-10 rounded-xl font-bold disabled:opacity-50 flex items-center gap-1.5 ${confirm === "verify" ? "gradient-cyan text-background glow-cyan" : "bg-destructive text-white"}`}
          >
            {verifyWorkerMutation.isPending && <Loader className="w-4 h-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Worker Profile" width="max-w-2xl">
        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Full Name</label>
            <input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Phone</label>
            <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Email</label>
            <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Category</label>
            <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary cursor-pointer">
              <option value="">Select category</option>
              {(categories as any[]).map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Hourly Rate (PKR)</label>
            <input type="number" value={editForm.hourlyRate} onChange={e => setEditForm(f => ({ ...f, hourlyRate: e.target.value }))}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Experience (years)</label>
            <input type="number" value={editForm.experience} onChange={e => setEditForm(f => ({ ...f, experience: e.target.value }))}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">City</label>
            <input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Address</label>
            <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Bio</label>
            <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} rows={3}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
          </div>
          <div className="sm:col-span-2 flex gap-3 justify-end pt-2 border-t border-border mt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="px-4 h-10 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-surface-light">Cancel</button>
            <button type="submit" disabled={updateProfileMutation.isPending}
              className="px-5 h-10 gradient-cyan text-background rounded-xl font-bold glow-cyan flex items-center gap-1.5 disabled:opacity-60">
              {updateProfileMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function DocumentImage({ label, src, onOpen }: { label: string; src?: string; onOpen: (src: string) => void }) {
  return (
    <button type="button" disabled={!src} onClick={() => src && onOpen(src)}
      className="aspect-video rounded-xl bg-surface-light border border-border overflow-hidden hover:border-primary transition disabled:cursor-not-allowed disabled:hover:border-border">
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
