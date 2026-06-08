import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Eye, CheckCircle2, Power, Download } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge, RatingStars, StatusBadge } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Drawer";
import { CITIES, CATEGORY_NAMES, fmtPKR } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";
import { useWorkersPage, useVerifyWorker, useToggleWorkerStatus, type Worker } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/workers/")({ component: WorkersPage });

function WorkersPage() {
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState("");
  const [cat, setCat] = useState("");
  const [city, setCity] = useState("");
  const [statusTarget, setStatusTarget] = useState<Worker | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [page, setPage] = useState(1);
  const deferredQ = useDeferredValue(q);

  useEffect(() => { setPage(1); }, [deferredQ, verified, cat, city]);

  const { data, isLoading } = useWorkersPage({
    page,
    limit: 10,
    search: deferredQ,
    verified: verified === "yes" ? true : verified === "no" ? false : undefined,
    category: cat || undefined,
    city: city || undefined,
  });
  const toggleWorkerStatusMutation = useToggleWorkerStatus();
  const verifyWorkerMutation = useVerifyWorker();

  const apiWorkers = data?.items || [];

  const rows = useMemo(() => apiWorkers.map((w) => ({ ...w, id: w._id })), [apiWorkers]);

  const verify = (worker: Worker) => {
    verifyWorkerMutation.mutate({ id: worker._id, isVerified: true });
  };
  
  const applyStatusChange = (worker: Worker, reason?: string) => {
    toggleWorkerStatusMutation.mutate(
      { id: worker._id, isActive: !worker.isActive, reason },
      {
        onSuccess: () => {
          setStatusTarget(null);
          setStatusReason("");
        }
      }
    );
  };

  const toggle = (worker: Worker) => {
    if (worker.isActive) {
      setStatusTarget(worker);
      setStatusReason("");
      return;
    }
    applyStatusChange(worker);
  };

  const confirmDeactivate = () => {
    if (!statusTarget || !statusReason.trim()) return;
    applyStatusChange(statusTarget, statusReason.trim());
  };

  const stats = {
    total: data?.pagination.totalItems ?? 0,
    verified: apiWorkers.filter((w) => w.isVerified).length,
    unverified: apiWorkers.filter((w) => !w.isVerified).length,
    active: apiWorkers.filter((w) => w.isActive).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Badge variant="info">Matching: {stats.total}</Badge>
        <Badge variant="success">Visible Verified: {stats.verified}</Badge>
        <Badge variant="warning" pulse>Visible Unverified: {stats.unverified}</Badge>
        <Badge variant="purple">Visible Active: {stats.active}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, phone, CNIC..." />
        <Select value={verified} onChange={setVerified} label="All" options={[{value:"yes",label:"Verified"},{value:"no",label:"Unverified"}]} />
        <Select value={cat} onChange={setCat} label="All Categories" options={CATEGORY_NAMES.map(c=>({value:c,label:c}))} />
        <Select value={city} onChange={setCity} label="All Cities" options={CITIES.map(c=>({value:c,label:c}))} />
        <button
          onClick={() => {
            downloadCsv("workers", rows, [
              { key: "_id", header: "ID" }, { key: "fullName", header: "Name" }, { key: "phone", header: "Phone" },
              { key: "cnicNumber", header: "CNIC" }, { key: "category", header: "Category" }, { key: "city", header: "City" },
              { key: "rating", header: "Rating" }, { key: "totalJobs", header: "Jobs" }, { key: "hourlyRate", header: "Rate" },
              { key: "isVerified", header: "Verified" }, { key: "isActive", header: "Status" },
            ]);
            toast.success(`Exported ${rows.length} workers`);
          }}
          className="btn-press inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-surface-light hover:bg-primary/15 hover:text-primary border border-border text-sm font-semibold transition"
        ><Download className="w-4 h-4" /> Export Page CSV</button>
      </div>
      <DataTable
        isLoading={isLoading}
        rows={rows}
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          totalItems: data?.pagination.totalItems ?? 0,
          onPageChange: setPage,
        }}
        columns={[
          { key: "w", header: "Worker", render: w => (
            <Link to="/workers/$id" params={{ id: w._id }} className="flex items-center gap-3 group">
              <Avatar src={w.profileImage} name={w.fullName} />
              <div>
                <div className="font-semibold group-hover:text-primary transition">{w.fullName}</div>
                <div className="text-xs text-muted-foreground font-mono">{w._id.slice(-6)}</div>
              </div>
            </Link>
          )},
          { key: "cat", header: "Category", render: w => <Badge variant="orange">{w.category || 'N/A'}</Badge> },
          { key: "city", header: "City", render: w => w.city || 'N/A' },
          { key: "rating", header: "Rating", render: w => <RatingStars rating={w.rating || 0} /> },
          { key: "jobs", header: "Jobs", render: w => <span className="font-semibold">{w.totalJobs || 0}</span> },
          { key: "rate", header: "Rate", render: w => <span className="text-accent font-semibold">{fmtPKR(w.hourlyRate || 0)}/hr</span> },
          { key: "v", header: "Verified", render: w => w.isVerified ? <Badge variant="success">✓ Verified</Badge> : <Badge variant="warning" pulse>Pending</Badge> },
          { key: "s", header: "Status", render: w => <StatusBadge status={w.isActive ? "active" : "inactive"} /> },
          { key: "a", header: "", render: w => (
            <div className="flex items-center justify-end gap-1">
              <Link to="/workers/$id" params={{ id: w._id }} className="p-2 rounded-lg hover:bg-primary/15 hover:text-primary"><Eye className="w-4 h-4" /></Link>
              {!w.isVerified && <button disabled={verifyWorkerMutation.isPending} onClick={() => verify(w)} className="p-2 rounded-lg hover:bg-success/15 hover:text-success disabled:opacity-50"><CheckCircle2 className="w-4 h-4" /></button>}
              <button disabled={toggleWorkerStatusMutation.isPending} onClick={() => toggle(w)} className="p-2 rounded-lg hover:bg-accent/15 hover:text-accent disabled:opacity-50"><Power className="w-4 h-4" /></button>
            </div>
          )},
        ]}
      />
      <Modal open={!!statusTarget} onClose={() => setStatusTarget(null)} title="Deactivate Worker Account">
        <div className="space-y-4">
          <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <div className="font-bold text-white">This worker will be locked out of app actions.</div>
                <p className="mt-1 text-sm text-muted-foreground">The reason will be shown in the worker app until the account is activated again.</p>
              </div>
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason shown to worker</span>
            <textarea
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Explain why this worker account is being deactivated..."
              className="w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none focus:border-destructive"
            />
          </label>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button onClick={() => setStatusTarget(null)} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground hover:bg-surface-light">Cancel</button>
            <button
              disabled={!statusReason.trim() || toggleWorkerStatusMutation.isPending}
              onClick={confirmDeactivate}
              className="h-10 rounded-xl bg-destructive px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              Deactivate Worker
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
