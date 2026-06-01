import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { 
  Tag, Plus, Trash2, Calendar, Sparkles, Percent, DollarSign, 
  AlertCircle, Power, Copy, Check, Info, ShieldCheck, ToggleLeft, ToggleRight
} from "lucide-react";
import { Modal } from "@/components/admin/Drawer";
import { Badge, StatCard } from "@/components/admin/ui";
import { DataTable, SearchInput } from "@/components/admin/DataTable";
import { fmtPKR } from "@/lib/mock-data";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  usePromos, 
  useCreatePromo, 
  useTogglePromoStatus, 
  useDeletePromo,
  type PromoCode
} from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/promos")({
  component: PromosPage,
});

type PromoFormState = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minBookingAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  userUsageLimit: number;
  startDate: string;
  endDate: string;
};

function PromosPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "", "active", "inactive"
  const [typeFilter, setTypeFilter] = useState(""); // "", "percentage", "fixed"
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Queries & Mutations
  const { data: promos = [], isLoading, isError, error, refetch } = usePromos();
  const createMutation = useCreatePromo();
  const toggleMutation = useTogglePromoStatus();
  const deleteMutation = useDeletePromo();

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PromoCode | null>(null);

  const [form, setForm] = useState<PromoFormState>({
    code: "",
    discountType: "percentage",
    discountValue: 0,
    minBookingAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
    userUsageLimit: 1,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  // Copy helper
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Promo code "${code}" copied to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Generate code helper
  const handleGenerateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "USTAD";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, code }));
  };

  // Filter promos
  const filteredPromos = useMemo(() => {
    return promos.filter((p: PromoCode) => {
      const codeMatches = p.code.toLowerCase().includes(q.toLowerCase());
      const typeMatches = typeFilter ? p.discountType === typeFilter : true;
      const statusMatches = statusFilter 
        ? (statusFilter === "active" ? p.isActive : !p.isActive) 
        : true;
      return codeMatches && typeMatches && statusMatches;
    });
  }, [promos, q, typeFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      active: promos.filter((p: PromoCode) => p.isActive).length,
      usages: promos.reduce((acc: number, p: PromoCode) => acc + (p.usageCount || 0), 0),
      inactive: promos.filter((p: PromoCode) => !p.isActive).length,
    };
  }, [promos]);

  // Save Promo Code
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    
    if (!code) {
      toast.error("Promo code is required");
      return;
    }
    if (form.discountValue <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }
    if (form.discountType === "percentage" && form.discountValue > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("End date cannot be before start date");
      return;
    }

    createMutation.mutate({
      code,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minBookingAmount: Number(form.minBookingAmount),
      maxDiscountAmount: Number(form.maxDiscountAmount),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      usageLimit: Number(form.usageLimit),
      userUsageLimit: Number(form.userUsageLimit)
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        // Reset form
        setForm({
          code: "",
          discountType: "percentage",
          discountValue: 0,
          minBookingAmount: 0,
          maxDiscountAmount: 0,
          usageLimit: 0,
          userUsageLimit: 1,
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        });
      }
    });
  };

  // Toggle active status
  const handleToggleStatus = (p: PromoCode) => {
    toggleMutation.mutate(p._id);
  };

  // Delete promo code
  const handleDelete = () => {
    if (!confirmDelete) return;
    deleteMutation.mutate(confirmDelete._id, {
      onSuccess: () => setConfirmDelete(null)
    });
  };

  return (
    <div className="space-y-6">
      {/* 🚀 Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Promo & Coupon Management
          </h2>
          <p className="text-sm text-dim mt-1">
            Create coupons, configure checkout rules, track usages, and manage active system discounts.
          </p>
        </div>

        <button 
          onClick={() => setIsCreateOpen(true)}
          className="btn-press inline-flex items-center gap-2 px-4 h-10 rounded-xl gradient-cyan text-background font-bold glow-cyan self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Promo Code
        </button>
      </div>

      {/* 📊 Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard 
          label="Active Coupons" 
          value={stats.active} 
          icon={<ShieldCheck className="w-5 h-5 text-white" />} 
          gradient="gradient-cyan glow-cyan" 
        />
        <StatCard 
          label="Total Usages" 
          value={stats.usages} 
          icon={<Sparkles className="w-5 h-5 text-white" />} 
          gradient="gradient-purple glow-purple" 
        />
        <StatCard 
          label="Inactive Coupons" 
          value={stats.inactive} 
          icon={<Power className="w-5 h-5 text-white" />} 
          gradient="gradient-orange glow-orange" 
        />
      </div>

      {/* 🔍 Filters & Search */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchInput 
            value={q} 
            onChange={setQ} 
            placeholder="Search promo codes..." 
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50 cursor-pointer min-w-[120px]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50 cursor-pointer min-w-[120px]"
          >
            <option value="">All Types</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed (Rs.)</option>
          </select>
        </div>
      </div>

      {/* 📋 Data Table */}
      {isError ? (
        <div className="bg-card border border-destructive/40 rounded-2xl p-6 shadow-card">
          <div className="font-bold text-destructive">Could not load promo codes</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {error?.message || "Please confirm the backend is running and your admin session is valid."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 h-10 rounded-xl bg-surface-light border border-border hover:border-primary font-semibold"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <DataTable<PromoCode>
            isLoading={isLoading}
            rows={filteredPromos}
            pageSize={10}
            columns={[
              {
                key: "code",
                header: "Promo Code",
                render: (p) => (
                  <div className="flex items-center gap-2 group">
                    <span className="font-mono text-sm font-extrabold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                      {p.code}
                    </span>
                    <button
                      onClick={() => handleCopy(p.code)}
                      className="p-1 rounded hover:bg-surface-light text-muted-foreground hover:text-white transition opacity-0 group-hover:opacity-100"
                      title="Copy code"
                    >
                      {copiedCode === p.code ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )
              },
              {
                key: "discount",
                header: "Discount",
                render: (p) => (
                  <div>
                    {p.discountType === "percentage" ? (
                      <Badge variant="info">
                        <Percent className="w-3 h-3 mr-1 inline" /> {p.discountValue}% Off
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        <DollarSign className="w-3 h-3 mr-0.5 inline" /> {fmtPKR(p.discountValue)} Off
                      </Badge>
                    )}
                  </div>
                )
              },
              {
                key: "rules",
                header: "Usage Constraints",
                render: (p) => {
                  const hasMin = p.minBookingAmount > 0;
                  const hasMax = p.discountType === "percentage" && p.maxDiscountAmount > 0;
                  const limit = p.usageLimit > 0 ? `${p.usageLimit} Global` : "Unlimited Global";
                  const userLimit = `${p.userUsageLimit} Per User`;

                  return (
                    <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        <span>{limit} • {userLimit}</span>
                      </div>
                      {hasMin && (
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Min Booking: {fmtPKR(p.minBookingAmount)}</span>
                        </div>
                      )}
                      {hasMax && (
                        <div className="flex items-center gap-1.5 text-pink-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                          <span>Max Cap: {fmtPKR(p.maxDiscountAmount)}</span>
                        </div>
                      )}
                    </div>
                  );
                }
              },
              {
                key: "usages",
                header: "Usage Tracking",
                render: (p) => {
                  const count = p.usageCount || 0;
                  const limit = p.usageLimit;
                  const percentage = limit > 0 ? Math.min(100, (count / limit) * 100) : 0;
                  
                  return (
                    <div className="w-full max-w-[120px] space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-white">{count} Used</span>
                        {limit > 0 && <span className="text-muted-foreground">/ {limit}</span>}
                      </div>
                      {limit > 0 && (
                        <div className="w-full h-1.5 rounded-full bg-surface-light overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                }
              },
              {
                key: "validity",
                header: "Validity",
                render: (p) => {
                  const isExpired = new Date(p.endDate) < new Date();
                  const startStr = format(new Date(p.startDate), "dd MMM yy");
                  const endStr = format(new Date(p.endDate), "dd MMM yy");
                  return (
                    <div className="flex flex-col">
                      <span className="text-xs text-white flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-dim shrink-0" />
                        {startStr} - {endStr}
                      </span>
                      {isExpired && (
                        <span className="text-[9px] uppercase tracking-wider text-destructive font-bold mt-0.5">
                          ⚠️ Expired
                        </span>
                      )}
                    </div>
                  );
                }
              },
              {
                key: "status",
                header: "Active",
                render: (p) => (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(p);
                    }}
                    className="p-1 rounded hover:bg-surface-light/50 transition"
                    title={p.isActive ? "Deactivate" : "Activate"}
                  >
                    {p.isActive ? (
                      <Badge variant="success" pulse>Active</Badge>
                    ) : (
                      <Badge variant="danger">Disabled</Badge>
                    )}
                  </button>
                )
              },
              {
                key: "actions",
                header: "",
                render: (p) => (
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setConfirmDelete(p)}
                      className="p-2 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all"
                      title="Delete Promo Code"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              }
            ]}
          />
        </div>
      )}

      {/* 🚀 Create Promo Modal */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Promo Code">
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Code Generation row */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
              Promo Code
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SPECIAL30"
                className="flex-1 h-11 px-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none transition-all uppercase font-mono tracking-wider text-white text-sm"
                maxLength={20}
                required
              />
              <button
                type="button"
                onClick={handleGenerateCode}
                className="px-3.5 h-11 rounded-xl bg-surface-light hover:bg-primary/10 border border-border hover:border-primary text-xs font-bold text-primary transition flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate
              </button>
            </div>
          </div>

          {/* Discount Type Selector */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
              Discount Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-surface-light p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setForm({ ...form, discountType: "percentage", maxDiscountAmount: 0 })}
                className={`py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  form.discountType === "percentage" 
                    ? "bg-primary text-background shadow-md shadow-glow-cyan" 
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Percent className="w-3.5 h-3.5" /> Percentage
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, discountType: "fixed", maxDiscountAmount: 0 })}
                className={`py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  form.discountType === "fixed" 
                    ? "bg-primary text-background shadow-md shadow-glow-cyan" 
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Fixed PKR
              </button>
            </div>
          </div>

          {/* Values Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Discount Value
              </label>
              <input 
                type="number"
                value={form.discountValue || ""}
                onChange={e => setForm({ ...form, discountValue: Math.max(0, Number(e.target.value)) })}
                placeholder={form.discountType === "percentage" ? "30 (%)" : "500 (PKR)"}
                className="w-full h-11 px-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none transition-all text-white text-sm"
                min={1}
                required
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Min. Booking Amount (PKR)
              </label>
              <input 
                type="number"
                value={form.minBookingAmount || ""}
                onChange={e => setForm({ ...form, minBookingAmount: Math.max(0, Number(e.target.value)) })}
                placeholder="e.g. 1000"
                className="w-full h-11 px-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none transition-all text-white text-sm"
                min={0}
              />
            </div>
          </div>

          {/* Conditional Max Cap */}
          {form.discountType === "percentage" && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1 flex items-center gap-1">
                Max. Discount Cap (PKR)
                <span className="text-[9px] text-dim font-normal uppercase tracking-normal">(0 = Unlimited)</span>
              </label>
              <input 
                type="number"
                value={form.maxDiscountAmount || ""}
                onChange={e => setForm({ ...form, maxDiscountAmount: Math.max(0, Number(e.target.value)) })}
                placeholder="e.g. 500"
                className="w-full h-11 px-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none transition-all text-white text-sm"
                min={0}
              />
            </div>
          )}

          {/* Usage Limits Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Global Limit <span className="text-[9px] text-dim lowercase font-normal">(0 = unlimited)</span>
              </label>
              <input 
                type="number"
                value={form.usageLimit || ""}
                onChange={e => setForm({ ...form, usageLimit: Math.max(0, Number(e.target.value)) })}
                placeholder="e.g. 100"
                className="w-full h-11 px-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none transition-all text-white text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Per-User Limit
              </label>
              <input 
                type="number"
                value={form.userUsageLimit || ""}
                onChange={e => setForm({ ...form, userUsageLimit: Math.max(1, Number(e.target.value)) })}
                placeholder="e.g. 1"
                className="w-full h-11 px-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none transition-all text-white text-sm"
                min={1}
                required
              />
            </div>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                Start Date
              </label>
              <input 
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full h-11 px-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none transition-all text-white text-sm cursor-pointer"
                required
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                End Date
              </label>
              <input 
                type="date"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="w-full h-11 px-4 rounded-xl bg-surface-light border border-border focus:border-primary focus:outline-none transition-all text-white text-sm cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={createMutation.isPending}
            className="btn-press w-full h-12 rounded-xl gradient-cyan text-background font-bold shadow-glow-cyan disabled:opacity-50 transition-all mt-4"
          >
            {createMutation.isPending ? "Creating Promo Code..." : "Create Promo Code"}
          </button>
        </form>
      </Modal>

      {/* ⚠️ Delete Confirmation Modal */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Promo Code">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 animate-pulse" />
            <p>
              Are you sure you want to delete the coupon <span className="font-extrabold font-mono text-white bg-destructive/20 px-1.5 py-0.5 rounded">{confirmDelete?.code}</span>? This action is permanent and cannot be undone.
            </p>
          </div>
          <p className="text-xs text-muted-foreground px-1">
            Any users currently possessing this code will no longer be able to validate it during booking checkouts. Historical statistics and booking logs will remain unaffected.
          </p>
          <div className="mt-4 flex gap-2 justify-end">
            <button 
              onClick={() => setConfirmDelete(null)} 
              className="px-4 h-10 rounded-xl border border-border hover:bg-surface-light text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleDelete} 
              className="px-5 h-10 rounded-xl bg-destructive hover:bg-destructive/80 text-white text-xs font-bold transition flex items-center justify-center" 
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
