import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Wrench, Loader2 } from "lucide-react";
import { login } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@apnaustad.com");
  const [password, setPassword] = useState("Admin@123");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back, Admin!");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 gradient-cosmic">
      {/* Floating particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-primary/40"
          style={{
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
            opacity: 0.3 + Math.random() * 0.7,
          }}
        />
      ))}
      <div className="absolute inset-0 gradient-glow opacity-50 pointer-events-none" />

      <div className="relative w-full max-w-md glass rounded-3xl p-8 shadow-card animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-cyan flex items-center justify-center glow-cyan mb-4">
            <Wrench className="w-8 h-8 text-background" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-gradient-cyan">ApnaUstad</h1>
          <p className="text-xs text-muted-foreground tracking-wider mt-1">PAKISTAN'S PREMIER HOME SERVICES</p>
        </div>

        <h2 className="text-2xl font-bold text-center">Admin Portal</h2>
        <p className="text-sm text-muted-foreground text-center mt-1 mb-8">Sign in to manage the platform</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1.5 w-full h-12 px-4 rounded-xl bg-input border border-border focus:border-primary focus:outline-none focus:glow-cyan transition"
              placeholder="admin@apnaustad.pk"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
            <div className="relative mt-1.5">
              <input
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-11 rounded-xl bg-input border border-border focus:border-primary focus:outline-none focus:glow-cyan transition"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {err && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2.5">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full h-12 rounded-xl gradient-cyan text-background font-bold glow-cyan hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-[11px] text-dim text-center mt-6">Restricted access · Admin credentials managed internally</p>
      </div>
    </div>
  );
}
