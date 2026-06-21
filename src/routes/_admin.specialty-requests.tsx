import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Layers, XCircle } from "lucide-react";
import { DataTable, FilterToolbar, SearchInput } from "@/components/admin/DataTable";
import { Avatar, Button, FormField, Textarea } from "@/components/admin/ui";
import { Drawer, Modal, ModalBody, ModalFooter } from "@/components/admin/Drawer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { fmtPKR } from "@/lib/format";
import { useReviewWorkerSpecialty, useSpecialtyRequestsPage } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/specialty-requests")({ component: SpecialtyRequestsPage });

type SpecialtyRow = {
  worker: any;
  specialty: any;
  categoryId: string;
  categoryName: string;
};

function SpecialtyRequestsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [selected, setSelected] = useState<SpecialtyRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => { setPage(1); }, [deferredQ]);

  const { data, isLoading } = useSpecialtyRequestsPage({ page, limit: 10, search: deferredQ || undefined });
  const reviewMutation = useReviewWorkerSpecialty();

  const pendingRows = useMemo(() => (data?.items || []).flatMap((worker: any) =>
    (worker.specialties || [])
      .filter((specialty: any) => specialty.approvalStatus === "pending")
      .map((specialty: any) => ({
        worker,
        specialty,
        categoryId: typeof specialty.categoryId === "object" ? specialty.categoryId?._id : specialty.categoryId,
        categoryName: typeof specialty.categoryId === "object" ? specialty.categoryId?.name : "Category",
      }))
  ), [data?.items]);

  const review = (row: SpecialtyRow, approvalStatus: "approved" | "rejected", reason?: string) => {
    reviewMutation.mutate(
      {
        workerId: row.worker._id,
        categoryId: row.categoryId,
        approvalStatus,
        reason,
      },
      {
        onSuccess: () => {
          setSelected(null);
          setRejectOpen(false);
          setRejectReason("");
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Specialty Requests"
        description="Approve or reject paid category add-ons before workers can offer new services."
        icon={<Layers className="h-3.5 w-3.5" />}
        stats={<span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{pendingRows.length} pending on this page</span>}
      />

      <FilterToolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search worker name, phone, or email..." />
      </FilterToolbar>

      <DataTable
        isLoading={isLoading}
        rows={pendingRows}
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
            render: (row: SpecialtyRow) => (
              <div className="flex items-center gap-3">
                <Avatar name={row.worker.fullName} src={row.worker.profileImage} />
                <div>
                  <div className="font-semibold text-white">{row.worker.fullName}</div>
                  <div className="text-xs text-dim">{row.worker.phone}</div>
                </div>
              </div>
            ),
          },
          {
            key: "category",
            header: "Service",
            render: (row: SpecialtyRow) => <span className="font-medium">{row.categoryName}</span>,
          },
          {
            key: "fee",
            header: "Monthly fee",
            render: (row: SpecialtyRow) => <span className="font-bold text-primary">{fmtPKR(row.specialty.monthlyFeeSnapshot || 0)}</span>,
          },
          {
            key: "experience",
            header: "Experience",
            render: (row: SpecialtyRow) => `${row.specialty.experience || 0} yrs`,
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (row: SpecialtyRow) => (
              <div className="flex justify-end gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(row); }}
                  className="rounded-lg border border-border p-2 text-dim transition hover:border-primary/30 hover:text-white"
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); review(row, "approved"); }}
                  className="rounded-lg border border-success/30 bg-success/10 p-2 text-success transition hover:bg-success/15"
                  title="Approve"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(row); setRejectOpen(true); }}
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-destructive transition hover:bg-destructive/15"
                  title="Reject"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Drawer
        open={!!selected && !rejectOpen}
        onClose={() => setSelected(null)}
        title="Specialty Request"
        description="Review worker credentials before approving this paid category."
        width="max-w-xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <Avatar name={selected.worker.fullName} src={selected.worker.profileImage} size={48} />
                <div>
                  <div className="font-semibold text-white">{selected.worker.fullName}</div>
                  <div className="text-sm text-dim">{selected.worker.email || selected.worker.phone}</div>
                </div>
              </div>
              <Link to="/workers/$id" params={{ id: selected.worker._id }} className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
                Open worker profile →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Service" value={selected.categoryName} />
              <Info label="Monthly fee" value={fmtPKR(selected.specialty.monthlyFeeSnapshot || 0)} />
              <Info label="Hourly rate" value={fmtPKR(selected.specialty.hourlyRate || 0)} />
              <Info label="Experience" value={`${selected.specialty.experience || 0} years`} />
            </div>
            {selected.specialty.bio && (
              <div className="rounded-xl border border-white/8 bg-black/20 p-3 text-sm leading-relaxed text-muted-foreground">{selected.specialty.bio}</div>
            )}
            <div className="flex gap-2 border-t border-white/8 pt-4">
              <Button variant="success" className="flex-1" onClick={() => review(selected, "approved")}>Approve specialty</Button>
              <Button variant="danger" className="flex-1" onClick={() => setRejectOpen(true)}>Reject</Button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject specialty request"
        description="The worker will see this reason. Be specific so they can fix and re-apply."
        variant="danger"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={reviewMutation.isPending}
              disabled={!rejectReason.trim() || !selected}
              onClick={() => selected && review(selected, "rejected", rejectReason.trim())}
            >
              Confirm rejection
            </Button>
          </ModalFooter>
        }
      >
        <ModalBody>
          <FormField label="Rejection reason" hint="Required — shown to the worker in the app.">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Experience certificate is missing or category mismatch..."
            />
          </FormField>
        </ModalBody>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-dim">{label}</div>
      <div className="mt-1 font-medium text-white">{value}</div>
    </div>
  );
}
