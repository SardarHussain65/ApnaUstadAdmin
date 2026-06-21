import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Mail, MapPin, Phone, Power,
  RotateCcw, X, XCircle, Wallet, Star, Edit, Save, Loader, Layers3
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, Badge, StatusBadge, RatingStars } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Drawer";
import { fmtPKR } from "@/lib/mock-data";
import {
  useBookings, useToggleWorkerStatus, useVerifyWorker,
  useWorkerDetails, useWorkerWalletDetails, useWorkerReviews,
  useUpdateWorkerProfile, useReviewWorkerSpecialty, useWalletSettings
} from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/workers/$id")({ component: WorkerDetail });

function WorkerDetail() {
  const { id } = Route.useParams();
  const [activeTab, setActiveTab] = useState<"bookings" | "wallet" | "reviews">("bookings");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"verify" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: "", phone: "", email: "", city: "", address: ""
  });

  const { data: worker, isLoading, isError, error, refetch } = useWorkerDetails(id, !!id);
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings({ workerId: id, limit: 10 });
  const { data: walletData, isLoading: walletLoading } = useWorkerWalletDetails(id, 1, 10);
  const { data: reviewsData, isLoading: reviewsLoading } = useWorkerReviews(id, activeTab === "reviews");
  const { data: walletSettings } = useWalletSettings();

  const verifyWorkerMutation = useVerifyWorker();
  const toggleWorkerStatusMutation = useToggleWorkerStatus();
  const updateProfileMutation = useUpdateWorkerProfile();
  const reviewSpecialtyMutation = useReviewWorkerSpecialty();

  const recentBookings = useMemo(() => (bookings as any[]).slice(0, 10), [bookings]);
  const reviews = useMemo(() => (reviewsData as any)?.data || (Array.isArray(reviewsData) ? reviewsData : []), [reviewsData]);
  const activeSpecialties = useMemo(() => (
    (worker?.specialties || [])
      .filter(specialty => specialty.approvalStatus === "approved" && specialty.isActive)
      .slice()
      .sort((a, b) => a.priority - b.priority)
  ), [worker?.specialties]);

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
    if (worker.isActive) {
      setStatusConfirmOpen(true);
      setStatusReason("");
      return;
    }
    toggleWorkerStatusMutation.mutate({ id: worker._id, isActive: true });
  };

  const confirmDeactivateWorker = () => {
    if (!statusReason.trim()) return;
    toggleWorkerStatusMutation.mutate(
      { id: worker._id, isActive: false, reason: statusReason.trim() },
      {
        onSuccess: () => {
          setStatusConfirmOpen(false);
          setStatusReason("");
        }
      }
    );
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
            {activeSpecialties.length > 0
              ? activeSpecialties.slice(0, 3).map((specialty) => {
                const category = typeof specialty.categoryId === "string" ? null : specialty.categoryId;
                return <Badge key={specialty._id} variant={specialty.priority === 1 ? "info" : "orange"}>{category?.name || "Category"}</Badge>;
              })
              : <Badge variant="orange">{worker.category || "No category"}</Badge>}
            {activeSpecialties.length > 3 && <Badge variant="purple">+{activeSpecialties.length - 3} more</Badge>}
            <StatusBadge status={worker.isActive ? "active" : "inactive"} />
          </div>

          <div className="mt-4 space-y-2 text-sm text-left">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {worker.phone || "N/A"}</div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> <span className="truncate">{worker.email || "N/A"}</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {worker.city || "N/A"}</div>
          </div>

          {!worker.isActive && (
            <div className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-left">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> Suspended
              </div>
              <p className="mt-2 text-sm text-white">{worker.deactivationReason || "Account deactivated by admin. Please contact support for details."}</p>
              {worker.deactivatedAt && <p className="mt-1 text-xs text-muted-foreground">Deactivated {formatDate(worker.deactivatedAt)}</p>}
            </div>
          )}

          {activeSpecialties.length > 0 && (
            <div className="mt-4 rounded-2xl bg-surface-light/70 border border-border p-3 text-left">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Active service categories</div>
              <div className="space-y-3">
                {activeSpecialties.map((specialty) => {
                  const category = typeof specialty.categoryId === "string" ? null : specialty.categoryId;
                  return (
                    <div key={specialty._id} className="rounded-xl bg-card/80 border border-border/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold truncate">{category?.name || "Category"}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{specialty.priority === 1 ? "Primary service" : "Additional service"}</div>
                        </div>
                        <Badge variant={specialty.subscriptionStatus === "active" || specialty.subscriptionStatus === "free" ? "success" : "warning"}>
                          {specialty.subscriptionStatus.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-surface-light/80 border border-border/60 px-3 py-2">
                          <div className="text-[10px] uppercase text-muted-foreground font-bold">Rate</div>
                          <div className="text-sm font-extrabold text-accent">{fmtPKR(specialty.hourlyRate || 0)}/hr</div>
                        </div>
                        <div className="rounded-lg bg-surface-light/80 border border-border/60 px-3 py-2">
                          <div className="text-[10px] uppercase text-muted-foreground font-bold">Experience</div>
                          <div className="text-sm font-extrabold">{specialty.experience || 0} years</div>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{specialty.bio || "No category description submitted."}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(specialty.skills || []).length > 0
                          ? specialty.skills.slice(0, 6).map(skill => <span key={skill} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">{skill}</span>)
                          : <span className="text-[11px] text-muted-foreground">No skills submitted</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Specialty subscriptions */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold flex items-center gap-2"><Layers3 className="w-4 h-4 text-primary" /> Specialty Subscriptions</h3>
                <p className="mt-1 text-xs text-muted-foreground">Only the primary category is free. Approving an additional category immediately deducts the monthly fee and activates it for matching.</p>
              </div>
              <Badge variant="info">{worker.specialties?.length || 0}/5</Badge>
            </div>
            <div className="space-y-2">
              {(worker.specialties || []).slice().sort((a, b) => a.priority - b.priority).map(specialty => {
                const category = typeof specialty.categoryId === "string" ? null : specialty.categoryId;
                const categoryId = typeof specialty.categoryId === "string" ? specialty.categoryId : specialty.categoryId._id;
                const tier = specialty.priority === 1 ? "Primary" : "Additional";
                const configuredFee = specialty.priority === 1
                  ? 0
                  : Number(walletSettings?.additionalCategoryMonthlyFee ?? specialty.monthlyFeeSnapshot ?? 500);
                return (
                  <div key={specialty._id} className="rounded-xl bg-surface border border-border px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{category?.name || "Category"}</span>
                          <Badge variant={specialty.priority === 1 ? "info" : "orange"}>{tier}</Badge>
                          <Badge variant={specialty.approvalStatus === "approved" ? "success" : specialty.approvalStatus === "rejected" ? "danger" : "warning"}>
                            {specialty.approvalStatus}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {specialty.priority === 1 ? "Included free" : `${fmtPKR(configuredFee)} / month`} · {specialty.subscriptionStatus.replace(/_/g, " ")}
                          {specialty.nextBillingAt ? ` · renews ${formatDate(specialty.nextBillingAt)}` : ""}
                        </div>
                      </div>
                      {specialty.approvalStatus === "pending" && (
                        <div className="flex gap-2">
                          <button disabled={reviewSpecialtyMutation.isPending}
                            onClick={() => reviewSpecialtyMutation.mutate({ workerId: worker._id, categoryId, approvalStatus: "approved" })}
                            className="px-3 h-9 rounded-lg bg-success/15 text-success border border-success/30 text-xs font-bold disabled:opacity-50">
                            Approve & Charge
                          </button>
                          <button disabled={reviewSpecialtyMutation.isPending}
                            onClick={() => reviewSpecialtyMutation.mutate({ workerId: worker._id, categoryId, approvalStatus: "rejected" })}
                            className="px-3 h-9 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 text-xs font-bold disabled:opacity-50">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 rounded-xl bg-card/70 border border-border/70 p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Worker rate:</span> <span className="font-bold text-accent">{fmtPKR(specialty.hourlyRate || 0)}/hr</span></div>
                        <div><span className="text-muted-foreground">Experience:</span> <span className="font-bold">{specialty.experience || 0} years</span></div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(specialty.skills || []).length > 0
                          ? specialty.skills.map(skill => <span key={skill} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">{skill}</span>)
                          : <span className="text-[11px] text-muted-foreground">No skills submitted</span>}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{specialty.bio || "No category description submitted."}</p>
                    </div>
                  </div>
                );
              })}
              {(worker.specialties || []).length === 0 && (
                <div className="rounded-xl bg-surface border border-border px-4 py-5 text-sm text-muted-foreground">Run the worker specialty migration to initialize this legacy profile.</div>
              )}
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
                      <div className="p-4 rounded-xl bg-surface border border-border">
                        <div className="text-xs text-muted-foreground uppercase font-semibold">Specialty Renewals</div>
                        <div className="text-2xl font-extrabold text-accent mt-1">{fmtPKR(walletData.wallet?.totalSubscriptionDeducted || 0)}</div>
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
                                <Badge variant={tx.type === 'recharge' ? 'success' : ['commission_deduction', 'specialty_subscription'].includes(tx.type) ? 'danger' : 'info'}>
                                  {tx.type?.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[200px]">{tx.description || "—"}</td>
                              <td className={`px-4 py-2.5 text-right font-bold ${['commission_deduction', 'specialty_subscription'].includes(tx.type) ? 'text-destructive' : 'text-success'}`}>
                                {['commission_deduction', 'specialty_subscription'].includes(tx.type) ? '-' : '+'}{fmtPKR(tx.amount || 0)}
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

      <Modal open={statusConfirmOpen} onClose={() => setStatusConfirmOpen(false)} title="Deactivate Worker Account">
        <div className="space-y-4">
          <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <div className="font-bold text-white">This worker will be locked out of app actions.</div>
                <p className="mt-1 text-sm text-muted-foreground">Active bookings are not cancelled automatically. Admin/support should resolve any active cases manually.</p>
              </div>
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason shown to worker</span>
            <textarea
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Explain why this worker account is being deactivated..."
              className="w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-destructive"
            />
          </label>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button onClick={() => setStatusConfirmOpen(false)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground hover:bg-surface-light">Cancel</button>
            <button
              disabled={!statusReason.trim() || toggleWorkerStatusMutation.isPending}
              onClick={confirmDeactivateWorker}
              className="h-10 rounded-xl bg-destructive px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              Deactivate Worker
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Worker Profile" width="max-w-2xl">
        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Layers3 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm font-extrabold text-white">Service details are category-specific</div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Category, hourly rate, experience, bio, and skills are managed in the Active Service Categories and pending approval sections, not from this general profile form.
                </p>
              </div>
            </div>
          </div>
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
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">City</label>
            <input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Address</label>
            <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
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
