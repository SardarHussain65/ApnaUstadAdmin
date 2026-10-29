import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Layers, XCircle, ArrowUpRight, Award, X } from "lucide-react";
import { DataTable, FilterToolbar, SearchInput } from "@/components/admin/DataTable";
import { Avatar, Button, FormField, Textarea } from "@/components/admin/ui";
import { Drawer, Modal, ModalBody, ModalFooter } from "@/components/admin/Drawer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { fmtPKR } from "@/lib/format";
import { useReviewWorkerSpecialty, useSpecialtyRequestsPage } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/specialty-requests")({
  component: SpecialtyRequestsPage,
});

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
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredQ]);

  const { data, isLoading } = useSpecialtyRequestsPage({
    page,
    limit: 10,
    search: deferredQ || undefined,
  });
  const reviewMutation = useReviewWorkerSpecialty();

  const pendingRows = useMemo(
    () =>
      (data?.items || []).flatMap((worker: any) =>
        (worker.specialties || [])
          .filter((specialty: any) => specialty.approvalStatus === "pending" && specialty.priority > 1)
          .map((specialty: any) => ({
            worker,
            specialty,
            categoryId:
              typeof specialty.categoryId === "object"
                ? specialty.categoryId?._id
                : specialty.categoryId,
            categoryName:
              typeof specialty.categoryId === "object"
                ? specialty.categoryId?.name
                : "Category",
          }))
      ),
    [data?.items]
  );

  const review = (
    row: SpecialtyRow,
    approvalStatus: "approved" | "rejected",
    reason?: string
  ) => {
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
        title="Extra Category Requests"
        description="Review and approve extra work categories requested by Ustads."
        icon={<Layers className="h-3.5 w-3.5" />}
        stats={
          <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {pendingRows.length} pending on this page
          </span>
        }
      />

      <FilterToolbar>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search Ustad name, phone, or email..."
        />
      </FilterToolbar>

      <DataTable
        isLoading={isLoading}
        rows={pendingRows}
        pageSize={10}
        onRowClick={(row: SpecialtyRow) => setSelected(row)}
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          totalItems: data?.pagination.totalItems ?? 0,
          onPageChange: setPage,
        }}
        columns={[
          {
            key: "worker",
            header: "Ustad",
            render: (row: SpecialtyRow) => (
              <div
                className="flex items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar name={row.worker.fullName} src={row.worker.profileImage} />
                <div>
                  <Link
                    to="/workers/$id"
                    params={{ id: String(row.worker._id) }}
                    className="font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {row.worker.fullName}
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">
                    {row.worker.phone}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "category",
            header: "Requested Service",
            render: (row: SpecialtyRow) => (
              <span className="font-semibold text-foreground">{row.categoryName}</span>
            ),
          },
          {
            key: "fee",
            header: "Monthly Fee",
            render: (row: SpecialtyRow) => (
              <span className="font-mono font-bold tabular-nums text-primary">
                {fmtPKR(row.specialty.monthlyFeeSnapshot || 0)}
              </span>
            ),
          },
          {
            key: "experience",
            header: "Experience",
            render: (row: SpecialtyRow) => (
              <span className="font-mono text-xs text-foreground">
                {row.specialty.experience || 0} yrs
              </span>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            className: "text-right",
            render: (row: SpecialtyRow) => (
              <div
                className="flex justify-end gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSelected(row)}
                  className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  <Eye className="h-3.5 w-3.5" /> Review
                </button>
                <button
                  type="button"
                  onClick={() => review(row, "approved")}
                  disabled={reviewMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-500 transition hover:bg-emerald-500/20"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(row);
                    setRejectOpen(true);
                  }}
                  disabled={reviewMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/20"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            ),
          },
        ]}
      />

      <Drawer
        open={!!selected && !rejectOpen}
        onClose={() => setSelected(null)}
        title="Specialty Request Review"
        description="Review Ustad credentials before approving this paid category."
        width="max-w-xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  name={selected.worker.fullName}
                  src={selected.worker.profileImage}
                  size={44}
                />
                <div>
                  <div className="font-semibold text-foreground">
                    {selected.worker.fullName}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {selected.worker.email || selected.worker.phone}
                  </div>
                </div>
              </div>
              <Link
                to="/workers/$id"
                params={{ id: String(selected.worker._id) }}
                className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Full Profile <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-hairline bg-surface p-4 text-sm">
              <Info label="Requested Service" value={selected.categoryName} />
              <Info
                label="Monthly Fee"
                value={fmtPKR(selected.specialty.monthlyFeeSnapshot || 0)}
              />
              <Info
                label="Hourly Rate"
                value={fmtPKR(selected.specialty.hourlyRate || 0)}
              />
              <Info
                label="Experience"
                value={`${selected.specialty.experience || 0} years`}
              />
            </div>
            {selected.specialty.bio && (
              <div className="rounded-xl border border-hairline bg-surface p-3.5 text-sm leading-relaxed text-muted-foreground">
                {selected.specialty.bio}
              </div>
            )}
            {(() => {
              const certs =
                selected.specialty.certificates?.length
                  ? selected.specialty.certificates
                  : (selected.worker.certificates || []).filter(
                      (c: any) =>
                        !c.categoryName || c.categoryName === selected.categoryName
                    );
              if (!certs || certs.length === 0) return null;
              return (
                <div className="rounded-xl border border-hairline bg-surface p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Award className="h-3.5 w-3.5 text-primary" /> Supporting Certificates ({certs.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {certs.map((cert: any, idx: number) => (
                      <button
                        key={cert._id || idx}
                        type="button"
                        onClick={() => cert.certificateUrl && setLightbox(cert.certificateUrl)}
                        className="group flex items-center gap-2.5 rounded-xl border border-hairline bg-card p-2.5 text-left transition hover:border-primary/50"
                      >
                        {cert.certificateUrl ? (
                          <img
                            src={cert.certificateUrl}
                            alt={cert.title || "Certificate"}
                            className="h-12 w-16 shrink-0 rounded-lg object-cover border border-hairline"
                          />
                        ) : (
                          <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-surface text-muted-foreground">
                            <Award className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-foreground">
                            {cert.title || "Certificate"}
                          </div>
                          {cert.issuingOrg && (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {cert.issuingOrg}
                            </div>
                          )}
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-primary group-hover:underline">
                            <Eye className="h-3 w-3" /> Inspect
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="flex gap-2 border-t border-hairline pt-4">
              <Button
                variant="success"
                className="flex-1"
                onClick={() => review(selected, "approved")}
              >
                Approve Specialty
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject specialty request"
        description="The Ustad will see this reason in their app. Be specific so they can fix and re-apply."
        variant="danger"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={reviewMutation.isPending}
              disabled={!rejectReason.trim() || !selected}
              onClick={() =>
                selected && review(selected, "rejected", rejectReason.trim())
              }
            >
              Confirm Rejection
            </Button>
          </ModalFooter>
        }
      >
        <ModalBody>
          <FormField
            label="Rejection reason"
            hint="Required — shown to the Ustad in the mobile app."
          >
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Experience certificate is missing or category mismatch..."
            />
          </FormField>
        </ModalBody>
      </Modal>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-xl glass text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="Certificate preview" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}
