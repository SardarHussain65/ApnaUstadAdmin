import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useAdmins,
  useCreateAdmin,
  useToggleAdminStatus,
  useDeleteAdmin
} from "@/lib/api-hooks";
import { Modal } from "@/components/admin/Drawer";
import { Badge, StatusBadge } from "@/components/admin/ui";
import {
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  Power,
  Mail,
  User,
  Lock,
  Clock
} from "lucide-react";

export const Route = createFileRoute("/_admin/admins")({
  component: AdminsManagementPage,
});

function AdminsManagementPage() {
  const { user: currentUser } = useAuth();

  // Dialog / Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusConfirmId, setStatusConfirmId] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "superadmin" | "support" | "verifier" | "finance">("admin");

  // React Query Queries & Mutations
  const { data: admins = [], isLoading } = useAdmins();
  const createAdminMutation = useCreateAdmin();
  const toggleStatusMutation = useToggleAdminStatus();
  const deleteAdminMutation = useDeleteAdmin();

  // Role Access Guard
  if (currentUser && currentUser.role !== "superadmin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive glow-red">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Access Denied</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Super Admin permissions are required to access admin management dashboard and settings.
          Your current account is registered as a <span className="text-secondary font-semibold uppercase">{currentUser.role}</span>.
        </p>
      </div>
    );
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    createAdminMutation.mutate(
      { fullName, email, password, role },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setFullName("");
          setEmail("");
          setPassword("");
          setRole("admin");
        }
      }
    );
  };

  const handleConfirmToggleStatus = () => {
    if (!statusConfirmId) return;
    toggleStatusMutation.mutate(statusConfirmId, {
      onSuccess: () => setStatusConfirmId(null)
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    deleteAdminMutation.mutate(deleteConfirmId, {
      onSuccess: () => setDeleteConfirmId(null)
    });
  };

  // Helper to check if row matches logged-in user
  const isSelf = (adminId: string) => {
    // Check both id formats
    const currentId = (currentUser as any)?.id || (currentUser as any)?._id;
    return adminId === currentId;
  };

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">System Administrators</h2>
          <p className="text-xs text-dim">Add, manage, and configure system sub-admins & super-admins</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-background px-4 py-2 rounded-xl text-sm font-bold shadow-cyan-glow transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Admin</span>
        </button>
      </div>

      {/* Admin Users Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="text-left py-3.5 px-4">Name</th>
                <th className="text-left py-3.5 px-4">Email</th>
                <th className="text-left py-3.5 px-4">System Role</th>
                <th className="text-left py-3.5 px-4">Status</th>
                <th className="text-left py-3.5 px-4">Last Login</th>
                <th className="text-center py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="w-8 h-8 border-4 border-t-primary border-border rounded-full animate-spin mx-auto mb-2" />
                    Loading admin users list...
                  </td>
                </tr>
              )}

              {!isLoading && admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No admin accounts found in system database.
                  </td>
                </tr>
              )}

              {!isLoading &&
                admins.map((admin: any) => {
                  const self = isSelf(admin._id);
                  return (
                    <tr key={admin._id} className="hover:bg-surface-light/35 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-surface-light border border-border flex items-center justify-center font-bold text-white text-xs">
                            {admin.fullName?.[0]?.toUpperCase() ?? "A"}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {admin.fullName}
                              {self && (
                                <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">{admin.email}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={admin.role === "superadmin" ? "purple" : "info"}>
                          {admin.role}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={admin.status || "active"} />
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap">
                        {admin.lastLogin ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-dim" />
                            <span>{new Date(admin.lastLogin).toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="text-dim">Never logged in</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex gap-1.5">
                          {/* Toggle Status Button */}
                          <button
                            onClick={() => setStatusConfirmId(admin._id)}
                            disabled={self}
                            className={`p-1.5 rounded-lg border border-border transition ${
                              self
                                ? "opacity-30 cursor-not-allowed"
                                : admin.status === "inactive"
                                ? "hover:border-success/50 hover:text-success text-muted-foreground"
                                : "hover:border-destructive/50 hover:text-destructive text-muted-foreground"
                            }`}
                            title={self ? "Cannot deactivate yourself" : admin.status === "inactive" ? "Activate Account" : "Deactivate Account"}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirmId(admin._id)}
                            disabled={self}
                            className={`p-1.5 rounded-lg border border-border transition ${
                              self
                                ? "opacity-30 cursor-not-allowed"
                                : "hover:border-destructive/50 hover:text-destructive text-muted-foreground"
                            }`}
                            title={self ? "Cannot delete yourself" : "Delete Account"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Admin Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create System Admin User"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <User className="w-3 h-3" /> Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Ali Ahmed"
              className="w-full bg-input border border-border rounded-xl px-3.5 py-2 text-sm outline-none focus:border-primary focus:glow-cyan transition text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ali.ahmed@apnaustad.com"
              className="w-full bg-input border border-border rounded-xl px-3.5 py-2 text-sm outline-none focus:border-primary focus:glow-cyan transition text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <Lock className="w-3 h-3" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-input border border-border rounded-xl px-3.5 py-2 text-sm outline-none focus:border-primary focus:glow-cyan transition text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <Shield className="w-3 h-3" /> Role & Authority level
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-input border border-border rounded-xl px-3.5 py-2 text-sm outline-none focus:border-primary cursor-pointer text-white"
            >
              <option value="admin">Admin (Full legacy access)</option>
              <option value="support">Support (Tickets, users, bookings, disputes)</option>
              <option value="verifier">Verifier (Identity, onboarding, specialties)</option>
              <option value="finance">Finance (Payments, wallets, promos, reports)</option>
              <option value="superadmin">Super Admin (Full system controls)</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-surface-light transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAdminMutation.isPending}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-background font-bold text-sm rounded-xl shadow-cyan-glow transition flex items-center gap-2"
            >
              {createAdminMutation.isPending && (
                <div className="w-4 h-4 border-2 border-t-background border-primary rounded-full animate-spin" />
              )}
              <span>Create Account</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Toggle Status Confirmation Modal */}
      <Modal
        open={!!statusConfirmId}
        onClose={() => setStatusConfirmId(null)}
        title="Change Admin Account Status"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to toggle the status of this admin account?
            Deactivating an account will immediately invalidate all active API sessions and block future login attempts.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setStatusConfirmId(null)}
              className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-surface-light transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmToggleStatus}
              disabled={toggleStatusMutation.isPending}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-background font-bold text-sm rounded-xl shadow-cyan-glow transition flex items-center gap-1.5"
            >
              {toggleStatusMutation.isPending && (
                <div className="w-4 h-4 border-2 border-t-background border-primary rounded-full animate-spin" />
              )}
              Confirm Toggle
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Admin Account"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to permanently delete this administrator account?
            This operation is permanent and cannot be undone. All audit trails of actions they performed will remain, but the account record will be wiped.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-surface-light transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleteAdminMutation.isPending}
              className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-bold text-sm rounded-xl transition flex items-center gap-1.5"
            >
              {deleteAdminMutation.isPending && (
                <div className="w-4 h-4 border-2 border-t-white border-destructive rounded-full animate-spin" />
              )}
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
