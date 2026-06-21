import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/admin/ui";
import { toast } from "sonner";
import {
  useUpdateAdminProfile,
  useChangeAdminPassword,
} from "@/lib/api-hooks";
import { Shield, Lock, Sliders, Settings2, RefreshCw } from "lucide-react";

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

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 🚀 Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-muted-foreground bg-clip-text text-transparent flex items-center gap-2">
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
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-xl font-bold text-white shadow-lg">
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

        {/* Card 3: Platform settings moved to dedicated page */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-lg text-white">Platform Configuration</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Commission rules, urgent pricing, geo matching, and payout accounts now live in the dedicated platform configuration page.
          </p>
          <Link to="/platform-config" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-background">
            Open Platform Config
          </Link>
        </div>

      </div>
    </div>
  );
}
