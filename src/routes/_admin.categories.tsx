import { createFileRoute } from "@tanstack/react-router";
import { useState, useDeferredValue } from "react";
import {
  Plus, Pencil, Trash2, Zap, Droplets, Wind, Hammer, Paintbrush,
  GraduationCap, Wrench, Car, Sun, Laptop, Smartphone, Scissors,
  Home, Camera, Bug, Leaf, Truck, Lightbulb, Sparkles, Layers,
  Search, CheckCircle2, XCircle, Clock, Check, AlertCircle, FileText
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
  useProfessionRequestsPage,
  useReviewProfessionRequest,
  type Category,
  type CategoryInput,
  type ProfessionRequest,
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
  const [activeTab, setActiveTab] = useState<"catalog" | "requests">("catalog");

  // Catalog hooks & state
  const { data: cats = [], isLoading, isError, error, refetch, isFetching } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [editing, setEditing] = useState<CategoryFormState | null>(null);
  const [confirm, setConfirm] = useState<Category | null>(null);
  const [linkedRequestId, setLinkedRequestId] = useState<string | null>(null);

  // Requests hooks & state
  const [reqPage, setReqPage] = useState(1);
  const [reqSearch, setReqSearch] = useState("");
  const deferredSearch = useDeferredValue(reqSearch);
  const [reqStatus, setReqStatus] = useState<string>("all");
  const [rejectingRequest, setRejectingRequest] = useState<ProfessionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: requestsData, isLoading: requestsLoading } = useProfessionRequestsPage({
    page: reqPage,
    limit: 10,
    search: deferredSearch || undefined,
    status: reqStatus === "all" ? undefined : reqStatus,
  });

  const reviewRequestMutation = useReviewProfessionRequest();

  const requests = requestsData?.items || [];
  const pendingRequestsCount = requests.filter((r) => r.status === "pending").length;

  const save = (c: CategoryFormState) => {
    const payload = toCategoryPayload(c);
    if (!payload) return;

    if (c._id && !c.isNew) {
      updateMutation.mutate({ id: c._id, ...payload }, { onSuccess: () => setEditing(null) });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          if (linkedRequestId) {
            reviewRequestMutation.mutate({
              id: linkedRequestId,
              status: "approved",
              categoryName: c.name,
              categoryIcon: c.icon,
              categoryColor: c.color,
            });
            setLinkedRequestId(null);
          }
          setEditing(null);
        },
      });
    }
  };

  const remove = (id: string) => {
    deleteMutation.mutate(id, { onSuccess: () => setConfirm(null) });
  };

  const openCreate = () => {
    setLinkedRequestId(null);
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
    setLinkedRequestId(null);
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

  const handleApproveWithNewCategory = (req: ProfessionRequest) => {
    setLinkedRequestId(req._id);
    setEditing({
      isNew: true,
      name: req.professionName,
      icon: "hammer",
      color: PALETTE[0],
      description: req.description || req.requirements || "",
      sortOrder: cats.length + 1,
      isActive: true,
      additionalCategoryMonthlyFee: 0,
      additionalCategoryGraceDays: 3,
    });
  };

  const handleApproveDirect = (req: ProfessionRequest) => {
    reviewRequestMutation.mutate({
      id: req._id,
      status: "approved",
      categoryName: req.professionName,
    });
  };

  const handleRejectSubmit = () => {
    if (!rejectingRequest) return;
    reviewRequestMutation.mutate(
      {
        id: rejectingRequest._id,
        status: "rejected",
        rejectionReason: rejectReason || "Request rejected by administrator",
      },
      {
        onSuccess: () => {
          setRejectingRequest(null);
          setRejectReason("");
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Services & Professions"
        description="Manage the categories customers browse, and approve custom trade requests submitted by workers."
        icon={<Layers className="h-3.5 w-3.5" />}
        eyebrow="Marketplace"
        actions={
          activeTab === "catalog" ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add service
            </Button>
          ) : null
        }
        stats={
          <p className="text-sm text-muted-foreground">
            {activeTab === "catalog"
              ? isFetching && !isLoading
                ? "Refreshing…"
                : `${cats.length} active services`
              : `${requestsData?.pagination?.totalItems || 0} trade requests`}
          </p>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === "catalog"
              ? "bg-primary text-black"
              : "bg-card text-muted-foreground hover:text-white"
          }`}
        >
          Active Services ({cats.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === "requests"
              ? "bg-primary text-black"
              : "bg-card text-muted-foreground hover:text-white"
          }`}
        >
          <span>Requested Professions</span>
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-400 text-black">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Catalog */}
      {activeTab === "catalog" && (
        <>
          {isError ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
              <div className="font-bold text-destructive">Could not load services</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {(error as Error)?.message || "Please confirm the backend is running and your admin session is valid."}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Try again
              </Button>
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
                        style={{
                          background: `${c.color}22`,
                          border: `1px solid ${c.color}55`,
                          boxShadow: `0 0 15px ${c.color}33`,
                        }}
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
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg p-2 hover:bg-primary/15 hover:text-primary"
                        title="Edit service"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirm(c)}
                        className="rounded-lg p-2 hover:bg-destructive/15 hover:text-destructive"
                        title="Delete service"
                      >
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
        </>
      )}

      {/* TAB 2: Requested Professions */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search profession, worker name, or phone..."
                value={reqSearch}
                onChange={(e) => {
                  setReqSearch(e.target.value);
                  setReqPage(1);
                }}
                className="bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none flex-1"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {["all", "pending", "approved", "rejected"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setReqStatus(s);
                    setReqPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                    reqStatus === s
                      ? "bg-primary text-black"
                      : "bg-surface-light text-muted-foreground hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          {requestsLoading ? (
            <div className="py-20 text-center text-muted-foreground">Loading profession requests...</div>
          ) : requests.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
              No profession requests found matching the current filter.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const isPending = r.status === "pending";
                const isApproved = r.status === "approved";
                const isRejected = r.status === "rejected";
                const categoryExists = cats.some(
                  (c) => c.name.toLowerCase() === r.professionName.toLowerCase()
                );

                return (
                  <div
                    key={r._id}
                    className="bg-card border border-border rounded-2xl p-5 shadow-card hover:border-primary/40 transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-bold text-white">{r.professionName}</h3>
                          {r.categoryDomain && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                              {r.categoryDomain}
                            </span>
                          )}
                          <Badge variant={isApproved ? "success" : isRejected ? "danger" : "warning"}>
                            {r.status}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Requester: <strong className="text-white">{r.requesterName}</strong></span>
                          <span>•</span>
                          <span>Phone: <strong className="text-white">{r.requesterPhone}</strong></span>
                          {r.createdAt && (
                            <>
                              <span>•</span>
                              <span>Submitted: {new Date(r.createdAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleApproveWithNewCategory(r)}
                            loading={reviewRequestMutation.isPending}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Approve & Add Category
                          </Button>
                          {categoryExists && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveDirect(r)}
                              loading={reviewRequestMutation.isPending}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                              Link Existing
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setRejectingRequest(r)}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Details Box */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-surface-light/30 border border-border/50 rounded-xl p-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block font-semibold mb-0.5">Required Tools & Equipment:</span>
                        <p className="text-white">{r.requirements || "None specified"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block font-semibold mb-0.5">Trade Description:</span>
                        <p className="text-white">{r.description || "No description provided"}</p>
                      </div>
                    </div>

                    {/* Rates & Skills */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      {r.hourlyRate ? (
                        <span className="px-2.5 py-1 rounded-lg bg-surface-light border border-border font-bold text-accent">
                          Rate: Rs. {r.hourlyRate}/hr
                        </span>
                      ) : null}
                      {r.experience !== undefined ? (
                        <span className="px-2.5 py-1 rounded-lg bg-surface-light border border-border font-bold text-white">
                          Exp: {r.experience} years
                        </span>
                      ) : null}
                      {r.skills && r.skills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-muted-foreground font-semibold">Skills:</span>
                          {r.skills.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/90">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {r.rejectionReason && (
                      <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg">
                        <strong>Rejection Reason:</strong> {r.rejectionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Category Edit / Create Modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id && !editing.isNew ? "Edit service" : "Add new service"}
        description={
          linkedRequestId
            ? "Approving trade request and creating category. This category will be linked to the requesting worker."
            : "This is what customers browse when booking. Workers link their profile to these service types."
        }
        width="max-w-2xl"
        eyebrow="Service setup"
      >
        {editing && (
          <CategoryForm
            value={editing}
            onChange={setEditing}
            onSave={() => save(editing)}
            loading={createMutation.isPending || updateMutation.isPending || reviewRequestMutation.isPending}
          />
        )}
      </Modal>

      {/* Reject Profession Request Modal */}
      <Modal
        open={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        title="Reject Profession Request"
        description={`Reject trade request for "${rejectingRequest?.professionName}".`}
        variant="danger"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setRejectingRequest(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={reviewRequestMutation.isPending}
              onClick={handleRejectSubmit}
            >
              Confirm Rejection
            </Button>
          </ModalFooter>
        }
      >
        <ModalBody>
          <FormField label="Reason for rejection" hint="Worker will see why this trade could not be accepted.">
            <Textarea
              placeholder="e.g. Duplicate trade category, unsupported trade type, requires specialized licensing..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-24"
            />
          </FormField>
        </ModalBody>
      </Modal>

      {/* Delete Category Modal */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete service?"
        description="Workers and bookings linked to this service may be affected."
        variant="danger"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
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
              className={`h-9 w-9 rounded-xl border-2 transition-transform ${
                value.color === c ? "scale-110 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
              }`}
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
