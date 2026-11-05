import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquare,
  MessageSquareWarning,
  Phone,
  ReceiptText,
  ShieldAlert,
  Star,
  UserRound,
  Wallet,
  Wrench,
  XCircle,
} from "lucide-react";
import { Avatar } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { CopyableId } from "@/components/ui/copyable-id";
import { ConfirmDialog, type ConfirmPayload } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ActionButton,
  DetailError,
  DetailGrid,
  DetailHeader,
  DetailLoading,
  DetailPage,
  EmptyBlock,
  InfoList,
  InfoRow,
  KpiGrid,
  KpiTile,
  MetaItem,
  NotProvided,
  Section,
  Timeline,
} from "@/components/admin/detail-page";
import { BookingTrackingMap } from "@/components/admin/BookingTrackingMap";
import { formatDate, formatDateTime, formatPhone, formatPKR, formatRelative, shortId } from "@/lib/format";
import {
  useBookingDetails,
  useBookingMessages,
  useCancelBooking,
  useUpdateBookingStatus,
  useResolvePriceReduction,
  useResolveFraudFlag,
} from "@/lib/api-hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/bookings/$id")({
  component: BookingDetailPage,
});

const CANCEL_REASONS = [
  "Customer asked to cancel before work started",
  "Ustad did not arrive (no-show)",
  "Work cannot be completed safely",
  "Price disagreement between customer and ustad",
  "Cancelled by admin after security check",
];

