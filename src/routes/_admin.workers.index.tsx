import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, CheckCircle2, Power } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge, RatingStars, StatusBadge } from "@/components/admin/ui";
import { workers as initial, CITIES, CATEGORY_NAMES, fmtPKR } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/workers/")({ component: WorkersPage });

function WorkersPage() {
  const [workers, setWorkers] = useState(initial);
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState("");
  const [cat, setCat] = useState("");
  const [city, setCity] = useState("");

  const rows = useMemo(() => workers.filter(w => {
    if (q && !`${w.name}${w.phone}${w.cnic}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (verified === "yes" && !w.isVerified) return false;
    if (verified === "no" && w.isVerified) return false;
    if (cat && w.category !== cat) return false;
    if (city && w.city !== city) return false;
    return true;
  }), [workers, q, verified, cat, city]);

  const verify = (id: string) => {
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, isVerified: true } : w));
    toast.success("Worker verified");
  };
  const toggle = (id: string) => {
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, status: w.status === "active" ? "inactive" : "active" } : w));
    toast.success("Status updated");
  };

  const stats = {
    total: workers.length,
    verified: workers.filter(w => w.isVerified).length,
    unverified: workers.filter(w => !w.isVerified).length,
    active: workers.filter(w => w.status === "active").length,
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
      </div>
      <DataTable
        rows={rows}
        columns={[
          { key: "w", header: "Worker", render: w => (
            <Link to="/workers/$id" params={{ id: w.id }} className="flex items-center gap-3 group">
              <Avatar src={w.avatar} name={w.name} />
              <div>
                <div className="font-semibold group-hover:text-primary transition">{w.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{w.id}</div>
              </div>
            </Link>
          )},
          { key: "cat", header: "Category", render: w => <Badge variant="orange">{w.category}</Badge> },
          { key: "city", header: "City", render: w => w.city },
          { key: "rating", header: "Rating", render: w => <RatingStars rating={w.rating} /> },
          { key: "jobs", header: "Jobs", render: w => <span className="font-semibold">{w.totalJobs}</span> },
          { key: "rate", header: "Rate", render: w => <span className="text-accent font-semibold">{fmtPKR(w.hourlyRate)}/hr</span> },
          { key: "v", header: "Verified", render: w => w.isVerified ? <Badge variant="success">✓ Verified</Badge> : <Badge variant="warning" pulse>Pending</Badge> },
          { key: "s", header: "Status", render: w => <StatusBadge status={w.status} /> },
          { key: "a", header: "", render: w => (
            <div className="flex items-center justify-end gap-1">
              <Link to="/workers/$id" params={{ id: w.id }} className="p-2 rounded-lg hover:bg-primary/15 hover:text-primary"><Eye className="w-4 h-4" /></Link>
              {!w.isVerified && <button onClick={() => verify(w.id)} className="p-2 rounded-lg hover:bg-success/15 hover:text-success"><CheckCircle2 className="w-4 h-4" /></button>}
              <button onClick={() => toggle(w.id)} className="p-2 rounded-lg hover:bg-accent/15 hover:text-accent"><Power className="w-4 h-4" /></button>
            </div>
          )},
        ]}
      />
    </div>
  );
}
