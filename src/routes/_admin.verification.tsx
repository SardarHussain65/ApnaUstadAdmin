import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Eye, CheckCircle2, XCircle, Search, Calendar, Landmark, HelpCircle, Check, X, ShieldAlert, Loader } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge, StatusBadge } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Drawer";
import { format } from "date-fns";
import { useVerificationRequestsPage, useReviewVerificationRequest } from "@/lib/api-hooks";
import { toast } from "sonner";

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

function VerificationRequestsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const deferredQ = useDeferredValue(q);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [auditAction, setAuditAction] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => { setPage(1); }, [deferredQ, status]);

  const { data, isLoading, refetch } = useVerificationRequestsPage({
    page,
    limit: 10,
    status: status || undefined,
    search: deferredQ || undefined,
  });

  const reviewMutation = useReviewVerificationRequest();

  const apiRequests = data?.items || [];

  const rows = useMemo(() => apiRequests.map((r: any) => ({ ...r, id: r._id })), [apiRequests]);

  const handleOpenAudit = (req: VerificationRequest) => {
    setSelectedRequest(req);
    setNotes(req.adminNotes || "");
    setRejectionReason(req.rejectionReason || "");
    setAuditAction(null);
  };

  const handleCloseAudit = () => {
    setSelectedRequest(null);
    setNotes("");
    setRejectionReason("");
    setAuditAction(null);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !auditAction) return;

    if (auditAction === "reject" && (!rejectionReason || rejectionReason.trim() === "")) {
      toast.error("Rejection reason is required");
      return;
    }

    reviewMutation.mutate(
      {
        id: selectedRequest._id,
        status: auditAction === "approve" ? "approved" : "rejected",
        rejectionReason: auditAction === "reject" ? rejectionReason : undefined,
        adminNotes: notes || undefined,
      },
      {
        onSuccess: () => {
          handleCloseAudit();
          refetch();
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
    <div className="space-y-5">
      {/* Top Stats Overview */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="info">Matching: {stats.total}</Badge>
        <Badge variant="warning" pulse={stats.pending > 0}>Visible Pending: {stats.pending}</Badge>
        <Badge variant="success">Visible Approved: {stats.approved}</Badge>
        <Badge variant="danger">Visible Rejected: {stats.rejected}</Badge>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, phone, CNIC..." />
        <Select
          value={status}
          onChange={setStatus}
          label="All Statuses"
          options={[
            { value: "pending", label: "Pending Reviews" },
            { value: "approved", label: "Approved Verifications" },
            { value: "rejected", label: "Rejected Audits" },
          ]}
        />
      </div>

      {/* Main Datatable */}
      <DataTable
        isLoading={isLoading}
        rows={rows}
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
                <Avatar src={r.worker?.profileImage} name={r.worker?.fullName || "Worker"} />
                <div>
                  <div className="font-semibold text-white">{r.worker?.fullName || "Unnamed Worker"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{r.worker?.phone}</div>
                </div>
              </div>
            ),
          },
          {
            key: "category",
            header: "Category",
            render: (r: VerificationRequest) => (
              <Badge variant="orange">{r.worker?.category || "N/A"}</Badge>
            ),
          },
          {
            key: "cnic",
            header: "CNIC Number",
            render: (r: VerificationRequest) => (
              <span className="font-mono font-semibold tracking-wider text-accent">{r.cnicNumber}</span>
            ),
          },
          {
            key: "city",
            header: "City",
            render: (r: VerificationRequest) => <span>{r.worker?.city || "N/A"}</span>,
          },
          {
            key: "date",
            header: "Submitted At",
            render: (r: VerificationRequest) => (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(r.createdAt)}</span>
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
            render: (r: VerificationRequest) => (
              <div className="flex items-center justify-end">
                <button
                  onClick={() => handleOpenAudit(r)}
                  className="btn-press p-2 rounded-lg bg-surface-light hover:bg-primary/15 hover:text-primary transition flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Eye className="w-4 h-4" /> {r.status === "pending" ? "Audit" : "View"}
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* Moderation Review Modal */}
      {selectedRequest && (
        <Modal
          open={!!selectedRequest}
          onClose={handleCloseAudit}
          title={selectedRequest.status === "pending" ? "Verification Request Audit" : "Verification Log Details"}
          width="max-w-4xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* Left side: Profile Metadata info */}
            <div className="lg:col-span-1 space-y-4 border-r border-border/40 pr-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Worker Account</h4>
              <div className="flex items-center gap-3 bg-surface-light p-3 rounded-xl border border-border/40">
                <Avatar src={selectedRequest.worker?.profileImage} name={selectedRequest.worker?.fullName || "Worker"} size={48} />
                <div>
                  <h5 className="font-bold text-white text-sm">{selectedRequest.worker?.fullName}</h5>
                  <p className="text-xs text-muted-foreground font-mono">{selectedRequest.worker?.phone}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">City Location</div>
                  <div className="font-semibold text-white mt-0.5">{selectedRequest.worker?.city || "N/A"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">Category Skillset</div>
                  <div className="mt-1">
                    <Badge variant="orange">{selectedRequest.worker?.category || "N/A"}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">CNIC Digits</div>
                  <div className="font-mono font-bold tracking-wider text-accent mt-0.5">{selectedRequest.cnicNumber}</div>
                </div>
              </div>

              {selectedRequest.status !== "pending" && (
                <div className="p-3.5 rounded-xl bg-surface border border-border/60 text-xs space-y-2 mt-4">
                  <h5 className="font-bold text-gradient-cyan uppercase tracking-wider text-[10px]">Review Log</h5>
                  <div>
                    <span className="text-muted-foreground">Audited By:</span>{" "}
                    <span className="font-semibold text-white">{selectedRequest.reviewedBy?.fullName || "System Admin"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Audited On:</span>{" "}
                    <span className="font-semibold text-white">{formatDate(selectedRequest.reviewedAt)}</span>
                  </div>
                  {selectedRequest.rejectionReason && (
                    <div className="pt-2 border-t border-border/40 text-destructive font-medium">
                      <span className="font-bold text-[10px] uppercase block mb-1">Rejection Reason</span>
                      {selectedRequest.rejectionReason}
                    </div>
                  )}
                  {selectedRequest.adminNotes && (
                    <div className="pt-2 border-t border-border/40 text-dim">
                      <span className="font-bold text-[10px] uppercase block mb-1">Audit Notes</span>
                      {selectedRequest.adminNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right side: Verification document captures */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CNIC Document Captures</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground font-semibold text-center">CNIC FRONT SIDE</div>
                  <button
                    onClick={() => setLightbox(selectedRequest.cnicFrontImage)}
                    className="w-full aspect-video rounded-xl bg-surface-light border border-border/60 overflow-hidden hover:border-primary transition group relative"
                  >
                    <img src={selectedRequest.cnicFrontImage} alt="CNIC Front" className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition">Click to Zoom</div>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground font-semibold text-center">CNIC BACK SIDE</div>
                  <button
                    onClick={() => setLightbox(selectedRequest.cnicBackImage)}
                    className="w-full aspect-video rounded-xl bg-surface-light border border-border/60 overflow-hidden hover:border-primary transition group relative"
                  >
                    <img src={selectedRequest.cnicBackImage} alt="CNIC Back" className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition">Click to Zoom</div>
                  </button>
                </div>
              </div>

              {/* Action Review Form if Pending */}
              {selectedRequest.status === "pending" && (
                <form onSubmit={handleReviewSubmit} className="pt-4 border-t border-border/40 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Audit Moderation Console</h4>
                  
                  {/* Select Action */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAuditAction("approve")}
                      className={`flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition ${
                        auditAction === "approve"
                          ? "gradient-cyan border-primary text-background glow-cyan font-black"
                          : "bg-surface-light border-border text-muted-foreground hover:text-white"
                      }`}
                    >
                      <Check className="w-4 h-4" /> Approve Verification
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuditAction("reject")}
                      className={`flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition ${
                        auditAction === "reject"
                          ? "bg-destructive border-destructive text-white glow-destructive"
                          : "bg-surface-light border-border text-muted-foreground hover:text-white"
                      }`}
                    >
                      <X className="w-4 h-4" /> Reject Credentials
                    </button>
                  </div>

                  {/* Input details based on selected action */}
                  {auditAction === "reject" && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="text-xs font-semibold text-destructive uppercase tracking-wider">Rejection Reason (Sent to Worker)</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={2}
                        className="w-full bg-input border border-border focus:border-destructive rounded-xl p-3 text-sm focus:outline-none text-white resize-none"
                        placeholder="Explain exactly what was wrong (e.g. image blurry, incorrect CNIC numbers)..."
                      />
                    </div>
                  )}

                  {auditAction && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Internal Audit Notes (Visible to Admins)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full bg-input border border-border focus:border-primary rounded-xl p-3 text-sm focus:outline-none text-white resize-none"
                        placeholder="Add private review audit logs, validation details, etc..."
                      />
                    </div>
                  )}

                  {/* Submit buttons */}
                  {auditAction && (
                    <div className="flex justify-end gap-2 pt-2 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => setAuditAction(null)}
                        className="px-4 h-10 border border-border rounded-xl text-sm font-semibold hover:bg-surface-light transition text-muted-foreground hover:text-white"
                      >
                        Cancel Action
                      </button>
                      <button
                        type="submit"
                        disabled={reviewMutation.isPending}
                        className={`px-5 h-10 rounded-xl font-bold flex items-center justify-center gap-1.5 disabled:opacity-55 ${
                          auditAction === "approve"
                            ? "gradient-cyan text-background glow-cyan font-black"
                            : "bg-destructive text-white"
                        }`}
                      >
                        {reviewMutation.isPending && <Loader className="w-4 h-4 animate-spin" />}
                        Confirm Audit decision
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Image Lightbox Overlay */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Verification document preview"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button aria-label="Close document preview" className="absolute top-4 right-4 p-2.5 rounded-xl bg-surface-light border border-border text-white hover:text-primary transition">
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="Document Zoom" className="max-w-full max-h-full rounded-2xl border border-border shadow-card" />
        </div>
      )}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "N/A";
  return format(date, "dd MMM yyyy HH:mm");
}
