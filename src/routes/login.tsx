import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { login } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const particleValue = (index: number, salt: number) => ((index * 73 + salt * 41) % 101) / 100;
const LOGIN_PARTICLES = Array.from({ length: 30 }, (_, index) => ({
  width: 2 + particleValue(index, 1) * 3,
  height: 2 + particleValue(index, 2) * 3,
  left: `${particleValue(index, 3) * 100}%`,
  top: `${particleValue(index, 4) * 100}%`,
  duration: 4 + particleValue(index, 5) * 6,
  delay: particleValue(index, 6) * 5,
  opacity: 0.3 + particleValue(index, 7) * 0.7,
}));

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 admin-workspace">
      {/* Aurora orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-primary/25 blur-[120px] animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[460px] w-[460px] rounded-full bg-secondary/25 blur-[140px] animate-float" style={{ animationDelay: "2s" }} />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />

      {/* Floating particles */}
      {LOGIN_PARTICLES.map((particle, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-primary/40"
          style={{
            width: particle.width,
            height: particle.height,
            left: particle.left,
            top: particle.top,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            opacity: particle.opacity,
          }}
        />
      ))}

      <div className="app-glass relative w-full max-w-md rounded-[28px] p-8 sm:p-10 animate-fade-in shadow-elev">
        {/* Animated border sheen */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] p-[1px] bg-[linear-gradient(135deg,rgba(0,245,255,0.45),transparent_40%,rgba(191,90,242,0.45))] opacity-60 [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude]" />

        <div className="flex flex-col items-center mb-6 relative">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
            <img src="/images/logo_premium.png" alt="ApnaUstad Expert Services" className="relative h-36 w-36 object-contain drop-shadow-[0_0_24px_rgba(0,245,255,0.35)]" />
          </div>
          <p className="-mt-1 text-[10px] font-bold text-gradient-aurora tracking-[0.28em]">ADMIN CONTROL CENTER</p>
        </div>

        <h1 className="font-display text-[28px] font-extrabold text-center tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground text-center mt-2 mb-8">Sign in to manage the ApnaUstad marketplace.</p>

        <form onSubmit={onSubmit} className="space-y-4 relative">
          <div>
            <label htmlFor="admin-email" className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-2 w-full h-12 px-4 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-primary/70 focus:outline-none focus:ring-3 focus:ring-primary/15 transition"
              placeholder="admin@apnaustad.pk"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Password</label>
            <div className="relative mt-2">
              <input
                id="admin-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-11 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-primary/70 focus:outline-none focus:ring-3 focus:ring-primary/15 transition"
                placeholder="••••••••"
              />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {err && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2.5">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full h-12 rounded-xl gradient-cyan text-background font-bold glow-cyan hover:brightness-110 transition flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-[11px] text-dim text-center mt-6 tracking-wider">Restricted access · Admin credentials managed internally</p>
      </div>
    </div>
  );
}
