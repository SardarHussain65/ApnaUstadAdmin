import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Plus, Pencil, Trash2, Zap, Droplets, Wind, Hammer, Paintbrush, 
  GraduationCap, Wrench, Car, Sun, Laptop, Smartphone, Scissors, 
  Home, Camera, Bug, Leaf, Truck, Lightbulb, Sparkles 
} from "lucide-react";
import { Modal } from "@/components/admin/Drawer";
import { Badge } from "@/components/admin/ui";
import { toast } from "sonner";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Category,
  type CategoryInput,
} from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/categories")({ component: CategoriesPage });

const PALETTE = ["#00F5FF", "#BF5AF2", "#FF8C00", "#34C759", "#FFD700", "#FF1493", "#00FF7F", "#FF3B30"];

const SEMANTIC_ICONS = [
  'electrical', 'plumbing', 'education', 'hvac', 'construction', 'painting', 
  'mechanical', 'automotive', 'solar', 'electronics', 'mobile', 'textiles', 
  'roofing', 'security', 'pest_control', 'gardening', 'transportation', 
  'power_systems', 'cleaning'
];

type CategoryFormState = CategoryInput & {
  _id?: string;
  isNew?: boolean;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

const IconMap: Record<string, any> = {
  'electrical': Zap,
  'plumbing': Droplets,
  'education': GraduationCap,
  'hvac': Wind,
  'construction': Hammer,
  'painting': Paintbrush,
  'mechanical': Wrench,
  'automotive': Car,
  'solar': Sun,
  'electronics': Laptop,
  'mobile': Smartphone,
  'textiles': Scissors,
  'roofing': Home,
  'security': Camera,
  'pest_control': Bug,
  'gardening': Leaf,
  'transportation': Truck,
  'power_systems': Lightbulb,
  'cleaning': Droplets,
};

function SemanticIcon({ name, className }: { name: string, className?: string }) {
  const IconComponent = IconMap[name] || Sparkles;
  return <IconComponent className={className} />;
}

function CategoriesPage() {
  const { data: cats = [], isLoading, isError, error, refetch, isFetching } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [editing, setEditing] = useState<CategoryFormState | null>(null);
  const [confirm, setConfirm] = useState<Category | null>(null);

  const save = (c: CategoryFormState) => {
    const payload = toCategoryPayload(c);
    if (!payload) return;

    if (c._id && !c.isNew) {
      updateMutation.mutate({ id: c._id, ...payload }, { onSuccess: () => setEditing(null) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => setEditing(null) });
    }
  };
  
  const remove = (id: string) => { 
    deleteMutation.mutate(id, { onSuccess: () => setConfirm(null) });
  };

  const openCreate = () => {
    setEditing({
      isNew: true,
      name: "",
      icon: SEMANTIC_ICONS[0],
      color: PALETTE[0],
      description: "",
      sortOrder: cats.length + 1,
      isActive: true,
      additionalCategoryMonthlyFee: 0,
      additionalCategoryGraceDays: 3,
    });
  };

  const openEdit = (category: Category) => {
    setEditing({
      _id: category._id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      description: category.description || "",
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive,
      additionalCategoryMonthlyFee: category.additionalCategoryMonthlyFee ?? 0,
      additionalCategoryGraceDays: category.additionalCategoryGraceDays ?? 3,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {isFetching && !isLoading ? "Refreshing..." : `${cats.length} categories`}
        </div>
        <button onClick={openCreate}
          className="btn-press inline-flex items-center gap-2 px-4 h-10 rounded-xl gradient-cyan text-background font-bold glow-cyan">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {isError ? (
        <div className="bg-card border border-destructive/40 rounded-2xl p-6 shadow-card">
          <div className="font-bold text-destructive">Could not load categories</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {(error as Error)?.message || "Please confirm the backend is running and your admin session is valid."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 h-10 rounded-xl bg-surface-light border border-border hover:border-primary font-semibold"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 bg-card/50 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cats.map((c: Category, i: number) => (
            <div key={c._id} className="bg-card border border-border rounded-2xl p-5 shadow-card card-hover animate-fade-in" style={{ animationDelay: `${i*40}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${c.color}22`, border: `1px solid ${c.color}55`, boxShadow: `0 0 15px ${c.color}55` }}>
                    <SemanticIcon name={c.icon} className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">Sort: {c.sortOrder}</div>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{c.description}</p>
              <div className="mt-3 rounded-xl bg-surface-light border border-border/60 px-3 py-2">
                <div className="text-[10px] uppercase text-muted-foreground">Additional specialty</div>
                <div className="mt-0.5 text-sm font-bold">Global monthly fee</div>
                <div className="text-[10px] text-muted-foreground">Configured in Wallets/Settings · {c.additionalCategoryGraceDays || 0}-day renewal grace</div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {c.isActive ? <Badge variant="success" pulse>Active</Badge> : <Badge variant="muted">Inactive</Badge>}
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-primary/15 hover:text-primary"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setConfirm(c)} className="p-2 rounded-lg hover:bg-destructive/15 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {cats.length === 0 && (
            <div className="col-span-full py-20 text-center text-muted-foreground">No categories found. Click "Add Category" to create one.</div>
          )}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id && !editing.isNew ? "Edit Category" : "Add Category"}>
        {editing && <CategoryForm value={editing} onChange={setEditing} onSave={() => save(editing)} loading={createMutation.isPending || updateMutation.isPending} />}
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete Category">
        <p className="text-sm text-muted-foreground">Are you sure you want to delete <span className="text-foreground font-semibold">{confirm?.name}</span>? This action cannot be undone.</p>
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={() => setConfirm(null)} className="px-4 h-10 rounded-xl border border-border">Cancel</button>
          <button onClick={() => confirm && remove(confirm._id)} className="px-5 h-10 rounded-xl bg-destructive text-destructive-foreground font-bold" disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function toCategoryPayload(value: CategoryFormState): CategoryInput | null {
  const name = value.name.trim();
  const icon = value.icon.trim();
  const color = value.color.trim();

  if (!name) {
    toast.error("Category name is required");
    return null;
  }
  if (!icon) {
    toast.error("Category icon is required");
    return null;
  }
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    toast.error("Choose a valid category color");
    return null;
  }

  return {
    name,
    icon,
    color,
    description: value.description.trim(),
    sortOrder: Number.isFinite(value.sortOrder) ? value.sortOrder : 0,
    isActive: value.isActive,
    additionalCategoryGraceDays: Math.max(0, Number(value.additionalCategoryGraceDays || 0)),
  };
}

function CategoryForm({ value, onChange, onSave, loading }: { value: CategoryFormState; onChange: (c: CategoryFormState) => void; onSave: () => void; loading?: boolean }) {
  return (
    <div className="space-y-4">
      <Field label="Name">
        <input 
          value={value.name} 
          onChange={e => onChange({ ...value, name: e.target.value })} 
          placeholder="e.g. Electrician"
          className="w-full h-11 px-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none transition-all" 
        />
      </Field>
      
      <div className="grid grid-cols-2 gap-4">
        <Field label="App Icon (Semantic)">
          <div className="flex items-center gap-3 w-full h-11 px-3 rounded-xl bg-surface-light border border-border focus-within:border-primary transition-all">
            <SemanticIcon name={value.icon} className="w-5 h-5 text-muted-foreground shrink-0" />
            <select 
              value={value.icon} 
              onChange={e => onChange({ ...value, icon: e.target.value })}
              className="w-full h-full bg-transparent focus:outline-none"
            >
              {SEMANTIC_ICONS.map(icon => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Sort Order">
          <input 
            type="number" 
            value={value.sortOrder} 
            onChange={e => onChange({ ...value, sortOrder: +e.target.value })} 
            className="w-full h-11 px-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none" 
          />
        </Field>
      </div>

      <Field label="Theme Color">
        <div className="flex gap-2 flex-wrap p-1">
          {PALETTE.map(c => (
            <button 
              key={c} 
              onClick={() => onChange({ ...value, color: c })} 
              className={`w-9 h-9 rounded-xl border-2 transition-transform ${value.color === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-70 hover:opacity-100"}`} 
              style={{ background: c }} 
            />
          ))}
        </div>
      </Field>

      <Field label="Description">
        <textarea 
          value={value.description} 
          onChange={e => onChange({ ...value, description: e.target.value })} 
          placeholder="What services does this category include?"
          className="w-full h-24 p-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none resize-none" 
        />
      </Field>

      <div className="rounded-xl bg-surface-light border border-border/60 p-4">
        <div className="text-sm font-bold">Additional Specialty Subscription</div>
        <p className="mt-1 text-[11px] text-muted-foreground">The worker's first approved specialty remains free. The monthly fee for every additional specialty is configured globally in Wallets or Settings.</p>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <Field label="Grace Days">
            <input type="number" min={0} max={30} value={value.additionalCategoryGraceDays ?? 0}
              onChange={e => onChange({ ...value, additionalCategoryGraceDays: +e.target.value })}
              className="w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none" />
          </Field>
        </div>
      </div>

      <label className="flex items-center justify-between p-4 rounded-xl bg-surface-light border border-border/50 cursor-pointer hover:bg-surface transition-colors">
        <div>
          <span className="text-sm font-bold block">Active Status</span>
          <span className="text-[10px] text-muted-foreground">Show this category on the app</span>
        </div>
        <input 
          type="checkbox" 
          checked={value.isActive} 
          onChange={e => onChange({ ...value, isActive: e.target.checked })} 
          className="w-6 h-6 rounded-lg accent-[#00F5FF] cursor-pointer" 
        />
      </label>

      <button 
        onClick={onSave} 
        disabled={loading} 
        className="btn-press w-full h-12 rounded-xl gradient-cyan text-background font-bold shadow-glow-cyan disabled:opacity-50 transition-all mt-2"
      >
        {loading ? "Processing..." : value._id && !value.isNew ? "Update Category" : "Create Category"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</label><div className="mt-1">{children}</div></div>;
}
