import {
  LayoutDashboard, Users, Wrench, ClipboardList, Calendar, FolderKanban, Star, Bell, Settings,
  Wallet, HelpCircle, BarChart3, History, UserCog, Scale, Tag, Fingerprint, Layers, Banknote,
} from "lucide-react";
import type { ComponentType } from "react";
import type { AdminPermission } from "@/lib/admin-permissions";

export type NavIcon = ComponentType<{ className?: string }>;

export interface NavItem {
  to: string;
  label: string;
  icon: NavIcon;
  permission: AdminPermission;
  superAdminOnly?: boolean;
  /** Key into the live badge counts (see useNavBadges). */
  badgeKey?: "openTickets" | "openJobs" | "pendingBookings" | "unverifiedWorkers" | "pendingVerifications" | "pendingSpecialties" | "pendingTopUps" | "openDisputes";
}

export interface NavGroup { label: string; items: NavItem[] }

/** Single source for Sidebar, Topbar breadcrumbs and (later) the command palette. */
export const NAV_GROUPS: NavGroup[] = [
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
      { to: "/verification", label: "Identity Reviews", icon: Fingerprint, permission: "verification", badgeKey: "pendingVerifications" },
      { to: "/specialty-requests", label: "Specialty Requests", icon: Layers, permission: "specialty-requests", badgeKey: "pendingSpecialties" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/jobs", label: "Job Posts", icon: ClipboardList, permission: "jobs", badgeKey: "openJobs" },
      { to: "/bookings", label: "Bookings", icon: Calendar, permission: "bookings", badgeKey: "pendingBookings" },
      { to: "/disputes", label: "Disputes", icon: Scale, permission: "disputes", badgeKey: "openDisputes" },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/payments", label: "Payments", icon: Banknote, permission: "payments" },
      { to: "/wallets", label: "Wallets & Top-ups", icon: Wallet, permission: "wallets", badgeKey: "pendingTopUps" },
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
      { to: "/support", label: "Support Desk", icon: HelpCircle, permission: "support", badgeKey: "openTickets" },
      { to: "/audit", label: "Audit Trail", icon: History, permission: "audit" },
      { to: "/admins", label: "Admin Access", icon: UserCog, permission: "admins", superAdminOnly: true },
      { to: "/settings", label: "My Settings", icon: Settings, permission: "settings" },
    ],
  },
];

export const PAGE_META: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "A live view of marketplace health and priority work." },
  "/users": { title: "Customers", description: "Manage customer accounts, access, and booking activity." },
  "/workers": { title: "Service Professionals", description: "Review worker profiles, availability, and performance." },
  "/verification": { title: "Identity Reviews", description: "Audit submitted documents and approve trusted professionals." },
  "/specialty-requests": { title: "Specialty Requests", description: "Approve paid category add-ons requested by workers." },
  "/jobs": { title: "Job Posts", description: "Monitor customer requests, bids, and marketplace fulfillment." },
  "/bookings": { title: "Bookings", description: "Track service delivery, payments, and booking outcomes." },
  "/payments": { title: "Payments Ledger", description: "Reconcile cash payments, commissions, and worker earnings." },
  "/wallets": { title: "Wallets & Top-ups", description: "Manage balances, top-ups, and platform commission rules." },
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

export function findNav(path: string): { group?: NavGroup; item?: NavItem } {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => path === i.to || path.startsWith(`${i.to}/`));
    if (item) return { group, item };
  }
  return {};
}

export function findPageMeta(path: string) {
  if (path.startsWith("/users/")) {
    return { title: "Customer Profile", description: "360° customer overview, booking history, and account controls." };
  }
  if (path.startsWith("/workers/")) {
    return { title: "Ustad Profile", description: "Service professional verification, specialties, wallet, and booking history." };
  }
  if (path.startsWith("/bookings/")) {
    return { title: "Booking Details", description: "Service agreement, financial breakdown, chat transcript, and status controls." };
  }
  if (path.startsWith("/jobs/")) {
    return { title: "Job Post Details", description: "Customer service request, Ustad bids, and moderation controls." };
  }
  if (path.startsWith("/disputes/")) {
    return { title: "Dispute Arbitration", description: "Complaint evidence, booking chat transcript, and wallet refund/penalty ruling." };
  }
  if (path.startsWith("/verification/")) {
    return { title: "Identity Verification Inspector", description: "Side-by-side facial match and NADRA CNIC document inspection." };
  }
  const match = Object.entries(PAGE_META).find(([k]) => path === k || path.startsWith(`${k}/`));
  return match?.[1] ?? { title: "ApnaUstad Admin", description: "Manage your marketplace with confidence." };
}
