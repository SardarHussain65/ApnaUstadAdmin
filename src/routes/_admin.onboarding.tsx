import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Fingerprint, Route as RouteIcon, Wallet } from "lucide-react";
import { DataTable, FilterToolbar, SearchInput } from "@/components/admin/DataTable";
import { Avatar, Badge } from "@/components/admin/ui";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { fmtPKR } from "@/lib/format";
import { useWorkerOnboardingPage } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/onboarding")({ component: OnboardingPage });

function OnboardingPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);

  useEffect(() => { setPage(1); }, [deferredQ]);

  const { data, isLoading } = useWorkerOnboardingPage({ page, limit: 10, search: deferredQ || undefined });
  const rows = data?.items || [];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Worker Onboarding Pipeline"
        description="See every blocker between signup and go-live: CNIC verification, specialty approval, and wallet readiness."
        icon={<RouteIcon className="h-3.5 w-3.5" />}
        stats={
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{data?.pagination.totalItems ?? 0} workers in pipeline</Badge>
            <Badge variant="warning">Review blockers before workers can accept jobs</Badge>
          </div>
        }
      />

      <FilterToolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search worker name, phone, or city..." />
      </FilterToolbar>

      <DataTable
        isLoading={isLoading}
        rows={rows}
        pageSize={10}
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          totalItems: data?.pagination.totalItems ?? 0,
          onPageChange: setPage,
        }}
        columns={[
          {
            key: "worker",
            header: "Worker",
            render: (worker: any) => (
              <div className="flex items-center gap-3">
                <Avatar name={worker.fullName} src={worker.profileImage} />
                <div>
                  <div className="font-semibold text-white">{worker.fullName}</div>
                  <div className="text-xs text-dim">{worker.city || "No city"}</div>
                </div>
              </div>
            ),
          },
          {
            key: "cnic",
            header: "CNIC",
            render: (worker: any) => <StepBadge status={worker.onboarding?.cnic} />,
          },
          {
            key: "specialty",
            header: "Specialty",
            render: (worker: any) => <StepBadge status={worker.onboarding?.specialty} />,
          },
          {
            key: "wallet",
            header: "Wallet",
            render: (worker: any) => (
              <div className="space-y-1">
                <StepBadge status={worker.onboarding?.wallet} />
                <div className="text-xs text-dim">
                  {fmtPKR(worker.onboarding?.walletBalance || 0)} / {fmtPKR(worker.onboarding?.minimumWalletBalance || 0)}
                </div>
              </div>
            ),
          },
          {
            key: "blockers",
            header: "Blockers",
            render: (worker: any) => (
              <div className="flex max-w-[220px] flex-wrap gap-1">
                {(worker.onboarding?.blockers || []).length === 0 ? (
                  <span className="text-xs text-success">Ready to go live</span>
                ) : (
                  (worker.onboarding?.blockers || []).map((blocker: string) => (
                    <span key={blocker} className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                      {blocker}
                    </span>
                  ))
                )}
              </div>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (worker: any) => (
              <Link
                to="/workers/$id"
                params={{ id: worker._id }}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/15"
              >
                Review <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}

function StepBadge({ status }: { status?: string }) {
  if (status === "complete") {
    return <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</span>;
  }
  if (status === "pending") {
    return <span className="inline-flex items-center gap-1 text-gold"><Fingerprint className="h-3.5 w-3.5" /> Pending</span>;
  }
  if (status === "blocked") {
    return <span className="inline-flex items-center gap-1 text-destructive"><Wallet className="h-3.5 w-3.5" /> Low balance</span>;
  }
  return <span className="inline-flex items-center gap-1 text-dim"><AlertTriangle className="h-3.5 w-3.5" /> Missing</span>;
}
