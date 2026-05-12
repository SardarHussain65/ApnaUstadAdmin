import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, CheckCircle2, Power, Download } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge, RatingStars, StatusBadge } from "@/components/admin/ui";
import { CITIES, CATEGORY_NAMES, fmtPKR } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";
import { useWorkers, useVerifyWorker, useToggleWorkerStatus, type Worker } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/workers/")({ component: WorkersPage });

function WorkersPage() {
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState("");
  const [cat, setCat] = useState("");
  const [city, setCity] = useState("");

  const { data, isLoading } = useWorkers({
    search: q,
    verified: verified === "yes" ? true : verified === "no" ? false : undefined,
    category: cat || undefined,
    city: city || undefined,
    limit: 100,
  });
  const toggleWorkerStatusMutation = useToggleWorkerStatus();
  const verifyWorkerMutation = useVerifyWorker();

  const apiWorkers = data || [];

  const rows = useMemo(() => apiWorkers.map((w) => ({ ...w, id: w._id })), [apiWorkers]);

  const verify = (worker: Worker) => {
    verifyWorkerMutation.mutate({ id: worker._id, isVerified: true });
  };
  
  const toggle = (worker: Worker) => {
    toggleWorkerStatusMutation.mutate({ id: worker._id, isActive: !worker.isActive });
  };

  const stats = {
    total: apiWorkers.length,
    verified: apiWorkers.filter((w) => w.isVerified).length,
    unverified: apiWorkers.filter((w) => !w.isVerified).length,
    active: apiWorkers.filter((w) => w.isActive).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Badge variant="info">Total: {stats.total}</Badge>
        <Badge variant="success">Verified: {stats.verified}</Badge>
        <Badge variant="warning" pulse>Unverified: {stats.unverified}</Badge>
        <Badge variant="purple">Active: {stats.active}</Badge>
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
        ><Download className="w-4 h-4" /> Export CSV</button>
      </div>
      <DataTable
        isLoading={isLoading}
        rows={rows}
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
    </div>
  );
}
