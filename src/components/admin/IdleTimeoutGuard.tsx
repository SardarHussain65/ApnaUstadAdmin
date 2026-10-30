import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldAlert, Clock, LogOut, RefreshCw } from "lucide-react";
import { logout } from "@/lib/auth";
import { toast } from "sonner";

// Default idle timeout: 20 minutes
const IDLE_LIMIT_MS = 20 * 60 * 1000;
// Warning countdown: 60 seconds
const COUNTDOWN_SECONDS = 60;

export function IdleTimeoutGuard() {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(COUNTDOWN_SECONDS);
  const lastActivityRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<any>(null);

  const handleLogout = useCallback(() => {
    setShowWarning(false);
    logout();
    toast.error("Session closed due to inactivity for security compliance");
    navigate({ to: "/login" });
  }, [navigate]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setRemainingSeconds(COUNTDOWN_SECONDS);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      toast.success("Admin session extended");
    }
  }, [showWarning]);

  // Activity listeners
  useEffect(() => {
    const handleActivity = () => {
      // Only reset activity timestamp if warning modal is not active
      if (!showWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    // Check inactivity every 10 seconds
    const interval = setInterval(() => {
      if (!showWarning) {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= IDLE_LIMIT_MS) {
          setShowWarning(true);
          setRemainingSeconds(COUNTDOWN_SECONDS);
        }
      }
    }, 10_000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearInterval(interval);
    };
  }, [showWarning]);

  // Countdown timer when warning modal is active
  useEffect(() => {
    if (showWarning) {
      countdownIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showWarning, handleLogout]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-5 animate-scale-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive glow-red shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Inactivity Security Warning</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enterprise security timeout policy
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-light border border-hairline space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your admin console has been idle. To protect customer PII and financial operations data, your session will be locked automatically:
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="font-mono text-3xl font-extrabold text-amber-400 tabular-nums">
              00:{remainingSeconds.toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end pt-2">
          <button
            onClick={handleLogout}
            className="flex-1 h-11 rounded-xl border border-border hover:bg-surface-light text-muted-foreground hover:text-white font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Lock & Sign Out</span>
          </button>

          <button
            onClick={resetTimer}
            className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/95 text-background font-bold text-xs transition shadow-cyan-glow flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Stay Logged In</span>
          </button>
        </div>
      </div>
    </div>
  );
}
