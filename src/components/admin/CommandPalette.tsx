import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search, LayoutDashboard, Users, Wrench, ClipboardList, Calendar,
  FolderKanban, Star, Bell, Settings, ArrowRight,
} from "lucide-react";
import { users, workers, bookings, jobs } from "@/lib/mock-data";

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
      { id: "n-jobs", label: "Job Posts", group: "Navigate", icon: ClipboardList, action: go("/jobs") },
      { id: "n-bookings", label: "Bookings", group: "Navigate", icon: Calendar, action: go("/bookings") },
      { id: "n-cats", label: "Categories", group: "Navigate", icon: FolderKanban, action: go("/categories") },
      { id: "n-rev", label: "Reviews", group: "Navigate", icon: Star, action: go("/reviews") },
      { id: "n-not", label: "Notifications", group: "Navigate", icon: Bell, action: go("/notifications") },
      { id: "n-set", label: "Settings", group: "Navigate", icon: Settings, action: go("/settings") },
    ];
    const w: Item[] = workers.map(x => ({
      id: "w-" + x.id, label: x.name, hint: `${x.id} · ${x.category} · ${x.city}`,
      group: "Workers", icon: Wrench, action: go("/workers/$id", { id: x.id }),
    }));
    const u: Item[] = users.map(x => ({
      id: "u-" + x.id, label: x.name, hint: `${x.id} · ${x.city}`,
      group: "Users", icon: Users, action: go("/users"),
    }));
    const b: Item[] = bookings.map(x => ({
      id: "b-" + x.id, label: x.id, hint: `${x.customerName} → ${x.workerName}`,
      group: "Bookings", icon: Calendar, action: go("/bookings"),
    }));
    const j: Item[] = jobs.map(x => ({
      id: "j-" + x.id, label: x.id, hint: `${x.customerName} · ${x.category}`,
      group: "Jobs", icon: ClipboardList, action: go("/jobs"),
    }));
    return [...nav, ...w, ...u, ...b, ...j];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4 animate-fade-in" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden glow-cyan">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Search className="w-4 h-4 text-primary" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search workers, users, bookings, pages..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-dim"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">No results for "{q}"</div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-2">
              <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{group}</div>
              {items.map(it => {
                runningIndex++;
                const isActive = runningIndex === active;
                const Icon = it.icon;
                return (
                  <button
                    key={it.id}
                    onMouseEnter={() => setActive(runningIndex)}
                    onClick={it.action}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                      isActive ? "bg-[rgba(0,245,255,0.08)] text-primary" : "hover:bg-surface-light/60"
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
        <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span><kbd className="px-1.5 py-0.5 rounded border border-border">↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 rounded border border-border">↵</kbd> select</span>
          <span className="ml-auto">ApnaUstad Command</span>
        </div>
      </div>
    </div>
  );
}
