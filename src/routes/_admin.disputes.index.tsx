import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useDeferredValue, useEffect } from "react";
import { useDisputesPage, useDisputeStats } from "@/lib/api-hooks";
import {
  DataTable,
  FilterToolbar,
  SearchInput,
  Select,
  type Column,
} from "@/components/admin/DataTable";
import { Badge, StatusBadge, Avatar } from "@/components/admin/ui";
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Gavel,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { fmtPKR, shortId } from "@/lib/format";

export const Route = createFileRoute("/_admin/disputes/")({
  component: DisputesIndexPage,
});

export function getDisputeReasonLabel(reason: string) {
  switch (reason) {
    case "incomplete_work":
      return "Work not completed";
    case "unfair_pricing":
      return "Overcharged / unfair price";
    case "no_show":
      return "Ustad did not show up";
    case "poor_quality":
      return "Poor workmanship";
    case "payment_issue":
      return "Cash payment issue";
    default:
      return "Other problem";
  }
}

function DisputesIndexPage() {
  const navigate = useNavigate();
  const [scopeTab, setScopeTab] = useState<"active" | "history">("active");
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);

  const { data: stats } = useDisputeStats();

  useEffect(() => {
    setPage(1);
  }, [scopeTab, statusFilter, reasonFilter, deferredSearch]);

  const { data: disputesData, isLoading } = useDisputesPage({
    page,
    limit: 12,
    scope: scopeTab,
    status: statusFilter || undefined,
    reason: reasonFilter || undefined,
    search: deferredSearch || undefined,
  });

  const disputes = disputesData?.items || [];

  const columns: Column<any>[] = [
    {
      key: "id",
      header: "Case",
      render: (dispute: any) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-semibold text-foreground">
            #{shortId(dispute._id)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {dispute.createdAt ? format(new Date(dispute.createdAt), "dd MMM yyyy") : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "raisedBy",
      header: "Raised By",
      render: (dispute: any) => (
        <Badge variant={dispute.raisedByType === "customer" ? "info" : "orange"}>
          {dispute.raisedByType === "customer" ? "Customer" : "Ustad"}
        </Badge>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (dispute: any) => (
        <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
          <Avatar
            src={dispute.customer?.profileImage}
            name={dispute.customer?.fullName || "Customer"}
            size={30}
          />
          <div className="min-w-0">
            {dispute.customer?._id ? (
              <Link
                to="/users/$id"
                params={{ id: String(dispute.customer._id) }}
                className="block truncate font-semibold text-foreground hover:text-primary hover:underline"
              >
                {dispute.customer.fullName || "Customer"}
              </Link>
            ) : (
              <span className="block truncate font-semibold text-foreground">
                {dispute.customer?.fullName || "Anonymous"}
              </span>
            )}
            <span className="block font-mono text-[11px] text-muted-foreground">
              {dispute.customer?.phone || "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "worker",
      header: "Ustad",
      render: (dispute: any) => (
        <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
          <Avatar
            src={dispute.worker?.profileImage}
            name={dispute.worker?.fullName || "Ustad"}
            size={30}
          />
          <div className="min-w-0">
            {dispute.worker?._id ? (
              <Link
                to="/workers/$id"
                params={{ id: String(dispute.worker._id) }}
                className="block truncate font-semibold text-foreground hover:text-primary hover:underline"
              >
                {dispute.worker.fullName || "Ustad"}
              </Link>
            ) : (
              <span className="block truncate font-semibold text-foreground">
                {dispute.worker?.fullName || "Unnamed"}
              </span>
            )}
            <span className="block font-mono text-[11px] text-muted-foreground">
              {dispute.worker?.phone || "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "booking",
      header: "Booking",
      render: (dispute: any) => {
        const bookingId = dispute.booking?._id || dispute.booking;
        return (
          <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-semibold text-foreground">
              {dispute.booking?.category || "Service Booking"}
            </span>
            {bookingId ? (
              <Link
                to="/bookings/$id"
                params={{ id: String(bookingId) }}
                className="inline-flex items-center gap-0.5 font-mono text-[11px] text-primary hover:underline"
              >
                #{shortId(String(bookingId))} <ArrowUpRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-[11px] text-muted-foreground">N/A</span>
            )}
          </div>
        );
      },
    },
    {
      key: "reason",
      header: "Issue & Chat",
      render: (dispute: any) => (
        <div className="flex flex-col gap-1 max-w-xs">
          <span className="inline-flex w-fit rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-xs font-medium text-foreground">
            {getDisputeReasonLabel(dispute.reason)}
          </span>
          {dispute.lastMessagePreview && (
            <span className="truncate text-[11px] text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3 shrink-0 text-primary" />
              {dispute.lastMessagePreview}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Job Value",
      className: "text-right",
      render: (dispute: any) => (
        <span className="font-mono text-sm font-bold tabular-nums text-primary">
          {fmtPKR(dispute.amountDisputed || 0)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (dispute: any) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={dispute.status} />
          {dispute.outcomeLabel && (
            <span className="text-[10px] font-semibold text-muted-foreground">
              {dispute.outcomeLabel}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (dispute: any) => {
        const isPending = dispute.status === "open" || dispute.status === "under_review";
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Link
              to="/disputes/$id"
              params={{ id: String(dispute._id) }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                isPending
                  ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-hairline bg-surface text-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {isPending ? <Gavel className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              {isPending ? "Case Room" : "View Dossier"}
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards from Stats Endpoint */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-hairline bg-card p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {stats?.active ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Active Complaints</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-hairline bg-card p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-destructive">
              {stats?.open ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">New / Unopened</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-hairline bg-card p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-amber-500">
              {stats?.underReview ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Under Investigation</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-hairline bg-card p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-emerald-500">
              {stats?.closed ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Closed Cases in History</div>
          </div>
        </div>
      </div>

      {/* Tabs: Active vs History */}
      <div className="flex items-center gap-2 border-b border-hairline pb-2">
        <button
          type="button"
          onClick={() => setScopeTab("active")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            scopeTab === "active"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-card hover:text-foreground"
          }`}
        >
          <span>Active Complaints</span>
          <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">
            {stats?.active ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setScopeTab("history")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            scopeTab === "history"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-card hover:text-foreground"
          }`}
        >
          <span>Case History (Closed)</span>
          <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">
            {stats?.closed ?? 0}
          </span>
        </button>
      </div>

      <FilterToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by client, Ustad, description or ID..."
        />
        <Select
          value={reasonFilter}
          onChange={setReasonFilter}
          label="All Reasons"
          options={[
            { value: "incomplete_work", label: "Work not completed" },
            { value: "unfair_pricing", label: "Overcharged" },
            { value: "no_show", label: "Ustad no-show" },
            { value: "poor_quality", label: "Poor workmanship" },
            { value: "payment_issue", label: "Cash payment issue" },
            { value: "other", label: "Other" },
          ]}
        />
      </FilterToolbar>

      <DataTable
        columns={columns}
        rows={disputes}
        isLoading={isLoading}
        pageSize={12}
        onRowClick={(dispute: any) =>
          navigate({ to: "/disputes/$id", params: { id: String(dispute._id) } })
        }
        emptyTitle={scopeTab === "active" ? "No active disputes" : "No closed case history"}
        emptyDescription={
          scopeTab === "active"
            ? "When a customer or Ustad reports an issue, it will appear here."
            : "Resolved and dismissed cases will be archived here."
        }
        pagination={{
          page,
          totalPages: disputesData?.pagination.totalPages ?? 1,
          totalItems: disputesData?.pagination.totalItems ?? 0,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
