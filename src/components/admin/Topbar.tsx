import { Link, useNavigate } from "@tanstack/react-router";
import type { ComponentType } from "react";
import {
  Bell, ChevronRight, Fingerprint, HelpCircle, Layers, LogOut, Menu, Monitor, Moon, Rows3, Scale, Search,
  Settings, Sparkles, Sun, Wallet, User as UserIcon,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { findNav, findPageMeta } from "@/lib/nav";
import {
  setPreferences, usePreferences, type Density, type EffectsPreference, type ThemePreference,
} from "@/lib/preferences";
import type { AdminUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Badges {
  pendingVerifications: number; openDisputes: number; pendingTopUps: number; openTickets: number; pendingSpecialties: number;
}

const ACTION_ROWS: Array<{
  key: keyof Badges; to: string; title: string; unit: string; icon: ComponentType<{ className?: string }>; tone: string;
}> = [
  { key: "pendingVerifications", to: "/verification", title: "Identity reviews", unit: "waiting for review", icon: Fingerprint, tone: "bg-accent/10 text-accent" },
  { key: "pendingSpecialties", to: "/specialty-requests", title: "Specialty requests", unit: "awaiting approval", icon: Layers, tone: "bg-secondary/10 text-secondary" },
  { key: "pendingTopUps", to: "/wallets", title: "Wallet top-ups", unit: "deposits in queue", icon: Wallet, tone: "bg-success/10 text-success" },
  { key: "openDisputes", to: "/disputes", title: "Open disputes", unit: "need resolution", icon: Scale, tone: "bg-destructive/10 text-destructive" },
  { key: "openTickets", to: "/support", title: "Support tickets", unit: "unresolved", icon: HelpCircle, tone: "bg-primary/10 text-primary" },
];

export function Topbar({
  user, path, badges, onOpenNav, onOpenPalette, onLogout,
}: {
  user: AdminUser | null;
  path: string;
  badges: Badges;
  onOpenNav: () => void;
  onOpenPalette: () => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const prefs = usePreferences();
  const [bellOpen, setBellOpen] = useState(false);
  const meta = findPageMeta(path);
  const { group, item } = findNav(path);
  const displayName = user?.fullName ?? user?.name ?? "Admin";
  const total = ACTION_ROWS.reduce((sum, r) => sum + (badges[r.key] ?? 0), 0);
  const ThemeIcon = prefs.theme === "light" ? Sun : prefs.theme === "dark" ? Moon : Monitor;
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="glass sticky top-0 z-20 flex min-h-[72px] items-center gap-3 border-x-0 border-t-0 px-4 lg:gap-4 lg:px-7">
      <button type="button" aria-label="Open navigation" className="icon-button lg:hidden" onClick={onOpenNav}>
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
          <Link to="/dashboard" className="hover:text-foreground">Admin</Link>
          {group && (<><ChevronRight className="h-3 w-3" aria-hidden="true" /><span>{group.label}</span></>)}
          {item && path !== item.to && (
            <>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <Link to={item.to} className="hover:text-foreground">{item.label}</Link>
            </>
          )}
        </nav>
        <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight lg:text-xl">{meta.title}</h1>
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Open command palette"
        className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-hairline bg-surface/60 px-3 text-left transition hover:border-primary/40 md:flex xl:w-72"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-xs text-muted-foreground">Search or jump to…</span>
        <kbd className="rounded border border-hairline-strong bg-card px-1.5 py-0.5 font-mono-ids text-[10px] text-muted-foreground">{isMac ? "⌘" : "Ctrl"} K</kbd>
      </button>

      {/* Notification centre (Action Center summary; full live centre lands in phase 6) */}
      <Popover open={bellOpen} onOpenChange={setBellOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={total > 0 ? `Notifications: ${total} items need attention` : "Notifications: all caught up"}
            className={cn("icon-button relative", bellOpen && "bg-surface-light text-foreground")}
          >
            <Bell className="h-5 w-5" />
            {total > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none tabular-nums text-destructive-foreground">
                {total > 99 ? "99+" : total}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 border-hairline-strong bg-card p-0 shadow-elev">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold"><Bell className="h-4 w-4 text-primary" /> Needs attention</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">{total}</span>
          </div>
          <div className="space-y-0.5 p-2">
            {ACTION_ROWS.filter((r) => (badges[r.key] ?? 0) > 0).map((r) => {
              const Icon = r.icon;
              return (
                <Link key={r.key} to={r.to} onClick={() => setBellOpen(false)} className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-light">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", r.tone)}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-13 font-semibold">{r.title}</span>
                    <span className="block text-xs text-muted-foreground"><span className="tabular-nums">{badges[r.key]}</span> {r.unit}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-dim transition group-hover:translate-x-0.5" />
                </Link>
              );
            })}
            {total === 0 && <div className="py-8 text-center text-sm text-muted-foreground">All caught up. No pending items.</div>}
          </div>
        </PopoverContent>
      </Popover>

      {/* Theme */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="icon-button" aria-label={`Theme: ${prefs.theme}`} title="Theme">
            <ThemeIcon className="h-[18px] w-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 border-hairline-strong bg-card">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={prefs.theme} onValueChange={(v) => setPreferences({ theme: v as ThemePreference })}>
            <DropdownMenuRadioItem value="light"><Sun className="mr-2 h-4 w-4" /> Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><Moon className="mr-2 h-4 w-4" /> Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system"><Monitor className="mr-2 h-4 w-4" /> System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Account menu" className="flex h-9 w-9 items-center justify-center rounded-xl gradient-purple text-sm font-bold text-white shadow-card">
            {displayName[0]?.toUpperCase() ?? "A"}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 border-hairline-strong bg-card">
          <DropdownMenuLabel>
            <div className="truncate text-sm font-semibold text-foreground">{displayName}</div>
            <div className="truncate text-xs font-normal text-muted-foreground">{user?.email}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-primary">{user?.role}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}><UserIcon className="mr-2 h-4 w-4" /> My settings</DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground"><Rows3 className="h-3.5 w-3.5" /> Table density</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={prefs.density} onValueChange={(v) => setPreferences({ density: v as Density })}>
            <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground"><Settings className="h-3.5 w-3.5" /> Visual effects</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={prefs.effects} onValueChange={(v) => setPreferences({ effects: v as EffectsPreference })}>
            <DropdownMenuRadioItem value="auto">Auto (reduce on low-end)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="on">Always on</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="off">Reduce visual effects</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" /> Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
