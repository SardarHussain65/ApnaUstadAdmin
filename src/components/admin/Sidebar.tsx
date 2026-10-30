import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, LogOut, PanelLeftClose, Pin, PinOff } from "lucide-react";
import { canAccessRoute } from "@/lib/admin-permissions";
import { NAV_GROUPS, type NavItem } from "@/lib/nav";
import { togglePinned, usePreferences } from "@/lib/preferences";
import type { AdminUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Badges = Partial<Record<NonNullable<NavItem["badgeKey"]>, number>>;

function NavLink({
  item, active, collapsed, count, pinned, onNavigate,
}: {
  item: NavItem; active: boolean; collapsed: boolean; count: number; pinned: boolean; onNavigate: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-10 items-center gap-3 rounded-xl border px-3 py-2 text-13 font-medium transition-colors",
        active
          ? "border-primary/25 bg-primary/10 text-foreground"
          : "border-transparent text-muted-foreground hover:bg-surface-light hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active-indicator"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="absolute -left-px bottom-2 top-2 w-[3px] rounded-r-full gradient-aurora"
        />
      )}
      <span className="relative shrink-0">
        <Icon className={cn("h-[18px] w-[18px]", active && "text-primary")} />
        {collapsed && count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {count > 0 && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 px-1.5 text-[10px] font-semibold tabular-nums leading-none text-destructive"
              aria-label={`${count} pending`}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}{count > 0 ? ` · ${count}` : ""}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="group/nav relative">
      {link}
      <button
        type="button"
        onClick={() => togglePinned(item.to)}
        aria-label={pinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
        title={pinned ? "Unpin" : "Pin to top"}
        className={cn(
          "absolute right-1.5 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-dim hover:bg-card hover:text-foreground focus-visible:flex group-hover/nav:flex",
          count > 0 && "right-9",
        )}
      >
        {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
      </button>
    </div>
  );
}

export function Sidebar({
  user, badges, collapsed, onToggleCollapsed, mobileOpen, onNavigate, onLogout,
}: {
  user: AdminUser | null;
  badges: Badges;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { pinned } = usePreferences();
  const navRef = useRef<HTMLElement>(null);
  const [scroll, setScroll] = useState({ top: false, bottom: false });

  // Scroll affordance: fade + "more below" cue appear only when content overflows.
  const measure = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setScroll({ top: el.scrollTop > 4, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure, collapsed, user?.role, pinned.length]);

  const visible = (item: NavItem) => !(item.superAdminOnly && user?.role !== "superadmin") && canAccessRoute(user?.role, item.to);
  const allItems = NAV_GROUPS.flatMap((g) => g.items).filter(visible);
  const pinnedItems = pinned.map((to) => allItems.find((i) => i.to === to)).filter((i): i is NavItem => !!i);
  const displayName = user?.fullName ?? user?.name ?? "Admin";
  const isActive = (to: string) => path === to || path.startsWith(`${to}/`);
  const countFor = (item: NavItem) => (item.badgeKey ? badges[item.badgeKey] ?? 0 : 0);

  const renderItem = (item: NavItem) => (
    <NavLink key={item.to} item={item} active={isActive(item.to)} collapsed={collapsed} count={countFor(item)} pinned={pinned.includes(item.to)} onNavigate={onNavigate} />
  );

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "fixed top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl transition-[width,transform] duration-200 lg:sticky",
        collapsed ? "w-[76px]" : "w-[272px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Brand: fixed height + no overflow clipping so the subtitle is never cut off */}
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-hairline px-4">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hairline bg-primary/10">
          <img src="/images/logo_premium.png" alt="ApnaUstad" className="h-10 w-10 scale-[1.3] object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[17px] font-bold tracking-tight text-foreground">ApnaUstad</div>
            <div className="mt-0.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Control Center</div>
          </div>
        )}
      </div>

      {/* Nav (scrollable) */}
      <div className="relative min-h-0 flex-1">
        <nav
          ref={navRef}
          onScroll={measure}
          className="scroll-fade-y h-full overflow-y-auto overscroll-contain px-3 py-4"
          style={{ ["--fade-top" as string]: scroll.top ? "24px" : "0px", ["--fade-bottom" as string]: scroll.bottom ? "32px" : "0px" }}
        >
          {pinnedItems.length > 0 && (
            <div className="mb-4">
              {!collapsed && <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">Pinned</div>}
              <div className="space-y-0.5">{pinnedItems.map(renderItem)}</div>
              <div className="mx-3 mt-4 border-t border-hairline" />
            </div>
          )}
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter(visible);
            if (!items.length) return null;
            return (
              <div key={group.label} className="mb-4">
                {!collapsed && <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{group.label}</div>}
                <div className="space-y-0.5">{items.map(renderItem)}</div>
              </div>
            );
          })}
        </nav>
        {scroll.bottom && (
          <button
            type="button"
            aria-label="Scroll navigation down"
            onClick={() => navRef.current?.scrollBy({ top: 200, behavior: "smooth" })}
            className="absolute bottom-1.5 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-hairline-strong bg-card text-muted-foreground shadow-card hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-hairline p-3">
        <div className={cn("flex items-center gap-3 rounded-xl border border-hairline bg-surface/60 p-2", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-purple text-sm font-bold text-white">
            {displayName[0]?.toUpperCase() ?? "A"}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-13 font-semibold text-foreground">{displayName}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{user?.role ?? "admin"}</div>
              </div>
              <button type="button" onClick={onLogout} aria-label="Log out" title="Log out" className="icon-button h-8 w-8 hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg p-2 text-xs font-medium text-muted-foreground transition hover:bg-surface-light hover:text-foreground lg:flex"
        >
          <PanelLeftClose className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
