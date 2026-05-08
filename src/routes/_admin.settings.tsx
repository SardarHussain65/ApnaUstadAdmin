import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/admin/ui";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [cur, setCur] = useState(""); const [npw, setNpw] = useState(""); const [conf, setConf] = useState("");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
        <h3 className="font-bold text-lg mb-1">Admin Profile</h3>
        <p className="text-sm text-muted-foreground mb-4">Manage your account details</p>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full gradient-purple flex items-center justify-center text-2xl font-bold">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="font-bold">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
            <div className="mt-1"><Badge variant={user?.role === "superadmin" ? "purple" : "info"}>{user?.role}</Badge></div>
          </div>
        </div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Display Name</label>
        <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none" />
        <button onClick={() => toast.success("Profile updated")} className="btn-press mt-4 w-full h-11 rounded-xl gradient-cyan text-background font-bold glow-cyan">Save Changes</button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
        <h3 className="font-bold text-lg mb-1">Change Password</h3>
        <p className="text-sm text-muted-foreground mb-4">Use a strong password</p>
        <div className="space-y-3">
          <input value={cur} onChange={e=>setCur(e.target.value)} type="password" placeholder="Current password" className="w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none" />
          <input value={npw} onChange={e=>setNpw(e.target.value)} type="password" placeholder="New password" className="w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none" />
          <input value={conf} onChange={e=>setConf(e.target.value)} type="password" placeholder="Confirm new password" className="w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none" />
          <button onClick={() => {
            if (npw !== conf) return toast.error("Passwords don't match");
            if (npw.length < 6) return toast.error("Password too short");
            setCur(""); setNpw(""); setConf("");
            toast.success("Password changed");
          }} className="btn-press w-full h-11 rounded-xl gradient-purple text-white font-bold glow-purple">Update Password</button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-card lg:col-span-2">
        <h3 className="font-bold text-lg mb-4">Platform Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground font-semibold">Platform Fee</div><div className="mt-1 text-2xl font-extrabold text-primary">10%</div></div>
          <div className="p-4 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground font-semibold">App Version</div><div className="mt-1 text-2xl font-extrabold">1.0.0</div></div>
          <div className="p-4 rounded-xl bg-surface-light"><div className="text-[10px] uppercase text-muted-foreground font-semibold">Currency</div><div className="mt-1 text-2xl font-extrabold text-accent">PKR ₨</div></div>
        </div>
      </div>
    </div>
  );
}
