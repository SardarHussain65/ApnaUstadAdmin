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
      { to: "/workers", label: "Ustads", icon: Wrench, permission: "workers" },
      { to: "/verification", label: "CNIC Verification", icon: Fingerprint, permission: "verification", badgeKey: "pendingVerifications" },
      { to: "/specialty-requests", label: "Extra Categories", icon: Layers, permission: "specialty-requests", badgeKey: "pendingSpecialties" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/jobs", label: "Job Posts", icon: ClipboardList, permission: "jobs", badgeKey: "openJobs" },
      { to: "/bookings", label: "Bookings", icon: Calendar, permission: "bookings", badgeKey: "pendingBookings" },
      { to: "/disputes", label: "Complaints", icon: Scale, permission: "disputes", badgeKey: "openDisputes" },
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
  "/dashboard": { title: "Dashboard", description: "A live view of business activity and priority work." },
  "/users": { title: "Customers", description: "Manage customer accounts, bookings, and customer history." },
  "/workers": { title: "Ustads", description: "Review ustad profiles, active status, ratings, and skills." },
  "/verification": { title: "CNIC Verification", description: "Check submitted CNIC photos and approve verified ustads." },
  "/specialty-requests": { title: "Extra Category Requests", description: "Review and approve extra work categories requested by ustads." },
  "/jobs": { title: "Job Posts", description: "Monitor customer job posts, ustad quotes, and hires." },
  "/bookings": { title: "Bookings", description: "Track active jobs, cash payments, and completed work." },
  "/payments": { title: "Payments & Cash Records", description: "Check cash payments, app fees, and ustad earnings." },
  "/wallets": { title: "Wallets & Top-ups", description: "Manage ustad balances, top-up receipts, and fee rules." },
  "/categories": { title: "Services", description: "Manage service types customers can book — Plumber, Electrician, AC repair, and more." },
  "/reviews": { title: "Reviews & Ratings", description: "Check customer reviews and keep work quality high." },
  "/notifications": { title: "Notifications", description: "Send announcements and notices to customers and ustads." },
  "/support": { title: "Support Desk", description: "Help customers and ustads with their questions and issues." },
  "/disputes": { title: "Customer Complaints", description: "Resolve customer and ustad issues fairly." },
  "/reports": { title: "Reports & Analytics", description: "Explore earnings, popular jobs, and marketplace growth." },
  "/audit": { title: "Audit Trail", description: "Review administrative actions and system events." },
  "/admins": { title: "Admin Access", description: "Control administrative accounts and permissions." },
  "/promos": { title: "Promotions", description: "Create discounts and coupon codes for customers." },
  "/settings": { title: "Settings", description: "Update your account details and app settings." },
  "/platform-config": { title: "Platform Configuration", description: "Set commission rates, urgent job fees, and search radius." },
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
    return { title: "Complaint Details", description: "Review customer issue, chat history, and team decision." };
  }
  if (path.startsWith("/verification/")) {
    return { title: "CNIC Verification", description: "Check ustad profile photo and CNIC card photos." };
  }
  const match = Object.entries(PAGE_META).find(([k]) => path === k || path.startsWith(`${k}/`));
  return match?.[1] ?? { title: "ApnaUstad Admin", description: "Manage your marketplace with confidence." };
}
