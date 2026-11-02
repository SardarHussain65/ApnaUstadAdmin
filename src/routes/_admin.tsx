import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageLoader } from "@/components/admin/AdminPageLoader";
import { IdleTimeoutGuard } from "@/components/admin/IdleTimeoutGuard";
import { fetchAdminProfile, getToken } from "@/lib/auth";
import { canAccessRoute } from "@/lib/admin-permissions";
import { getSocket } from "@/lib/socket";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  // Global Real-Time Socket sync for all Admin views
  useEffect(() => {
    if (!ready) return;
    const socket = getSocket();
    if (!socket) return;

    const handleJobUpdate = (data: any) => {
      const jobId = (data?.jobId || data?._id)?.toString();
      if (jobId) {
        queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      }
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["action-counts"] });
    };

    const handleBookingUpdate = (data: any) => {
      const bookingId = (data?.bookingId || data?._id)?.toString();
      if (bookingId) {
        queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      }
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["action-counts"] });
    };

    socket.on("job:new", handleJobUpdate);
    socket.on("job:cancelled", handleJobUpdate);
    socket.on("job:status", handleJobUpdate);
    socket.on("job:assigned", handleJobUpdate);

    socket.on("booking:new", handleBookingUpdate);
    socket.on("booking:status", handleBookingUpdate);
    socket.on("booking:accepted", handleBookingUpdate);
    socket.on("booking:ongoing", handleBookingUpdate);
    socket.on("booking:completed", handleBookingUpdate);
    socket.on("booking:cancelled", handleBookingUpdate);
    socket.on("booking:paid", handleBookingUpdate);

    return () => {
      socket.off("job:new", handleJobUpdate);
      socket.off("job:cancelled", handleJobUpdate);
      socket.off("job:status", handleJobUpdate);
      socket.off("job:assigned", handleJobUpdate);

      socket.off("booking:new", handleBookingUpdate);
      socket.off("booking:status", handleBookingUpdate);
      socket.off("booking:accepted", handleBookingUpdate);
      socket.off("booking:ongoing", handleBookingUpdate);
      socket.off("booking:completed", handleBookingUpdate);
      socket.off("booking:cancelled", handleBookingUpdate);
      socket.off("booking:paid", handleBookingUpdate);
    };
  }, [ready, queryClient]);

  if (!ready) return <AdminPageLoader fullScreen />;
  return (
    <AdminShell>
      <IdleTimeoutGuard />
      <Outlet />
    </AdminShell>
  );
}
