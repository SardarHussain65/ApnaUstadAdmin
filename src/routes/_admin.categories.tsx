import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus, Pencil, Trash2, Zap, Droplets, Wind, Hammer, Paintbrush,
  GraduationCap, Wrench, Car, Sun, Laptop, Smartphone, Scissors,
  Home, Camera, Bug, Leaf, Truck, Lightbulb, Sparkles, Layers,
} from "lucide-react";
import { FormHint, Modal, ModalBody, ModalFooter } from "@/components/admin/Drawer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge, Button, FormField, Input, Textarea } from "@/components/admin/ui";
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
  "electrical", "plumbing", "education", "hvac", "construction", "painting",
  "mechanical", "automotive", "solar", "electronics", "mobile", "textiles",
  "roofing", "security", "pest_control", "gardening", "transportation",
  "power_systems", "cleaning",
];

const ICON_LABELS: Record<string, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  education: "Education",
  hvac: "AC & cooling",
  construction: "Construction",
  painting: "Painting",
  mechanical: "Mechanical",
  automotive: "Automotive",
  solar: "Solar",
  electronics: "Electronics",
  mobile: "Mobile repair",
  textiles: "Tailoring",
  roofing: "Roofing",
  security: "Security / CCTV",
  pest_control: "Pest control",
  gardening: "Gardening",
  transportation: "Transport",
  power_systems: "Power / UPS",
  cleaning: "Cleaning",
};

