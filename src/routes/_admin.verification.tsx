import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Fingerprint,
  Info,
  Loader,
  Lock,
  Maximize2,
  Phone,
  RefreshCw,
  RotateCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { DataTable, FilterToolbar, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge, StatusBadge } from "@/components/admin/ui";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Drawer, Modal, ModalBody, ModalFooter } from "@/components/admin/Drawer";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { CopyableId } from "@/components/ui/copyable-id";
import { format } from "date-fns";
import { useVerificationRequestsPage, useReviewVerificationRequest } from "@/lib/api-hooks";
import { toast } from "sonner";
import { formatCnic, shortId } from "@/lib/format";

export const Route = createFileRoute("/_admin/verification")({
  component: VerificationRequestsPage,
});

interface VerificationRequest {
  _id: string;
  worker?: {
    _id: string;
    fullName: string;
    phone: string;
    email?: string;
    profileImage?: string;
    category: string;
    city: string;
    createdAt?: string;
  };
  cnicNumber: string;
  cnicFrontImage: string;
  cnicBackImage: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  adminNotes?: string;
  reviewedBy?: {
    _id: string;
    fullName: string;
    email?: string;
  };
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const NADRA_REUPLOAD_PRESETS = [
  "CNIC front document is blurry or unreadable",
  "CNIC back document is blurry or unreadable",
  "Facial image does not clearly match photo on CNIC card",
  "CNIC document has expired — please provide valid CNIC",
  "Document corners cut off — entire card must be visible",
  "Glare or reflection obscuring name or CNIC number",
];

function VerificationRequestsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const deferredQ = useDeferredValue(q);

