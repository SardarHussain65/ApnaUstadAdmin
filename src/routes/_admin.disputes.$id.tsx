import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  useDisputeDetails,
  useResolveDispute,
  useAdminDisputeMessages,
  useSendAdminDisputeMessage,
  type DisputeMessage,
} from "@/lib/api-hooks";
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
import { getSocket } from "@/lib/socket";
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
  MessageSquare,
  Send,
  Reply,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
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

  const { data: messagesData, refetch: refetchMessages } = useAdminDisputeMessages(id, !!id);
  const sendMessageMutation = useSendAdminDisputeMessage(id);

  const [messageInput, setMessageInput] = useState("");
  const [replyTarget, setReplyTarget] = useState<DisputeMessage | null>(null);

  const [resolutionStatus, setResolutionStatus] = useState<
    "resolved" | "dismissed" | "under_review" | ""
  >("");
  const [adminNotes, setAdminNotes] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [refundWorkerCommission, setRefundWorkerCommission] = useState(false);
  const [workerCommissionRefund, setWorkerCommissionRefund] = useState<number>(0);
  const [workerPenalty, setWorkerPenalty] = useState(0);
  const [triggerPenalty, setTriggerPenalty] = useState(false);
  const [warnCustomer, setWarnCustomer] = useState(false);
  const [warnWorker, setWarnWorker] = useState(false);
  const [blockCustomer, setBlockCustomer] = useState(false);
  const [blockWorker, setBlockWorker] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [showAdvancedModeration, setShowAdvancedModeration] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const bookingCommission = Number(
    dispute?.booking?.agreement?.commissionAmount ?? dispute?.booking?.platformFee ?? 0
  );

  // Sync initial values from dispute
  useEffect(() => {
    if (!dispute) return;
    setAdminNotes(dispute.adminNotes || "");
    setResolutionDetails(dispute.resolutionDetails || "");
    const initialComm = Number(
      dispute.booking?.agreement?.commissionAmount ?? dispute.booking?.platformFee ?? 0
    );
    setWorkerCommissionRefund(initialComm);
  }, [dispute?._id]);

  // Live Socket connection for dispute messages & updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (msg.disputeId === id || msg.dispute === id) {
        refetchMessages();
        refetch();
      }
    };

    const handleDisputeUpdate = (payload: any) => {
      if (payload.disputeId === id) {
        refetch();
      }
    };

    socket.on("dispute:message", handleNewMessage);
    socket.on("dispute:updated", handleDisputeUpdate);

    return () => {
      socket.off("dispute:message", handleNewMessage);
      socket.off("dispute:updated", handleDisputeUpdate);
    };
  }, [id, refetchMessages, refetch]);

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
  const isClosed =
    dispute.status === "resolved" ||
    dispute.status === "dismissed" ||
    dispute.status === "withdrawn";

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageInput.trim();
    if (!text || sendMessageMutation.isPending) return;

    try {
      await sendMessageMutation.mutateAsync({
        content: text,
        replyTo: replyTarget?._id || null,
      });
      setMessageInput("");
      setReplyTarget(null);
      refetchMessages();
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      // handled in mutation hook
    }
  };

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
        refundWorkerCommission,
        workerCommissionRefund: refundWorkerCommission ? Number(workerCommissionRefund) : 0,
        moderation: {
          warnCustomer,
          warnWorker,
          workerPenalty: triggerPenalty ? Number(workerPenalty) : 0,
          refundWorkerCommission,
          workerCommissionRefund: refundWorkerCommission ? Number(workerCommissionRefund) : 0,
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

  // Build Stored Timeline from dispute.timeline
  const timelineItems =
    dispute.timeline && dispute.timeline.length > 0
      ? dispute.timeline.map((ev, index) => {
          const tone =
            ev.type === "resolved"
              ? ("success" as const)
              : ev.type === "dismissed" || ev.type === "withdrawn"
              ? ("default" as const)
              : ev.type === "under_review"
              ? ("info" as const)
              : ("warning" as const);

          const title =
            ev.type === "opened"
              ? `Complaint Filed by ${ev.actorType === "customer" ? "Customer" : "Ustad"}`
              : ev.type === "evidence_added"
              ? `Evidence Photos Added (${ev.actorName || ev.actorType})`
              : ev.type === "under_review"
              ? "Under Investigation by ApnaUstad Team"
              : ev.type === "withdrawn"
              ? "Complaint Withdrawn (Settled by Parties)"
              : ev.type === "resolved"
              ? "Resolved in Customer's Favour"
              : ev.type === "dismissed"
              ? "Dismissed in Ustad's Favour"
              : "Case Closed";

          return {
            id: `timeline-${index}`,
            title,
            subtitle: ev.note || (ev.actorName ? `By ${ev.actorName}` : ""),
            timestamp: ev.at ? format(new Date(ev.at), "dd MMM yyyy, hh:mm a") : "—",
            tone,
          };
        })
      : [
          {
            id: "filed",
            title: `Dispute filed by ${
              dispute.raisedByType === "customer" ? "Customer" : "Ustad"
            }`,
            subtitle: getDisputeReasonLabel(dispute.reason),
            timestamp: dispute.createdAt
              ? format(new Date(dispute.createdAt), "dd MMM yyyy, hh:mm a")
              : "—",
            tone: "warning" as const,
          },
        ];

  const messagesList = [...(messagesData?.messages || [])]
    .filter((msg) => {
      // Do not duplicate the initial complaint description in the chat stream
      if (
        msg.kind === "message" &&
        dispute &&
        msg.senderType === dispute.raisedByType &&
        dispute.description &&
        msg.content?.trim() === dispute.description?.trim()
      ) {
        return false;
      }
      return true;
    })
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

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
        } on ${dispute.booking?.category || "Service Booking"}`}
        badges={
          <>
            <StatusBadge status={dispute.status} />
            <Badge variant={dispute.raisedByType === "customer" ? "info" : "orange"}>
              Raised by {dispute.raisedByType === "customer" ? "Customer" : "Ustad"}
            </Badge>
            {isClosed && dispute.outcomeLabel && (
              <Badge variant="success">{dispute.outcomeLabel}</Badge>
            )}
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

      {/* Cash Model Informational Alert */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-xs text-muted-foreground">
        <Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <span className="font-bold text-foreground">Pakistan Direct Cash Model:</span>
          <p>
            Customer pays cash in person directly to the Ustad. The platform does not hold customer funds;
            only the platform commission was deducted from the Ustad's wallet upon job assignment.
            In case of dispute or default by customer, you can <strong>refund the commission back to the Ustad's wallet</strong>.
            For customer complaints or misconduct, you can issue an official warning or suspend their account.
          </p>
        </div>
      </div>

      <KpiGrid columns={4}>
        <KpiTile
          label="Agreed Job Cash"
          value={fmtPKR(dispute.amountDisputed || 0)}
          sub="Customer pays directly to Ustad"
          tone="primary"
          icon={<Scale className="h-4 w-4" />}
        />
        <KpiTile
          label="App Commission"
          value={fmtPKR(bookingCommission)}
          sub="Deducted from Ustad upon assignment"
          icon={<Landmark className="h-4 w-4" />}
        />
        <KpiTile
          label="Commission Refunded"
          value={fmtPKR(dispute.moderationApplied?.workerCommissionRefund || 0)}
          sub={isClosed ? "Returned to Ustad wallet" : "Can refund to Ustad"}
          tone={(dispute.moderationApplied?.workerCommissionRefund || 0) > 0 ? "success" : "default"}
        />
        <KpiTile
          label="Ustad Penalty"
          value={fmtPKR(dispute.moderationApplied?.workerPenalty || 0)}
          sub={isClosed ? "Deducted penalty" : "Optional fault deduction"}
          tone={(dispute.moderationApplied?.workerPenalty || 0) > 0 ? "danger" : "default"}
        />
      </KpiGrid>

      <DetailGrid
        main={
          <>
            {/* Complainant Statement & Attached Proof */}
            <Section
              title="Complaint Summary & Evidence"
              description="Initial statement and evidence attached by the reporter"
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
                    No photo evidence was attached to the initial complaint.
                  </div>
                )}
              </div>
            </Section>

            {/* 3-Way Case Room Live Chat */}
            <Section
              title="Case Room: 3-Way Arbitration Chat"
              description="Real-time multi-party chat between Customer, Ustad and ApnaUstad Team"
              icon={<MessageSquare className="h-4 w-4 text-primary" />}
            >
              <div className="flex flex-col rounded-xl border border-hairline bg-surface">
                {/* Messages stream */}
                <div className="max-h-[460px] min-h-[280px] space-y-3 overflow-y-auto p-4">
                  {messagesList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-xs font-semibold text-foreground">No messages yet</p>
                      <p className="text-[11px] text-muted-foreground">
                        Post an initial message below to guide both parties toward a resolution.
                      </p>
                    </div>
                  ) : (
                    messagesList.map((msg) => {
                      if (msg.kind === "system" || msg.kind === "decision") {
                        const isDecision = msg.kind === "decision";
                        return (
                          <div key={msg._id} className="flex justify-center my-2">
                            <div
                              className={`max-w-[85%] rounded-xl border p-3 text-center text-xs ${
                                isDecision
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : "border-hairline bg-card/60 text-muted-foreground"
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                                {isDecision ? (
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Scale className="h-3.5 w-3.5 text-primary" />
                                )}
                                {isDecision ? "Official Ruling" : "System Update"}
                              </div>
                              <p className="whitespace-pre-line text-foreground">{msg.content}</p>
                              <span className="mt-1 block text-[10px] text-muted-foreground">
                                {format(new Date(msg.createdAt), "hh:mm a, dd MMM")}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const isAdmin = msg.senderType === "admin";
                      const isWorker = msg.senderType === "worker";

                      return (
                        <div
                          key={msg._id}
                          className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                        >
                          <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px]">
                            {isAdmin ? (
                              <span className="font-bold text-amber-500">
                                {msg.senderName || "ApnaUstad Team"} (You)
                              </span>
                            ) : isWorker ? (
                              <span className="font-bold text-orange-400">
                                {msg.senderName || "Ustad"} (Worker)
                              </span>
                            ) : (
                              <span className="font-bold text-sky-400">
                                {msg.senderName || "Customer"}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(msg.createdAt), "hh:mm a")}
                            </span>
                          </div>

                          <div
                            className={`group relative max-w-[80%] rounded-2xl border p-3 text-sm shadow-sm ${
                              isAdmin
                                ? "border-amber-500/30 bg-amber-500/10 text-foreground"
                                : isWorker
                                ? "border-orange-500/20 bg-orange-500/5 text-foreground"
                                : "border-hairline bg-card text-foreground"
                            }`}
                          >
                            {/* Quoted reply snapshot */}
                            {msg.replySnapshot && (
                              <div className="mb-2 rounded-lg border-l-2 border-primary bg-background/50 p-2 text-xs">
                                <span className="font-bold text-primary">
                                  {msg.replySnapshot.senderName || msg.replySnapshot.senderType}:
                                </span>{" "}
                                <span className="text-muted-foreground">
                                  {msg.replySnapshot.content}
                                </span>
                              </div>
                            )}

                            <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>

                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {msg.attachments.map((url, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setLightbox(url)}
                                    className="h-16 w-16 overflow-hidden rounded-lg border border-hairline"
                                  >
                                    <img
                                      src={url}
                                      alt="Attachment"
                                      className="h-full w-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Reply button */}
                            {!isClosed && (
                              <button
                                type="button"
                                onClick={() => setReplyTarget(msg)}
                                className="absolute -bottom-2 right-2 hidden rounded-md border border-hairline bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow transition hover:text-foreground group-hover:flex items-center gap-1"
                              >
                                <Reply className="h-2.5 w-2.5" /> Reply
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply banner if quoting someone */}
                {replyTarget && (
                  <div className="flex items-center justify-between border-t border-hairline bg-card/60 px-4 py-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Reply className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-primary">
                        Replying to {replyTarget.senderName || replyTarget.senderType}:
                      </span>
                      <span className="truncate text-muted-foreground">{replyTarget.content}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyTarget(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Input form */}
                {!isClosed ? (
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2 border-t border-hairline p-3"
                  >
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Send message to both parties as ApnaUstad Team..."
                      className="h-10 flex-1 rounded-xl border border-hairline bg-card px-3.5 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
                    >
                      {sendMessageMutation.isPending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Send
                    </button>
                  </form>
                ) : (
                  <div className="border-t border-hairline bg-card/40 p-3 text-center text-xs text-muted-foreground">
                    This complaint is closed. The 3-way conversation is preserved in history.
                  </div>
                )}
              </div>
            </Section>

            {/* Linked Booking Context */}
            <Section
              title="Linked Booking & System Messages"
              description="Review original booking timeline and direct worker-client chat"
            >
              <BookingContextPanel bookingId={bookingId ? String(bookingId) : null} />
            </Section>
          </>
        }
        rail={
          <>
            {/* Customer Profile */}
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

            {/* Ustad Profile */}
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

            {/* Administrative Resolution Console */}
            <Section
              title="Official Ruling & Actions"
              description={
                isClosed
                  ? "Case resolved and archived in history."
                  : "Choose an outcome and notify parties."
              }
              icon={<Landmark className="h-4 w-4" />}
            >
              {!isClosed ? (
                <div className="space-y-4">
                  {/* Step 1: Outcome Selection */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setResolutionStatus("resolved")}
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
                        resolutionStatus === "resolved"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-hairline bg-surface hover:border-emerald-500/40 text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                        <CheckCircle2 className="h-4 w-4" /> Rule in Customer Favor
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Customer complaint upheld. Cash payment agreement cancelled.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResolutionStatus("dismissed")}
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
                        resolutionStatus === "dismissed"
                          ? "border-sky-500 bg-sky-500/10 text-sky-400"
                          : "border-hairline bg-surface hover:border-sky-500/40 text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-sky-500">
                        <ShieldCheck className="h-4 w-4" /> Rule in Ustad Favor
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Ustad cleared. Job cash payment continues.
                      </span>
                    </button>
                  </div>

                  {/* One-click "Under review" button if still checking */}
                  {dispute.status === "open" && (
                    <button
                      type="button"
                      onClick={() => {
                        setResolutionStatus("under_review");
                        handleResolve();
                      }}
                      className="w-full text-center text-xs font-semibold text-amber-500 hover:underline py-1"
                    >
                      Mark Under Investigation (Hold)
                    </button>
                  )}

                  {/* Ustad Commission Refund (Available on any ruling to protect worker) */}
                  <div className="space-y-2 rounded-xl border border-hairline bg-surface p-3 text-xs">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5 text-primary" />
                        Refund Commission to Ustad Wallet
                      </span>
                      <input
                        type="checkbox"
                        checked={refundWorkerCommission}
                        onChange={(e) => setRefundWorkerCommission(e.target.checked)}
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                      />
                    </label>

                    {refundWorkerCommission && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-hairline">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Refund Amount</span>
                          <span className="font-mono font-bold text-primary">
                            {fmtPKR(workerCommissionRefund)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={workerCommissionRefund}
                            onChange={(e) => setWorkerCommissionRefund(Number(e.target.value))}
                            placeholder="Commission PKR"
                            className="h-8 flex-1 rounded border border-hairline bg-card px-2 font-mono text-xs"
                          />
                          {bookingCommission > 0 && (
                            <button
                              type="button"
                              onClick={() => setWorkerCommissionRefund(bookingCommission)}
                              className="rounded border border-hairline bg-card px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/10"
                            >
                              Full ({fmtPKR(bookingCommission)})
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Refunds the platform commission back into the Ustad's wallet balance.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Decision Explanation Note */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Decision Note (Sent to Both Parties)
                    </label>
                    <textarea
                      value={resolutionDetails}
                      onChange={(e) => setResolutionDetails(e.target.value)}
                      placeholder="Explain the ruling clearly to both sides..."
                      rows={3}
                      className="w-full rounded-xl border border-hairline bg-surface p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Collapsible Account Moderation */}
                  <div className="border-t border-hairline pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedModeration(!showAdvancedModeration)}
                      className="flex w-full items-center justify-between py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <span>Account Actions & Penalties</span>
                      {showAdvancedModeration ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {showAdvancedModeration && (
                      <div className="mt-2 space-y-2 rounded-xl border border-hairline bg-card/40 p-3 text-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Customer Actions
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={warnCustomer}
                            onChange={(e) => setWarnCustomer(e.target.checked)}
                            className="rounded accent-primary"
                          />
                          <span>Send official warning notice to Customer</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={blockCustomer}
                            onChange={(e) => setBlockCustomer(e.target.checked)}
                            className="rounded accent-destructive"
                          />
                          <span className="text-destructive font-medium">Suspend Customer account</span>
                        </label>

                        <div className="pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Ustad Actions
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={triggerPenalty}
                            onChange={(e) => setTriggerPenalty(e.target.checked)}
                            className="rounded accent-amber-500"
                          />
                          <span>Deduct penalty from Ustad wallet</span>
                        </label>
                        {triggerPenalty && (
                          <input
                            type="number"
                            value={workerPenalty}
                            onChange={(e) => setWorkerPenalty(Number(e.target.value))}
                            placeholder="Penalty amount PKR"
                            className="h-8 w-full rounded border border-hairline bg-surface px-2 font-mono text-xs"
                          />
                        )}
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={warnWorker}
                            onChange={(e) => setWarnWorker(e.target.checked)}
                            className="rounded accent-primary"
                          />
                          <span>Send official warning to Ustad</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={blockWorker}
                            onChange={(e) => setBlockWorker(e.target.checked)}
                            className="rounded accent-destructive"
                          />
                          <span className="text-destructive font-medium">Suspend Ustad account</span>
                        </label>

                        {(blockCustomer || blockWorker) && (
                          <div className="pt-2">
                            <label className="mb-1 block text-[10px] font-bold uppercase text-destructive">
                              Suspension Reason (Required)
                            </label>
                            <input
                              type="text"
                              value={blockReason}
                              onChange={(e) => setBlockReason(e.target.value)}
                              placeholder="Reason for suspension..."
                              className="h-8 w-full rounded border border-destructive/40 bg-surface px-2 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
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
                    Record Ruling & Close Dispute
                  </button>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-500">
                    <Check className="h-4 w-4" /> Case Closed in History
                  </div>
                  <InfoList columns={1}>
                    <InfoRow label="Outcome" value={<StatusBadge status={dispute.status} />} />
                    <InfoRow
                      label="Resolved At"
                      value={
                        dispute.closedAt || dispute.resolvedAt
                          ? format(
                              new Date(dispute.closedAt || dispute.resolvedAt || ""),
                              "dd MMM yyyy, hh:mm a"
                            )
                          : "—"
                      }
                    />
                    <InfoRow
                      label="Ustad Commission Refund"
                      value={fmtPKR(dispute.moderationApplied?.workerCommissionRefund || 0)}
                    />
                    <InfoRow
                      label="Ustad Penalty"
                      value={fmtPKR(dispute.moderationApplied?.workerPenalty || 0)}
                    />
                  </InfoList>
                  {dispute.resolutionDetails && (
                    <div className="rounded-lg border border-hairline bg-card p-2.5 text-xs italic text-foreground">
                      "{dispute.resolutionDetails}"
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* Case Timeline */}
            <Section title="Stored History Timeline" icon={<Clock className="h-4 w-4" />}>
              <Timeline items={timelineItems} />
            </Section>
          </>
        }
      />

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <XCircle className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Dispute evidence"
            className="max-h-full max-w-full rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </DetailPage>
  );
}