function BookingDetailPage() {
  const { id } = Route.useParams();
  const { data: booking, isLoading, isError, error, refetch } = useBookingDetails(id);
  const { data: messages = [] } = useBookingMessages(id, !!booking);
  const cancelMutation = useCancelBooking();
  const updateStatusMutation = useUpdateBookingStatus();
  const resolveReductionMutation = useResolvePriceReduction();
  const resolveFraudMutation = useResolveFraudFlag();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [statusOverride, setStatusOverride] = useState("");

  const [reductionConfirmOpen, setReductionConfirmOpen] = useState(false);
  const [reductionAction, setReductionAction] = useState<"approve" | "reject">("approve");
  const [reductionNote, setReductionNote] = useState("");

  const [fraudConfirmOpen, setFraudConfirmOpen] = useState(false);
  const [fraudAction, setFraudAction] = useState<"dismiss" | "penalize">("dismiss");
  const [fraudPenaltyAmount, setFraudPenaltyAmount] = useState("500");
  const [fraudReason, setFraudReason] = useState("");

  const handleResolveReduction = async () => {
    try {
      await resolveReductionMutation.mutateAsync({
        id,
        action: reductionAction,
        adminNotes: reductionNote || undefined,
      });
      setReductionConfirmOpen(false);
      setReductionNote("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve price reduction request");
    }
  };

  const handleResolveFraud = async () => {
    try {
      if (!fraudReason || fraudReason.trim().length < 5) {
        toast.error("Please enter a detailed reason (at least 5 characters)");
        return;
      }
      await resolveFraudMutation.mutateAsync({
        id,
        action: fraudAction,
        penaltyAmount: fraudAction === "penalize" ? Number(fraudPenaltyAmount || 0) : undefined,
        reason: fraudReason.trim(),
      });
      setFraudConfirmOpen(false);
      setFraudReason("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve fraud alert");
    }
  };

  if (isLoading) return <DetailLoading />;
  if (isError || !booking) {
    return (
      <DetailError
        backTo="/bookings"
        backLabel="Back to bookings"
        title="Booking not found"
        message={(error as Error)?.message}
        onRetry={() => refetch()}
      />
    );
  }

  const customer = booking.customer;
  const worker = booking.worker;
  const payment = booking.payment;
  const dispute = booking.dispute;
  const review = booking.review;
  const agreement = booking.agreement || {};
  const cashDue = agreement.cashDue ?? booking.totalAmount ?? 0;
  const agreedPrice = agreement.agreedPrice || booking.subtotal || booking.totalAmount || 0;
  const clientOffer = agreement.clientOffer || booking.subtotal || 0;
  const commissionAmount = agreement.commissionAmount ?? booking.platformFee ?? 0;
  const workerNet = agreement.workerNetIncome ?? booking.workerEarning ?? 0;
  const paymentState = payment?.status || booking.paymentStatus || "pending";

  const handleCancelConfirm = async (payload: ConfirmPayload) => {
    await cancelMutation.mutateAsync({ id: booking._id, reason: payload.reason });
    setCancelOpen(false);
    refetch();
  };

  const handleStatusOverride = () => {
    if (!statusOverride) return;
    updateStatusMutation.mutate(
      { id: booking._id, status: statusOverride },
      {
        onSuccess: () => {
          setStatusOverride("");
          refetch();
        },
      }
    );
  };

  const timelineItems = [
    {
      title: "Booking created",
      time: formatDateTime(booking.createdAt),
      description: `${booking.bookingType === "instant" ? "Instant" : "Scheduled"} ${booking.category || "service"} request`,
      tone: "primary" as const,
    },
    ...(booking.workerRespondedAt
      ? [
          {
            title: "Ustad accepted assignment",
            time: formatDateTime(booking.workerRespondedAt),
            description: worker?.fullName ? `Accepted by ${worker.fullName}` : undefined,
            tone: "success" as const,
          },
        ]
      : []),
    ...(booking.completedAt
      ? [
          {
            title: "Service completed",
            time: formatDateTime(booking.completedAt),
            description: `Cash due: ${formatPKR(cashDue)}`,
            tone: "success" as const,
          },
        ]
      : []),
    ...(booking.status === "cancelled"
      ? [
          {
            title: `Booking cancelled${booking.cancelledBy ? ` by ${booking.cancelledBy}` : ""}`,
            time: formatDateTime(booking.updatedAt),
            description: booking.cancelReason || "No reason recorded",
            tone: "danger" as const,
          },
        ]
      : []),
  ];

  return (
    <DetailPage>
      <DetailHeader
        backTo="/bookings"
        backLabel="Back to bookings"
        crumbs={[
          { label: "Bookings", to: "/bookings" },
          { label: `Booking ${shortId(booking._id)}` },
        ]}
        leading={
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <ReceiptText className="h-6 w-6" />
          </div>
        }
        title={`${booking.category || "Service"} Booking`}
        subtitle={booking.description || "Home service booking"}
        badges={
          <>
            <StatusBadge status={booking.status} />
            <StatusBadge status={paymentState} />
            <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">
              {booking.bookingType || "scheduled"}
            </span>
            {booking.pricingType === "open" && (
              <span className="rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                Open Price / Bid
              </span>
            )}
            {booking.rateBasis && booking.rateBasis !== "total" && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                {booking.rateBasis === "per_day" ? "Dihari (Per Day)" : "Hourly Rate"}
              </span>
            )}
            {booking.helperCount > 0 && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                +{booking.helperCount} {booking.helperCount === 1 ? "Helper" : "Helpers"}
              </span>
            )}
          </>
        }
        meta={
          <>
            <CopyableId id={booking._id} label="Booking ID" />
            <MetaItem icon={<Calendar />}>
              Scheduled {formatDate(booking.scheduledDate)}
              {booking.scheduledTime ? ` · ${booking.scheduledTime}` : ""}
            </MetaItem>
            <MetaItem icon={<Clock />}>Est. {booking.estimatedHours || 1}h</MetaItem>
          </>
        }
        actions={
          <>
            {booking.jobPost?._id && (
              <Link to="/jobs/$id" params={{ id: booking.jobPost._id }}>
                <ActionButton icon={<Briefcase />}>Source Job Post</ActionButton>
              </Link>
            )}
            {booking.status !== "cancelled" && booking.status !== "completed" && (
              <ActionButton
                tone="danger"
                icon={<XCircle />}
                onClick={() => setCancelOpen(true)}
              >
                Cancel Booking
              </ActionButton>
            )}
          </>
        }
      />

      {booking.status === "cancelled" && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">
              Booking cancelled {booking.cancelledBy ? `by ${booking.cancelledBy}` : ""}
            </p>
            <p className="mt-0.5 text-sm text-foreground">
              {booking.cancelReason || "No cancellation reason was recorded."}
            </p>
          </div>
        </div>
      )}

      {dispute && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Active Complaint Linked ({dispute.reason?.replace(/_/g, " ")})
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {dispute.description}
              </p>
            </div>
          </div>
          <Link to="/disputes/$id" params={{ id: String(dispute._id) }}>
            <ActionButton tone="default">View Complaint</ActionButton>
          </Link>
        </div>
      )}

      {/* ── Fraud Alert Banner ── */}
      {booking.fraudSignals?.isFlaggedForAudit && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border-2 border-destructive bg-destructive/10 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-destructive animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-destructive">
                  Potential Off-Platform Disintermediation / Fraud Flag
                </span>
                {booking.fraudSignals.flaggedAt && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Flagged {formatRelative(booking.fraudSignals.flaggedAt)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-foreground font-medium">
                {booking.fraudSignals.flagReason || "Suspicious on-site activity or unauthorized cash payment reported."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                setFraudAction("dismiss");
                setFraudReason("Reviewed GPS timeline and chat; cancellation verified as legitimate.");
                setFraudConfirmOpen(true);
              }}
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition"
            >
              Dismiss Alarm
            </button>
            <button
              type="button"
              onClick={() => {
                setFraudAction("penalize");
                setFraudReason("Confirmed offline deal during on-site visit. Penalizing worker.");
                setFraudPenaltyAmount("500");
                setFraudConfirmOpen(true);
              }}
              className="rounded-xl bg-destructive px-3.5 py-1.5 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 transition shadow-sm"
            >
              Penalize Worker
            </button>
          </div>
        </div>
      )}

      {/* ── Customer Price Reduction Request Banner ── */}
      {booking.customerReductionRequest?.status === "pending" && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border-2 border-warning bg-warning/10 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-warning" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-warning">
                  Customer Requested Price Reduction
                </span>
                <span className="text-xs font-bold font-mono text-foreground">
                  New: {formatPKR(booking.customerReductionRequest.requestedAmount)} (Current: {formatPKR(booking.totalAmount)})
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground font-medium">
                Customer Reason: "{booking.customerReductionRequest.reason}"
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                setReductionAction("approve");
                setReductionNote("Approved scope reduction after review.");
                setReductionConfirmOpen(true);
              }}
              className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              Approve Reduction
            </button>
            <button
              type="button"
              onClick={() => {
                setReductionAction("reject");
                setReductionNote("Rejected: Work scope matches originally agreed contract.");
                setReductionConfirmOpen(true);
              }}
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
            >
              Reject Request
            </button>
          </div>
        </div>
      )}

      <KpiGrid cols={4}>
        <KpiTile
          label="Cash Due from Customer"
          value={formatPKR(cashDue)}
          hint={agreement.promoCode ? `Promo ${agreement.promoCode} applied` : "Cash on completion"}
          icon={<Banknote />}
          tone="primary"
        />
        <KpiTile
          label="Agreed Service Price"
          value={formatPKR(agreedPrice)}
          hint={
            clientOffer && clientOffer !== agreedPrice
              ? `Customer originally offered ${formatPKR(clientOffer)}`
              : `Price mode: ${(agreement.priceSource || "direct_rate").replace(/_/g, " ")}`
          }
          icon={<ReceiptText />}
        />
        <KpiTile
          label="App Commission"
          value={formatPKR(commissionAmount)}
          hint={
            agreement.commissionRateSnapshot
              ? `${agreement.commissionRateSnapshot}% commission snapshot`
              : "Deducted from Ustad wallet"
          }
          icon={<Wallet />}
          tone="success"
        />
        <KpiTile
          label="Ustad Net Earning"
          value={formatPKR(workerNet)}
          hint={`Payment state: ${paymentState}`}
          icon={<Wrench />}
          tone="default"
        />
      </KpiGrid>

      {/* Interactive Live Booking & Ustad Location Map */}
      <BookingTrackingMap booking={booking} />

      <DetailGrid
        main={
          <>
            <Section
              title="Pricing & Payment Breakdown"
              description="Payment details agreed between customer and ustad"
              icon={<Banknote />}
            >
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-hairline">
                  <span className="text-muted-foreground">Customer Initial Offer</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {formatPKR(clientOffer || agreedPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-hairline">
                  <span className="text-muted-foreground">Final Agreed Service Price</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {formatPKR(agreedPrice)}
                  </span>
                </div>
                {agreement.discountAmount > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-hairline">
                    <span className="text-muted-foreground">
                      Promo Discount ({agreement.promoCode || "Applied"})
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-success">
                      -{formatPKR(agreement.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5 border-b border-hairline">
                  <span className="text-muted-foreground">
                    App Commission {agreement.commissionRateSnapshot ? `(${agreement.commissionRateSnapshot}%)` : ""}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-primary">
                    {formatPKR(commissionAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-hairline">
                  <span className="text-muted-foreground">Ustad Net Take-Home</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {formatPKR(workerNet)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 text-base font-bold">
                  <span className="text-foreground">Total Cash Due from Customer</span>
                  <span className="font-mono tabular-nums text-primary">
                    {formatPKR(cashDue)}
                  </span>
                </div>
              </div>
            </Section>

            {/* ── On-Site Price Revisions & Quotations ── */}
            {(booking.pendingPriceIncrease || (booking.priceRevisionHistory && booking.priceRevisionHistory.length > 0)) && (
              <Section
                title="On-Site Price Revisions & Quotations"
                description="Worker on-site price changes and customer real-time responses"
                icon={<ReceiptText />}
              >
                <div className="space-y-3">
                  {booking.pendingPriceIncrease && (
                    <div className="flex flex-col gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-warning flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" /> Pending Customer Decision
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {formatDateTime(booking.pendingPriceIncrease.requestedAt)}
                        </span>
                      </div>
                      <div className="text-foreground">
                        Worker requested new price: <strong className="font-mono text-sm font-bold text-foreground">{formatPKR(booking.pendingPriceIncrease.newAmount)}</strong> (Current: {formatPKR(booking.totalAmount)})
                      </div>
                      <div className="text-muted-foreground italic">
                        Reason: &quot;{booking.pendingPriceIncrease.reason}&quot;
                      </div>
                    </div>
                  )}

                  {booking.priceRevisionHistory && booking.priceRevisionHistory.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-hairline">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-hairline bg-surface/80 font-semibold text-muted-foreground">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Previous</th>
                            <th className="p-2.5">New Price</th>
                            <th className="p-2.5">Diff</th>
                            <th className="p-2.5">Worker Reason</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                          {booking.priceRevisionHistory.map((rev: any, idx: number) => {
                            const diff = rev.newAmount - rev.previousAmount;
                            return (
                              <tr key={idx} className="hover:bg-surface/50">
                                <td className="p-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                  {formatDateTime(rev.requestedAt)}
                                </td>
                                <td className="p-2.5 font-mono font-medium">
                                  {formatPKR(rev.previousAmount)}
                                </td>
                                <td className="p-2.5 font-mono font-bold text-foreground">
                                  {formatPKR(rev.newAmount)}
                                </td>
                                <td className="p-2.5 font-mono font-semibold text-success">
                                  +{formatPKR(diff)}
                                </td>
                                <td className="p-2.5 text-foreground max-w-xs truncate" title={rev.reason}>
                                  {rev.reason}
                                </td>
                                <td className="p-2.5">
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                      rev.status === "approved"
                                        ? "bg-success/15 text-success"
                                        : rev.status === "rejected"
                                        ? "bg-destructive/15 text-destructive"
                                        : "bg-warning/15 text-warning"
                                    }`}
                                  >
                                    {rev.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* ── Customer Price Reduction Audit ── */}
            {booking.customerReductionRequest && (
              <Section
                title="Customer Price Reduction Audit"
                description="Customer request to lower price due to smaller scope"
                icon={<AlertTriangle />}
              >
                <div className="rounded-xl border border-hairline bg-surface/50 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      Requested Amount: <strong className="font-mono text-sm text-foreground">{formatPKR(booking.customerReductionRequest.requestedAmount)}</strong> (Original: {formatPKR(booking.totalAmount)})
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        booking.customerReductionRequest.status === "approved"
                          ? "bg-success/15 text-success"
                          : booking.customerReductionRequest.status === "rejected"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-warning/15 text-warning"
                      }`}
                    >
                      {booking.customerReductionRequest.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Reason:</strong> {booking.customerReductionRequest.reason}
                  </p>
                  {booking.customerReductionRequest.adminNotes && (
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Admin Notes:</strong> {booking.customerReductionRequest.adminNotes}
                    </p>
                  )}
                  {booking.customerReductionRequest.resolvedAt && (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Resolved {formatRelative(booking.customerReductionRequest.resolvedAt)}
                    </p>
                  )}
                </div>
              </Section>
            )}

            {/* ── Customer Truth Settlement & Audit ── */}
            {booking.finalSettlement && (
              <Section
                title="Customer Truth Settlement & Audit"
                description="Verified final cash payment reported by customer upon job completion"
                icon={<ShieldAlert />}
              >
                <div className="space-y-3 text-xs">
                  <div
                    className={`rounded-xl border p-4 ${
                      booking.finalSettlement.unauthorizedExtraDemanded
                        ? "border-destructive/40 bg-destructive/10"
                        : booking.finalSettlement.reportedStatus === "paid_more"
                        ? "border-warning/40 bg-warning/10"
                        : "border-success/30 bg-success/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-foreground flex items-center gap-2">
                        {booking.finalSettlement.reportedStatus === "paid_more" ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <span>Customer Paid Additional Cash on Site</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span>Paid Exactly as Agreed</span>
                          </>
                        )}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Verified {formatRelative(booking.finalSettlement.verifiedAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div>
                        <div className="text-muted-foreground text-[11px]">Agreed Price</div>
                        <div className="font-mono font-bold text-foreground text-sm">
                          {formatPKR(booking.totalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[11px]">Actual Cash Paid</div>
                        <div className="font-mono font-bold text-foreground text-sm">
                          {formatPKR(booking.finalSettlement.actualCashPaid)}
                        </div>
                      </div>
                      {booking.finalSettlement.extraCashPaid ? (
                        <div>
                          <div className="text-muted-foreground text-[11px]">Extra Cash Paid</div>
                          <div className="font-mono font-bold text-warning text-sm">
                            +{formatPKR(booking.finalSettlement.extraCashPaid)}
                          </div>
                        </div>
                      ) : null}
                      {booking.finalSettlement.incrementalCommission ? (
                        <div>
                          <div className="text-muted-foreground text-[11px]">Extra Commission Cut</div>
                          <div className="font-mono font-bold text-primary text-sm">
                            +{formatPKR(booking.finalSettlement.incrementalCommission)}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {booking.finalSettlement.unauthorizedExtraDemanded && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/20 p-2.5 text-destructive font-semibold">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Customer reported that the worker improperly demanded extra money above the agreed scope!</span>
                      </div>
                    )}

                    {booking.finalSettlement.customerFeedback && (
                      <div className="mt-2 text-foreground font-medium">
                        Customer Note: &quot;{booking.finalSettlement.customerFeedback}&quot;
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            )}

            <Section
              title="Booking Chat Messages"
              description="Chat messages between customer and ustad for this booking"
              icon={<MessageSquare />}
            >
              {messages.length === 0 ? (
                <EmptyBlock
                  icon={<MessageSquare />}
                  title="No messages exchanged"
                  hint="Customer and Ustad did not send any in-app chat messages on this booking."
                />
              ) : (
                <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                  {messages.map((m: any) => {
                    const isCustomer =
                      String(m.sender) === String(customer?._id) || m.senderRole === "customer";
                    return (
                      <div
                        key={m._id}
                        className={`flex flex-col rounded-xl border p-3 ${
                          isCustomer
                            ? "border-hairline bg-surface/60"
                            : "border-primary/20 bg-primary/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-foreground">
                            {isCustomer
                              ? `${customer?.fullName || "Customer"} (Customer)`
                              : `${worker?.fullName || "Ustad"} (Ustad)`}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {formatDateTime(m.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                          {m.text || m.content || m.message || "Media attachment"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {review && (
              <Section title="Customer Review" icon={<Star />}>
                <div className="rounded-xl border border-hairline bg-surface/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      Rated by {customer?.fullName || "Customer"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">
                      <Star className="h-3.5 w-3.5 fill-current" /> {review.rating} / 5
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-foreground">{review.comment}</p>
                  )}
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                    Submitted {formatRelative(review.createdAt)}
                  </p>
                </div>
              </Section>
            )}

            <Section
              title="Update Status Directly"
              description="Change booking status or cancel directly"
              icon={<ShieldAlert />}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={statusOverride}
                  onChange={(e) => setStatusOverride(e.target.value)}
                  className="h-10 flex-1 rounded-xl border border-hairline-strong bg-surface px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  <option value="">Select status to update…</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ActionButton
                  tone="primary"
                  disabled={!statusOverride || updateStatusMutation.isPending}
                  onClick={handleStatusOverride}
                >
                  Apply Status
                </ActionButton>
              </div>
            </Section>
          </>
        }
        aside={
          <>
            <Section title="Customer" icon={<UserRound />}>
              {customer ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={customer.profileImage} name={customer.fullName} size={42} />
                      <div className="min-w-0">
                        <Link
                          to="/users/$id"
                          params={{ id: customer._id }}
                          className="truncate block text-sm font-bold text-foreground hover:text-primary"
                        >
                          {customer.fullName || "Unnamed Customer"}
                        </Link>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {shortId(customer._id)}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/users/$id"
                      params={{ id: customer._id }}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-hairline-strong px-2.5 text-xs font-semibold text-foreground hover:bg-surface"
                    >
                      Profile <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <InfoList>
                    <InfoRow label="Phone" icon={<Phone />} mono>
                      {formatPhone(customer.phone) || <NotProvided />}
                    </InfoRow>
                    <InfoRow label="City" icon={<MapPin />}>
                      {customer.city || <NotProvided />}
                    </InfoRow>
                  </InfoList>
                </div>
              ) : (
                <EmptyBlock title="Customer record unavailable" />
              )}
            </Section>

            <Section title="Assigned Ustad" icon={<Wrench />}>
              {worker ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={worker.profileImage} name={worker.fullName} size={42} />
                      <div className="min-w-0">
                        <Link
                          to="/workers/$id"
                          params={{ id: worker._id }}
                          className="truncate block text-sm font-bold text-foreground hover:text-primary"
                        >
                          {worker.fullName || "Ustad"}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {worker.category || booking.category}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/workers/$id"
                      params={{ id: worker._id }}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-hairline-strong px-2.5 text-xs font-semibold text-foreground hover:bg-surface"
                    >
                      Profile <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <InfoList>
                    <InfoRow label="Phone" icon={<Phone />} mono>
                      {formatPhone(worker.phone) || <NotProvided />}
                    </InfoRow>
                    <InfoRow label="Rating">
                      {worker.rating ? (
                        <span className="inline-flex items-center gap-1 font-bold text-gold">
                          <Star className="h-3.5 w-3.5 fill-current" />{" "}
                          {Number(worker.rating).toFixed(1)}
                        </span>
                      ) : (
                        "New"
                      )}
                    </InfoRow>
                  </InfoList>
                </div>
              ) : (
                <EmptyBlock title="No Ustad assigned yet" />
              )}
            </Section>

            <Section title="Service Location" icon={<MapPin />}>
              <InfoList>
                <InfoRow label="Address">
                  {booking.address || customer?.address || <NotProvided />}
                </InfoRow>
                <InfoRow label="Scheduled Date" mono>
                  {formatDate(booking.scheduledDate)}
                </InfoRow>
                <InfoRow label="Time Slot" mono>
                  {booking.scheduledTime || "Flexible"}
                </InfoRow>
                <InfoRow label="Payment Method">
                  <span className="uppercase font-mono text-xs">
                    {booking.paymentMethod || "CASH"}
                  </span>
                </InfoRow>
              </InfoList>
            </Section>

            <Section title="Lifecycle Timeline" icon={<CheckCircle2 />}>
              <Timeline items={timelineItems} />
            </Section>
          </>
        }
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Service Booking"
        description={
          <p>
            Are you sure you want to cancel booking{" "}
            <strong className="text-foreground">{shortId(booking._id)}</strong>? This will release
            any reserved commission and notify both parties.
          </p>
        }
        confirmLabel="Cancel Booking"
        tone="danger"
        requireReason
        reasons={CANCEL_REASONS}
        notePlaceholder="Explain why this booking is being cancelled…"
        onConfirm={handleCancelConfirm}
      />

      {/* ── Dialog: Customer Price Reduction Resolution ── */}
      <Dialog open={reductionConfirmOpen} onOpenChange={setReductionConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reductionAction === "approve" ? "Approve Price Reduction" : "Reject Price Reduction"}
            </DialogTitle>
            <DialogDescription>
              {reductionAction === "approve"
                ? `Approving will reduce the service total from ${formatPKR(booking.totalAmount)} to ${formatPKR(booking.customerReductionRequest?.requestedAmount || 0)}. The commission difference will be automatically refunded to the worker's wallet.`
                : "Rejecting will keep the current booking price unchanged."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-hairline bg-surface/50 p-3 text-xs space-y-1">
              <div className="text-muted-foreground">Customer's Reason:</div>
              <div className="font-medium text-foreground italic">
                &quot;{booking.customerReductionRequest?.reason || "No reason given"}&quot;
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Admin Review Notes (Optional)
              </label>
              <Textarea
                placeholder="Enter notes on why this reduction is approved or rejected…"
                value={reductionNote}
                onChange={(e) => setReductionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReductionConfirmOpen(false)}
              disabled={resolveReductionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={reductionAction === "approve" ? "default" : "destructive"}
              onClick={handleResolveReduction}
              disabled={resolveReductionMutation.isPending}
            >
              {resolveReductionMutation.isPending
                ? "Processing…"
                : reductionAction === "approve"
                ? "Confirm & Refund Difference"
                : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Fraud Signal Resolution ── */}
      <Dialog open={fraudConfirmOpen} onOpenChange={setFraudConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {fraudAction === "penalize" ? "Penalize Worker for Fraud" : "Dismiss Fraud Alarm"}
            </DialogTitle>
            <DialogDescription>
              {fraudAction === "penalize"
                ? "Penalizing will record a penalty transaction against the worker's wallet balance and resolve the fraud signal."
                : "Dismissing clears the alarm after confirming the booking activity was legitimate."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {fraudAction === "penalize" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Penalty Amount (PKR)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="500"
                  value={fraudPenaltyAmount}
                  onChange={(e) => setFraudPenaltyAmount(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Audit Findings & Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Explain the findings from GPS logs, customer confirmation, or worker interview…"
                value={fraudReason}
                onChange={(e) => setFraudReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setFraudConfirmOpen(false)}
              disabled={resolveFraudMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={fraudAction === "penalize" ? "destructive" : "default"}
              onClick={handleResolveFraud}
              disabled={resolveFraudMutation.isPending || !fraudReason.trim()}
            >
              {resolveFraudMutation.isPending
                ? "Processing…"
                : fraudAction === "penalize"
                ? "Apply Penalty"
                : "Dismiss Alarm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailPage>
  );
}

