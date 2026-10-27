import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { login, getToken } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AuroraBackground } from "@/components/admin/AuroraBackground";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const REMEMBER_KEY = "au-remember-email";

function loginErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return "Too many sign-in attempts. Please wait a few minutes before trying again.";
    if (e.status === 401 || e.status === 400) return e.message || "Incorrect email or password.";
    if (e.status >= 500) return "The server had a problem. Please try again shortly.";
  }
  if (e instanceof TypeError) return "Can’t reach the server. Check your connection and try again.";
  return e instanceof Error ? e.message : "Sign-in failed. Please try again.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (getToken()) {
      navigate({ to: "/dashboard" });
      return;
    }
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      if (remember) window.localStorage.setItem(REMEMBER_KEY, email.trim());
      else window.localStorage.removeItem(REMEMBER_KEY);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch (error) {
      const message = loginErrorMessage(error);
      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-workspace relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <AuroraBackground variant="hero" />

      <motion.main
        initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="app-glass relative z-10 w-full max-w-md rounded-3xl p-8 shadow-elev sm:p-10"
      >
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_35%,transparent),transparent_40%,color-mix(in_oklab,var(--secondary)_35%,transparent))] p-px opacity-60 [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude]" />

        <div className="relative mb-6 flex flex-col items-center">
          <div className="fx-float relative">
            <div className="absolute inset-0 rounded-full bg-primary/25 blur-2xl" aria-hidden="true" />
            <img src="/images/logo_premium.png" alt="ApnaUstad — Har Kaam Ka Ustad" className="relative h-32 w-32 object-contain drop-shadow-[0_8px_24px_rgba(0,245,255,0.3)]" />
          </div>
          <p className="-mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Admin Control Center</p>
        </div>

        <h1 className="text-center text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mb-8 mt-2 text-center text-sm text-muted-foreground">Sign in to manage the ApnaUstad marketplace.</p>

        <form onSubmit={onSubmit} className="relative space-y-4" noValidate>
          <div>
            <label htmlFor="admin-email" className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!err}
              className="mt-1.5 h-12 w-full bg-surface/60 px-4 text-sm"
              placeholder="admin@apnaustad.pk"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-xs font-medium text-muted-foreground">Password</label>
            <div className="relative mt-1.5">
              <input
                id="admin-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!err}
                className="h-12 w-full bg-surface/60 px-4 pr-11 text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-13 text-muted-foreground">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            Remember my email on this device
          </label>

          {err && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-press glow-cyan mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl gradient-cyan font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-dim">
          <ShieldCheck className="h-3.5 w-3.5" /> Restricted access · Admin credentials managed internally
        </p>
      </motion.main>
    </div>
  );
}
