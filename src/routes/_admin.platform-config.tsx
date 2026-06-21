import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Settings2 } from "lucide-react";
import { useCategories, usePlatformSettings, useUpdatePlatformSettings, useUpdateWalletSettings, useWalletSettings } from "@/lib/api-hooks";
import { fmtPKR } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions";

export const Route = createFileRoute("/_admin/platform-config")({ component: PlatformConfigPage });

function PlatformConfigPage() {
  const { user } = useAuth();
  const canManage = hasAdminPermission(user?.role, "platform-config");

  const { data: platformSettings } = usePlatformSettings();
  const { data: walletSettings } = useWalletSettings();
  const updatePlatform = useUpdatePlatformSettings();
  const updateWallet = useUpdateWalletSettings();
  const { data: categories = [] } = useCategories({ limit: 100 });

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
  });
  const [urgentRates, setUrgentRates] = useState<Record<string, { baseRatePerHour: number; minimumPrice: number }>>({});

  useEffect(() => {
    if (!platformSettings) return;
    setGeo({
      instantJobInitialRadiusKm: platformSettings.instantJobInitialRadiusKm,
      instantJobExpandedRadiusKm: platformSettings.instantJobExpandedRadiusKm,
      instantJobExpansionMinutes: platformSettings.instantJobExpansionMinutes,
      instantJobTimeoutMinutes: platformSettings.instantJobTimeoutMinutes,
    });
    setUrgentRates(platformSettings.urgentPricingRates || {});
  }, [platformSettings]);

  useEffect(() => {
    if (!walletSettings) return;
    setWalletForm({
      platformFeePercentage: walletSettings.platformFeePercentage,
      minimumWalletBalance: walletSettings.minimumWalletBalance,
      additionalCategoryMonthlyFee: walletSettings.additionalCategoryMonthlyFee,
      commissionEnabled: walletSettings.commissionEnabled,
    });
  }, [walletSettings]);

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-dim">
        You do not have permission to manage platform configuration.
      </div>
    );
  }

  const saveAll = async () => {
    await updatePlatform.mutateAsync({
      urgentPricingRates: urgentRates,
      defaultUrgentRate: platformSettings?.defaultUrgentRate,
      ...geo,
    });
    await updateWallet.mutateAsync(walletForm);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Platform Configuration</h2>
        <p className="text-sm text-dim">Commission rules, urgent pricing, geo matching, and payout accounts.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold"><Settings2 className="h-4 w-4 text-primary" /> Wallet & Commission</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField label="Platform commission %" value={walletForm.platformFeePercentage} onChange={(value) => setWalletForm((current) => ({ ...current, platformFeePercentage: value }))} />
          <NumberField label="Minimum wallet balance" value={walletForm.minimumWalletBalance} onChange={(value) => setWalletForm((current) => ({ ...current, minimumWalletBalance: value }))} />
          <NumberField label="Additional category monthly fee" value={walletForm.additionalCategoryMonthlyFee} onChange={(value) => setWalletForm((current) => ({ ...current, additionalCategoryMonthlyFee: value }))} />
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={walletForm.commissionEnabled}
              onChange={(e) => setWalletForm((current) => ({ ...current, commissionEnabled: e.target.checked }))}
            />
            Commission enabled
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
        <div className="font-semibold text-white">Instant Job Geo Settings</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField label="Initial search radius (km)" value={geo.instantJobInitialRadiusKm} onChange={(value) => setGeo((current) => ({ ...current, instantJobInitialRadiusKm: value }))} />
          <NumberField label="Expanded search radius (km)" value={geo.instantJobExpandedRadiusKm} onChange={(value) => setGeo((current) => ({ ...current, instantJobExpandedRadiusKm: value }))} />
          <NumberField label="Expand after (minutes)" value={geo.instantJobExpansionMinutes} onChange={(value) => setGeo((current) => ({ ...current, instantJobExpansionMinutes: value }))} />
          <NumberField label="Timeout after (minutes)" value={geo.instantJobTimeoutMinutes} onChange={(value) => setGeo((current) => ({ ...current, instantJobTimeoutMinutes: value }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
        <div className="font-semibold text-white">Urgent Pricing by Category</div>
        <div className="space-y-3">
          {categories.map((category) => {
            const rate = urgentRates[category.name] || { baseRatePerHour: 450, minimumPrice: 600 };
            return (
              <div key={category._id} className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-border/60 p-3">
                <div className="font-medium text-white">{category.name}</div>
                <NumberField
                  label="Base rate / hour"
                  value={rate.baseRatePerHour}
                  onChange={(value) => setUrgentRates((current) => ({ ...current, [category.name]: { ...rate, baseRatePerHour: value } }))}
                />
                <NumberField
                  label="Minimum price"
                  value={rate.minimumPrice}
                  onChange={(value) => setUrgentRates((current) => ({ ...current, [category.name]: { ...rate, minimumPrice: value } }))}
                />
              </div>
            );
          })}
        </div>
        <div className="text-xs text-dim">Example minimum job price preview: {fmtPKR(600)} for a 2-hour urgent booking.</div>
      </section>

      <button
        onClick={saveAll}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-background"
      >
        <Save className="h-4 w-4" />
        Save platform configuration
      </button>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-dim">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-border bg-input px-3 py-2 outline-none"
      />
    </label>
  );
}