  // Selected request for Side-by-Side Inspector
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);

  // Inspector view state
  const [cnicTab, setCnicTab] = useState<"front" | "back">("front");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Audit action state
  const [auditNotes, setAuditNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [reuploadModalOpen, setReuploadModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [deferredQ, status]);

  const { data, isLoading, refetch } = useVerificationRequestsPage({
    page,
    limit: 15,
    status: status || undefined,
    search: deferredQ || undefined,
  });

  const reviewMutation = useReviewVerificationRequest();
  const apiRequests: VerificationRequest[] = (data?.items as any) || [];

  const rows = useMemo(() => apiRequests.map((r) => ({ ...r, id: r._id })), [apiRequests]);

  const handleOpenAudit = (req: VerificationRequest) => {
    setSelectedRequest(req);
    setAuditNotes(req.adminNotes || "");
    setRejectionReason(req.rejectionReason || "");
    setSelectedPreset("");
    setCnicTab("front");
    setZoomLevel(1);
    setRotation(0);
  };

  const handleCloseAudit = () => {
    setSelectedRequest(null);
    setAuditNotes("");
    setRejectionReason("");
    setSelectedPreset("");
  };

  const handleNextInQueue = () => {
    if (!selectedRequest) return;
    const currentIndex = apiRequests.findIndex((r) => r._id === selectedRequest._id);
    if (currentIndex >= 0 && currentIndex < apiRequests.length - 1) {
      handleOpenAudit(apiRequests[currentIndex + 1]);
    } else {
      toast.info("End of current verification queue page");
    }
  };

  const handlePrevInQueue = () => {
    if (!selectedRequest) return;
    const currentIndex = apiRequests.findIndex((r) => r._id === selectedRequest._id);
    if (currentIndex > 0) {
      handleOpenAudit(apiRequests[currentIndex - 1]);
    }
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    reviewMutation.mutate(
      {
        id: selectedRequest._id,
        status: "approved",
        adminNotes: auditNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Verification approved for ${selectedRequest.worker?.fullName || "Worker"}`);
          refetch();
          handleNextInQueue();
        },
      }
    );
  };

  const handleSendReupload = () => {
    if (!selectedRequest) return;
    const finalReason = selectedPreset || rejectionReason;
    if (!finalReason.trim()) {
      toast.error("Please select or type a re-upload reason");
      return;
    }
    reviewMutation.mutate(
      {
        id: selectedRequest._id,
        status: "rejected",
        rejectionReason: `Re-upload requested: ${finalReason}`,
        adminNotes: auditNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Re-upload requested from ${selectedRequest.worker?.fullName || "Worker"}`);
          setReuploadModalOpen(false);
          refetch();
          handleNextInQueue();
        },
      }
    );
  };

  const stats = useMemo(() => {
    return {
      total: data?.pagination.totalItems ?? 0,
      pending: apiRequests.filter((r) => r.status === "pending").length,
      approved: apiRequests.filter((r) => r.status === "approved").length,
      rejected: apiRequests.filter((r) => r.status === "rejected").length,
    };
  }, [apiRequests, data?.pagination.totalItems]);

  return (
    <div className="space-y-5 animate-fade-in">
      <AdminPageHeader
        title="Worker Identity & NADRA Verification Queue"
        description="Inspect high-resolution worker profile photos side-by-side with CNIC identity documents to guarantee facial resemblance and authenticity."
        icon={<Fingerprint className="h-4 w-4" />}
        stats={
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Total: {stats.total}</Badge>
            <Badge variant="warning" pulse={stats.pending > 0}>
              Pending Audit: {stats.pending}
            </Badge>
            <Badge variant="success">Approved: {stats.approved}</Badge>
            <Badge variant="danger">Rejected: {stats.rejected}</Badge>
          </div>
        }
      />

      {/* Filter toolbar */}
      <FilterToolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search by worker name, phone, CNIC number..." />
        <Select
          value={status}
          onChange={setStatus}
          label="All Statuses"
          options={[
            { value: "pending", label: "Pending Reviews" },
            { value: "approved", label: "Approved Verifications" },
            { value: "rejected", label: "Rejected Audits" },
            { value: "", label: "All Verifications" },
          ]}
        />
      </FilterToolbar>

      {/* Main DataTable */}
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
            key: "worker",
            header: "Worker Profile",
            render: (r: VerificationRequest) => (
              <div className="flex items-center gap-3">
                <Avatar src={r.worker?.profileImage} name={r.worker?.fullName || "Worker"} size={44} />
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    {r.worker?.fullName || "Unnamed Worker"}
                    {r.status === "approved" && <ShieldCheck className="w-3.5 h-3.5 text-success" />}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                    <span>{r.worker?.phone}</span>
                    <span>·</span>
                    <span>{r.worker?.city || "Pakistan"}</span>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "category",
            header: "Specialty",
            render: (r: VerificationRequest) => (
              <Badge variant="orange">{r.worker?.category || "General"}</Badge>
            ),
          },
          {
            key: "cnic",
            header: "CNIC Number",
            render: (r: VerificationRequest) => (
              <span className="font-mono font-bold tracking-wider text-accent text-xs">
                {formatCnic(r.cnicNumber)}
              </span>
            ),
          },
          {
            key: "submitted",
            header: "Submitted",
            render: (r: VerificationRequest) => (
              <div className="text-xs text-muted-foreground">
                {r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy HH:mm") : "N/A"}
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r: VerificationRequest) => {
              if (r.status === "approved") return <Badge variant="success">✓ Verified</Badge>;
              if (r.status === "rejected") return <Badge variant="danger">✗ Rejected</Badge>;
              return <Badge variant="warning" pulse>Pending review</Badge>;
            },
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (r: VerificationRequest) => (
              <button
                type="button"
                onClick={() => handleOpenAudit(r)}
                className="btn-press inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                {r.status === "pending" ? "Inspect" : "View Log"}
              </button>
            ),
          },
        ]}
      />

      {/* Side-by-Side Facial Match Inspection Drawer */}
      <Drawer
        open={!!selectedRequest}
        onClose={handleCloseAudit}
        title={`Identity Inspection — ${selectedRequest?.worker?.fullName || "Worker"}`}
        width="max-w-5xl"
      >
        {selectedRequest && (
          <div className="space-y-6 pt-2">
            {/* Top Toolbar with Queue Navigation and Status */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-light border border-border/80">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Verification ID:</span>
                <span className="font-mono text-xs font-bold text-primary">{shortId(selectedRequest._id)}</span>
                <span className="text-muted-foreground">·</span>
                {selectedRequest.status === "approved" ? (
                  <Badge variant="success">Approved</Badge>
                ) : selectedRequest.status === "rejected" ? (
                  <Badge variant="danger">Rejected</Badge>
                ) : (
                  <Badge variant="warning" pulse>Awaiting Audit</Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevInQueue}
                  className="p-1.5 rounded-xl border border-border bg-surface text-muted-foreground hover:text-white transition"
                  title="Previous request in queue"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground font-mono px-2">Queue navigation</span>
                <button
                  type="button"
                  onClick={handleNextInQueue}
                  className="p-1.5 rounded-xl border border-border bg-surface text-muted-foreground hover:text-white transition"
                  title="Next request in queue"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SIDE-BY-SIDE INSPECTOR GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT PANE: Profile Photo & Facial Match */}
              <div className="space-y-4 p-5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <User className="w-4 h-4" /> 1. Worker Profile Photo
                    </span>
                    <Badge variant="info">Live Profile</Badge>
                  </div>

                  {/* Profile photo view */}
                  <div
                    className="w-full aspect-square max-h-[300px] mx-auto rounded-2xl bg-surface-light border border-border/80 overflow-hidden relative group cursor-zoom-in flex items-center justify-center shadow-inner"
                    onClick={() => setLightboxUrl(selectedRequest.worker?.profileImage || "/placeholder-avatar.png")}
                  >
                    {selectedRequest.worker?.profileImage ? (
                      <img
                        src={selectedRequest.worker.profileImage}
                        alt="Profile Capture"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="text-center p-4 text-xs text-muted-foreground">
                        <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        No custom profile photo
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition gap-1.5">
                      <ZoomIn className="w-4 h-4" /> Zoom Profile Picture
                    </div>
                  </div>

                  {/* Worker Metadata details */}
                  <div className="p-3 rounded-xl bg-surface-light border border-border/60 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Full Name:</span>
                      <span className="font-bold text-white">{selectedRequest.worker?.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone Number:</span>
                      <span className="font-mono font-bold text-primary">{selectedRequest.worker?.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">City:</span>
                      <span className="text-white">{selectedRequest.worker?.city || "Pakistan"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Skill Category:</span>
                      <span className="font-semibold text-accent">{selectedRequest.worker?.category || "General"}</span>
                    </div>
                  </div>

                  {/* Face match checklist */}
                  <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                      Facial Match Criteria
                    </div>
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-border text-primary" />
                      <span>Face is unobstructed (no mask, sunglasses)</span>
                    </label>
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-border text-primary" />
                      <span>Facial structure matches CNIC ID photo</span>
                    </label>
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-border text-primary" />
                      <span>Approximate age matches date on CNIC</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* RIGHT PANE: CNIC Document Captures & NADRA Inspection */}
              <div className="space-y-4 p-5 rounded-2xl bg-surface border border-border/80 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                      <Fingerprint className="w-4 h-4" /> 2. NADRA CNIC Document
                    </span>

                    {/* Tab toggle: Front vs Back */}
                    <div className="flex items-center p-1 rounded-xl bg-surface-light border border-border/60 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setCnicTab("front");
                          setRotation(0);
                        }}
                        className={`px-3 py-1 rounded-lg font-bold transition ${
                          cnicTab === "front" ? "bg-primary text-background" : "text-muted-foreground hover:text-white"
                        }`}
                      >
                        Front Side
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCnicTab("back");
                          setRotation(0);
                        }}
                        className={`px-3 py-1 rounded-lg font-bold transition ${
                          cnicTab === "back" ? "bg-primary text-background" : "text-muted-foreground hover:text-white"
                        }`}
                      >
                        Back Side
                      </button>
                    </div>
                  </div>

                  {/* CNIC Number banner */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-light border border-border/60">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">CNIC Digits</div>
                      <div className="font-mono text-sm font-bold tracking-widest text-accent mt-0.5">
                        {formatCnic(selectedRequest.cnicNumber)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedRequest.cnicNumber);
                        toast.success("CNIC copied to clipboard");
                      }}
                      className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-white hover:border-primary flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>

                  {/* Document capture container with Zoom & Rotate controls */}
                  <div className="relative">
                    <div
                      className="w-full aspect-[16/10] max-h-[300px] rounded-2xl bg-surface-light border border-border/80 overflow-hidden relative group cursor-zoom-in flex items-center justify-center shadow-inner"
                      onClick={() =>
                        setLightboxUrl(
                          cnicTab === "front"
                            ? selectedRequest.cnicFrontImage
                            : selectedRequest.cnicBackImage
                        )
                      }
                    >
                      <img
                        src={cnicTab === "front" ? selectedRequest.cnicFrontImage : selectedRequest.cnicBackImage}
                        alt={`CNIC ${cnicTab}`}
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                          transformOrigin: "center center",
                        }}
                        className="w-full h-full object-contain transition duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition gap-1.5">
                        <Maximize2 className="w-4 h-4" /> Fullscreen View
                      </div>
                    </div>

                    {/* Image manipulation bar */}
                    <div className="flex items-center justify-between mt-2 px-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                          className="p-1.5 rounded-lg border border-border bg-surface text-xs text-muted-foreground hover:text-white flex items-center gap-1"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-mono text-muted-foreground px-1">{zoomLevel}x</span>
                        <button
                          type="button"
                          onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                          className="p-1.5 rounded-lg border border-border bg-surface text-xs text-muted-foreground hover:text-white flex items-center gap-1"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                      >
                        <RotateCw className="w-3.5 h-3.5" /> Rotate ({rotation}°)
                      </button>
                    </div>
                  </div>

                  {/* Document verification checklist */}
                  <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                      NADRA Document Checks
                    </div>
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-border text-accent" />
                      <span>Name matches profile name exactly</span>
                    </label>
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-border text-accent" />
                      <span>Hologram & green pattern visible</span>
                    </label>
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-border text-accent" />
                      <span>Document is unexpired & non-counterfeit</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* AUDIT LOG / PAST DECISION IF NOT PENDING */}
            {selectedRequest.status !== "pending" && (
              <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-2 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Previous Audit Record
                </div>
                <div className="flex flex-wrap gap-4 text-white">
                  <div>
                    <span className="text-muted-foreground">Audited By:</span>{" "}
                    <span className="font-semibold">{selectedRequest.reviewedBy?.fullName || "System Admin"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Audited On:</span>{" "}
                    <span className="font-semibold">
                      {selectedRequest.reviewedAt ? format(new Date(selectedRequest.reviewedAt), "dd MMM yyyy HH:mm") : "N/A"}
                    </span>
                  </div>
                </div>
                {selectedRequest.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-semibold">
                    Rejection Reason: {selectedRequest.rejectionReason}
                  </div>
                )}
                {selectedRequest.adminNotes && (
                  <div className="text-muted-foreground italic">
                    Notes: {selectedRequest.adminNotes}
                  </div>
                )}
              </div>
            )}

            {/* DECISION ACTION CONSOLE */}
            {selectedRequest.status === "pending" && (
              <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Audit Decision Console</span>
                  <span className="text-[11px] text-primary lowercase font-mono">press 'A' to approve</span>
                </div>

                {/* Optional Admin Notes */}
                <div>
                  <textarea
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    rows={2}
                    placeholder="Internal audit notes (e.g. NADRA card validated against database, clear match)..."
                    className="w-full bg-input border border-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={reviewMutation.isPending}
                    className="w-full sm:flex-1 h-12 rounded-xl gradient-cyan text-background font-black text-sm flex items-center justify-center gap-2 shadow-lg glow-cyan disabled:opacity-50"
                  >
                    {reviewMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Approve Verification
                  </button>

                  <button
                    type="button"
                    onClick={() => setReuploadModalOpen(true)}
                    disabled={reviewMutation.isPending}
                    className="w-full sm:w-auto px-5 h-12 rounded-xl border border-gold/40 bg-gold/10 text-gold font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gold/20 transition"
                  >
                    <RotateCw className="w-4 h-4" /> Request Re-upload
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={reviewMutation.isPending}
                    className="w-full sm:w-auto px-5 h-12 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-destructive/20 transition"
                  >
                    <XCircle className="w-4 h-4" /> Reject Permanently
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Request Re-upload Modal with NADRA Presets */}
      <Modal
        open={reuploadModalOpen}
        onClose={() => setReuploadModalOpen(false)}
        title="Request CNIC Re-upload"
        description="Notify worker to re-capture and upload their identity documents."
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
              onClick={handleSendReupload}
              disabled={reviewMutation.isPending}
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
              Standard Re-upload Reason
            </label>
            <div className="space-y-1.5">
              {NADRA_REUPLOAD_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset);
                    setRejectionReason("");
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition ${
                    selectedPreset === preset
                      ? "border-gold bg-gold/15 text-gold font-bold"
                      : "border-border bg-surface-light text-muted-foreground hover:text-white"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Custom Re-upload Instructions
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setSelectedPreset("");
                }}
                rows={2}
                placeholder="Or type specific instructions for the worker..."
                className="w-full bg-input border border-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold resize-none"
              />
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* Reject Verification Confirm Dialog */}
      <ConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title={`Reject verification for ${selectedRequest?.worker?.fullName}?`}
        description="This will formally reject this verification submission and record the decision in the audit log."
        confirmLabel="Reject Verification"
        tone="danger"
        requireReason={true}
        reasons={[
          "Counterfeit or altered CNIC document",
          "Identity mismatch / impersonation attempt",
          "CNIC card permanently revoked or expired",
          "Fraudulent application",
        ]}
        onConfirm={async (payload: ConfirmPayload) => {
          if (!selectedRequest) return;
          const reason = payload.reason
            ? payload.note
              ? `${payload.reason} — ${payload.note}`
              : payload.reason
            : payload.note || "Verification rejected by administrator";
          await reviewMutation.mutateAsync({
            id: selectedRequest._id,
            status: "rejected",
            rejectionReason: reason,
            adminNotes: auditNotes.trim() || undefined,
          });
          toast.success("Verification submission rejected");
          refetch();
          handleNextInQueue();
        }}
      />

      {/* Lightbox Zoom Overlay */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image Zoom"
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 animate-fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="flex items-center gap-3 mb-3 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="text-xs text-muted-foreground hover:text-white font-bold flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Close Zoom
            </button>
          </div>

          <img
            src={lightboxUrl}
            alt="Inspection Zoom"
            className="max-w-[90vw] max-h-[85vh] rounded-2xl border border-border shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
