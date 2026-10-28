import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Heart,
  Mail,
  MapPin,
  MessageSquareWarning,
  Phone,
  Power,
  ReceiptText,
  ShieldCheck,
  Star,
  Wallet,
  Briefcase,
  UserRound,
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
import { formatDate, formatDateTime, formatPhone, formatPKR, formatRelative, shortId } from "@/lib/format";
import { useToggleUserStatus, useUserOverview } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/users/$id")({ component: CustomerDetailPage });

const SUSPEND_REASONS = [
  "Violation of platform safety policies",
  "Abusive conduct towards ustads or staff",
  "Suspected fraudulent or duplicate profile",
  "Unpaid service dispute non-compliance",
  "User-requested account termination",
];

/** Placeholder cities that came from emulators / bad geocoding. */
const isRealCity = (c?: string) => !!c && !["n/a", "na", "mountain view", "unknown", "-"].includes(c.trim().toLowerCase());

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading, isError, error, refetch } = useUserOverview(id);
  const toggle = useToggleUserStatus();
  const [suspendOpen, setSuspendOpen] = useState(false);

  if (isLoading) return <DetailLoading />;
  if (isError || !data?.user) {
    return (
      <DetailError
        backTo="/users"
        backLabel="Back to customers"
        title="Customer not found"
        message={(error as Error)?.message}
        onRetry={() => refetch()}
      />
    );
  }

  const { user, stats, recentBookings, recentJobs, disputes, reviews } = data;
  const phone = formatPhone(user.phone);
  const favorites = (user.favorites || []).filter((w: any) => w && typeof w === "object" && w.fullName);
  const isGoogle = user.authProvider === "google" || (!phone && !!user.email);

  const suspend = async (payload: ConfirmPayload) => {
    await toggle.mutateAsync({ id: user._id, isActive: false, reason: payload.reason });
    setSuspendOpen(false);
    refetch();
  };
  const reactivate = async () => {
    await toggle.mutateAsync({ id: user._id, isActive: true, reason: "Account reactivated by administrator review" });
    refetch();
  };

  const activity = [
    { title: "Account created", time: formatDateTime(user.createdAt), tone: "primary" as const },
    ...(stats.lastBookingAt
      ? [{ title: "Last booking placed", time: formatDateTime(stats.lastBookingAt), tone: "success" as const }]
      : []),
    ...(user.deactivatedAt && !user.isActive
      ? [{ title: "Account suspended", time: formatDateTime(user.deactivatedAt), description: user.deactivationReason, tone: "danger" as const }]
      : []),
    ...(user.reactivatedAt && user.isActive
      ? [{ title: "Account reactivated", time: formatDateTime(user.reactivatedAt), tone: "success" as const }]
      : []),
  ];

  return (
    <DetailPage>
      <DetailHeader
        backTo="/users"
        backLabel="Back to customers"
        crumbs={[{ label: "Customers", to: "/users" }, { label: user.fullName || "Customer" }]}
        leading={<Avatar src={user.profileImage} name={user.fullName} size={64} />}
        title={user.fullName || "Unnamed customer"}
        badges={
          <>
            <StatusBadge status={user.isActive ? "active" : "suspended"} />
            {isGoogle && (
              <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Google sign-in</span>
            )}
          </>
        }
        meta={
          <>
            <CopyableId id={user._id} label="ID" />
            <MetaItem icon={<MapPin />}>{isRealCity(user.city) ? user.city : "City unknown"}</MetaItem>
            <MetaItem icon={<CalendarDays />}>Joined {formatDate(user.createdAt)}</MetaItem>
          </>
        }
        actions={
          <>
            {phone && (
              <a href={`tel:${phone.replace(/\s/g, "")}`}>
                <ActionButton icon={<Phone />}>Call</ActionButton>
              </a>
            )}
            {user.email && (
              <a href={`mailto:${user.email}`}>
                <ActionButton icon={<Mail />}>Email</ActionButton>
              </a>
            )}
            {user.isActive ? (
              <ActionButton tone="danger" icon={<Ban />} onClick={() => setSuspendOpen(true)}>
                Suspend account
              </ActionButton>
            ) : (
              <ActionButton tone="success" icon={<Power />} onClick={reactivate} disabled={toggle.isPending}>
                Reactivate account
              </ActionButton>
            )}
          </>
        }
      />

      {!user.isActive && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">This account is suspended</p>
            <p className="mt-0.5 text-sm text-foreground">{user.deactivationReason || "No reason was recorded."}</p>
            {user.deactivatedAt && (
              <p className="mt-1 text-xs text-muted-foreground">Since {formatDateTime(user.deactivatedAt)}</p>
            )}
          </div>
        </div>
      )}

      <KpiGrid cols={4}>
        <KpiTile
          label="Total bookings"
          value={stats.totalBookings}
          hint={stats.activeBookings ? `${stats.activeBookings} in progress` : "None in progress"}
          icon={<CalendarCheck />}
          tone="primary"
        />
        <KpiTile
          label="Total spent"
          value={formatPKR(stats.totalSpent)}
          hint={`${stats.completedBookings} completed`}
          icon={<Wallet />}
          tone="success"
        />
        <KpiTile
          label="Cancellation rate"
          value={stats.cancellationRate === null ? "—" : `${stats.cancellationRate}%`}
          hint={`${stats.cancelledBookings} cancelled`}
          icon={<Clock />}
          tone={stats.cancellationRate !== null && stats.cancellationRate >= 30 ? "danger" : "default"}
        />
        <KpiTile
          label="Disputes"
          value={stats.totalDisputes}
          hint={stats.openDisputes ? `${stats.openDisputes} open` : "None open"}
          icon={<MessageSquareWarning />}
          tone={stats.openDisputes ? "warning" : "default"}
        />
      </KpiGrid>

      <DetailGrid
        main={
          <>
            <Section
              title="Recent bookings"
              description="Latest 8 bookings placed by this customer"
              icon={<ReceiptText />}
              bodyClassName="p-0"
              action={
                stats.totalBookings > 0 ? (
                  <Link
                    to="/bookings"
                    search={{ customerId: user._id } as any}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View all
                  </Link>
                ) : null
              }
            >
              {recentBookings.length === 0 ? (
                <div className="p-5">
                  <EmptyBlock icon={<ReceiptText />} title="No bookings yet" hint="This customer hasn't booked a service." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-hairline text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-2.5">Booking</th>
                        <th className="px-5 py-2.5">Ustad</th>
                        <th className="px-5 py-2.5">Date</th>
                        <th className="px-5 py-2.5 text-right">Amount</th>
                        <th className="px-5 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {recentBookings.map((b) => (
                        <tr key={b._id} className="transition hover:bg-surface/60">
                          <td className="px-5 py-3">
                            <Link to="/bookings/$id" params={{ id: b._id }} className="group block">
                              <div className="font-semibold text-foreground group-hover:text-primary">{b.category || "Service"}</div>
                              <div className="font-mono text-[11px] text-muted-foreground">
                                {shortId(b._id)} · {b.bookingType === "instant" ? "Instant" : "Scheduled"}
                              </div>
                            </Link>
                          </td>
                          <td className="px-5 py-3">
                            {b.worker?._id ? (
                              <Link to="/workers/$id" params={{ id: b.worker._id }} className="font-medium text-foreground hover:text-primary">
                                {b.worker.fullName}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                            {formatDate(b.scheduledDate || b.createdAt)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-foreground">
                            {formatPKR(b.totalAmount)}
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Section title="Job posts" description={`${stats.totalJobs} posted in total`} icon={<Briefcase />}>
                {recentJobs.length === 0 ? (
                  <EmptyBlock title="No job posts" />
                ) : (
                  <ul className="space-y-2">
                    {recentJobs.map((j) => (
                      <li key={j._id}>
                        <Link
                          to="/jobs/$id"
                          params={{ id: j._id }}
                          className="flex items-center justify-between gap-3 rounded-xl border border-hairline px-3 py-2.5 transition hover:border-primary/40 hover:bg-surface/60"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-foreground">{j.title || j.category}</div>
                            <div className="text-[11px] text-muted-foreground">{j.category} · {formatDate(j.createdAt)}</div>
                          </div>
                          <StatusBadge status={j.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Reviews written" description={stats.avgRatingGiven ? `Average ${stats.avgRatingGiven} ★ given` : undefined} icon={<Star />}>
                {reviews.length === 0 ? (
                  <EmptyBlock title="No reviews yet" />
                ) : (
                  <ul className="space-y-3">
                    {reviews.map((r) => (
                      <li key={r._id} className="rounded-xl border border-hairline p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-foreground">{r.worker?.fullName || "Ustad"}</span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-gold">
                            <Star className="h-3.5 w-3.5 fill-current" /> {r.rating}
                          </span>
                        </div>
                        {r.comment && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.comment}</p>}
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{formatRelative(r.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            {disputes.length > 0 && (
              <Section title="Disputes" icon={<MessageSquareWarning />} bodyClassName="p-0">
                <ul className="divide-y divide-hairline">
                  {disputes.map((d) => (
                    <li key={d._id}>
                      <Link
                        to="/disputes/$id"
                        params={{ id: String(d._id) }}
                        className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-surface/60"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold capitalize text-foreground">
                            {(d.reason || "dispute").replace(/_/g, " ")}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            vs {d.worker?.fullName || "Ustad"} · raised by {d.raisedByType} · {formatDate(d.createdAt)}
                          </div>
                        </div>
                        <StatusBadge status={d.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        }
        aside={
          <>
            <Section title="Contact" icon={<UserRound />}>
              <InfoList>
                <InfoRow label="Phone" icon={<Phone />} mono>
                  {phone || <NotProvided />}
                </InfoRow>
                <InfoRow label="Email" icon={<Mail />}>
                  {user.email || <NotProvided />}
                </InfoRow>
                <InfoRow label="City" icon={<MapPin />}>
                  {isRealCity(user.city) ? user.city : <NotProvided label="Unknown" />}
                </InfoRow>
                <InfoRow label="Address">{user.address || <NotProvided />}</InfoRow>
              </InfoList>
            </Section>

            <Section title="Account" icon={<ShieldCheck />}>
              <InfoList>
                <InfoRow label="Status">
                  <StatusBadge status={user.isActive ? "active" : "suspended"} />
                </InfoRow>
                <InfoRow label="Sign-in">{isGoogle ? "Google" : "Phone OTP"}</InfoRow>
                <InfoRow label="Joined" mono>{formatDate(user.createdAt)}</InfoRow>
                <InfoRow label="Completion rate" mono>
                  {stats.completionRate === null ? "—" : `${stats.completionRate}%`}
                </InfoRow>
                <InfoRow label="Last booking">
                  {stats.lastBookingAt ? formatRelative(stats.lastBookingAt) : "Never"}
                </InfoRow>
              </InfoList>
            </Section>

            {favorites.length > 0 && (
              <Section title="Favourite ustads" description={`${favorites.length} saved`} icon={<Heart />}>
                <ul className="space-y-2">
                  {favorites.map((w: any) => (
                    <li key={w._id}>
                      <Link
                        to="/workers/$id"
                        params={{ id: w._id }}
                        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface"
                      >
                        <Avatar src={w.profileImage} name={w.fullName} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-foreground">{w.fullName}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{w.category}</div>
                        </div>
                        {w.rating > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-gold">
                            <Star className="h-3 w-3 fill-current" /> {Number(w.rating).toFixed(1)}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Activity" icon={<CheckCircle2 />}>
              <Timeline items={activity} />
            </Section>
          </>
        }
      />

      <ConfirmDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title="Suspend customer account"
        description={
          <p>
            <strong className="text-foreground">{user.fullName}</strong> will lose booking access immediately. The reason is saved to the
            audit log.
          </p>
        }
        confirmLabel="Suspend account"
        tone="danger"
        requireReason
        reasons={SUSPEND_REASONS}
        notePlaceholder="Explain why this account is being suspended…"
        onConfirm={suspend}
      />
    </DetailPage>
  );
}

