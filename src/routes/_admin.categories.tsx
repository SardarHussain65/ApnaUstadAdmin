import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/admin/Drawer";
import { Badge } from "@/components/admin/ui";
import { categories as initial, type Category } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/categories")({ component: CategoriesPage });

const PALETTE = ["#00F5FF", "#BF5AF2", "#FF8C00", "#34C759", "#FFD700", "#FF1493", "#00FF7F", "#FF3B30"];

function CategoriesPage() {
  const [cats, setCats] = useState(initial);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirm, setConfirm] = useState<Category | null>(null);

  const save = (c: Category) => {
    setCats(prev => prev.find(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [...prev, c]);
    toast.success("Category saved");
    setEditing(null);
  };
  const remove = (id: string) => { setCats(p => p.filter(c => c.id !== id)); toast.success("Category deleted"); setConfirm(null); };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{cats.length} categories</div>
        <button onClick={() => setEditing({ id: `c${Date.now()}`, name: "", icon: "🛠️", color: PALETTE[0], description: "", sortOrder: cats.length + 1, isActive: true })}
          className="btn-press inline-flex items-center gap-2 px-4 h-10 rounded-xl gradient-cyan text-background font-bold glow-cyan">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cats.map((c, i) => (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-5 shadow-card card-hover animate-fade-in" style={{ animationDelay: `${i*40}ms` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${c.color}22`, border: `1px solid ${c.color}55`, boxShadow: `0 0 15px ${c.color}55` }}>{c.icon}</div>
                <div>
                  <div className="font-bold text-lg">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">Sort: {c.sortOrder}</div>
                </div>
              </div>
              <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{c.description}</p>
            <div className="mt-4 flex items-center justify-between">
              {c.isActive ? <Badge variant="success" pulse>Active</Badge> : <Badge variant="muted">Inactive</Badge>}
              <div className="flex gap-1">
                <button onClick={() => setEditing(c)} className="p-2 rounded-lg hover:bg-primary/15 hover:text-primary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setConfirm(c)} className="p-2 rounded-lg hover:bg-destructive/15 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing && cats.find(c=>c.id===editing.id) ? "Edit Category" : "Add Category"}>
        {editing && <CategoryForm value={editing} onChange={setEditing} onSave={() => save(editing)} />}
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete Category">
        <p className="text-sm text-muted-foreground">Are you sure you want to delete <span className="text-foreground font-semibold">{confirm?.name}</span>? This action cannot be undone.</p>
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={() => setConfirm(null)} className="px-4 h-10 rounded-xl border border-border">Cancel</button>
          <button onClick={() => confirm && remove(confirm.id)} className="px-5 h-10 rounded-xl bg-destructive text-destructive-foreground font-bold">Delete</button>
        </div>
      </Modal>
    </div>
  );
}

function CategoryForm({ value, onChange, onSave }: { value: Category; onChange: (c: Category) => void; onSave: () => void }) {
  return (
    <div className="space-y-3">
      <Field label="Name"><input value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Icon"><input value={value.icon} onChange={e => onChange({ ...value, icon: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none text-2xl" /></Field>
        <Field label="Sort Order"><input type="number" value={value.sortOrder} onChange={e => onChange({ ...value, sortOrder: +e.target.value })} className="w-full h-10 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none" /></Field>
      </div>
      <Field label="Color">
        <div className="flex gap-2 flex-wrap">
          {PALETTE.map(c => (
            <button key={c} onClick={() => onChange({ ...value, color: c })} className={`w-9 h-9 rounded-xl border-2 ${value.color === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
          ))}
        </div>
      </Field>
      <Field label="Description"><textarea value={value.description} onChange={e => onChange({ ...value, description: e.target.value })} className="w-full h-20 p-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none" /></Field>
      <label className="flex items-center justify-between p-3 rounded-xl bg-surface-light cursor-pointer">
        <span className="text-sm font-semibold">Active</span>
        <input type="checkbox" checked={value.isActive} onChange={e => onChange({ ...value, isActive: e.target.checked })} className="w-5 h-5 accent-[#00F5FF]" />
      </label>
      <button onClick={onSave} className="btn-press w-full h-11 rounded-xl gradient-cyan text-background font-bold glow-cyan">Save Category</button>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</label><div className="mt-1">{children}</div></div>;
}
