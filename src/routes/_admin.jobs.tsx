import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useState } from "react";
import { Trash2, Download, ExternalLink, ChevronDown, Users, XCircle } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Badge, StatusBadge } from "@/components/admin/ui";
import { Drawer, Modal } from "@/components/admin/Drawer";
import { CATEGORY_NAMES, fmtPKR } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDeleteJob, useCancelJob, useJobsPage, useJobDetails, useUpdateJobStatus } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/jobs")({ component: JobsPage });

function JobsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [urg, setUrg] = useState("");
  const [cat, setCat] = useState("");
  const [sel, setSel] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [statusOverride, setStatusOverride] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [bidsExpanded, setBidsExpanded] = useState(true);
  const [page, setPage] = useState(1);
  const deferredQ = useDeferredValue(q);

  useEffect(() => { setPage(1); }, [deferredQ, status, urg, cat]);

  const { data, isLoading } = useJobsPage({
    page,
    limit: 10,
    search: deferredQ,
    status: status || undefined,
    urgency: urg || undefined,
    category: cat || undefined,
  });
  const { data: jobDetails, isLoading: detailsLoading } = useJobDetails(sel?._id || "", !!sel);
  const deleteJobMutation = useDeleteJob();
  const cancelJobMutation = useCancelJob();
  const updateStatusMutation = useUpdateJobStatus();

  const rows = data?.items || [];

  const enrichedJob = (jobDetails as any) || sel;
  const bids = enrichedJob?.bids || [];

  const handleStatusOverride = () => {
    if (!sel || !statusOverride) return;
    updateStatusMutation.mutate(
      { id: sel._id, status: statusOverride },
      { onSuccess: () => { toast.success(`Status set to ${statusOverride}`); setStatusOverride(""); } }
    );
  };

  const handleCancel = () => {
    if (!sel) return;
    cancelJobMutation.mutate(
      { id: sel._id, reason: "Cancelled by admin" },
      {
        onSuccess: () => {
          setCancelConfirm(false);
          setSel(null);
          toast.success("Job cancelled");
        }
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search jobs..." />
        <Select value={status} onChange={setStatus} label="All Status" options={["open","assigned","reviewing","closed","cancelled"].map(s=>({value:s,label:s}))} />
        <Select value={urg} onChange={setUrg} label="Urgency" options={[{value:"instant",label:"Instant"},{value:"scheduled",label:"Scheduled"}]} />
        <Select value={cat} onChange={setCat} label="Category" options={CATEGORY_NAMES.map(c=>({value:c,label:c}))} />
        <button
          onClick={() => {
            downloadCsv("jobs", rows, [
              { key: "_id", header: "Job ID" },
              { key: "category", header: "Category" },
              { key: "status", header: "Status" },
              { key: "urgency", header: "Urgency" },
              { key: "bidsCount", header: "Bids" },
              { key: "createdAt", header: "Posted" },
            ]);
            toast.success(`Exported ${rows.length} jobs`);
          }}
          className="btn-press inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-surface-light hover:bg-primary/15 hover:text-primary border border-border text-sm font-semibold transition"
        >
          <Download className="w-4 h-4" /> Export Page CSV
        </button>
      </div>

      <DataTable isLoading={isLoading} rows={rows} pagination={{
        page,
        totalPages: data?.pagination.totalPages ?? 1,
        totalItems: data?.pagination.totalItems ?? 0,
        onPageChange: setPage,
      }} onRowClick={j => { setSel(j); setBidsExpanded(true); setStatusOverride(""); setCancelConfirm(false); }} columns={[
        { key: "id", header: "Job ID", render: j => <span className="font-mono text-xs text-primary">#{j._id.slice(-6)}</span> },
        {
          key: "c", header: "Customer", render: j => (
            <div className="flex items-center gap-1">
              <span>{j.customer?.fullName || 'Unknown'}</span>
              {j.customer?._id && (
                <Link to="/users" onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary transition" title={`User: ${j.customer._id}`}>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          )
        },
        { key: "cat", header: "Category", render: j => <Badge variant="orange">{j.category || 'N/A'}</Badge> },
        { key: "u", header: "Urgency", render: j => <StatusBadge status={j.urgency} /> },
        { key: "s", header: "Status", render: j => <StatusBadge status={j.status} /> },
        { key: "amt", header: "Client Offer", render: j => <span className="font-semibold">{fmtPKR(j.pricing?.clientOffer || j.amount || 0)}</span> },
        { key: "agreed", header: "Selected Quote", render: j => <span className={j.acceptedBid ? "font-semibold text-success" : "text-xs text-muted-foreground"}>{j.acceptedBid ? fmtPKR(j.acceptedBid.proposedPrice || 0) : "Not assigned"}</span> },
        { key: "b", header: "Bids", render: j => <Badge variant="purple">{j.bidsCount || 0}</Badge> },
        { key: "p", header: "Posted", render: j => <span className="text-xs text-muted-foreground">{j.createdAt ? format(new Date(j.createdAt), "dd MMM") : 'N/A'}</span> },
        { key: "a", header: "", render: j => (
          <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setConfirmDelete(j)}
              disabled={deleteJobMutation.isPending}
              className="p-2 rounded-lg hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
              title="Delete job"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) },
      ]} />

      {/* Job Detail Drawer */}
      <Drawer open={!!sel} onClose={() => { setSel(null); setCancelConfirm(false); setStatusOverride(""); }} title={`Job #${sel?._id?.slice(-6) ?? ""}`} width="max-w-2xl">
        {sel && (
          <div className="space-y-4 text-sm">
            {/* Basic Info */}
            <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground font-semibold">Description</div><div className="mt-1">{enrichedJob.description || sel.description}</div></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-light">
                <div className="text-[10px] uppercase text-muted-foreground">Customer</div>
                <div className="font-semibold">{sel.customer?.fullName || 'Unknown'}</div>
                {sel.customer?._id && (
                  <Link to="/users"
                    className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" /> View Users
                  </Link>
                )}
              </div>
              <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Client Offer</div><div className="font-semibold text-accent">{fmtPKR(enrichedJob.pricing?.clientOffer || sel.amount || 0)}</div></div>
              <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Selected Quote</div><div className="font-semibold text-success">{enrichedJob.acceptedBid ? fmtPKR(enrichedJob.acceptedBid.proposedPrice || 0) : "Not assigned"}</div></div>
              <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Category</div><div>{enrichedJob.category || 'N/A'}</div></div>
              <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Urgency</div><div><StatusBadge status={enrichedJob.urgency || 'N/A'} /></div></div>
              <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Status</div><div><StatusBadge status={enrichedJob.status || sel.status} /></div></div>
              <div className="p-3 rounded-xl bg-surface-light col-span-2"><div className="text-[10px] uppercase text-muted-foreground">Address</div><div>{enrichedJob.address || sel.address || 'View map for address'}</div></div>
            </div>

            {/* Bid List */}
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setBidsExpanded(e => !e)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-light hover:bg-surface transition font-semibold text-sm"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Bids ({detailsLoading ? "…" : bids.length})
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${bidsExpanded ? "rotate-180" : ""}`} />
              </button>
              {bidsExpanded && (
                <div>
                  {detailsLoading ? (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      <div className="w-5 h-5 border-2 border-t-primary border-border rounded-full animate-spin mx-auto mb-2" />
                      Loading bids...
                    </div>
                  ) : bids.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs">No bids submitted yet</div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase text-muted-foreground border-b border-border bg-surface/50">
                          <th className="px-4 py-2 text-left">Worker</th>
                          <th className="px-4 py-2 text-right">Quote</th>
                          <th className="px-4 py-2 text-left">Mode</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bids.map((bid: any) => (
                          <tr key={bid._id} className="border-b border-border/50 hover:bg-surface-light/40">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold">{bid.worker?.fullName || "Unknown"}</span>
                                {bid.worker?._id && (
                                  <Link to="/workers/$id" params={{ id: bid.worker._id }}
                                    className="text-muted-foreground hover:text-accent">
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                )}
                                {enrichedJob.acceptedBid?._id === bid._id && (
                                  <span className="ml-1 px-1.5 py-0.5 rounded bg-success/10 text-success text-[9px] font-bold uppercase border border-success/20">Selected</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-success">{fmtPKR(bid.proposedPrice || 0)}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{bid.priceMode?.replace(/_/g, ' ') || "—"}</td>
                            <td className="px-4 py-2.5"><StatusBadge status={bid.status || "pending"} /></td>
                            <td className="px-4 py-2.5 text-muted-foreground">{bid.createdAt ? format(new Date(bid.createdAt), "dd MMM, HH:mm") : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Status Override */}
            {!["cancelled", "closed"].includes(sel.status) && (
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Admin Status Override</div>
                <div className="flex gap-2">
                  <select
                    value={statusOverride}
                    onChange={e => setStatusOverride(e.target.value)}
                    className="flex-1 bg-input border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">Select new status...</option>
                    {["open","assigned","reviewing","closed"].filter(s => s !== sel.status).map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    disabled={!statusOverride || updateStatusMutation.isPending}
                    onClick={handleStatusOverride}
                    className="px-4 h-10 rounded-xl gradient-cyan text-background font-bold disabled:opacity-50 text-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Cancel Job */}
            {sel.status !== "cancelled" && sel.status !== "closed" && (
              !cancelConfirm ? (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="btn-press w-full h-11 rounded-xl bg-destructive/15 text-destructive border border-destructive/30 font-bold flex items-center justify-center gap-2 hover:bg-destructive/25"
                >
                  <XCircle className="w-4 h-4" /> Cancel Job
                </button>
              ) : (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive font-semibold mb-3">⚠ Cancel job #{sel._id.slice(-6)}?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setCancelConfirm(false)} className="flex-1 h-9 rounded-xl border border-border text-sm font-semibold">No</button>
                    <button
                      disabled={cancelJobMutation.isPending}
                      onClick={handleCancel}
                      className="flex-1 h-9 rounded-xl bg-destructive text-white text-sm font-bold disabled:opacity-60"
                    >
                      {cancelJobMutation.isPending ? "Cancelling..." : "Yes, cancel"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Drawer>

      {/* Delete Confirm Modal */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Job">
        <p className="text-sm text-muted-foreground">
          Delete job <span className="font-semibold text-foreground">#{confirmDelete?._id?.slice(-6)}</span>? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(null)} className="px-4 h-10 rounded-xl border border-border">Cancel</button>
          <button
            onClick={() => confirmDelete && deleteJobMutation.mutate(confirmDelete._id, { onSuccess: () => setConfirmDelete(null) })}
            disabled={deleteJobMutation.isPending}
            className="px-5 h-10 rounded-xl bg-destructive text-destructive-foreground font-bold disabled:opacity-50"
          >
            {deleteJobMutation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
