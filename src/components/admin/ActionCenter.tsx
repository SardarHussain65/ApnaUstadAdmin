import { Link } from "@tanstack/react-router";
import { ArrowRight, Fingerprint, HelpCircle, Layers, Scale, Wallet, Wrench } from "lucide-react";
import { fmtPKR } from "@/lib/format";
import {
  useDisputesPage,
  useNavBadges,
  useSpecialtyRequestsPage,
  useSupportRequestsPage,
  useVerificationRequestsPage,
  useWalletTopUpsPage,
  useWorkersPage,
} from "@/lib/api-hooks";

type QueueItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
};

export function ActionCenter() {
  const badges = useNavBadges();
  const { data: verifications } = useVerificationRequestsPage({ status: "pending", limit: 3 });
  const { data: specialties } = useSpecialtyRequestsPage({ limit: 3 });
  const { data: topUps } = useWalletTopUpsPage({ status: "pending", limit: 3 });
  const { data: support } = useSupportRequestsPage({ status: "open", limit: 3 });
  const { data: disputes } = useDisputesPage({ status: "open", limit: 3 });
  const { data: workers } = useWorkersPage({ verified: false, limit: 3 });

  const queueCards = [
    { label: "Identity Reviews", count: badges.pendingVerifications, href: "/verification", icon: Fingerprint, color: "text-accent" },
    { label: "Specialty Requests", count: badges.pendingSpecialties, href: "/specialty-requests", icon: Layers, color: "text-primary" },
    { label: "Wallet Top-ups", count: badges.pendingTopUps, href: "/wallets", icon: Wallet, color: "text-success" },
    { label: "Support Tickets", count: badges.openTickets, href: "/support", icon: HelpCircle, color: "text-secondary" },
    { label: "Open Disputes", count: badges.openDisputes, href: "/disputes", icon: Scale, color: "text-destructive" },
    { label: "Unverified Workers", count: badges.unverifiedWorkers, href: "/onboarding", icon: Wrench, color: "text-gold" },
  ];

  const items: QueueItem[] = [
  ...(verifications?.items || []).map((item: any) => ({
    id: `verification-${item._id}`,
    title: item.worker?.fullName || "Worker verification",
    subtitle: "CNIC review pending",
    href: "/verification",
  })),
  ...(specialties?.items || []).flatMap((worker: any) =>
    (worker.specialties || [])
      .filter((specialty: any) => specialty.approvalStatus === "pending")
      .slice(0, 1)
      .map((specialty: any) => ({
        id: `specialty-${worker._id}-${specialty._id}`,
        title: worker.fullName,
        subtitle: `Specialty request: ${typeof specialty.categoryId === "object" ? specialty.categoryId?.name : "Category"}`,
        href: "/specialty-requests",
      }))
  ),
  ...(topUps?.items || []).map((item: any) => ({
    id: `topup-${item._id}`,
    title: item.worker?.fullName || "Wallet top-up",
    subtitle: `${fmtPKR(item.amount || 0)} via ${item.method || "transfer"}`,
    href: "/wallets",
  })),
  ...(support?.items || []).map((item: any) => ({
    id: `support-${item._id}`,
    title: item.name || item.topic || "Support ticket",
    subtitle: item.message?.slice(0, 80) || "Open support request",
    href: "/support",
    badge: item.priority,
  })),
  ...(disputes?.items || []).map((item: any) => ({
    id: `dispute-${item._id}`,
    title: `Dispute #${String(item._id).slice(-6)}`,
    subtitle: item.reason || "Booking dispute",
    href: "/disputes",
  })),
  ...(workers?.items || []).map((item: any) => ({
    id: `worker-${item._id}`,
    title: item.fullName,
    subtitle: "Worker awaiting verification",
    href: "/onboarding",
  })),
  ].slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Action Center</h3>
          <p className="text-xs text-dim">Prioritized queues that need admin attention today.</p>
        </div>
        <Link to="/onboarding" className="text-xs font-semibold text-primary hover:underline">
          View onboarding pipeline
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {queueCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href + card.label}
              to={card.href}
              className="rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40"
            >
              <div className="mb-3 flex items-center justify-between">
                <Icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xl font-extrabold text-white">{card.count}</span>
              </div>
              <div className="text-xs font-semibold text-white">{card.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-white">Priority inbox</div>
        <div className="divide-y divide-border/60">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-dim">No pending actions right now.</div>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-surface-light/20"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{item.title}</div>
                  <div className="truncate text-xs text-dim">{item.subtitle}</div>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-dim">
                      {item.badge}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
