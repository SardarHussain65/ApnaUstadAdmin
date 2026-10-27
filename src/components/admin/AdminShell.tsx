import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { logout, useAuth } from "@/lib/auth";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { AuroraBackground } from "@/components/admin/AuroraBackground";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { useNavBadges } from "@/lib/api-hooks";

/**
 * AppShell = AuroraBackground + Sidebar + Topbar + animated content outlet.
 * Navigation config lives in `lib/nav.ts`; preferences in `lib/preferences.ts`.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const badges = useNavBadges();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [path]);

  useEffect(() => {
    const onUnauthorized = () => navigate({ to: "/login" });
    window.addEventListener("admin:unauthorized", onUnauthorized);
    return () => window.removeEventListener("admin:unauthorized", onUnauthorized);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="admin-workspace flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-card px-3 py-2 text-sm font-semibold text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <AuroraBackground />

      <Sidebar
        user={user}
        badges={badges}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" aria-hidden="true" onClick={() => setMobileOpen(false)} />}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          path={path}
          badges={badges}
          onOpenNav={() => setMobileOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onLogout={handleLogout}
        />
        <main id="main-content" className="admin-content flex-1 p-4 sm:p-5 lg:p-7 xl:p-8">
          {/* Page transition: 180ms fade/slide, keyed by route. No exit phase so navigation never feels slower. */}
          <motion.div
            key={path}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
