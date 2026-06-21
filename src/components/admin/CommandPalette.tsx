import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search, LayoutDashboard, Users, Wrench, ClipboardList, Calendar,
  FolderKanban, Star, Bell, Settings, ArrowRight, Wallet, HelpCircle,
  BarChart3, History, UserCog, Scale, Tag, Fingerprint, Banknote, Layers, Route,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { canAccessRoute } from "@/lib/admin-permissions";

type Item = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => { if (open) { setQ(""); setActive(0); } }, [open]);

  const go = (to: string) => () => {
    onClose();
    navigate({ to } as never);
  };

  const allItems: Item[] = useMemo(() => {
    const nav: Item[] = [
      { id: "n-dash", label: "Dashboard", group: "Navigate", icon: LayoutDashboard, action: go("/dashboard") },
      { id: "n-users", label: "Customers", group: "Navigate", icon: Users, action: go("/users") },
      { id: "n-workers", label: "Professionals", group: "Navigate", icon: Wrench, action: go("/workers") },
      { id: "n-onboarding", label: "Onboarding Queue", group: "Navigate", icon: Route, action: go("/onboarding") },
      { id: "n-verification", label: "Identity Reviews", group: "Navigate", icon: Fingerprint, action: go("/verification") },
      { id: "n-specialty", label: "Specialty Requests", group: "Navigate", icon: Layers, action: go("/specialty-requests") },
      { id: "n-jobs", label: "Job Posts", group: "Navigate", icon: ClipboardList, action: go("/jobs") },
      { id: "n-bookings", label: "Bookings", group: "Navigate", icon: Calendar, action: go("/bookings") },
      { id: "n-payments", label: "Payments Ledger", group: "Navigate", icon: Banknote, action: go("/payments") },
      { id: "n-wallets", label: "Wallets", group: "Navigate", icon: Wallet, action: go("/wallets") },
      { id: "n-cats", label: "Services", group: "Navigate", icon: FolderKanban, action: go("/categories") },
      { id: "n-promos", label: "Promotions", group: "Navigate", icon: Tag, action: go("/promos") },
      { id: "n-rev", label: "Reviews", group: "Navigate", icon: Star, action: go("/reviews") },
      { id: "n-not", label: "Notifications", group: "Navigate", icon: Bell, action: go("/notifications") },
      { id: "n-support", label: "Support Desk", group: "Navigate", icon: HelpCircle, action: go("/support") },
      { id: "n-disputes", label: "Booking Disputes", group: "Navigate", icon: Scale, action: go("/disputes") },
      { id: "n-reports", label: "Reports & Analytics", group: "Navigate", icon: BarChart3, action: go("/reports") },
      { id: "n-audit", label: "Audit Logs", group: "Navigate", icon: History, action: go("/audit") },
      { id: "n-platform", label: "Platform Configuration", group: "Navigate", icon: Settings, action: go("/platform-config") },
      { id: "n-set", label: "My Settings", group: "Navigate", icon: Settings, action: go("/settings") },
      { id: "q-topups", label: "Pending wallet top-ups", hint: "Finance queue", group: "Queues", icon: Wallet, action: go("/wallets") },
      { id: "q-verification", label: "Pending identity reviews", hint: "Verifier queue", group: "Queues", icon: Fingerprint, action: go("/verification") },
      { id: "q-specialty", label: "Pending specialty requests", hint: "Verifier queue", group: "Queues", icon: Layers, action: go("/specialty-requests") },
      { id: "q-support", label: "Open support tickets", hint: "Support queue", group: "Queues", icon: HelpCircle, action: go("/support") },
      { id: "q-disputes", label: "Open booking disputes", hint: "Ops queue", group: "Queues", icon: Scale, action: go("/disputes") },
    ];
    if (user?.role === "superadmin") {
      nav.splice(nav.length - 6, 0, { id: "n-admins", label: "Admin Users", group: "Navigate", icon: UserCog, action: go("/admins") });
    }
    return nav.filter((item) => {
      const path = item.action.toString();
      void path;
      const route = item.id.startsWith("q-")
        ? item.action
        : go;
      const target = {
        "n-dash": "/dashboard", "n-users": "/users", "n-workers": "/workers", "n-onboarding": "/onboarding",
        "n-verification": "/verification", "n-specialty": "/specialty-requests", "n-jobs": "/jobs",
        "n-bookings": "/bookings", "n-payments": "/payments", "n-wallets": "/wallets", "n-cats": "/categories",
        "n-promos": "/promos", "n-rev": "/reviews", "n-not": "/notifications", "n-support": "/support",
        "n-disputes": "/disputes", "n-reports": "/reports", "n-audit": "/audit", "n-platform": "/platform-config",
        "n-set": "/settings", "n-admins": "/admins", "q-topups": "/wallets", "q-verification": "/verification",
        "q-specialty": "/specialty-requests", "q-support": "/support", "q-disputes": "/disputes",
      }[item.id];
      return target ? canAccessRoute(user?.role, target) : true;
    });
  }, [user?.role]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allItems.slice(0, 12);
    return allItems
      .filter(i => i.label.toLowerCase().includes(term) || i.hint?.toLowerCase().includes(term) || i.group.toLowerCase().includes(term))
      .slice(0, 30);
  }, [q, allItems]);

  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); filtered[active]?.action(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  if (!open) return null;

  const groups = filtered.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.group] ??= []).push(it); return acc;
  }, {});

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/72 px-4 pt-20 backdrop-blur-sm animate-fade-in sm:pt-24" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Admin page finder" onClick={e => e.stopPropagation()} className="app-glass w-full max-w-2xl overflow-hidden rounded-[20px] shadow-2xl">
        <div className="flex h-16 items-center gap-3 border-b border-border bg-white/[0.025] px-4">
          <Search className="w-4 h-4 text-primary" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Find a page or queue..."
            className="flex-1 border-0! bg-transparent! text-sm outline-none! ring-0! shadow-none! placeholder:text-dim"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">No results for "{q}"</div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-2">
              <div className="px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-dim font-bold">{group}</div>
              {items.map(it => {
                const itemIndex = ++runningIndex;
                const isActive = itemIndex === active;
                const Icon = it.icon;
                return (
                  <button
                    key={it.id}
                    onMouseEnter={() => setActive(itemIndex)}
                    onClick={it.action}
                    className={`mx-2 flex w-[calc(100%_-_1rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      isActive ? "bg-primary/10 text-primary" : "text-foreground/90 hover:bg-surface-light/60"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{it.label}</div>
                      {it.hint && <div className="text-[11px] text-muted-foreground truncate">{it.hint}</div>}
                    </div>
                    {isActive && <ArrowRight className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
