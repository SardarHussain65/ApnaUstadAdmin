import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search, LayoutDashboard, Users, Wrench, ClipboardList, Calendar,
  FolderKanban, Star, Bell, Settings, ArrowRight, Wallet, HelpCircle,
  BarChart3, History, UserCog, Scale, Tag, Fingerprint,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

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

  const go = (to: string, params?: Record<string, string>) => () => {
    onClose();
    navigate({ to, params } as never);
  };

  const allItems: Item[] = useMemo(() => {
    const nav: Item[] = [
      { id: "n-dash", label: "Dashboard", group: "Navigate", icon: LayoutDashboard, action: go("/dashboard") },
      { id: "n-users", label: "Users", group: "Navigate", icon: Users, action: go("/users") },
      { id: "n-workers", label: "Workers", group: "Navigate", icon: Wrench, action: go("/workers") },
      { id: "n-verification", label: "Identity Reviews", group: "Navigate", icon: Fingerprint, action: go("/verification") },
      { id: "n-jobs", label: "Job Posts", group: "Navigate", icon: ClipboardList, action: go("/jobs") },
      { id: "n-bookings", label: "Bookings", group: "Navigate", icon: Calendar, action: go("/bookings") },
      { id: "n-wallets", label: "Wallets", group: "Navigate", icon: Wallet, action: go("/wallets") },
      { id: "n-cats", label: "Categories", group: "Navigate", icon: FolderKanban, action: go("/categories") },
      { id: "n-promos", label: "Promos", group: "Navigate", icon: Tag, action: go("/promos") },
      { id: "n-rev", label: "Reviews", group: "Navigate", icon: Star, action: go("/reviews") },
      { id: "n-not", label: "Notifications", group: "Navigate", icon: Bell, action: go("/notifications") },
      { id: "n-support", label: "Support", group: "Navigate", icon: HelpCircle, action: go("/support") },
      { id: "n-disputes", label: "Booking Disputes", group: "Navigate", icon: Scale, action: go("/disputes") },
      { id: "n-reports", label: "Reports & Analytics", group: "Navigate", icon: BarChart3, action: go("/reports") },
      { id: "n-audit", label: "Audit Logs", group: "Navigate", icon: History, action: go("/audit") },
      { id: "n-set", label: "Settings", group: "Navigate", icon: Settings, action: go("/settings") },
    ];
    if (user?.role === "superadmin") {
      nav.splice(nav.length - 1, 0, { id: "n-admins", label: "Admin Users", group: "Navigate", icon: UserCog, action: go("/admins") });
    }
    return nav;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allItems.slice(0, 10);
    return allItems
      .filter(i => i.label.toLowerCase().includes(term) || i.hint?.toLowerCase().includes(term))
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
            placeholder="Find an admin page..."
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
        <div className="border-t border-border bg-surface/60 px-4 py-2.5 flex items-center gap-3 text-[10px] text-dim">
          <span><kbd className="px-1.5 py-0.5 rounded border border-border">↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 rounded border border-border">↵</kbd> select</span>
          <span className="ml-auto font-semibold text-muted-foreground">ApnaUstad quick navigation</span>
        </div>
      </div>
    </div>
  );
}
