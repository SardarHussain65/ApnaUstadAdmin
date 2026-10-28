import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useDisputeDetails, useResolveDispute } from "@/lib/api-hooks";
import {
  DetailPage,
  DetailBreadcrumbs,
  DetailHeader,
  MetaItem,
  KpiGrid,
  KpiTile,
  DetailGrid,
  Section,
  InfoList,
  InfoRow,
  Timeline,
  DetailLoading,
  DetailError,
} from "@/components/admin/detail-page";
import { CopyableId } from "@/components/ui/copyable-id";
import { Badge, StatusBadge, Avatar } from "@/components/admin/ui";
import { BookingContextPanel } from "@/components/admin/BookingContextPanel";
import { getDisputeReasonLabel } from "./_admin.disputes.index";
import {
  Scale,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  RefreshCw,
  ArrowUpRight,
  Calendar,
  User as UserIcon,
  Wrench,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { fmtPKR } from "@/lib/format";

export const Route = createFileRoute("/_admin/disputes/$id")({
  component: DisputeDetailPage,
});

function DisputeDetailPage() {
  const { id } = Route.useParams();
  const { data: dispute, isLoading, isError, refetch } = useDisputeDetails(id, !!id);
  const resolveMutation = useResolveDispute();

  const [resolutionStatus, setResolutionStatus] = useState<
    "resolved" | "dismissed" | "under_review" | ""
  >("");
  const [adminNotes, setAdminNotes] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [triggerRefund, setTriggerRefund] = useState(false);
  const [workerPenalty, setWorkerPenalty] = useState(0);
  const [triggerPenalty, setTriggerPenalty] = useState(false);
  const [warnCustomer, setWarnCustomer] = useState(false);
  const [warnWorker, setWarnWorker] = useState(false);
  const [blockCustomer, setBlockCustomer] = useState(false);
  const [blockWorker, setBlockWorker] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!dispute) return;
    setAdminNotes(dispute.adminNotes || "");
    setResolutionDetails(dispute.resolutionDetails || "");
    setRefundAmount(dispute.amountDisputed || 0);
  }, [dispute?._id]);

  useEffect(() => {
    if (resolutionStatus === "resolved" && dispute?.amountDisputed) {
      setTriggerRefund(true);
      setRefundAmount(dispute.amountDisputed);
      setWarnCustomer(false);
      setBlockCustomer(false);
    } else if (resolutionStatus === "dismissed") {
      setTriggerRefund(false);
      setRefundAmount(0);
      setTriggerPenalty(false);
      setWorkerPenalty(0);
      setWarnWorker(false);
      setBlockWorker(false);
    }
  }, [resolutionStatus, dispute?.amountDisputed]);

  if (isLoading) return <DetailLoading label="Loading dispute arbitration dossier..." />;
  if (isError || !dispute) {
    return (
      <DetailError
        title="Dispute not found"
        description="The requested dispute record could not be loaded."
        backTo="/disputes"
        backLabel="Back to Disputes"
        onRetry={() => refetch()}
      />
    );
  }

  const bookingId = dispute.booking?._id || dispute.booking;
  const isClosed = dispute.status === "resolved" || dispute.status === "dismissed";

  const handleResolve = async () => {
    if (!resolutionStatus) return;
    if ((blockCustomer || blockWorker) && !blockReason.trim()) {
      toast.error("Please enter a reason before blocking an account");
      return;
    }
    try {
      await resolveMutation.mutateAsync({
        id: dispute._id,
        status: resolutionStatus,
        adminNotes: adminNotes.trim(),
        resolutionDetails: resolutionDetails.trim(),
        refundAmount: triggerRefund ? Number(refundAmount) : 0,
        moderation: {
          warnCustomer,
          warnWorker,
          workerPenalty: triggerPenalty ? Number(workerPenalty) : 0,
          blockCustomer,
          blockWorker,
          blockReason: blockReason.trim(),
        },
      });
      refetch();
    } catch {
      // handled in mutation hook
    }
  };

  const timelineItems = [
    {
      id: "filed",
      title: `Dispute filed by ${dispute.raisedByType === "customer" ? "Customer" : "Ustad"}`,
      subtitle: getDisputeReasonLabel(dispute.reason),
      timestamp: dispute.createdAt
        ? format(new Date(dispute.createdAt), "dd MMM yyyy, hh:mm a")
        : "—",
      tone: "warning" as const,
    },
    ...(dispute.status === "under_review"
      ? [
          {
            id: "review",
            title: "Marked Under Investigation",
            subtitle: "Cash settlement remains held pending admin ruling",
            timestamp: dispute.updatedAt
              ? format(new Date(dispute.updatedAt), "dd MMM yyyy, hh:mm a")
              : "—",
            tone: "info" as const,
          },
        ]
      : []),
    ...(isClosed
      ? [
          {
            id: "closed",
            title:
              dispute.status === "resolved"
                ? "Resolved in Customer's Favour"
                : "Dismissed in Ustad's Favour",
            subtitle: dispute.resolvedBy?.fullName
              ? `By ${dispute.resolvedBy.fullName}`
              : "By Admin",
            timestamp: dispute.resolvedAt
              ? format(new Date(dispute.resolvedAt), "dd MMM yyyy, hh:mm a")
              : "—",
            tone:
              dispute.status === "resolved"
                ? ("success" as const)
                : ("default" as const),
          },
        ]
      : []),
  ];

  return (
    <DetailPage>
      <DetailBreadcrumbs
        items={[
          { label: "Disputes", to: "/disputes" },
          { label: `Case #${String(dispute._id).slice(-8)}` },
        ]}
      />

      <DetailHeader
        title={getDisputeReasonLabel(dispute.reason)}
        subtitle={`Complaint raised by ${
          dispute.raisedByType === "customer" ? "Customer" : "Ustad"
        } on ${
          dispute.booking?.category || "Service Booking"
        }`}
        badges={
          <>
            <StatusBadge status={dispute.status} />
            <Badge variant={dispute.raisedByType === "customer" ? "info" : "orange"}>
              Raised by {dispute.raisedByType === "customer" ? "Customer" : "Ustad"}
            </Badge>
          </>
        }
        meta={
          <>
            <CopyableId id={String(dispute._id)} label="Dispute ID" />
            {dispute.createdAt && (
              <MetaItem icon={<Calendar className="h-3.5 w-3.5" />}>
                Filed {format(new Date(dispute.createdAt), "dd MMM yyyy, hh:mm a")}
              </MetaItem>
            )}
          </>
        }
        actions={
          bookingId ? (
            <Link
              to="/bookings/$id"
              params={{ id: String(bookingId) }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
            >
              Inspect Booking <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : null
        }
      />

      <KpiGrid columns={4}>
        <KpiTile
          label="Disputed Job Value"
          value={fmtPKR(dispute.amountDisputed || 0)}
          sub="Locked from booking total"
          tone="primary"
          icon={<Scale className="h-4 w-4" />}
        />
        <KpiTile
          label="Evidence Photos"
          value={String(dispute.proofImages?.length || 0)}
          sub="Uploaded by complainant"
          icon={<ImageIcon className="h-4 w-4" />}
        />
        <KpiTile
          label="Customer Refunded"
          value={fmtPKR(dispute.moderationApplied?.customerRefund || 0)}
          sub={isClosed ? "Finalized wallet credit" : "Pending ruling"}
          tone={(dispute.moderationApplied?.customerRefund || 0) > 0 ? "success" : "default"}
        />
        <KpiTile
          label="Ustad Penalty"
          value={fmtPKR(dispute.moderationApplied?.workerPenalty || 0)}
          sub={isClosed ? "Finalized wallet debit" : "Pending ruling"}
          tone={(dispute.moderationApplied?.workerPenalty || 0) > 0 ? "danger" : "default"}
        />
      </KpiGrid>

      <DetailGrid
        main={
          <>
            {/* Complainant Statement & Proof */}
            <Section
              title="Complaint Statement & Evidence"
              description="Statement and photo attachments submitted from the mobile app"
              icon={<FileText className="h-4 w-4" />}
            >
              <div className="space-y-4">
                <div className="rounded-xl border border-hairline bg-surface p-4 text-sm leading-relaxed text-foreground">
                  "{dispute.description || "No written statement provided."}"
                </div>

                {dispute.proofImages && dispute.proofImages.length > 0 ? (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Attached Proof ({dispute.proofImages.length})
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {dispute.proofImages.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLightbox(img)}
                          className="group aspect-[4/3] overflow-hidden rounded-xl border border-hairline bg-surface transition hover:border-primary"
                        >
                          <img
                            src={img}
                            alt={`Evidence ${idx + 1}`}
                            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No photo evidence was attached to this complaint.
                  </div>
                )}
              </div>
            </Section>

            {/* Booking Context & Chat */}
            <Section
              title="Linked Booking & Chat Transcript"
              description="Review the booking timeline, payment snapshot, and messages between Customer and Ustad"
            >
              <BookingContextPanel bookingId={bookingId ? String(bookingId) : null} />
            </Section>

            {/* Administrative Resolution Console */}
            <Section
              title="Admin Arbitration & Ruling"
              description={
                isClosed
                  ? "This complaint has been closed. Review the recorded ruling below."
                  : "Select an outcome, configure wallet refund or penalty, and notify both parties."
              }
              icon={<Landmark className="h-4 w-4" />}
            >
              {!isClosed ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Card 1: Full Client Refund */}
                    <button
                      type="button"
                      onClick={() => {
                        setResolutionStatus("resolved");
                        setTriggerRefund(true);
                        setRefundAmount(dispute.amountDisputed || 0);
                      }}
                      className={`flex flex-col justify-between gap-1.5 rounded-xl border p-3.5 text-left transition ${
                        resolutionStatus === "resolved" &&
                        triggerRefund &&
                        refundAmount === dispute.amountDisputed
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-hairline bg-surface hover:border-emerald-500/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                          <CheckCircle2 className="h-4 w-4" /> Full Client Refund
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">100%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Debit Ustad wallet and credit {fmtPKR(dispute.amountDisputed || 0)} to Customer.
                      </div>
                    </button>

                    {/* Card 2: Partial Refund / Split */}
                    <button
                      type="button"
                      onClick={() => {
                        setResolutionStatus("resolved");
                        setTriggerRefund(true);
                        setRefundAmount(Math.round((dispute.amountDisputed || 0) / 2));
                      }}
                      className={`flex flex-col justify-between gap-1.5 rounded-xl border p-3.5 text-left transition ${
                        resolutionStatus === "resolved" &&
                        triggerRefund &&
                        refundAmount !== dispute.amountDisputed
                          ? "border-primary bg-primary/10"
                          : "border-hairline bg-surface hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                          <Scale className="h-4 w-4" /> Partial Refund / Split
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">Custom</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Refund a custom portion of the job amount between Customer and Ustad.
                      </div>
                    </button>

                    {/* Card 3: Dismiss / Release to Ustad */}
                    <button
                      type="button"
                      onClick={() => {
                        setResolutionStatus("dismissed");
                        setTriggerRefund(false);
                        setRefundAmount(0);
                      }}
                      className={`flex flex-col justify-between gap-1.5 rounded-xl border p-3.5 text-left transition ${
                        resolutionStatus === "dismissed"
                          ? "border-sky-500 bg-sky-500/10"
                          : "border-hairline bg-surface hover:border-sky-500/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-sky-500">
                          <ShieldCheck className="h-4 w-4" /> Dismiss & Release to Ustad
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">Dismiss</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Complaint not upheld. Unblock cash confirmation and release earnings to Ustad.
                      </div>
                    </button>

                    {/* Card 4: Under Investigation */}
                    <button
                      type="button"
                      onClick={() => {
                        setResolutionStatus("under_review");
                        setTriggerRefund(false);
                        setRefundAmount(0);
                      }}
                      className={`flex flex-col justify-between gap-1.5 rounded-xl border p-3.5 text-left transition ${
                        resolutionStatus === "under_review"
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-hairline bg-surface hover:border-amber-500/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                          <Clock className="h-4 w-4" /> Keep Under Review
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">Hold</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Keep cash settlement on hold while gathering additional evidence.
                      </div>
                    </button>
                  </div>

                  {resolutionStatus === "resolved" && dispute.amountDisputed > 0 && (
                    <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-emerald-500">
                          Refund Amount to Customer
                        </span>
                        <span className="font-mono text-sm font-bold text-foreground">
                          {fmtPKR(refundAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={dispute.amountDisputed}
                          step={50}
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(Number(e.target.value))}
                          className="flex-1 cursor-pointer accent-primary"
                        />
                        <input
                          type="number"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(Number(e.target.value))}
                          max={dispute.amountDisputed}
                          min={0}
                          className="h-9 w-28 rounded-lg border border-hairline bg-card px-2.5 font-mono text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRefundAmount(dispute.amountDisputed)}
                          className="rounded-lg border border-hairline bg-card px-2.5 py-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          100% ({fmtPKR(dispute.amountDisputed)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRefundAmount(Math.round(dispute.amountDisputed / 2))}
                          className="rounded-lg border border-hairline bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                        >
                          50% ({fmtPKR(Math.round(dispute.amountDisputed / 2))})
                        </button>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2 border-t border-hairline pt-3">
                        <input
                          type="checkbox"
                          checked={triggerPenalty}
                          onChange={(e) => setTriggerPenalty(e.target.checked)}
                          className="h-4 w-4 rounded accent-amber-500"
                        />
                        <span className="text-xs font-bold uppercase text-amber-500">
                          Extra Ustad Penalty (deducted from wallet)
                        </span>
                      </label>

                      {triggerPenalty && (
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">
                            Penalty Amount (PKR)
                          </label>
                          <input
                            type="number"
                            value={workerPenalty}
                            onChange={(e) => setWorkerPenalty(Number(e.target.value))}
                            min={0}
                            className="h-9 w-36 rounded-lg border border-hairline bg-card px-3 font-mono text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2 border-t border-hairline pt-3">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={warnWorker}
                            onChange={(e) => setWarnWorker(e.target.checked)}
                            className="h-4 w-4 rounded accent-primary"
                          />
                          <span className="text-xs text-foreground">
                            Send official warning to Ustad
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={blockWorker}
                            onChange={(e) => setBlockWorker(e.target.checked)}
                            className="h-4 w-4 rounded accent-destructive"
                          />
                          <span className="text-xs font-semibold text-destructive">
                            Block / suspend Ustad account
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {resolutionStatus === "dismissed" && (
                    <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">
                        Optional Customer Moderation
                      </p>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={warnCustomer}
                          onChange={(e) => setWarnCustomer(e.target.checked)}
                          className="h-4 w-4 rounded accent-primary"
                        />
                        <span className="text-xs text-foreground">
                          Send official warning to Customer
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={blockCustomer}
                          onChange={(e) => setBlockCustomer(e.target.checked)}
                          className="h-4 w-4 rounded accent-destructive"
                        />
                        <span className="text-xs font-semibold text-destructive">
                          Block / suspend Customer account
                        </span>
                      </label>
                    </div>
                  )}

                  {(blockCustomer || blockWorker) && (
                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase text-destructive">
                        Account Suspension Reason (Required)
                      </label>
                      <input
                        type="text"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="e.g. Repeated false complaints / severe misconduct"
                        className="h-10 w-full rounded-xl border border-destructive/40 bg-surface px-3.5 text-sm text-foreground focus:border-destructive focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Message to Both Parties
                    </label>
                    <textarea
                      value={resolutionDetails}
                      onChange={(e) => setResolutionDetails(e.target.value)}
                      placeholder="Explain your decision in clear language (shared with Customer and Ustad)..."
                      rows={4}
                      className="w-full rounded-xl border border-hairline bg-surface p-3.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Internal Admin Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Internal audit notes..."
                      className="h-10 w-full rounded-xl border border-hairline bg-surface px-3.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleResolve}
                    disabled={!resolutionStatus || resolveMutation.isPending}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
                  >
                    {resolveMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Save Ruling & Notify Parties
                  </button>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
                    <Check className="h-4 w-4" /> Official Ruling Recorded
                  </div>
                  <InfoList columns={2}>
                    <InfoRow
                      label="Outcome"
                      value={<StatusBadge status={dispute.status} />}
                    />
                    <InfoRow
                      label="Resolved By"
                      value={dispute.resolvedBy?.fullName || "System Admin"}
                    />
                    <InfoRow
                      label="Resolved At"
                      value={
                        dispute.resolvedAt
                          ? format(new Date(dispute.resolvedAt), "dd MMM yyyy, hh:mm a")
                          : "—"
                      }
                    />
                    <InfoRow
                      label="Internal Notes"
                      value={dispute.adminNotes || "—"}
                    />
                  </InfoList>
                  {dispute.resolutionDetails && (
                    <div className="rounded-lg border border-hairline bg-card p-3 text-sm italic text-foreground">
                      "{dispute.resolutionDetails}"
                    </div>
                  )}
                </div>
              )}
            </Section>
          </>
        }
        rail={
          <>
            {/* Customer Card */}
            <Section title="Customer" icon={<UserIcon className="h-4 w-4" />}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={dispute.customer?.profileImage}
                    name={dispute.customer?.fullName || "Customer"}
                    size={42}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-foreground">
                      {dispute.customer?.fullName || "Customer"}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {dispute.customer?.phone || "—"}
                    </div>
                  </div>
                </div>
                {dispute.customer?._id && (
                  <Link
                    to="/users/$id"
                    params={{ id: String(dispute.customer._id) }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
                  >
                    Open Customer Profile <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </Section>

            {/* Ustad Card */}
            <Section title="Ustad (Worker)" icon={<Wrench className="h-4 w-4" />}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={dispute.worker?.profileImage}
                    name={dispute.worker?.fullName || "Ustad"}
                    size={42}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-foreground">
                      {dispute.worker?.fullName || "Ustad"}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {dispute.worker?.phone || "—"}
                    </div>
                  </div>
                </div>
                {dispute.worker?._id && (
                  <Link
                    to="/workers/$id"
                    params={{ id: String(dispute.worker._id) }}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
                  >
                    Open Ustad Profile <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </Section>

            {/* Case Timeline */}
            <Section title="Case Timeline" icon={<Clock className="h-4 w-4" />}>
              <Timeline items={timelineItems} />
            </Section>
          </>
        }
      />

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Dispute evidence preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close evidence preview"
            className="absolute right-4 top-4 rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <XCircle className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Dispute proof"
            className="max-h-full max-w-full rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </DetailPage>
  );
}

