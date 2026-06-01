import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/admin/ui";
import { toast } from "sonner";
import {
  useUpdateAdminProfile,
  useChangeAdminPassword,
  useWalletSettings,
  useUpdateWalletSettings
} from "@/lib/api-hooks";
import { Shield, Lock, Sliders, Check, Settings2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();

  // Profile Form state
  const [fullName, setFullName] = useState(user?.fullName || user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  // Update profile inputs if auth state resolves late
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Password Form state
  const [cur, setCur] = useState("");
  const [npw, setNpw] = useState("");
  const [conf, setConf] = useState("");

  // Mutations
  const updateProfileMutation = useUpdateAdminProfile();
  const changePasswordMutation = useChangeAdminPassword();

  // Wallet/Platform Settings
  const { data: walletSettings, isLoading: isLoadingSettings } = useWalletSettings();
  const updateWalletSettingsMutation = useUpdateWalletSettings();

  // Local state for platform settings
  const [platformFee, setPlatformFee] = useState<number>(10);
  const [minBalance, setMinBalance] = useState<number>(500);

  useEffect(() => {
    if (walletSettings) {
      setPlatformFee(walletSettings.platformFeePercentage ?? 10);
      setMinBalance(walletSettings.minimumWalletBalance ?? 500);
    }
  }, [walletSettings]);

  // Handlers
  const handleSaveProfile = async () => {
    if (!fullName.trim() || !email.trim()) {
      return toast.error("Name and Email are required");
    }
    try {
      await updateProfileMutation.mutateAsync({ fullName, email });
    } catch (err) {
      // toast is handled in mutation
    }
  };

  const handleUpdatePassword = async () => {
    if (!cur || !npw || !conf) {
      return toast.error("Please fill all password fields");
    }
    if (npw !== conf) {
      return toast.error("New passwords do not match");
    }
    if (npw.length < 6) {
      return toast.error("New password must be at least 6 characters long");
    }
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: cur,
        newPassword: npw
      });
      // Reset inputs on success
      setCur("");
      setNpw("");
      setConf("");
    } catch (err) {
      // toast is handled in mutation
    }
  };

  const handleSavePlatformSettings = async () => {
    try {
      await updateWalletSettingsMutation.mutateAsync({
        platformFeePercentage: Number(platformFee),
        minimumWalletBalance: Number(minBalance),
        commissionEnabled: true
      });
    } catch (err) {
      // toast is handled in mutation
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 🚀 Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-primary" />
          System Settings
        </h2>
        <p className="text-sm text-dim mt-1">
          Update admin profile, configure platform commissions, and manage authentication.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Admin Profile */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg text-white">Admin Profile</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-5">Manage your display profile and account identifiers</p>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-surface-light/20 border border-border rounded-xl">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                {(fullName || user?.name || "A")[0].toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-sm text-white">{fullName || user?.name || "Super Admin"}</div>
                <div className="text-xs text-dim">{email || user?.email}</div>
                <div className="mt-1.5">
                  <Badge variant={user?.role === "superadmin" ? "purple" : "info"}>
                    {user?.role || "Administrator"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-dim font-bold block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary/50 focus:outline-none text-sm transition"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-dim font-bold block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary/50 focus:outline-none text-sm transition"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            className="btn-press mt-6 w-full h-11 rounded-xl gradient-cyan text-background font-bold glow-cyan flex items-center justify-center gap-2"
          >
            {updateProfileMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>

        {/* Card 2: Change Password */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-secondary" />
              <h3 className="font-bold text-lg text-white">Change Password</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-5">Change your administrator access credentials</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-dim font-bold block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={cur}
                  onChange={(e) => setCur(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary/50 focus:outline-none text-sm transition"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-dim font-bold block mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={npw}
                  onChange={(e) => setNpw(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary/50 focus:outline-none text-sm transition"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-dim font-bold block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={conf}
                  onChange={(e) => setConf(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary/50 focus:outline-none text-sm transition"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleUpdatePassword}
            disabled={changePasswordMutation.isPending}
            className="btn-press mt-6 w-full h-11 rounded-xl gradient-purple text-white font-bold glow-purple flex items-center justify-center gap-2"
          >
            {changePasswordMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
            Update Password
          </button>
        </div>

        {/* Card 3: Platform Settings */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sliders className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-lg text-white">Platform Settings</h3>
              </div>
              <p className="text-xs text-muted-foreground">Adjust system commission rates and worker eligibility configurations</p>
            </div>
            <button
              onClick={handleSavePlatformSettings}
              disabled={updateWalletSettingsMutation.isPending || isLoadingSettings}
              className="btn-press px-5 h-10 rounded-xl bg-accent text-background font-bold flex items-center gap-2 border border-accent/20 hover:brightness-110 active:scale-95 transition"
            >
              {updateWalletSettingsMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Apply Platform Rules
            </button>
          </div>

          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-6 text-dim gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span>Fetching live system rules...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Rule 1: Commission */}
              <div className="p-5 rounded-2xl bg-surface-light/10 border border-border/40 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase text-dim font-bold block mb-1">Platform Commission Fee</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">Percentage deducted from completed service bookings</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={platformFee}
                    onChange={(e) => setPlatformFee(Number(e.target.value))}
                    className="w-20 h-10 px-2 rounded-xl bg-input border border-border text-center text-sm font-extrabold focus:border-primary/50 focus:outline-none"
                  />
                  <span className="text-xl font-bold text-primary">%</span>
                </div>
              </div>

              {/* Rule 2: Minimum Balance */}
              <div className="p-5 rounded-2xl bg-surface-light/10 border border-border/40 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase text-dim font-bold block mb-1">Minimum Wallet Balance</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">Minimum funds worker needs to accept direct booking requests</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold text-accent">PKR</span>
                  <input
                    type="number"
                    min="0"
                    value={minBalance}
                    onChange={(e) => setMinBalance(Number(e.target.value))}
                    className="w-28 h-10 px-2 rounded-xl bg-input border border-border text-center text-sm font-extrabold focus:border-primary/50 focus:outline-none"
                  />
                  <span className="text-lg font-bold text-white">₨</span>
                </div>
              </div>

              {/* Rule 3: Platform Constants */}
              <div className="p-5 rounded-2xl bg-surface-light/10 border border-border/40 space-y-2.5">
                <div>
                  <span className="text-[10px] uppercase text-dim font-bold block">Platform Region</span>
                  <div className="text-lg font-bold text-white mt-1">Pakistan (PKR ₨)</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-dim font-bold block">App Live Version</span>
                  <div className="text-lg font-bold text-white mt-1">1.0.0 (Production)</div>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
