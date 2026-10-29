import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  DollarSign,
  Eye,
  Globe,
  Layers,
  MapPin,
  Percent,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Shield,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import {
  useCategories,
  usePlatformSettings,
  useUpdatePlatformSettings,
  useUpdateWalletSettings,
  useWalletSettings,
} from "@/lib/api-hooks";
import { fmtPKR } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Modal, ModalBody, ModalFooter } from "@/components/admin/Drawer";
import { Badge } from "@/components/admin/ui";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/platform-config")({ component: PlatformConfigPage });

interface DiffItem {
  field: string;
  category: string;
  liveValue: string | number | boolean;
  stagedValue: string | number | boolean;
}

function PlatformConfigPage() {
  const { user } = useAuth();
  const canManage = hasAdminPermission(user?.role, "platform-config");

  const { data: platformSettings, isLoading: isPlatformLoading } = usePlatformSettings();
  const { data: walletSettings, isLoading: isWalletLoading } = useWalletSettings();
  const updatePlatform = useUpdatePlatformSettings();
  const updateWallet = useUpdateWalletSettings();
  const { data: categories = [] } = useCategories({ limit: 100 });

  // Form states
  const [geo, setGeo] = useState({
    instantJobInitialRadiusKm: 10,
    instantJobExpandedRadiusKm: 25,
    instantJobExpansionMinutes: 5,
    instantJobTimeoutMinutes: 10,
  });

  const [walletForm, setWalletForm] = useState({
    platformFeePercentage: 10,
    minimumWalletBalance: 500,
    additionalCategoryMonthlyFee: 500,
    commissionEnabled: true,
    cnicVerificationBonus: 500,
  });

  const [urgentRates, setUrgentRates] = useState<Record<string, { baseRatePerHour: number; minimumPrice: number }>>({});

  // Diff Modal state
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  useEffect(() => {
    if (!platformSettings) return;
    setGeo({
      instantJobInitialRadiusKm: platformSettings.instantJobInitialRadiusKm ?? 10,
      instantJobExpandedRadiusKm: platformSettings.instantJobExpandedRadiusKm ?? 25,
      instantJobExpansionMinutes: platformSettings.instantJobExpansionMinutes ?? 5,
      instantJobTimeoutMinutes: platformSettings.instantJobTimeoutMinutes ?? 10,
    });
    setUrgentRates(platformSettings.urgentPricingRates || {});
  }, [platformSettings]);

  useEffect(() => {
    if (!walletSettings) return;
    setWalletForm({
      platformFeePercentage: walletSettings.platformFeePercentage ?? 10,
      minimumWalletBalance: walletSettings.minimumWalletBalance ?? 500,
      additionalCategoryMonthlyFee: walletSettings.additionalCategoryMonthlyFee ?? 500,
      commissionEnabled: walletSettings.commissionEnabled ?? true,
      cnicVerificationBonus: walletSettings.cnicVerificationBonus ?? 500,
    });
  }, [walletSettings]);

  // Compute diff between Live DB values and Staged Form values
  const stagedDiffs = useMemo<DiffItem[]>(() => {
    const diffs: DiffItem[] = [];

    // Wallet settings diff
    if (walletSettings) {
      if (walletForm.platformFeePercentage !== walletSettings.platformFeePercentage) {
        diffs.push({
          field: "Platform Commission %",
          category: "Wallet & Finance",
          liveValue: `${walletSettings.platformFeePercentage}%`,
          stagedValue: `${walletForm.platformFeePercentage}%`,
        });
      }
      if (walletForm.minimumWalletBalance !== walletSettings.minimumWalletBalance) {
        diffs.push({
          field: "Minimum Wallet Balance",
          category: "Wallet & Finance",
          liveValue: fmtPKR(walletSettings.minimumWalletBalance),
          stagedValue: fmtPKR(walletForm.minimumWalletBalance),
        });
      }
      if (walletForm.additionalCategoryMonthlyFee !== walletSettings.additionalCategoryMonthlyFee) {
        diffs.push({
          field: "Additional Category Monthly Fee",
          category: "Wallet & Finance",
          liveValue: fmtPKR(walletSettings.additionalCategoryMonthlyFee),
          stagedValue: fmtPKR(walletForm.additionalCategoryMonthlyFee),
        });
      }
      if (walletForm.cnicVerificationBonus !== (walletSettings.cnicVerificationBonus ?? 500)) {
        diffs.push({
          field: "CNIC Verification Starter Bonus",
          category: "Wallet & Finance",
          liveValue: fmtPKR(walletSettings.cnicVerificationBonus ?? 500),
          stagedValue: fmtPKR(walletForm.cnicVerificationBonus),
        });
      }
      if (walletForm.commissionEnabled !== walletSettings.commissionEnabled) {
        diffs.push({
          field: "Commission Enabled",
          category: "Wallet & Finance",
          liveValue: walletSettings.commissionEnabled ? "Enabled" : "Disabled",
          stagedValue: walletForm.commissionEnabled ? "Enabled" : "Disabled",
        });
      }
    }

    // Geo settings diff
    if (platformSettings) {
      if (geo.instantJobInitialRadiusKm !== platformSettings.instantJobInitialRadiusKm) {
        diffs.push({
          field: "Initial Search Radius",
          category: "Instant Matching",
          liveValue: `${platformSettings.instantJobInitialRadiusKm} km`,
          stagedValue: `${geo.instantJobInitialRadiusKm} km`,
        });
      }
      if (geo.instantJobExpandedRadiusKm !== platformSettings.instantJobExpandedRadiusKm) {
        diffs.push({
          field: "Expanded Search Radius",
          category: "Instant Matching",
          liveValue: `${platformSettings.instantJobExpandedRadiusKm} km`,
          stagedValue: `${geo.instantJobExpandedRadiusKm} km`,
        });
      }
      if (geo.instantJobExpansionMinutes !== platformSettings.instantJobExpansionMinutes) {
        diffs.push({
          field: "Radius Expansion Delay",
          category: "Instant Matching",
          liveValue: `${platformSettings.instantJobExpansionMinutes} min`,
          stagedValue: `${geo.instantJobExpansionMinutes} min`,
        });
      }
      if (geo.instantJobTimeoutMinutes !== platformSettings.instantJobTimeoutMinutes) {
        diffs.push({
          field: "Dispatch Timeout",
          category: "Instant Matching",
          liveValue: `${platformSettings.instantJobTimeoutMinutes} min`,
          stagedValue: `${geo.instantJobTimeoutMinutes} min`,
        });
      }

      // Check category rate diffs
      const liveRates = platformSettings.urgentPricingRates || {};
      for (const [catName, stagedRate] of Object.entries(urgentRates)) {
        const liveRate = liveRates[catName] || { baseRatePerHour: 450, minimumPrice: 600 };
        if (stagedRate.baseRatePerHour !== liveRate.baseRatePerHour) {
          diffs.push({
            field: `${catName} Rate/hr`,
            category: "Urgent Category Rates",
            liveValue: fmtPKR(liveRate.baseRatePerHour),
            stagedValue: fmtPKR(stagedRate.baseRatePerHour),
          });
        }
        if (stagedRate.minimumPrice !== liveRate.minimumPrice) {
          diffs.push({
            field: `${catName} Min Price`,
            category: "Urgent Category Rates",
            liveValue: fmtPKR(liveRate.minimumPrice),
            stagedValue: fmtPKR(stagedRate.minimumPrice),
          });
        }
      }
    }

    return diffs;
  }, [walletSettings, platformSettings, walletForm, geo, urgentRates]);

  const handleRollback = () => {
    if (walletSettings) {
      setWalletForm({
        platformFeePercentage: walletSettings.platformFeePercentage,
        minimumWalletBalance: walletSettings.minimumWalletBalance,
        additionalCategoryMonthlyFee: walletSettings.additionalCategoryMonthlyFee,
        commissionEnabled: walletSettings.commissionEnabled,
        cnicVerificationBonus: walletSettings.cnicVerificationBonus ?? 500,
      });
    }
    if (platformSettings) {
      setGeo({
        instantJobInitialRadiusKm: platformSettings.instantJobInitialRadiusKm,
        instantJobExpandedRadiusKm: platformSettings.instantJobExpandedRadiusKm,
        instantJobExpansionMinutes: platformSettings.instantJobExpansionMinutes,
        instantJobTimeoutMinutes: platformSettings.instantJobTimeoutMinutes,
      });
      setUrgentRates(platformSettings.urgentPricingRates || {});
    }
    setDiffModalOpen(false);
    toast.info("Staged configuration changes rolled back to live settings.");
  };

  const saveAll = async () => {
    try {
      await updatePlatform.mutateAsync({
        urgentPricingRates: urgentRates,
        defaultUrgentRate: platformSettings?.defaultUrgentRate,
        ...geo,
      });
      await updateWallet.mutateAsync(walletForm);
      setDiffModalOpen(false);
      toast.success("Platform settings successfully published to production!");
    } catch {
      // toast handled in hooks
    }
  };

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-dim">
        You do not have permission to manage platform configuration.
      </div>
    );
  }

  const isSaving = updatePlatform.isPending || updateWallet.isPending;
  const hasChanges = stagedDiffs.length > 0;

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <AdminPageHeader
        title="Platform Rules & Engine Configuration"
        description="Configure Pakistan operations parameters: commission percentages, instant dispatch radii, wallet lock thresholds, and category urgent rates."
        icon={<Settings2 className="h-4 w-4" />}
        stats={
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Commission: {walletForm.platformFeePercentage}%</Badge>
            <Badge variant="warning">Min Wallet: {fmtPKR(walletForm.minimumWalletBalance)}</Badge>
            <Badge variant="purple">Categories: {categories.length}</Badge>
            {hasChanges && (
              <Badge variant="orange" pulse>
                {stagedDiffs.length} Staged Changes
              </Badge>
            )}
          </div>
        }
      />

      {/* 1. Wallet & Financial Rules Section */}
      <section className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Wallet className="h-4 w-4 text-primary" /> Wallet Thresholds & Commission
          </div>
          <span className="text-xs text-muted-foreground">Applies across all Pakistani cities</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumberField
            label="Platform Commission (%)"
            value={walletForm.platformFeePercentage}
            suffix="%"
            helper="Deducted upon cash job completion"
            onChange={(val) => setWalletForm((prev) => ({ ...prev, platformFeePercentage: val }))}
          />

          <NumberField
            label="Minimum Wallet Threshold (PKR)"
            value={walletForm.minimumWalletBalance}
            prefix="Rs."
            helper="Workers below this balance cannot accept jobs"
            onChange={(val) => setWalletForm((prev) => ({ ...prev, minimumWalletBalance: val }))}
          />

          <NumberField
            label="CNIC Verification Starter Bonus (PKR)"
            value={walletForm.cnicVerificationBonus}
            prefix="Rs."
            helper="Auto-credited to worker upon CNIC approval"
            onChange={(val) => setWalletForm((prev) => ({ ...prev, cnicVerificationBonus: val }))}
          />

          <NumberField
            label="Additional Specialty Fee (PKR/mo)"
            value={walletForm.additionalCategoryMonthlyFee}
            prefix="Rs."
            helper="Charged monthly for 2nd+ trade categories"
            onChange={(val) => setWalletForm((prev) => ({ ...prev, additionalCategoryMonthlyFee: val }))}
          />

          <div className="p-3.5 rounded-xl bg-surface-light border border-border/60 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Commission Engine</span>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">Toggle automatic ledger fee collection</span>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={walletForm.commissionEnabled}
                onChange={(e) => setWalletForm((prev) => ({ ...prev, commissionEnabled: e.target.checked }))}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span>{walletForm.commissionEnabled ? "Engine Active (10%)" : "Commission Paused (0%)"}</span>
            </label>
          </div>
        </div>
      </section>

      {/* 2. Instant Job Dispatch Radius Settings */}
      <section className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Globe className="h-4 w-4 text-accent" /> Instant Match Dispatch Engine
          </div>
          <span className="text-xs text-muted-foreground">Haversine geo-expansion formula</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumberField
            label="Initial Broadcast Radius"
            value={geo.instantJobInitialRadiusKm}
            suffix="km"
            helper="Stage 1 search radius for nearest Ustads"
            onChange={(val) => setGeo((prev) => ({ ...prev, instantJobInitialRadiusKm: val }))}
          />

          <NumberField
            label="Expanded Search Radius"
            value={geo.instantJobExpandedRadiusKm}
            suffix="km"
            helper="Stage 2 outer perimeter fallback"
            onChange={(val) => setGeo((prev) => ({ ...prev, instantJobExpandedRadiusKm: val }))}
          />

          <NumberField
            label="Expansion Delay"
            value={geo.instantJobExpansionMinutes}
            suffix="min"
            helper="Wait time before broadening to Stage 2"
            onChange={(val) => setGeo((prev) => ({ ...prev, instantJobExpansionMinutes: val }))}
          />

          <NumberField
            label="Auto-Timeout Threshold"
            value={geo.instantJobTimeoutMinutes}
            suffix="min"
            helper="Max wait before alerting client of no Ustads"
            onChange={(val) => setGeo((prev) => ({ ...prev, instantJobTimeoutMinutes: val }))}
          />
        </div>
      </section>

      {/* 3. Category Overrides & Urgent Pricing */}
      <section className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Layers className="h-4 w-4 text-gold" /> Category Urgent Pricing Overrides
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {categories.length} trade categories registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((category) => {
            const rate = urgentRates[category.name] || { baseRatePerHour: 450, minimumPrice: 600 };
            return (
              <div
                key={category._id}
                className="rounded-xl border border-border/70 bg-surface-light p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color || "#00F5FF" }} />
                    {category.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Min 2-hr: {fmtPKR(rate.minimumPrice)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="Rate / Hour"
                    value={rate.baseRatePerHour}
                    prefix="Rs."
                    onChange={(val) =>
                      setUrgentRates((prev) => ({
                        ...prev,
                        [category.name]: { ...rate, baseRatePerHour: val },
                      }))
                    }
                  />
                  <NumberField
                    label="Minimum Floor"
                    value={rate.minimumPrice}
                    prefix="Rs."
                    onChange={(val) =>
                      setUrgentRates((prev) => ({
                        ...prev,
                        [category.name]: { ...rate, minimumPrice: val },
                      }))
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FLOATING STAGED DIFF ACTION BAR */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface/90 backdrop-blur-xl border border-primary/40 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-slide-up">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-gold animate-ping" />
            <div>
              <span className="text-xs font-bold text-white block">
                {stagedDiffs.length} Unsaved Configuration Changes
              </span>
              <span className="text-[11px] text-muted-foreground">
                Changes will not affect mobile apps until published.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDiffModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-white hover:bg-surface-light flex items-center gap-1.5 transition"
            >
              <Eye className="w-3.5 h-3.5" /> View Diff
            </button>

            <button
              type="button"
              onClick={handleRollback}
              className="px-3 py-2 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Rollback
            </button>

            <button
              type="button"
              onClick={saveAll}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl gradient-cyan text-background font-black text-xs flex items-center gap-1.5 shadow-lg glow-cyan disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Publish Changes
            </button>
          </div>
        </div>
      )}

      {/* VISUAL CONFIGURATION DIFF VIEWER MODAL */}
      <Modal
        open={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        title="Platform Configuration Diff Viewer"
        description="Verify pending changes against currently active production settings before publishing."
        width="max-w-3xl"
        footer={
          <ModalFooter>
            <button
              type="button"
              onClick={handleRollback}
              className="px-4 py-2 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-bold flex items-center gap-1.5 mr-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Discard & Rollback
            </button>
            <button
              type="button"
              onClick={() => setDiffModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface-light"
            >
              Keep Editing
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl gradient-cyan text-background font-black text-xs flex items-center gap-1.5 shadow-lg glow-cyan"
            >
              <Check className="w-4 h-4" /> Confirm & Publish
            </button>
          </ModalFooter>
        }
      >
        <ModalBody>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-surface-light border border-border/80 flex items-center justify-between text-xs text-muted-foreground">
              <span>Comparing Live Production DB vs Staged Form Edits</span>
              <span className="font-mono font-bold text-accent">{stagedDiffs.length} fields modified</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-light border-b border-border/80 text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="p-3">Section / Field</th>
                    <th className="p-3">Live Production</th>
                    <th className="p-3">Staged New Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {stagedDiffs.map((diff, idx) => (
                    <tr key={idx} className="hover:bg-surface-light/40">
                      <td className="p-3">
                        <div className="font-bold text-white">{diff.field}</div>
                        <div className="text-[10px] text-muted-foreground">{diff.category}</div>
                      </td>
                      <td className="p-3 font-mono text-destructive/80 line-through">
                        {String(diff.liveValue)}
                      </td>
                      <td className="p-3 font-mono font-bold text-success flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>{String(diff.stagedValue)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}

function NumberField({
  label,
  value,
  prefix,
  suffix,
  helper,
  onChange,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  helper?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-muted-foreground block">{label}</label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-xs font-mono font-bold text-muted-foreground pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full h-10 rounded-xl border border-border bg-input px-3 text-xs font-mono font-bold text-white outline-none focus:border-primary transition ${
            prefix ? "pl-9" : ""
          } ${suffix ? "pr-9" : ""}`}
        />
        {suffix && (
          <span className="absolute right-3 text-xs font-mono text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {helper && <p className="text-[10px] text-muted-foreground leading-tight">{helper}</p>}
    </div>
  );
}