type CategoryFormState = CategoryInput & {
  _id?: string;
  isNew?: boolean;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

const IconMap: Record<string, any> = {
  electrical: Zap,
  plumbing: Droplets,
  education: GraduationCap,
  hvac: Wind,
  construction: Hammer,
  painting: Paintbrush,
  mechanical: Wrench,
  automotive: Car,
  solar: Sun,
  electronics: Laptop,
  mobile: Smartphone,
  textiles: Scissors,
  roofing: Home,
  security: Camera,
  pest_control: Bug,
  gardening: Leaf,
  transportation: Truck,
  power_systems: Lightbulb,
  cleaning: Sparkles,
};

function SemanticIcon({ name, className }: { name: string; className?: string }) {
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
      <AdminPageHeader
        title="Services catalog"
        description="Manage the service types customers see in the app — e.g. Plumber, Electrician, AC repair."
        icon={<Layers className="h-3.5 w-3.5" />}
        eyebrow="Marketplace"
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add service
          </Button>
        }
        stats={
          <p className="text-sm text-muted-foreground">
            {isFetching && !isLoading ? "Refreshing…" : `${cats.length} services configured`}
          </p>
        }
      />

      {isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <div className="font-bold text-destructive">Could not load services</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {(error as Error)?.message || "Please confirm the backend is running and your admin session is valid."}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-card/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cats.map((c: Category, i: number) => (
            <div
              key={c._id}
              className="card-hover animate-fade-in rounded-2xl border border-border bg-card p-5 shadow-card"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                    style={{ background: `${c.color}22`, border: `1px solid ${c.color}55`, boxShadow: `0 0 15px ${c.color}33` }}
                  >
                    <SemanticIcon name={c.icon} className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">List position: {c.sortOrder}</div>
                  </div>
                </div>
                <div className="h-3 w-3 rounded-full" style={{ background: c.color }} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              <div className="mt-3 rounded-xl border border-border/60 bg-surface-light/30 px-3 py-2">
                <div className="text-[10px] uppercase text-muted-foreground">Paid add-on for workers</div>
                <div className="mt-0.5 text-sm font-semibold">{c.additionalCategoryGraceDays || 0}-day renewal grace</div>
                <div className="text-[10px] text-muted-foreground">Monthly fee set in Wallets → Settings</div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {c.isActive ? <Badge variant="success" pulse>Live in app</Badge> : <Badge variant="muted">Hidden</Badge>}
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="rounded-lg p-2 hover:bg-primary/15 hover:text-primary" title="Edit service">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setConfirm(c)} className="rounded-lg p-2 hover:bg-destructive/15 hover:text-destructive" title="Delete service">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {cats.length === 0 && (
            <div className="col-span-full py-20 text-center text-muted-foreground">
              No services yet. Click <strong className="text-white">Add service</strong> to create your first one.
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id && !editing.isNew ? "Edit service" : "Add new service"}
        description="This is what customers browse when booking. Workers link their profile to these service types."
        width="max-w-2xl"
        eyebrow="Service setup"
      >
        {editing && (
          <CategoryForm
            value={editing}
            onChange={setEditing}
            onSave={() => save(editing)}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete service?"
        description="Workers and bookings linked to this service may be affected."
        variant="danger"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => confirm && remove(confirm._id)}
            >
              Delete permanently
            </Button>
          </ModalFooter>
        }
      >
        <ModalBody>
          <p className="text-sm text-muted-foreground">
            You are about to remove <strong className="text-white">{confirm?.name}</strong>. This cannot be undone.
          </p>
        </ModalBody>
      </Modal>
    </div>
  );
}

function toCategoryPayload(value: CategoryFormState): CategoryInput | null {
  const name = value.name.trim();
  const icon = value.icon.trim();
  const color = value.color.trim();

  if (!name) {
    toast.error("Service name is required");
    return null;
  }
  if (!icon) {
    toast.error("Please choose an app icon");
    return null;
  }
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    toast.error("Please choose a valid theme color");
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

function CategoryForm({
  value,
  onChange,
  onSave,
  loading,
}: {
  value: CategoryFormState;
  onChange: (c: CategoryFormState) => void;
  onSave: () => void;
  loading?: boolean;
}) {
  return (
    <div className="space-y-5">
      <FormField label="Service name" hint="Short label customers recognize — e.g. Plumber, Electrician.">
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g. Plumber"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="App icon" hint="Icon shown in the mobile app for this service.">
          <div className="flex h-11 w-full items-center gap-3 rounded-xl border border-border bg-input px-3">
            <SemanticIcon name={value.icon} className="h-5 w-5 shrink-0 text-muted-foreground" />
            <select
              value={value.icon}
              onChange={(e) => onChange({ ...value, icon: e.target.value })}
              className="h-full w-full bg-transparent text-sm focus:outline-none"
            >
              {SEMANTIC_ICONS.map((icon) => (
                <option key={icon} value={icon}>{ICON_LABELS[icon] || icon}</option>
              ))}
            </select>
          </div>
        </FormField>

        <FormField label="List position" hint="Lower numbers appear first in the app service list.">
          <Input
            type="number"
            value={value.sortOrder}
            onChange={(e) => onChange({ ...value, sortOrder: +e.target.value })}
          />
        </FormField>
      </div>

      <FormField label="Theme color" hint="Accent color for cards and badges in the app.">
        <div className="flex flex-wrap gap-2 p-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...value, color: c })}
              className={`h-9 w-9 rounded-xl border-2 transition-transform ${value.color === c ? "scale-110 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100"}`}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </FormField>

      <FormField label="Description" hint="Brief summary of what this service includes — shown to customers.">
        <Textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="e.g. Pipe leaks, geyser install, toilet fittings…"
          className="min-h-24"
        />
      </FormField>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="text-sm font-bold text-white">Worker subscription rules</div>
        <FormHint>
          A worker&apos;s <strong className="text-foreground">first</strong> approved service is free. Each extra service costs a monthly fee (set globally under Wallets → Settings).
        </FormHint>

        <div className="mt-4">
          <FormField
            label="Grace days after failed payment"
            hint="If wallet renewal fails, the worker keeps this service active for this many days before it is turned off. Use 0 for immediate cutoff, 3–7 for a friendly buffer."
          >
            <Input
              type="number"
              min={0}
              max={30}
              value={value.additionalCategoryGraceDays ?? 0}
              onChange={(e) => onChange({ ...value, additionalCategoryGraceDays: +e.target.value })}
            />
          </FormField>
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition hover:bg-white/[0.04]">
        <div>
          <span className="block text-sm font-bold">Show in app</span>
          <span className="text-xs text-muted-foreground">Turn off to hide this service from new bookings without deleting it</span>
        </div>
        <input
          type="checkbox"
          checked={value.isActive}
          onChange={(e) => onChange({ ...value, isActive: e.target.checked })}
          className="h-6 w-6 cursor-pointer rounded-lg accent-[#00F5FF]"
        />
      </label>

      <Button variant="primary" className="w-full" size="lg" loading={loading} onClick={onSave}>
        {value._id && !value.isNew ? "Save changes" : "Create service"}
      </Button>
    </div>
  );
}
