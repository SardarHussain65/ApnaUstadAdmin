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

  const [cancelOpen, setCancelOpen] = useState(false);
  const [statusOverride, setStatusOverride] = useState("");

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
    </DetailPage>
  );
}

