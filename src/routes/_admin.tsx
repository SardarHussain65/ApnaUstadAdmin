import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageLoader } from "@/components/admin/AdminPageLoader";
import { fetchAdminProfile, getToken } from "@/lib/auth";
import { canAccessRoute } from "@/lib/admin-permissions";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const guard = async () => {
      if (!getToken()) {
        navigate({ to: "/login" });
        return;
      }
      try {
        const profile = await fetchAdminProfile();
        if (!active) return;
        const path = window.location.pathname;
        if (!canAccessRoute(profile?.role, path)) {
          navigate({ to: "/dashboard" });
        }
        setReady(true);
      } catch {
        navigate({ to: "/login" });
      }
    };
    guard();
    return () => {
      active = false;
    };
  }, [navigate]);

  if (!ready) return <AdminPageLoader fullScreen />;
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
