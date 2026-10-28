import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useDeferredValue, useEffect, useMemo } from "react";
import { useDisputesPage } from "@/lib/api-hooks";
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
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, reasonFilter, deferredSearch]);

  const { data: disputesData, isLoading } = useDisputesPage({
    page,
    limit: 12,
    status: statusFilter || undefined,
    reason: reasonFilter || undefined,
    search: deferredSearch || undefined,
  });

  const disputes = disputesData?.items || [];

  const stats = useMemo(() => {
    return {
      total: disputesData?.pagination.totalItems ?? 0,
      open: disputes.filter((d: any) => d.status === "open").length,
      review: disputes.filter((d: any) => d.status === "under_review").length,
      resolved: disputes.filter(
        (d: any) => d.status === "resolved" || d.status === "dismissed"
      ).length,
    };
  }, [disputes, disputesData?.pagination.totalItems]);

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
      header: "Reason",
      render: (dispute: any) => (
        <span className="inline-flex rounded-full border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
          {getDisputeReasonLabel(dispute.reason)}
        </span>
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
      render: (dispute: any) => <StatusBadge status={dispute.status} />,
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
              {isPending ? "Resolve" : "View Case"}
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Pakistan cash-booking arbitration:</strong> Customers and Ustads report complaints directly from the mobile app. Job value is locked from the booking agreement. Click any case to open the full-page arbitration console with chat transcripts, photo evidence, and wallet refund/penalty controls.
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-hairline bg-card p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Complaints</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-hairline bg-card p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-destructive">{stats.open}</div>
            <div className="text-xs text-muted-foreground">Open (On Page)</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-hairline bg-card p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-amber-500">{stats.review}</div>
            <div className="text-xs text-muted-foreground">Under Review (On Page)</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-hairline bg-card p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-bold tabular-nums text-emerald-500">{stats.resolved}</div>
            <div className="text-xs text-muted-foreground">Closed (On Page)</div>
          </div>
        </div>
      </div>

      <FilterToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search disputes by name, phone, description or ID..."
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          label="All Statuses"
          options={[
            { value: "open", label: "Open / Unresolved" },
            { value: "under_review", label: "Under Review" },
            { value: "resolved", label: "Resolved (Client Favour)" },
            { value: "dismissed", label: "Dismissed (Ustad Favour)" },
          ]}
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
        emptyTitle="No disputes found"
        emptyDescription="Customers and Ustads report issues from the mobile app under booking details."
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
