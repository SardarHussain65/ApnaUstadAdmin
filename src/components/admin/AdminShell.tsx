import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Wrench, ClipboardList, Calendar, FolderKanban,
  Star, Bell, Settings, ChevronLeft, LogOut, Search, ChevronDown,
} from "lucide-react";
import { logout, useAuth } from "@/lib/auth";
import { CommandPalette } from "@/components/admin/CommandPalette";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: Users },
  { to: "/workers", label: "Workers", icon: Wrench },
  { to: "/jobs", label: "Job Posts", icon: ClipboardList },
  { to: "/bookings", label: "Bookings", icon: Calendar },
  { to: "/categories", label: "Categories", icon: FolderKanban },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/users": "Users Management",
  "/workers": "Workers Management",
  "/jobs": "Job Posts",
  "/bookings": "Bookings",
  "/categories": "Service Categories",
  "/reviews": "Reviews & Ratings",
  "/notifications": "Push Notifications",
  "/settings": "Settings",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const path = useRouterState({ select: s => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useAuth();
  const title = Object.entries(TITLES).find(([k]) => path.startsWith(k))?.[1] ?? "ApnaUstad Admin";

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

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex bg-background gradient-cosmic">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-[260px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl gradient-cyan flex items-center justify-center glow-cyan flex-shrink-0">
            <Wrench className="w-5 h-5 text-background" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <div className="font-extrabold text-lg leading-tight text-gradient-cyan">ApnaUstad</div>
              <div className="text-[10px] text-muted-foreground tracking-wider">ADMIN PORTAL</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV.map(item => {
            const active = path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-[rgba(0,245,255,0.08)] text-primary"
                    : "text-muted-foreground hover:bg-surface-light hover:text-foreground"
                }`}
              >
                {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-primary glow-cyan" />}
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-surface-light ${collapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-full gradient-purple flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-semibold truncate">{user?.name ?? "Admin"}</div>
                <div className="text-[10px] uppercase tracking-wider text-secondary">{user?.role ?? "admin"}</div>
              </div>
            )}
            {!collapsed && (
              <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden lg:flex w-full mt-3 items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-surface-light hover:text-foreground transition"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 glass flex items-center px-4 lg:px-6 gap-4">
          <button className="lg:hidden p-2 rounded-lg hover:bg-surface-light" onClick={() => setMobileOpen(true)}>
            <ChevronDown className="w-5 h-5 -rotate-90" />
          </button>
          <h1 className="text-lg font-bold tracking-tight truncate flex-1">{title}</h1>
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 h-9 w-72 rounded-xl bg-input border border-border hover:border-primary/60 hover:glow-cyan transition text-left"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm flex-1 text-dim">Search anything...</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">⌘K</kbd>
          </button>
          <button className="relative p-2 rounded-xl hover:bg-surface-light">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
          </button>
          <div className="w-9 h-9 rounded-full gradient-purple flex items-center justify-center text-sm font-bold cursor-pointer">
            {user?.name?.[0]?.toUpperCase() ?? "A"}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 animate-fade-in">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
