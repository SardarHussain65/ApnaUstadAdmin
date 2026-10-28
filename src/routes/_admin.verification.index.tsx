import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Fingerprint,
  ShieldCheck,
  ArrowUpRight,
  ScanFace,
} from "lucide-react";
import { DataTable, FilterToolbar, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge } from "@/components/admin/ui";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { format } from "date-fns";
import { useVerificationRequestsPage } from "@/lib/api-hooks";
import { formatCnic } from "@/lib/format";

export const Route = createFileRoute("/_admin/verification/")({
  component: VerificationRequestsIndexPage,
});

export interface VerificationRequest {
  _id: string;
  worker?: {
    _id: string;
    fullName: string;
    phone: string;
    email?: string;
    profileImage?: string;
    category: string;
    city: string;
    address?: string;
    isVerified?: boolean;
    isActive?: boolean;
    createdAt?: string;
  };
  cnicNumber: string;
  cnicFrontImage: string;
  cnicBackImage: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  adminNotes?: string;
  reviewedBy?: {
    _id: string;
    fullName: string;
    email?: string;
  };
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  history?: VerificationRequest[];
}

function VerificationRequestsIndexPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const deferredQ = useDeferredValue(q);

  useEffect(() => {
    setPage(1);
  }, [deferredQ, status]);

  const { data, isLoading, isFetching } = useVerificationRequestsPage({
    page,
    limit: 15,
    status: status || undefined,
    search: deferredQ || undefined,
  });

  const apiRequests: VerificationRequest[] = (data?.items as any) || [];
  const rows = useMemo(() => apiRequests.map((r) => ({ ...r, id: r._id })), [apiRequests]);

  const stats = useMemo(() => {
    return {
      total: data?.pagination.totalItems ?? 0,
      pending: apiRequests.filter((r) => r.status === "pending").length,
      approved: apiRequests.filter((r) => r.status === "approved").length,
      rejected: apiRequests.filter((r) => r.status === "rejected").length,
    };
  }, [apiRequests, data?.pagination.totalItems]);

  return (
    <div className="space-y-5 animate-fade-in">
      <AdminPageHeader
        title="Worker Identity & NADRA Verification Queue"
        description="Click any submission to open the dedicated full-page Side-by-Side Facial Match & NADRA CNIC Inspector."
        icon={<Fingerprint className="h-4 w-4" />}
        stats={
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Total Matching: {stats.total}</Badge>
            <Badge variant="warning" pulse={stats.pending > 0}>
              Pending (On Page): {stats.pending}
            </Badge>
            <Badge variant="success">Approved (On Page): {stats.approved}</Badge>
            <Badge variant="danger">Rejected (On Page): {stats.rejected}</Badge>
          </div>
        }
      />

      <FilterToolbar>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by Ustad name, phone, or CNIC number..."
        />
        <Select
          value={status}
          onChange={setStatus}
          label="All Statuses"
          options={[
            { value: "pending", label: "Pending Reviews" },
            { value: "approved", label: "Approved Verifications" },
            { value: "rejected", label: "Rejected Audits" },
            { value: "", label: "All Verifications" },
          ]}
        />
      </FilterToolbar>

      <DataTable
        isLoading={isLoading}
        rows={rows}
        pageSize={15}
        onRowClick={(r: VerificationRequest) =>
          navigate({ to: "/verification/$id", params: { id: String(r._id) } })
        }
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          totalItems: data?.pagination.totalItems ?? 0,
          onPageChange: setPage,
        }}
        columns={[
          {
            key: "worker",
            header: "Ustad Profile",
            render: (r: VerificationRequest) => (
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <Avatar
                  src={r.worker?.profileImage}
                  name={r.worker?.fullName || "Worker"}
                  size={40}
                />
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    {r.worker?._id ? (
                      <Link
                        to="/workers/$id"
                        params={{ id: String(r.worker._id) }}
                        className="hover:text-primary hover:underline"
                      >
                        {r.worker.fullName || "Unnamed Worker"}
                      </Link>
                    ) : (
                      <span>{r.worker?.fullName || "Unnamed Worker"}</span>
                    )}
                    {r.status === "approved" && (
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    <span>{r.worker?.phone || "—"}</span>
                    <span>·</span>
                    <span>{r.worker?.city || "Pakistan"}</span>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "category",
            header: "Primary Trade",
            render: (r: VerificationRequest) => (
              <Badge variant="orange">{r.worker?.category || "General"}</Badge>
            ),
          },
          {
            key: "cnic",
            header: "CNIC Number",
            render: (r: VerificationRequest) => (
              <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
                {formatCnic(r.cnicNumber)}
              </span>
            ),
          },
          {
            key: "submitted",
            header: "Submitted",
            render: (r: VerificationRequest) => (
              <div className="font-mono text-xs text-muted-foreground">
                {r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy, HH:mm") : "N/A"}
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r: VerificationRequest) => {
              if (r.status === "approved") return <Badge variant="success">Verified</Badge>;
              if (r.status === "rejected") return <Badge variant="danger">Rejected</Badge>;
              return (
                <Badge variant="warning" pulse>
                  Pending Review
                </Badge>
              );
            },
          },
          {
            key: "actions",
            header: "Actions",
            className: "text-right",
            render: (r: VerificationRequest) => (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <Link
                  to="/verification/$id"
                  params={{ id: String(r._id) }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    r.status === "pending"
                      ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-hairline bg-surface text-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {r.status === "pending" ? (
                    <ScanFace className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  )}
                  {r.status === "pending" ? "Inspect" : "View Audit"}
                </Link>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

