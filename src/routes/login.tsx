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
      <div className="absolute inset-0 gradient-glow opacity-50 pointer-events-none" />

      <div className="app-glass relative w-full max-w-md rounded-3xl p-8 animate-fade-in">
        <div className="flex flex-col items-center mb-7">
          <img src="/images/logo_premium.png" alt="ApnaUstad Expert Services" className="h-40 w-40 object-contain drop-shadow-[0_0_22px_rgba(0,245,255,0.2)]" />
          <p className="-mt-2 text-[10px] font-bold text-primary tracking-[0.22em]">ADMIN CONTROL CENTER</p>
        </div>

        <h1 className="text-2xl font-extrabold text-center">Welcome back</h1>
        <p className="text-sm text-muted-foreground text-center mt-1 mb-8">Sign in to manage the ApnaUstad marketplace.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1.5 w-full h-12 px-4 rounded-xl bg-input border border-border focus:border-primary focus:outline-none focus:glow-cyan transition"
              placeholder="admin@apnaustad.pk"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
            <div className="relative mt-1.5">
              <input
                id="admin-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-11 rounded-xl bg-input border border-border focus:border-primary focus:outline-none focus:glow-cyan transition"
                placeholder="••••••••"
              />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
