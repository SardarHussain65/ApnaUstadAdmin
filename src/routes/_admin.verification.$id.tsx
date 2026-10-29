import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Fingerprint,
  Loader,
  Maximize2,
  RotateCw,
  ShieldCheck,
  User,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
  ArrowUpRight,
  Calendar,
  History,
} from "lucide-react";
import {
  DetailPage,
  DetailBreadcrumbs,
  DetailHeader,
  MetaItem,
  Section,
  InfoList,
  InfoRow,
  DetailLoading,
  DetailError,
} from "@/components/admin/detail-page";
import { Badge } from "@/components/admin/ui";
import { Modal, ModalBody, ModalFooter } from "@/components/admin/Drawer";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import { CopyableId } from "@/components/ui/copyable-id";
import { format } from "date-fns";
import {
  useVerificationRequestDetails,
  useVerificationRequestsPage,
  useReviewVerificationRequest,
} from "@/lib/api-hooks";
import { toast } from "sonner";
import { formatCnic } from "@/lib/format";
import type { VerificationRequest } from "./_admin.verification.index";

export const Route = createFileRoute("/_admin/verification/$id")({
  component: VerificationDetailPage,
});

const NADRA_REUPLOAD_PRESETS = [
  "CNIC front document is blurry or unreadable",
  "CNIC back document is blurry or unreadable",
  "Facial image does not clearly match photo on CNIC card",
  "CNIC document has expired — please provide valid CNIC",
  "Document corners cut off — entire card must be visible",
  "Glare or reflection obscuring name or CNIC number",
];

function VerificationDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const {
    data: selectedRequest,
    isLoading,
    isError,
    refetch,
  } = useVerificationRequestDetails(id, !!id);

  // Also fetch pending queue so Prev / Next navigation works seamlessly
  const { data: queueData } = useVerificationRequestsPage({
    page: 1,
    limit: 50,
    status: "pending",
  });
  const queueItems: VerificationRequest[] = (queueData?.items as any) || [];

  const reviewMutation = useReviewVerificationRequest();

  const [cnicTab, setCnicTab] = useState<"front" | "back">("front");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [auditNotes, setAuditNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [reuploadModalOpen, setReuploadModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  useEffect(() => {
    if (!selectedRequest) return;
    setAuditNotes(selectedRequest.adminNotes || "");
    setRejectionReason(selectedRequest.rejectionReason || "");
    setSelectedPreset("");
    setCnicTab("front");
    setZoomLevel(1);
    setRotation(0);
  }, [selectedRequest?._id]);

  if (isLoading) return <DetailLoading label="Loading identity verification submission..." />;
  if (isError || !selectedRequest) {
    return (
      <DetailError
        title="Verification request not found"
        description="The requested identity verification record could not be loaded."
        backTo="/verification"
        backLabel="Back to Verification Queue"
        onRetry={() => refetch()}
      />
    );
  }

  const currentIndex = queueItems.findIndex(
    (item) => String(item._id) === String(selectedRequest._id)
  );
  const prevItem = currentIndex > 0 ? queueItems[currentIndex - 1] : null;
  const nextItem =
    currentIndex >= 0 && currentIndex < queueItems.length - 1
      ? queueItems[currentIndex + 1]
      : queueItems.find((item) => String(item._id) !== String(selectedRequest._id)) || null;

  const advanceOrRefetch = () => {
    refetch();
    if (nextItem) {
      navigate({ to: "/verification/$id", params: { id: String(nextItem._id) } });
    }
  };

  const handleApprove = () => {
    reviewMutation.mutate(
      {
        id: selectedRequest._id,
        status: "approved",
        adminNotes: auditNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            `Verification approved for ${selectedRequest.worker?.fullName || "Worker"}`
          );
          advanceOrRefetch();
        },
      }
    );
  };

  const handleSendReupload = () => {
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
          toast.success(
            `Re-upload requested from ${selectedRequest.worker?.fullName || "Worker"}`
          );
          setReuploadModalOpen(false);
          advanceOrRefetch();
        },
      }
    );
  };

  return (
    <DetailPage>
      <DetailBreadcrumbs
        items={[
          { label: "CNIC Verification", to: "/verification" },
          {
            label: `${selectedRequest.worker?.fullName || "Ustad"} (${formatCnic(
              selectedRequest.cnicNumber
            )})`,
          },
        ]}
      />

      <DetailHeader
        title={selectedRequest.worker?.fullName || "Ustad Identity Submission"}
        subtitle={`${selectedRequest.worker?.category || "General"} · ${
          selectedRequest.worker?.city || "Pakistan"
        } · CNIC ${formatCnic(selectedRequest.cnicNumber)}`}
        badges={
          <>
            {selectedRequest.status === "approved" ? (
              <Badge variant="success">Verified</Badge>
            ) : selectedRequest.status === "rejected" ? (
              <Badge variant="danger">Rejected</Badge>
            ) : (
              <Badge variant="warning" pulse>
                Pending Review
              </Badge>
            )}
            <Badge variant="orange">{selectedRequest.worker?.category || "General"}</Badge>
          </>
        }
        meta={
          <>
            <CopyableId id={String(selectedRequest._id)} label="Request ID" />
            {selectedRequest.createdAt && (
              <MetaItem icon={<Calendar className="h-3.5 w-3.5" />}>
                Submitted {format(new Date(selectedRequest.createdAt), "dd MMM yyyy, hh:mm a")}
              </MetaItem>
            )}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!prevItem}
              onClick={() =>
                prevItem &&
                navigate({ to: "/verification/$id", params: { id: String(prevItem._id) } })
              }
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 text-xs font-medium text-foreground hover:border-primary/40 disabled:opacity-40"
              title="Previous pending request"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button
              type="button"
              disabled={!nextItem}
              onClick={() =>
                nextItem &&
                navigate({ to: "/verification/$id", params: { id: String(nextItem._id) } })
              }
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 text-xs font-medium text-foreground hover:border-primary/40 disabled:opacity-40"
              title="Next pending request"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
            {selectedRequest.worker?._id && (
              <Link
                to="/workers/$id"
                params={{ id: String(selectedRequest.worker._id) }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
              >
                Full Ustad Profile <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        }
      />

      {/* Side-by-Side Facial Match & CNIC Inspector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT PANE: Worker Profile Photo & Facial Match */}
        <Section
          title="1. Ustad Profile Photo"
          description="Compare face photo against the photo on the CNIC card"
          icon={<User className="h-4 w-4" />}
          actions={<Badge variant="info">Profile Photo</Badge>}
        >
          <div className="space-y-4">
            <div
              className="group relative mx-auto flex aspect-square max-h-[340px] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-xl border border-hairline bg-surface"
              onClick={() =>
                selectedRequest.worker?.profileImage &&
                setLightboxUrl(selectedRequest.worker.profileImage)
              }
            >
              {selectedRequest.worker?.profileImage ? (
                <img
                  src={selectedRequest.worker.profileImage}
                  alt="Profile Capture"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  <User className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  No custom profile photo uploaded
                </div>
              )}
              {selectedRequest.worker?.profileImage && (
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                  <ZoomIn className="h-4 w-4" /> Zoom Profile Photo
                </div>
              )}
            </div>

            <InfoList columns={2}>
              <InfoRow
                label="Full Name"
                value={selectedRequest.worker?.fullName || "—"}
              />
              <InfoRow
                label="Phone Number"
                value={selectedRequest.worker?.phone || "—"}
                mono
              />
              <InfoRow
                label="City"
                value={selectedRequest.worker?.city || "Pakistan"}
              />
              <InfoRow
                label="Trade Category"
                value={selectedRequest.worker?.category || "General"}
              />
            </InfoList>

            <div className="space-y-2 border-t border-hairline pt-3 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Facial Match Checklist
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-hairline accent-primary"
                />
                <span>Face is unobstructed (no mask or dark sunglasses)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-hairline accent-primary"
                />
                <span>Facial structure matches CNIC ID photo</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-hairline accent-primary"
                />
                <span>Approximate age matches date of birth on CNIC</span>
              </label>
            </div>
          </div>
        </Section>

        {/* RIGHT PANE: CNIC Photos */}
        <Section
          title="2. CNIC Photos"
          description="Check both sides of the CNIC card to make sure name and photo are clear"
          icon={<Fingerprint className="h-4 w-4" />}
          actions={
            <div className="flex items-center rounded-lg border border-hairline bg-surface p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCnicTab("front");
                  setRotation(0);
                }}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  cnicTab === "front"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
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
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  cnicTab === "back"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Back Side
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">
                  Submitted CNIC Number
                </div>
                <div className="mt-0.5 font-mono text-sm font-bold tracking-widest text-primary">
                  {formatCnic(selectedRequest.cnicNumber)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedRequest.cnicNumber);
                  toast.success("CNIC copied to clipboard");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>

            <div>
              <div
                className="group relative flex aspect-[16/10] max-h-[340px] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-xl border border-hairline bg-surface"
                onClick={() =>
                  setLightboxUrl(
                    cnicTab === "front"
                      ? selectedRequest.cnicFrontImage
                      : selectedRequest.cnicBackImage
                  )
                }
              >
                <img
                  src={
                    cnicTab === "front"
                      ? selectedRequest.cnicFrontImage
                      : selectedRequest.cnicBackImage
                  }
                  alt={`CNIC ${cnicTab}`}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                  className="h-full w-full object-contain transition duration-200"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                  <Maximize2 className="h-4 w-4" /> Fullscreen View
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                    className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface p-1.5 text-xs text-muted-foreground hover:text-foreground"
                    title="Zoom out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2 font-mono text-xs text-muted-foreground">
                    {zoomLevel}x
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                    className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface p-1.5 text-xs text-muted-foreground hover:text-foreground"
                    title="Zoom in"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <RotateCw className="h-3.5 w-3.5" /> Rotate ({rotation}°)
                </button>
              </div>
            </div>

            <div className="space-y-2 border-t border-hairline pt-3 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                NADRA Document Checks
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-hairline accent-primary"
                />
                <span>Printed name matches Ustad profile name</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-hairline accent-primary"
                />
                <span>CNIC number on card matches typed 13-digit CNIC</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-hairline accent-primary"
                />
                <span>Document is unexpired and all four corners are visible</span>
              </label>
            </div>
          </div>
        </Section>
      </div>

      {/* Audit Decision Console OR Recorded Audit Log */}
      {selectedRequest.status === "pending" ? (
        <Section
          title="Audit Decision Console"
          description="Approve to grant the Verified Ustad badge, request a clearer re-upload, or reject permanently."
          icon={<ShieldCheck className="h-4 w-4" />}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Internal Audit Notes (Optional)
              </label>
              <textarea
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                rows={2}
                placeholder="Internal audit notes (e.g. NADRA card validated, clear facial match)..."
                className="w-full rounded-xl border border-hairline bg-surface p-3 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleApprove}
                disabled={reviewMutation.isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50 sm:flex-1"
              >
                {reviewMutation.isPending ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve Verification
              </button>

              <button
                type="button"
                onClick={() => setReuploadModalOpen(true)}
                disabled={reviewMutation.isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 text-xs font-bold text-amber-500 transition hover:bg-amber-500/20 sm:w-auto"
              >
                <RotateCw className="h-4 w-4" /> Request Re-upload
              </button>

              <button
                type="button"
                onClick={() => setRejectDialogOpen(true)}
                disabled={reviewMutation.isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-5 text-xs font-bold text-destructive transition hover:bg-destructive/20 sm:w-auto"
              >
                <XCircle className="h-4 w-4" /> Reject Permanently
              </button>
            </div>
          </div>
        </Section>
      ) : (
        <Section
          title="Recorded Audit Decision"
          description="This verification submission has already been reviewed."
          icon={<ShieldCheck className="h-4 w-4" />}
        >
          <div className="space-y-3">
            <InfoList columns={3}>
              <InfoRow
                label="Decision"
                value={
                  selectedRequest.status === "approved" ? (
                    <Badge variant="success">Approved</Badge>
                  ) : (
                    <Badge variant="danger">Rejected</Badge>
                  )
                }
              />
              <InfoRow
                label="Reviewed By"
                value={selectedRequest.reviewedBy?.fullName || "System Admin"}
              />
              <InfoRow
                label="Reviewed At"
                value={
                  selectedRequest.reviewedAt
                    ? format(new Date(selectedRequest.reviewedAt), "dd MMM yyyy, HH:mm")
                    : "—"
                }
              />
            </InfoList>
            {selectedRequest.rejectionReason && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                Rejection Reason: {selectedRequest.rejectionReason}
              </div>
            )}
            {selectedRequest.adminNotes && (
              <div className="rounded-xl border border-hairline bg-surface p-3 text-xs text-muted-foreground">
                Admin Notes: {selectedRequest.adminNotes}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Prior Verification History for this Worker */}
      {selectedRequest.history && selectedRequest.history.length > 0 && (
        <Section
          title={`Prior Submissions by ${selectedRequest.worker?.fullName || "Ustad"} (${
            selectedRequest.history.length
          })`}
          icon={<History className="h-4 w-4" />}
        >
          <div className="divide-y divide-hairline">
            {selectedRequest.history.map((h: VerificationRequest) => (
              <div
                key={h._id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      h.status === "approved"
                        ? "success"
                        : h.status === "rejected"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {h.status}
                  </Badge>
                  <span className="font-mono text-foreground">
                    {formatCnic(h.cnicNumber)}
                  </span>
                  <span className="text-muted-foreground">
                    {h.createdAt ? format(new Date(h.createdAt), "dd MMM yyyy") : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {h.rejectionReason && (
                    <span className="text-destructive">{h.rejectionReason}</span>
                  )}
                  <Link
                    to="/verification/$id"
                    params={{ id: String(h._id) }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Request Re-upload Modal */}
      <Modal
        open={reuploadModalOpen}
        onClose={() => setReuploadModalOpen(false)}
        title="Request CNIC Re-upload"
        description="Notify Ustad to re-capture and upload clear identity documents."
        variant="warning"
        footer={
          <ModalFooter>
            <button
              type="button"
              onClick={() => setReuploadModalOpen(false)}
              className="rounded-xl border border-hairline px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendReupload}
              disabled={reviewMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600"
            >
              <RotateCw className="h-3.5 w-3.5" /> Send Re-upload Request
            </button>
          </ModalFooter>
        }
      >
        <ModalBody>
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                  className={`w-full rounded-xl border p-2.5 text-left text-xs transition ${
                    selectedPreset === preset
                      ? "border-amber-500 bg-amber-500/15 font-bold text-amber-500"
                      : "border-hairline bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Custom Re-upload Instructions
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setSelectedPreset("");
                }}
                rows={2}
                placeholder="Or type specific instructions for the Ustad..."
                className="w-full rounded-xl border border-hairline bg-surface p-3 text-xs text-foreground focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* Reject Verification Confirm Dialog */}
      <ConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title={`Reject verification for ${selectedRequest.worker?.fullName || "Ustad"}?`}
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
          advanceOrRefetch();
        }}
      />

      {/* Lightbox Zoom Overlay */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image Zoom"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="mb-3 flex items-center gap-3 rounded-2xl border border-white/15 bg-black/60 px-4 py-2 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="flex items-center gap-1 text-xs font-bold text-white"
            >
              <X className="h-4 w-4" /> Close Zoom
            </button>
          </div>

          <img
            src={lightboxUrl}
            alt="Inspection Zoom"
            className="max-h-[85vh] max-w-[90vw] rounded-2xl border border-white/15 object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </DetailPage>
  );
}

