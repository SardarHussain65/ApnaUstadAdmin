import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  Phone,
  ReceiptText,
  ShieldAlert,
  Star,
  Trash2,
  UserRound,
  Users,
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
import { formatDate, formatDateTime, formatPhone, formatPKR, shortId } from "@/lib/format";
import {
  useCancelJob,
  useDeleteJob,
  useJobDetails,
  useUpdateJobStatus,
} from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/jobs/$id")({
  component: JobDetailPage,
});

const DELETE_REASONS = [
  "Spam, abusive, or prohibited job description",
  "Duplicate or fraudulent job posting",
  "Customer requested cancellation/removal",
  "Solicitation of off-platform illegal activities",
  "Expired or abandoned with invalid contact info",
];

function JobDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: job, isLoading, isError, error, refetch } = useJobDetails(id);
  const deleteMutation = useDeleteJob();
  const cancelMutation = useCancelJob();
  const updateStatusMutation = useUpdateJobStatus();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [statusOverride, setStatusOverride] = useState("");

  if (isLoading) return <DetailLoading />;
  if (isError || !job) {
    return (
      <DetailError
        backTo="/jobs"
        backLabel="Back to job posts"
        title="Job post not found"
        message={(error as Error)?.message}
        onRetry={() => refetch()}
      />
    );
  }

  const customer = job.customer;
  const bids: any[] = job.bids || [];
  const acceptedBid = job.acceptedBid || bids.find((b) => b.status === "accepted") || null;
  const linkedBooking = job.linkedBooking;
  const clientOffer = job.pricing?.clientOffer || job.amount || 0;
  const selectedPrice = acceptedBid?.proposedPrice || linkedBooking?.totalAmount || 0;
  const delta = selectedPrice && clientOffer ? selectedPrice - clientOffer : 0;

  const handleDeleteConfirm = async (payload: ConfirmPayload) => {
    await deleteMutation.mutateAsync({ id: job._id, reason: payload.reason });
    setDeleteOpen(false);
    navigate({ to: "/jobs" });
  };

  const handleCancelConfirm = async (payload: ConfirmPayload) => {
    await cancelMutation.mutateAsync({ id: job._id, reason: payload.reason });
    setCancelOpen(false);
    refetch();
  };

  const handleStatusOverride = () => {
    if (!statusOverride) return;
    updateStatusMutation.mutate(
      { id: job._id, status: statusOverride },
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
      title: "Job post published",
      time: formatDateTime(job.createdAt),
      description: `${job.urgency === "instant" ? "Instant" : "Scheduled"} ${job.category} request`,
      tone: "primary" as const,
    },
    ...(acceptedBid
      ? [
          {
            title: "Ustad quote accepted",
            time: formatDateTime(acceptedBid.updatedAt || acceptedBid.createdAt),
            description: `${acceptedBid.worker?.fullName || "Ustad"} · ${formatPKR(acceptedBid.proposedPrice)}`,
            tone: "success" as const,
          },
        ]
      : []),
    ...(job.cancelledAt
      ? [
          {
            title: `Cancelled${job.cancelledBy ? ` by ${job.cancelledBy}` : ""}`,
            time: formatDateTime(job.cancelledAt),
            description: job.cancelReason || "No reason recorded",
            tone: "danger" as const,
          },
        ]
      : []),
  ];

  return (
    <DetailPage>
      <DetailHeader
        backTo="/jobs"
        backLabel="Back to job posts"
        crumbs={[
          { label: "Job Posts", to: "/jobs" },
          { label: `Job ${shortId(job._id)}` },
        ]}
        leading={
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <Briefcase className="h-6 w-6" />
          </div>
        }
        title={`${job.category || "Service"} Request`}
        subtitle={job.description}
        badges={
          <>
            <StatusBadge status={job.status} />
            <StatusBadge status={job.urgency || "scheduled"} />
            {job.isFixedPrice && (
              <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Fixed Price
              </span>
            )}
          </>
        }
        meta={
          <>
            <CopyableId id={job._id} label="Job ID" />
            <MetaItem icon={<Calendar />}>Posted {formatDate(job.createdAt)}</MetaItem>
            {job.scheduledDate && (
              <MetaItem icon={<Clock />}>
                Scheduled {formatDate(job.scheduledDate)}
                {job.scheduledTime ? ` · ${job.scheduledTime}` : ""}
              </MetaItem>
            )}
          </>
        }
        actions={
          <>
            {linkedBooking?._id && (
              <Link to="/bookings/$id" params={{ id: linkedBooking._id }}>
                <ActionButton tone="primary" icon={<ReceiptText />}>
                  View Booking
                </ActionButton>
              </Link>
            )}
            {job.status !== "cancelled" && job.status !== "closed" && (
              <ActionButton
                tone="default"
                icon={<XCircle />}
                onClick={() => setCancelOpen(true)}
              >
                Cancel Post
              </ActionButton>
            )}
            <ActionButton
              tone="danger"
              icon={<Trash2 />}
              onClick={() => setDeleteOpen(true)}
            >
              Soft-Delete
            </ActionButton>
          </>
        }
      />

      {job.status === "cancelled" && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">
              Job post cancelled {job.cancelledBy ? `by ${job.cancelledBy}` : ""}
            </p>
            <p className="mt-0.5 text-sm text-foreground">
              {job.cancelReason || "No cancellation reason was recorded."}
            </p>
          </div>
        </div>
      )}

      <KpiGrid cols={4}>
        <KpiTile
          label="Customer Offer"
          value={formatPKR(clientOffer)}
          hint={job.isFixedPrice ? "Fixed budget" : "Open to counter-offers"}
          icon={<Banknote />}
          tone="primary"
        />
        <KpiTile
          label="Accepted Quote"
          value={selectedPrice ? formatPKR(selectedPrice) : "Not assigned"}
          hint={
            selectedPrice && delta !== 0
              ? `${delta > 0 ? "+" : ""}${formatPKR(delta)} vs initial offer`
              : acceptedBid
              ? "Matched customer offer"
              : "Awaiting customer selection"
          }
          icon={<CheckCircle2 />}
          tone={acceptedBid ? "success" : "default"}
        />
        <KpiTile
          label="Submitted Bids"
          value={bids.length}
          hint={
            job.notifiedWorkersCount
              ? `${job.notifiedWorkersCount} Ustads notified nearby`
              : "Marketplace bidding"
          }
          icon={<Users />}
        />
        <KpiTile
          label="Urgency & Window"
          value={job.urgency === "instant" ? "Instant" : "Scheduled"}
          hint={job.expiresAt ? `Expires ${formatDate(job.expiresAt)}` : "Standard window"}
          icon={<Clock />}
          tone={job.urgency === "instant" ? "warning" : "default"}
        />
      </KpiGrid>

      {/* Live MapTiler Job Location & Assigned Ustad Map */}
      <BookingTrackingMap
        booking={{
          _id: job._id,
          category: job.category,
          status: job.status,
          address: job.address || customer?.address,
          location: job.location,
          customer,
          worker: job.selectedWorker || acceptedBid?.worker || linkedBooking?.worker || null,
        }}
        compact
      />

      <DetailGrid
        main={
          <>
            <Section
              title="Job Description & Scope"
              description="Customer's stated problem, requirements, and pricing expectations"
              icon={<Briefcase />}
            >
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                {job.description || "No detailed description provided."}
              </p>
              {delta !== 0 && acceptedBid && (
                <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-xs">
                  <span className="font-semibold text-primary">Counter-Offer Explanation: </span>
                  <span className="text-foreground">
                    Customer initially offered{" "}
                    <strong className="font-mono">{formatPKR(clientOffer)}</strong>. Ustad{" "}
                    <strong>{acceptedBid.worker?.fullName || "Pro"}</strong> proposed{" "}
                    <strong className="font-mono">{formatPKR(selectedPrice)}</strong> (
                    {acceptedBid.priceMode === "counter_offer" ? "Counter-Offer" : "Accepted Offer"}
                    ), which the customer accepted.
                  </span>
                </div>
              )}
            </Section>

            <Section
              title={`Submitted Ustad Bids (${bids.length})`}
              description="All quotes and proposals submitted by service professionals for this job"
              icon={<Users />}
              bodyClassName="p-0"
            >
              {bids.length === 0 ? (
                <div className="p-5">
                  <EmptyBlock
                    icon={<Users />}
                    title="No bids submitted yet"
                    hint="No Ustads have placed a quote on this job post yet."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-hairline text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-2.5">Ustad</th>
                        <th className="px-5 py-2.5">Message / Pitch</th>
                        <th className="px-5 py-2.5">Mode</th>
                        <th className="px-5 py-2.5 text-right">Proposed Price</th>
                        <th className="px-5 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {bids.map((b: any) => (
                        <tr key={b._id} className="transition hover:bg-surface/60">
                          <td className="px-5 py-3">
                            {b.worker?._id ? (
                              <Link
                                to="/workers/$id"
                                params={{ id: b.worker._id }}
                                className="flex items-center gap-2.5 font-semibold text-foreground hover:text-primary"
                              >
                                <Avatar
                                  src={b.worker.profileImage}
                                  name={b.worker.fullName}
                                  size={32}
                                />
                                <div>
                                  <div>{b.worker.fullName}</div>
                                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    {b.worker.rating ? (
                                      <>
                                        <Star className="h-3 w-3 fill-gold text-gold" />
                                        <span>{Number(b.worker.rating).toFixed(1)}</span>
                                      </>
                                    ) : (
                                      <span>New Ustad</span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Ustad</span>
                            )}
                          </td>
                          <td className="px-5 py-3 max-w-xs">
                            <p className="line-clamp-2 text-xs text-foreground">
                              {b.message || "—"}
                            </p>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {formatDateTime(b.createdAt)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs capitalize text-muted-foreground">
                            {(b.priceMode || "counter_offer").replace(/_/g, " ")}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-bold tabular-nums text-foreground">
                            {formatPKR(b.proposedPrice || 0)}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={b.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section
              title="Administrative Moderation"
              description="Override job status or remove non-compliant postings"
              icon={<ShieldAlert />}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={statusOverride}
                  onChange={(e) => setStatusOverride(e.target.value)}
                  className="h-10 flex-1 rounded-xl border border-hairline-strong bg-surface px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  <option value="">Select job status to force-apply…</option>
                  <option value="open">Open</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="assigned">Assigned</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ActionButton
                  tone="primary"
                  disabled={!statusOverride || updateStatusMutation.isPending}
                  onClick={handleStatusOverride}
                >
                  Apply Status Override
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
                          {customer.fullName || "Customer"}
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
                <EmptyBlock title="Customer unavailable" />
              )}
            </Section>

            {linkedBooking && (
              <Section title="Linked Booking" icon={<ReceiptText />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {shortId(linkedBooking._id)}
                    </span>
                    <StatusBadge status={linkedBooking.status} />
                  </div>
                  <InfoList>
                    <InfoRow label="Ustad">
                      {linkedBooking.worker?.fullName || "Assigned"}
                    </InfoRow>
                    <InfoRow label="Amount" mono>
                      {formatPKR(linkedBooking.totalAmount || 0)}
                    </InfoRow>
                  </InfoList>
                  <Link
                    to="/bookings/$id"
                    params={{ id: linkedBooking._id }}
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Open Booking Details <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Section>
            )}

            <Section title="Location & Dispatch" icon={<MapPin />}>
              <InfoList>
                <InfoRow label="Address">
                  {job.address || customer?.address || <NotProvided />}
                </InfoRow>
                <InfoRow label="Radius Expanded">
                  {job.radiusExpanded ? "Yes (widened search)" : "Standard radius"}
                </InfoRow>
                <InfoRow label="Notified Ustads" mono>
                  {job.notifiedWorkersCount || 0}
                </InfoRow>
              </InfoList>
            </Section>

            <Section title="Timeline" icon={<CheckCircle2 />}>
              <Timeline items={timelineItems} />
            </Section>
          </>
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Soft-Delete Job Post"
        description={
          <p>
            Are you sure you want to soft-delete job post{" "}
            <strong className="text-foreground">{shortId(job._id)}</strong>? Pending bids will be
            rejected and the reason logged to the audit trail.
          </p>
        }
        confirmLabel="Delete Job Post"
        tone="danger"
        requireReason
        reasons={DELETE_REASONS}
        notePlaceholder="Explain why this job post is being removed…"
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Job Post"
        description="Cancel this active job post and notify the customer and bidding Ustads."
        confirmLabel="Cancel Post"
        tone="warning"
        requireReason
        reasons={[
          "Customer request",
          "Service no longer needed",
          "Duplicate posting",
          "Other",
        ]}
        onConfirm={handleCancelConfirm}
      />
    </DetailPage>
  );
}

