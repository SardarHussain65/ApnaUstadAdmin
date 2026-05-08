import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getToken } from "@/lib/auth";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getToken()) {
      navigate({ to: "/login" });
    } else {
      setReady(true);
    }
  }, [navigate]);
  if (!ready) return <div className="min-h-screen bg-background" />;
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
