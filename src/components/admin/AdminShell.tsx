import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Wrench, ClipboardList, Calendar, FolderKanban,
  Star, Bell, Settings, LogOut, Search, Wallet,
  HelpCircle, BarChart3, History, UserCog, Scale, Tag, Fingerprint, Menu,
  PanelLeftClose, Sparkles, Layers, Banknote, Route
} from "lucide-react";
import { logout, useAuth } from "@/lib/auth";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { useNavBadges } from "@/lib/api-hooks";
import { canAccessRoute, type AdminPermission } from "@/lib/admin-permissions";

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "A live view of marketplace health and priority work." },
  "/users": { title: "Customers", description: "Manage customer accounts, access, and booking activity." },
  "/workers": { title: "Service Professionals", description: "Review worker profiles, availability, and performance." },
  "/onboarding": { title: "Onboarding Pipeline", description: "Track worker verification, specialty, and wallet readiness." },
  "/verification": { title: "Identity Reviews", description: "Audit submitted documents and approve trusted professionals." },
  "/specialty-requests": { title: "Specialty Requests", description: "Approve paid category add-ons requested by workers." },
  "/jobs": { title: "Job Posts", description: "Monitor customer requests, bids, and marketplace fulfillment." },
  "/bookings": { title: "Bookings", description: "Track service delivery, payments, and booking outcomes." },
  "/payments": { title: "Payments Ledger", description: "Reconcile cash payments, commissions, and worker earnings." },
  "/wallets": { title: "Wallets & Commission", description: "Manage balances, top-ups, and platform commission rules." },
  "/categories": { title: "Services", description: "Manage service types customers can book — Plumber, Electrician, AC repair, and more." },
  "/reviews": { title: "Reviews & Ratings", description: "Moderate feedback and monitor service quality." },
  "/notifications": { title: "Notifications", description: "Compose targeted announcements and review delivery history." },
  "/support": { title: "Support Desk", description: "Resolve customer and professional support requests." },
  "/disputes": { title: "Booking Disputes", description: "Investigate conflicts and record fair resolutions." },
  "/reports": { title: "Reports & Analytics", description: "Explore revenue, demand, and marketplace performance." },
  "/audit": { title: "Audit Trail", description: "Review administrative actions and system events." },
  "/admins": { title: "Admin Access", description: "Control administrative accounts and permissions." },
  "/promos": { title: "Promotions", description: "Create offers and manage checkout incentives." },
  "/settings": { title: "Settings", description: "Update your account and platform operating rules." },
  "/platform-config": { title: "Platform Configuration", description: "Manage commission, urgent pricing, and geo matching rules." },
};

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: AdminPermission;
  superAdminOnly?: boolean;
};

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
      { to: "/reports", label: "Reports & Analytics", icon: BarChart3, permission: "reports" },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/users", label: "Customers", icon: Users, permission: "users" },
      { to: "/workers", label: "Professionals", icon: Wrench, permission: "workers" },
      { to: "/onboarding", label: "Onboarding Queue", icon: Route, permission: "onboarding" },
      { to: "/verification", label: "Identity Reviews", icon: Fingerprint, permission: "verification" },
      { to: "/specialty-requests", label: "Specialty Requests", icon: Layers, permission: "specialty-requests" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/jobs", label: "Job Posts", icon: ClipboardList, permission: "jobs" },
      { to: "/bookings", label: "Bookings", icon: Calendar, permission: "bookings" },
      { to: "/disputes", label: "Disputes", icon: Scale, permission: "disputes" },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/payments", label: "Payments", icon: Banknote, permission: "payments" },
      { to: "/wallets", label: "Wallets & Top-ups", icon: Wallet, permission: "wallets" },
      { to: "/promos", label: "Promotions", icon: Tag, permission: "promos" },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/categories", label: "Services", icon: FolderKanban, permission: "categories" },
      { to: "/reviews", label: "Reviews", icon: Star, permission: "reviews" },
      { to: "/notifications", label: "Notifications", icon: Bell, permission: "notifications" },
      { to: "/platform-config", label: "Platform Config", icon: Settings, permission: "platform-config" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/support", label: "Support Desk", icon: HelpCircle, permission: "support" },
      { to: "/audit", label: "Audit Trail", icon: History, permission: "audit" },
      { to: "/admins", label: "Admin Access", icon: UserCog, permission: "admins", superAdminOnly: true },
      { to: "/settings", label: "My Settings", icon: Settings, permission: "settings" },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const path = useRouterState({ select: s => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.fullName ?? user?.name ?? "Admin";
  const pageMeta = Object.entries(PAGE_META).find(([k]) => path.startsWith(k))?.[1] ?? {
    title: "ApnaUstad Admin",
    description: "Manage your marketplace with confidence.",
  };

  const badges = useNavBadges();

  // Map nav routes to badge counts
  const badgeMap: Record<string, number> = {
    "/support": badges.openTickets,
    "/jobs": badges.openJobs,
    "/bookings": badges.pendingBookings,
    "/workers": badges.unverifiedWorkers,
    "/onboarding": badges.unverifiedWorkers,
    "/verification": badges.pendingVerifications,
    "/specialty-requests": badges.pendingSpecialties,
    "/wallets": badges.pendingTopUps,
    "/disputes": badges.openDisputes,
  };

  const totalBadge = badges.openTickets + badges.pendingTopUps + badges.openDisputes + badges.pendingVerifications + badges.pendingSpecialties;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowNotifications(false);
  }, [path]);

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
    <div className="min-h-screen flex admin-workspace">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen bg-[linear-gradient(180deg,rgba(10,10,30,0.96),rgba(6,6,20,0.96))] border-r border-white/[0.06] backdrop-blur-2xl shadow-[8px_0_40px_rgba(0,0,0,0.4)] flex flex-col transition-all duration-300 ${
          collapsed ? "w-[80px]" : "w-[280px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Top accent line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {/* Logo */}
        <div className="h-[80px] flex items-center px-4 border-b border-white/[0.05]">
          <div className="relative w-12 h-12 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(0,245,255,0.12),rgba(191,90,242,0.10))] flex items-center justify-center flex-shrink-0 shadow-[0_0_18px_rgba(0,245,255,0.18)] overflow-hidden">
            <img src="/images/logo_premium.png" alt="ApnaUstad" className="w-12 h-12 object-contain scale-[1.32]" />
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <div className="font-display font-extrabold text-[17px] leading-tight tracking-tight text-white">ApnaUstad</div>
              <div className="mt-1 text-[9px] font-bold text-gradient-aurora tracking-[0.24em]">CONTROL CENTER</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-5">
              {!collapsed && <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-dim">{group.label}</div>}
              <div className="space-y-1">
                {group.items.map(item => {
                  if (item.superAdminOnly && user?.role !== "superadmin") return null;
                  if (!canAccessRoute(user?.role, item.to)) return null;
                  const active = path.startsWith(item.to);
                  const Icon = item.icon;
                  const count = badgeMap[item.to] ?? 0;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 border ${
                        active
                          ? "bg-[linear-gradient(135deg,rgba(0,245,255,0.14),rgba(191,90,242,0.10))] text-white border-primary/30 shadow-[0_0_22px_rgba(0,245,255,0.16)]"
                          : "border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground hover:border-white/[0.06]"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full gradient-aurora shadow-[0_0_12px_rgba(0,245,255,0.6)]" />}
                      <span className="relative flex-shrink-0">
                        <Icon className={`w-[18px] h-[18px] transition ${active ? "text-primary" : "group-hover:text-foreground"}`} />
                        {collapsed && count > 0 && (
                          <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center leading-none shadow">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="truncate flex-1">{item.label}</span>
                          {count > 0 && (
                            <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-destructive/15 border border-destructive/30 text-destructive text-[10px] font-bold flex items-center justify-center leading-none">
                              {count > 99 ? "99+" : count}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className={`flex items-center gap-3 p-2 rounded-xl border border-sidebar-border bg-white/[0.035] ${collapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-xl gradient-purple flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg">
              {displayName[0]?.toUpperCase() ?? "A"}
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-semibold truncate">{displayName}</div>
                <div className="text-[10px] uppercase tracking-wider text-secondary">{user?.role ?? "admin"}</div>
              </div>
            )}
            {!collapsed && (
              <button onClick={handleLogout} aria-label="Log out" className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            className="hidden lg:flex w-full mt-3 items-center justify-center gap-2 p-2 rounded-lg text-muted-foreground hover:bg-surface-light hover:text-foreground transition text-xs font-semibold"
          >
            <PanelLeftClose className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span>Collapse navigation</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" aria-hidden="true" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 min-h-[76px] glass flex items-center px-4 lg:px-7 gap-3 lg:gap-4 relative">
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <button aria-label="Open navigation" className="icon-button lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-bold text-primary">
              <Sparkles className="w-3 h-3" /> Admin workspace
            </div>
            <h1 className="mt-1 font-display text-[18px] lg:text-[22px] font-extrabold tracking-tight truncate">{pageMeta.title}</h1>
            <p className="hidden xl:block mt-0.5 text-xs text-muted-foreground truncate">{pageMeta.description}</p>
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 h-10 w-64 xl:w-72 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-primary/45 hover:bg-primary/[0.05] transition text-left"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs flex-1 text-muted-foreground">Quick navigation...</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-muted-foreground">⌘K</kbd>
          </button>
          
          {/* Notification Popover Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Open action center"
              className={`relative icon-button ${
                showNotifications ? "bg-surface-light text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Notification Center"
            >
              <Bell className="w-5 h-5" />
              {totalBadge > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center leading-none animate-pulse shadow">
                  {totalBadge > 99 ? "99+" : totalBadge}
                </span>
              ) : (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-success" />
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-30" aria-hidden="true" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-2.5 w-80 overlay-panel rounded-[22px] p-4 z-40 animate-fade-in divide-y divide-white/8">
                  <div className="pb-3 flex items-center justify-between">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-primary" /> Action Center
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                      {totalBadge} Pending
                    </span>
                  </div>
                  
                  <div className="py-2.5 space-y-2">
                    {badges.pendingVerifications > 0 && (
                      <Link
                        to="/verification"
                        onClick={() => setShowNotifications(false)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-light/40 transition group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20">
                          <Fingerprint className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-primary transition truncate">Worker Reviews</div>
                          <div className="text-[10px] text-dim">{badges.pendingVerifications} verification requests</div>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                      </Link>
                    )}

                    {badges.openDisputes > 0 && (
                      <Link
                        to="/disputes"
                        onClick={() => setShowNotifications(false)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-light/40 transition group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20">
                          <Scale className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-primary transition truncate">Active Disputes</div>
                          <div className="text-[10px] text-dim">{badges.openDisputes} disputes waiting resolve</div>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
                      </Link>
                    )}

                    {badges.pendingTopUps > 0 && (
                      <Link
                        to="/wallets"
                        onClick={() => setShowNotifications(false)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-light/40 transition group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center flex-shrink-0 group-hover:bg-success/20">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-primary transition truncate">Pending Top-Ups</div>
                          <div className="text-[10px] text-dim">{badges.pendingTopUps} deposits in queue</div>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                      </Link>
                    )}

                    {badges.openTickets > 0 && (
                      <Link
                        to="/support"
                        onClick={() => setShowNotifications(false)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-light/40 transition group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-primary transition truncate">Support Tickets</div>
                          <div className="text-[10px] text-dim">{badges.openTickets} unresolved tickets</div>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                      </Link>
                    )}

                    {totalBadge === 0 && (
                      <div className="text-center py-6 text-xs text-dim">
                        All caught up. No pending alerts.
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-2 flex justify-between items-center text-[10px] text-dim">
                    <span>Click outside to close</span>
                    <Link to="/support" onClick={() => setShowNotifications(false)} className="text-primary hover:underline font-semibold">
                      Support Desk →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-9 h-9 rounded-xl gradient-purple flex items-center justify-center text-sm font-bold cursor-pointer shadow-lg">
            {displayName[0]?.toUpperCase() ?? "A"}
          </div>
        </header>

        <main className="admin-content flex-1 p-4 sm:p-5 lg:p-7 xl:p-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
