import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Badge, StatusBadge } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Drawer";
import { jobs as initial, CATEGORY_NAMES, fmtPKR, type JobPost } from "@/lib/mock-data";
import { format } from "date-fns";

export const Route = createFileRoute("/_admin/jobs")({ component: JobsPage });

function JobsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [urg, setUrg] = useState("");
  const [cat, setCat] = useState("");
  const [sel, setSel] = useState<JobPost | null>(null);

  const rows = useMemo(() => initial.filter(j => {
    if (q && !`${j.id}${j.description}${j.category}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (status && j.status !== status) return false;
    if (urg && j.urgency !== urg) return false;
    if (cat && j.category !== cat) return false;
    return true;
  }), [q, status, urg, cat]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search jobs..." />
        <Select value={status} onChange={setStatus} label="All Status" options={["open","assigned","reviewing","closed","cancelled"].map(s=>({value:s,label:s}))} />
        <Select value={urg} onChange={setUrg} label="Urgency" options={[{value:"instant",label:"Instant"},{value:"scheduled",label:"Scheduled"}]} />
        <Select value={cat} onChange={setCat} label="Category" options={CATEGORY_NAMES.map(c=>({value:c,label:c}))} />
      </div>
      <DataTable rows={rows} onRowClick={j => setSel(j)} columns={[
        { key: "id", header: "Job ID", render: j => <span className="font-mono text-xs text-primary">{j.id}</span> },
        { key: "c", header: "Customer", render: j => j.customerName },
        { key: "cat", header: "Category", render: j => <Badge variant="orange">{j.category}</Badge> },
        { key: "u", header: "Urgency", render: j => <StatusBadge status={j.urgency} /> },
        { key: "s", header: "Status", render: j => <StatusBadge status={j.status} /> },
        { key: "amt", header: "Amount", render: j => <span className="font-semibold">{fmtPKR(j.amount)}</span> },
        { key: "b", header: "Bids", render: j => <Badge variant="purple">{j.bidsCount}</Badge> },
        { key: "p", header: "Posted", render: j => <span className="text-xs text-muted-foreground">{format(new Date(j.postedAt), "dd MMM")}</span> },
      ]} />
      <Drawer open={!!sel} onClose={() => setSel(null)} title={`Job ${sel?.id ?? ""}`}>
        {sel && (
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground font-semibold">Description</div><div className="mt-1">{sel.description}</div></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Customer</div><div className="font-semibold">{sel.customerName}</div></div>
              <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Amount</div><div className="font-semibold text-accent">{fmtPKR(sel.amount)}</div></div>
              <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Category</div><div>{sel.category}</div></div>
              <div className="p-3 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground">Bids</div><div>{sel.bidsCount} workers bidding</div></div>
              <div className="p-3 rounded-xl bg-surface-light col-span-2"><div className="text-[10px] uppercase text-muted-foreground">Address</div><div>{sel.address}</div></div>
            </div>
            <div className="aspect-video rounded-xl bg-surface-light border border-border flex items-center justify-center text-muted-foreground text-sm">📍 Location preview</div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
