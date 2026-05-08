import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, Power } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge, StatusBadge } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Drawer";
import { users as initialUsers, CITIES, bookings, fmtPKR, type User } from "@/lib/mock-data";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  const rows = useMemo(() => users.filter(u => {
    if (q && !`${u.name}${u.phone}${u.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (status && u.status !== status) return false;
    if (city && u.city !== city) return false;
    return true;
  }), [users, q, status, city]);

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u));
    toast.success("User status updated");
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === "active").length,
    inactive: users.filter(u => u.status === "inactive").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">Total: {stats.total}</Badge>
        <Badge variant="success" pulse>Active: {stats.active}</Badge>
        <Badge variant="danger">Inactive: {stats.inactive}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, phone, email..." />
        <Select value={status} onChange={setStatus} label="All Status" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        <Select value={city} onChange={setCity} label="All Cities" options={CITIES.map(c => ({ value: c, label: c }))} />
      </div>

      <DataTable
        rows={rows}
        onRowClick={u => setSelected(u)}
        columns={[
          { key: "user", header: "User", render: u => (
            <div className="flex items-center gap-3">
              <Avatar src={u.avatar} name={u.name} />
              <div>
                <div className="font-semibold">{u.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{u.id}</div>
              </div>
            </div>
          )},
          { key: "phone", header: "Phone", render: u => <span className="font-mono text-xs">{u.phone}</span> },
          { key: "email", header: "Email", render: u => <span className="text-xs text-muted-foreground">{u.email}</span> },
          { key: "city", header: "City", render: u => u.city },
          { key: "status", header: "Status", render: u => <StatusBadge status={u.status} /> },
          { key: "joined", header: "Joined", render: u => <span className="text-xs text-muted-foreground">{format(new Date(u.joinedAt), "dd MMM yyyy")}</span> },
          { key: "actions", header: "", render: u => (
            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelected(u)} className="p-2 rounded-lg hover:bg-primary/15 hover:text-primary transition" title="View"><Eye className="w-4 h-4" /></button>
              <button onClick={() => toggleStatus(u.id)} className="p-2 rounded-lg hover:bg-accent/15 hover:text-accent transition" title="Toggle status"><Power className="w-4 h-4" /></button>
            </div>
          )},
        ]}
      />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="User Details">
        {selected && <UserDetail user={selected} onToggle={() => { toggleStatus(selected.id); setSelected({ ...selected, status: selected.status === "active" ? "inactive" : "active" }); }} />}
      </Drawer>
    </div>
  );
}

function UserDetail({ user, onToggle }: { user: User; onToggle: () => void }) {
  const userBookings = bookings.filter(b => b.customerId === user.id).slice(0, 5);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar src={user.avatar} name={user.name} size={72} />
        <div>
          <div className="text-xl font-bold">{user.name}</div>
          <div className="text-xs text-muted-foreground font-mono">{user.id}</div>
          <div className="mt-1"><StatusBadge status={user.status} /></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Phone" value={user.phone} />
        <Field label="Email" value={user.email} />
        <Field label="City" value={user.city} />
        <Field label="Joined" value={format(new Date(user.joinedAt), "dd MMM yyyy")} />
        <Field label="Address" value={user.address} className="col-span-2" />
      </div>
      <button onClick={onToggle} className="btn-press w-full h-11 rounded-xl gradient-cyan text-background font-bold glow-cyan">
        {user.status === "active" ? "Deactivate Account" : "Activate Account"}
      </button>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Recent Bookings</div>
        <div className="space-y-2">
          {userBookings.map(b => (
            <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-light">
              <div>
                <div className="text-sm font-semibold">{b.category}</div>
                <div className="text-[11px] text-muted-foreground">with {b.workerName} · {format(new Date(b.scheduledAt), "dd MMM")}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{fmtPKR(b.total)}</div>
                <StatusBadge status={b.status} />
              </div>
            </div>
          ))}
          {userBookings.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No bookings yet</div>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`p-3 rounded-xl bg-surface-light ${className}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="mt-0.5 font-medium break-words">{value}</div>
    </div>
  );
}
