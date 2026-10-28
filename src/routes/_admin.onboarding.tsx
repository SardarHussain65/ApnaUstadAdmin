import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  Fingerprint,
  Layers,
  MapPin,
  Phone,
  RefreshCw,
  RotateCw,
  Route as RouteIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Wallet,
  X,
  XCircle,
  ZoomIn,
} from "lucide-react";
import { DataTable, FilterToolbar, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge, StatusBadge } from "@/components/admin/ui";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Drawer, Modal, ModalBody, ModalFooter } from "@/components/admin/Drawer";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { CnicRevealModal } from "@/components/admin/CnicRevealModal";
import { fmtPKR, shortId } from "@/lib/format";
import {
  useWorkerOnboardingPage,
  useVerifyWorker,
  useReviewWorkerSpecialty,
  useAdminRechargeWallet,
  useToggleWorkerStatus,
} from "@/lib/api-hooks";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_admin/onboarding")({ component: OnboardingPage });

const REUPLOAD_REASONS = [
  "CNIC front document is blurry or unreadable",
  "CNIC back document is blurry or unreadable",
  "CNIC document has expired — please provide valid CNIC",
  "Worker name does not match name on CNIC card",
  "Facial image does not clearly match photo on CNIC",
  "Document edges cut off — all 4 corners must be visible",
];

function OnboardingPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [blockerFilter, setBlockerFilter] = useState("all");
  const deferredQ = useDeferredValue(q);

  // Selected worker for Stepper Review Drawer
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Lightbox for document inspection
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);

  // Re-upload Request Modal state
  const [reuploadModalOpen, setReuploadModalOpen] = useState(false);
  const [selectedPresetReason, setSelectedPresetReason] = useState("");
  const [customReuploadNote, setCustomReuploadNote] = useState("");

  // Reject / Deactivate state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // Starter credit state
  const [creditAmount, setCreditAmount] = useState<number>(500);
  const [isCrediting, setIsCrediting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [deferredQ, blockerFilter]);

  const { data, isLoading, refetch } = useWorkerOnboardingPage({
    page,
    limit: 15,
    search: deferredQ || undefined,
  });

  const verifyMutation = useVerifyWorker();
  const specialtyMutation = useReviewWorkerSpecialty();
  const rechargeMutation = useAdminRechargeWallet();
  const statusMutation = useToggleWorkerStatus();

  const allItems = data?.items || [];

  // Filter in memory if blockerFilter selected
  const filteredRows = useMemo(() => {
    if (blockerFilter === "all") return allItems;
    if (blockerFilter === "cnic") {
      return allItems.filter((w: any) => w.onboarding?.cnic !== "complete");
    }
    if (blockerFilter === "specialty") {
      return allItems.filter((w: any) => w.onboarding?.specialty !== "complete");
    }
    if (blockerFilter === "wallet") {
      return allItems.filter((w: any) => w.onboarding?.wallet !== "complete");
    }
    if (blockerFilter === "ready") {
      return allItems.filter((w: any) => w.onboarding?.isReady);
    }
    return allItems;
  }, [allItems, blockerFilter]);

  // Overall pipeline summary stats
  const pipelineStats = useMemo(() => {
    const total = data?.pagination.totalItems ?? allItems.length;
    const cnicBlocked = allItems.filter((w: any) => w.onboarding?.cnic !== "complete").length;
    const specialtyBlocked = allItems.filter((w: any) => w.onboarding?.specialty !== "complete").length;
    const walletBlocked = allItems.filter((w: any) => w.onboarding?.wallet !== "complete").length;
    const readyCount = allItems.filter((w: any) => w.onboarding?.isReady).length;
    return { total, cnicBlocked, specialtyBlocked, walletBlocked, readyCount };
  }, [allItems, data?.pagination.totalItems]);

  const handleOpenReview = (worker: any, step: 1 | 2 | 3 | 4 = 1) => {
    setSelectedWorker(worker);
    setActiveStep(step);
    setRotation(0);
  };

  const handleNextWorker = () => {
    if (!selectedWorker) return;
    const currentIndex = filteredRows.findIndex((w: any) => w._id === selectedWorker._id);
    if (currentIndex >= 0 && currentIndex < filteredRows.length - 1) {
      setSelectedWorker(filteredRows[currentIndex + 1]);
      setActiveStep(1);
    } else {
      toast.info("Reached the end of current review queue page");
    }
  };

  const handleApproveGoLive = async () => {
    if (!selectedWorker) return;
    try {
      await verifyMutation.mutateAsync({ id: selectedWorker._id, isVerified: true });
      toast.success(`${selectedWorker.fullName} verified and approved to go live!`);
      refetch();
      // Auto advance or close
      const currentIndex = filteredRows.findIndex((w: any) => w._id === selectedWorker._id);
      if (currentIndex >= 0 && currentIndex < filteredRows.length - 1) {
        setSelectedWorker(filteredRows[currentIndex + 1]);
        setActiveStep(1);
      } else {
        setSelectedWorker(null);
      }
    } catch {
      // toast handled in hook
    }
  };

  const handleSendReuploadRequest = () => {
    const reason = selectedPresetReason || customReuploadNote;
    if (!reason.trim()) {
      toast.error("Please select or enter a re-upload reason");
      return;
    }
    // In our system, rejecting verification with reason prompts worker app to re-upload
    verifyMutation.mutate(
      { id: selectedWorker._id, isVerified: false },
      {
        onSuccess: () => {
          toast.success(`Re-upload requested from ${selectedWorker.fullName}: "${reason}"`);
          setReuploadModalOpen(false);
          setSelectedPresetReason("");
          setCustomReuploadNote("");
          refetch();
          setSelectedWorker(null);
        },
      }
    );
  };

  const handleCreditStarter = async () => {
    if (!selectedWorker) return;
    setIsCrediting(true);
    try {
      await rechargeMutation.mutateAsync({
        workerId: selectedWorker._id,
        amount: Number(creditAmount),
        description: `Onboarding starter credit — Admin activation grant of PKR ${creditAmount}`,
      });
      toast.success(`Credited PKR ${creditAmount} to ${selectedWorker.fullName}'s wallet!`);
      refetch();
    } catch {
      // toast handled in hook
    } finally {
      setIsCrediting(false);
    }
  };

  const handleSpecialtyStatusChange = async (categoryId: string, status: "approved" | "rejected") => {
    if (!selectedWorker) return;
    try {
      await specialtyMutation.mutateAsync({
        workerId: selectedWorker._id,
        categoryId,
        approvalStatus: status,
      });
      toast.success(`Specialty ${status === "approved" ? "approved" : "rejected"}`);
      refetch();
    } catch {
      // error handled in hook
    }
  };


  return (
    <div className="space-y-5 animate-fade-in">
      <AdminPageHeader
        title="Worker Onboarding Pipeline"
        description="End-to-end review console: verify identity, inspect CNIC documents, approve specialties, and clear balance blockers."
        icon={<RouteIcon className="h-4 w-4" />}
        stats={
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Pipeline: {pipelineStats.total}</Badge>
            <Badge variant="warning" pulse={pipelineStats.cnicBlocked > 0}>
              CNIC Pending: {pipelineStats.cnicBlocked}
            </Badge>
            <Badge variant="purple">Specialty Pending: {pipelineStats.specialtyBlocked}</Badge>
            <Badge variant="orange">Low Balance: {pipelineStats.walletBlocked}</Badge>
            <Badge variant="success">Ready: {pipelineStats.readyCount}</Badge>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface border border-border/70 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <RouteIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono">{pipelineStats.total}</div>
            <div className="text-[11px] text-muted-foreground font-medium">In Pipeline</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border/70 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-gold">{pipelineStats.cnicBlocked}</div>
            <div className="text-[11px] text-muted-foreground font-medium">CNIC Needed</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border/70 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-purple-400">{pipelineStats.specialtyBlocked}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Specialty Check</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border/70 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-amber-400">{pipelineStats.walletBlocked}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Wallet Blocked</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border/70 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-success">{pipelineStats.readyCount}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Ready to Go Live</div>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <FilterToolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search worker name, phone, CNIC, or city..." />
        <Select
          value={blockerFilter}
          onChange={setBlockerFilter}
          label="All Workers"
          options={[
            { value: "all", label: "All Pipeline Workers" },
            { value: "cnic", label: "Blocked: CNIC Verification" },
            { value: "specialty", label: "Blocked: Specialty Approval" },
            { value: "wallet", label: "Blocked: Minimum Balance" },
            { value: "ready", label: "Ready to Go Live" },
          ]}
        />
      </FilterToolbar>

      {/* Main Pipeline DataTable */}
      <DataTable
        isLoading={isLoading}
        rows={filteredRows}
        pageSize={15}
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          totalItems: data?.pagination.totalItems ?? filteredRows.length,
          onPageChange: setPage,
        }}
        columns={[
          {
            key: "worker",
            header: "Ustad",
            render: (worker: any) => (
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <Avatar name={worker.fullName} src={worker.profileImage} size={42} />
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Link
                      to="/workers/$id"
                      params={{ id: String(worker._id) }}
                      className="hover:text-primary hover:underline"
                    >
                      {worker.fullName}
                    </Link>
                    {worker.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-success" />}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="font-mono">{worker.phone}</span>
                    <span>·</span>
                    <span>{worker.city || "No city"}</span>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "cnic",
            header: "CNIC Document",
            render: (worker: any) => (
              <button
                onClick={() => handleOpenReview(worker, 2)}
                className="hover:opacity-80 transition group flex items-center gap-1.5"
              >
                <StepBadge status={worker.onboarding?.cnic} />
                <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-primary transition" />
              </button>
            ),
          },
          {
            key: "specialty",
            header: "Skills / Specialties",
            render: (worker: any) => (
              <button
                onClick={() => handleOpenReview(worker, 3)}
                className="hover:opacity-80 transition group flex items-center gap-1.5"
              >
                <StepBadge status={worker.onboarding?.specialty} />
                <span className="text-xs text-muted-foreground">
                  ({(worker.specialties || []).length} skills)
                </span>
              </button>
            ),
          },
          {
            key: "wallet",
            header: "Wallet Readiness",
            render: (worker: any) => {
              const balance = worker.onboarding?.walletBalance || 0;
              const min = worker.onboarding?.minimumWalletBalance || 500;
              const isAdequate = balance >= min;
              return (
                <div className="space-y-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isAdequate ? "text-success" : "text-amber-400"}`}>
                    <Wallet className="h-3.5 w-3.5" />
                    {fmtPKR(balance)}
                  </span>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Req: {fmtPKR(min)}
                  </div>
                </div>
              );
            },
          },
          {
            key: "blockers",
            header: "Pipeline Blockers",
            render: (worker: any) => {
              const blockers = worker.onboarding?.blockers || [];
              if (blockers.length === 0) {
                return (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Activate
                  </span>
                );
              }
              return (
                <div className="flex max-w-[200px] flex-wrap gap-1">
                  {blockers.map((b: string) => (
                    <span
                      key={b}
                      className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            key: "actions",
            header: "Actions",
            className: "text-right",
            render: (worker: any) => (
              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Link
                  to="/workers/$id"
                  params={{ id: String(worker._id) }}
                  className="inline-flex items-center gap-1 rounded-xl border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
                >
                  Profile <ExternalLink className="h-3 w-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleOpenReview(worker, 1)}
                  className="btn-press inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition"
                >
                  Review Stepper <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* Stepper Review Drawer */}
      <Drawer
        open={!!selectedWorker}
        onClose={() => setSelectedWorker(null)}
        title={`Onboarding Review — ${selectedWorker?.fullName || "Worker"}`}
        width="max-w-3xl"
      >
        {selectedWorker && (
          <div className="space-y-6 pt-2">
            {/* Worker top summary bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-light border border-border/70">
              <div className="flex items-center gap-3">
                <Avatar name={selectedWorker.fullName} src={selectedWorker.profileImage} size={50} />
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    {selectedWorker.fullName}
                    {selectedWorker.isVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Verification Pending</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="font-mono">{selectedWorker.phone}</span>
                    <span>·</span>
                    <span>{selectedWorker.city || "Pakistan"}</span>
                    <span>·</span>
                    <span>ID: {shortId(selectedWorker._id)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNextWorker}
                  className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-muted-foreground hover:text-white hover:border-primary transition flex items-center gap-1"
                >
                  Next in Queue <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stepper Navigation Indicator */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { step: 1, label: "1. Personal Info", icon: User },
                { step: 2, label: "2. CNIC Review", icon: Fingerprint },
                { step: 3, label: "3. Specialties", icon: Layers },
                { step: 4, label: "4. Decision", icon: ShieldCheck },
              ].map(({ step, label, icon: Icon }) => {
                const isActive = activeStep === step;
                const isPassed = activeStep > step;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setActiveStep(step as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : isPassed
                        ? "border-success/30 bg-success/5 text-success"
                        : "border-border/60 bg-surface text-muted-foreground hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Step 1: Personal Info */}
            {activeStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Full Legal Name</div>
                    <div className="text-sm font-semibold text-white">{selectedWorker.fullName}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Phone Number</div>
                    <div className="text-sm font-mono font-semibold text-primary">{selectedWorker.phone}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</div>
                    <div className="text-sm font-semibold text-white">{selectedWorker.email || "No email on file"}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">City / Location</div>
                    <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {selectedWorker.city || "Not specified"}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Residential Address</div>
                    <div className="text-sm text-white">{selectedWorker.address || "No street address provided"}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Experience & Rate</div>
                    <div className="text-sm text-white">
                      {selectedWorker.experienceYears ? `${selectedWorker.experienceYears} Years` : "Entry level"} · Rate: {fmtPKR(selectedWorker.hourlyRate || 0)}/hr
                    </div>
                  </div>
                </div>

                {selectedWorker.bio && (
                  <div className="p-3.5 rounded-xl bg-surface border border-border/70 space-y-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Worker Bio / Description</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedWorker.bio}</p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-5 h-10 rounded-xl gradient-cyan text-background font-black flex items-center gap-1.5"
                  >
                    Proceed to CNIC Review <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: CNIC Review */}
            {activeStep === 2 && (
              <div className="space-y-5 animate-fade-in">
                {/* CNIC Number and Reveal */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border/70">
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">CNIC National ID Number</div>
                    <div className="text-base font-mono font-bold tracking-wider text-accent mt-0.5">
                      {selectedWorker.cnicNumber || "Not recorded"}
                    </div>
                  </div>

                  {selectedWorker._id && (
                    <CnicRevealModal
                      workerId={selectedWorker._id}
                      workerName={selectedWorker.fullName}
                      maskedCnic={selectedWorker.cnicNumber}
                    />
                  )}

                </div>

                {/* Front & Back Document Inspection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Front image */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span>CNIC FRONT SIDE</span>
                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="text-[11px] text-primary flex items-center gap-1 hover:underline"
                      >
                        <RotateCw className="w-3 h-3" /> Rotate
                      </button>
                    </div>

                    <div
                      className="w-full aspect-[16/10] rounded-2xl bg-surface-light border border-border/80 overflow-hidden relative group cursor-zoom-in flex items-center justify-center"
                      onClick={() => setLightboxUrl(selectedWorker.cnicFrontImage || "/placeholder-cnic.png")}
                    >
                      {selectedWorker.cnicFrontImage ? (
                        <img
                          src={selectedWorker.cnicFrontImage}
                          alt="CNIC Front"
                          style={{ transform: `rotate(${rotation}deg)` }}
                          className="w-full h-full object-contain transition duration-200"
                        />
                      ) : (
                        <div className="text-center p-4 text-xs text-muted-foreground">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-1 opacity-50 text-gold" />
                          No CNIC front image uploaded
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition gap-1.5">
                        <ZoomIn className="w-4 h-4" /> Click to Zoom
                      </div>
                    </div>
                  </div>

                  {/* Back image */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span>CNIC BACK SIDE</span>
                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="text-[11px] text-primary flex items-center gap-1 hover:underline"
                      >
                        <RotateCw className="w-3 h-3" /> Rotate
                      </button>
                    </div>

                    <div
                      className="w-full aspect-[16/10] rounded-2xl bg-surface-light border border-border/80 overflow-hidden relative group cursor-zoom-in flex items-center justify-center"
                      onClick={() => setLightboxUrl(selectedWorker.cnicBackImage || "/placeholder-cnic.png")}
                    >
                      {selectedWorker.cnicBackImage ? (
                        <img
                          src={selectedWorker.cnicBackImage}
                          alt="CNIC Back"
                          style={{ transform: `rotate(${rotation}deg)` }}
                          className="w-full h-full object-contain transition duration-200"
                        />
                      ) : (
                        <div className="text-center p-4 text-xs text-muted-foreground">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-1 opacity-50 text-gold" />
                          No CNIC back image uploaded
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition gap-1.5">
                        <ZoomIn className="w-4 h-4" /> Click to Zoom
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Verification Inspection Checklist */}
                <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    NADRA ID Verification Checklist
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-border" />
                      <span>Legible 13-digit CNIC</span>
                    </label>
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-border" />
                      <span>All 4 document corners visible</span>
                    </label>
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-border" />
                      <span>Name matches profile name</span>
                    </label>
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-border" />
                      <span>Document is currently valid / not expired</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-4 h-10 rounded-xl border border-border text-sm font-semibold hover:bg-surface-light text-muted-foreground hover:text-white flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-5 h-10 rounded-xl gradient-cyan text-background font-black flex items-center gap-1.5"
                  >
                    Proceed to Specialties <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Skills & Specialties */}
            {activeStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-xs text-muted-foreground">
                  Workers can offer multiple trade specialties. Approve or reject each requested category below.
                </div>

                <div className="space-y-3">
                  {(selectedWorker.specialties || []).length === 0 ? (
                    <div className="p-6 rounded-2xl bg-surface border border-border text-center text-xs text-muted-foreground">
                      No specialties registered yet.
                    </div>
                  ) : (
                    (selectedWorker.specialties || []).map((spec: any) => {
                      const isPending = spec.approvalStatus === "pending";
                      const isApproved = spec.approvalStatus === "approved";
                      const specName = spec.categoryId?.name || spec.name || "Specialty";
                      const specCerts = spec.certificates?.length
                        ? spec.certificates
                        : (selectedWorker.certificates || []).filter(
                            (c: any) => c.categoryName === specName || (!c.categoryName && spec.priority === 1)
                          );
                      return (
                        <div
                          key={spec._id}
                          className="p-3.5 rounded-xl bg-surface border border-border/80 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-foreground flex items-center gap-2">
                                  {specName}
                                  {isApproved ? (
                                    <Badge variant="success">Approved</Badge>
                                  ) : isPending ? (
                                    <Badge variant="warning">Approval Pending</Badge>
                                  ) : (
                                    <Badge variant="danger">Rejected</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Rate: {fmtPKR(spec.hourlyRate || selectedWorker.hourlyRate || 0)}/hr · Experience: {spec.experience ?? spec.experienceYears ?? selectedWorker.experienceYears ?? 1} yrs
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSpecialtyStatusChange(spec.categoryId?._id || spec.categoryId || spec._id, "approved")}
                                    disabled={specialtyMutation.isPending}
                                    className="px-3 py-1.5 rounded-xl gradient-success text-background font-bold text-xs flex items-center gap-1 hover:opacity-90"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSpecialtyStatusChange(spec.categoryId?._id || spec.categoryId || spec._id, "rejected")}
                                    disabled={specialtyMutation.isPending}
                                    className="px-3 py-1.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive font-bold text-xs flex items-center gap-1 hover:bg-destructive/25"
                                  >
                                    <X className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </>
                              )}
                              {isApproved && (
                                <span className="text-xs text-success font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                </span>
                              )}
                            </div>
                          </div>

                          {specCerts.length > 0 && (
                            <div className="pt-2.5 border-t border-border/60">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                Certificates ({specCerts.length})
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {specCerts.map((cert: any, idx: number) => (
                                  <button
                                    key={cert._id || idx}
                                    type="button"
                                    onClick={() => cert.certificateUrl && setLightboxUrl(cert.certificateUrl)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-left hover:border-primary/50 transition"
                                  >
                                    {cert.certificateUrl && (
                                      <img src={cert.certificateUrl} alt={cert.title} className="w-10 h-7 rounded object-cover border border-border" />
                                    )}
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold text-foreground truncate max-w-[160px]">{cert.title || "Certificate"}</div>
                                      {cert.issuingOrg && <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">{cert.issuingOrg}</div>}
                                    </div>
                                    <Eye className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-4 h-10 rounded-xl border border-border text-sm font-semibold hover:bg-surface-light text-muted-foreground hover:text-white flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to CNIC
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="px-5 h-10 rounded-xl gradient-cyan text-background font-black flex items-center gap-1.5"
                  >
                    Proceed to Decision <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Decision & Actions */}
            {activeStep === 4 && (
              <div className="space-y-5 animate-fade-in">
                {/* Readiness Audit Card */}
                <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pipeline Readiness Status
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-light">
                      <span className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-muted-foreground" /> CNIC Verification
                      </span>
                      <StepBadge status={selectedWorker.onboarding?.cnic} />
                    </div>

                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-light">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-muted-foreground" /> Specialty Approvals
                      </span>
                      <StepBadge status={selectedWorker.onboarding?.specialty} />
                    </div>

                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-light">
                      <span className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-muted-foreground" /> Minimum Wallet Balance
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        {fmtPKR(selectedWorker.onboarding?.walletBalance || 0)} / {fmtPKR(selectedWorker.onboarding?.minimumWalletBalance || 500)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick starter credit grant */}
                <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-primary" />
                        Grant Activation Wallet Credit
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Credit starter balance so the worker immediately meets the minimum threshold to take jobs.
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-success">
                      Current: {fmtPKR(selectedWorker.onboarding?.walletBalance || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {[250, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCreditAmount(amt)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition ${
                          creditAmount === amt
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border bg-surface-light text-muted-foreground hover:text-white"
                        }`}
                      >
                        +{fmtPKR(amt)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleCreditStarter}
                      disabled={isCrediting}
                      className="ml-auto px-4 py-1.5 rounded-xl gradient-success text-background font-black text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isCrediting ? "Crediting..." : `Credit ${fmtPKR(creditAmount)}`}
                    </button>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    onClick={handleApproveGoLive}
                    disabled={verifyMutation.isPending}
                    className="w-full h-12 rounded-xl gradient-cyan text-background font-black text-sm flex items-center justify-center gap-2 shadow-lg glow-cyan disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {verifyMutation.isPending ? "Approving Worker..." : "Approve & Activate Worker Go-Live"}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReuploadModalOpen(true)}
                      className="h-11 rounded-xl border border-gold/40 bg-gold/10 text-gold font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gold/20 transition"
                    >
                      <RotateCw className="w-4 h-4" /> Request Document Re-upload
                    </button>

                    <button
                      type="button"
                      onClick={() => setRejectDialogOpen(true)}
                      className="h-11 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-destructive/20 transition"
                    >
                      <XCircle className="w-4 h-4" /> Deactivate / Reject
                    </button>
                  </div>
                </div>

                <div className="flex justify-start pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-4 h-10 rounded-xl border border-border text-sm font-semibold hover:bg-surface-light text-muted-foreground hover:text-white flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Specialties
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Re-upload Request Modal with Standard Presets */}
      <Modal
        open={reuploadModalOpen}
        onClose={() => setReuploadModalOpen(false)}
        title="Request Document Re-upload"
        description={`Send a push notification and SMS to ${selectedWorker?.fullName} requesting clearer documents.`}
        variant="warning"
        footer={
          <ModalFooter>
            <button
              type="button"
              onClick={() => setReuploadModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface-light"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendReuploadRequest}
              disabled={verifyMutation.isPending}
              className="px-4 py-2 rounded-xl bg-gold text-background font-black text-xs flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" /> Send Re-upload Request
            </button>
          </ModalFooter>
        }
      >
        <ModalBody>
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Standard Rejection / Re-upload Presets
            </label>
            <div className="space-y-1.5">
              {REUPLOAD_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setSelectedPresetReason(reason);
                    setCustomReuploadNote("");
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition ${
                    selectedPresetReason === reason
                      ? "border-gold bg-gold/15 text-gold font-bold"
                      : "border-border bg-surface-light text-muted-foreground hover:text-white"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Custom Instructions for Worker
              </label>
              <textarea
                value={customReuploadNote}
                onChange={(e) => {
                  setCustomReuploadNote(e.target.value);
                  setSelectedPresetReason("");
                }}
                rows={2}
                placeholder="Or specify specific feedback (e.g. glare on CNIC number, corner of card cut off)..."
                className="w-full bg-input border border-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold resize-none"
              />
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* Reject Worker Confirm Dialog */}
      <ConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title={`Deactivate / Reject ${selectedWorker?.fullName}?`}
        description="This will suspend the worker's account and block them from accepting jobs on Apna Ustad."
        confirmLabel="Confirm Deactivation"
        tone="danger"
        requireReason={true}
        reasons={[
          "Failed identity verification / fake CNIC",
          "Duplicate account detected",
          "Incomplete registration details",
          "Failed skill or background assessment",
          "Worker requested application cancellation",
        ]}
        onConfirm={async (payload: ConfirmPayload) => {
          if (!selectedWorker) return;
          const auditReason = payload.reason
            ? payload.note
              ? `${payload.reason} — ${payload.note}`
              : payload.reason
            : payload.note || "Onboarding application rejected during admin review";
          await statusMutation.mutateAsync({
            id: selectedWorker._id,
            isActive: false,
            reason: auditReason,
          });
          toast.success("Worker application deactivated");
          refetch();
          setSelectedWorker(null);
        }}
      />


      {/* Document Lightbox Modal with Pan/Zoom and Rotation */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="CNIC Document Lightbox"
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 animate-fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="flex items-center gap-3 mb-3 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="text-xs text-primary font-bold flex items-center gap-1.5 hover:underline"
            >
              <RotateCw className="w-4 h-4" /> Rotate ({rotation}°)
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="text-xs text-muted-foreground hover:text-white font-bold flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>

          <img
            src={lightboxUrl}
            alt="Inspection Zoom"
            style={{ transform: `rotate(${rotation}deg)` }}
            className="max-w-[90vw] max-h-[80vh] rounded-2xl border border-border shadow-2xl object-contain transition duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function StepBadge({ status }: { status?: string }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 text-success font-semibold text-xs">
        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-gold font-semibold text-xs">
        <Fingerprint className="h-3.5 w-3.5" /> Pending
      </span>
    );
  }
  if (status === "blocked") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive font-semibold text-xs">
        <Wallet className="h-3.5 w-3.5" /> Low balance
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground font-semibold text-xs">
      <AlertTriangle className="h-3.5 w-3.5" /> Missing
    </span>
  );
}
