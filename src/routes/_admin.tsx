import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageLoader } from "@/components/admin/AdminPageLoader";
import { IdleTimeoutGuard } from "@/components/admin/IdleTimeoutGuard";
import { fetchAdminProfile, getToken, logout } from "@/lib/auth";
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
        logout();
        if (active) {
          navigate({ to: "/login" });
        }
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

    const handleWalletUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-topups"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-topup-summary"] });
      queryClient.invalidateQueries({ queryKey: ["worker-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-summary"] });
      queryClient.invalidateQueries({ queryKey: ["action-counts"] });
    };

    const handleDisputeUpdate = (data: any) => {
      const disputeId = (data?.disputeId || data?._id)?.toString();
      if (disputeId) {
        queryClient.invalidateQueries({ queryKey: ["dispute", disputeId] });
      }
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      queryClient.invalidateQueries({ queryKey: ["action-counts"] });
    };

    const handleWorkerUpdate = (data: any) => {
      const workerId = (data?.workerId || data?._id)?.toString();
      if (workerId) {
        queryClient.invalidateQueries({ queryKey: ["worker", workerId] });
      }
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["verification-requests"] });
      queryClient.invalidateQueries({ queryKey: ["action-counts"] });
    };

    const handleSupportUpdate = (data: any) => {
      const requestId = (data?.requestId || data?._id)?.toString();
      if (requestId) {
        queryClient.invalidateQueries({ queryKey: ["support-request", requestId] });
      }
      queryClient.invalidateQueries({ queryKey: ["support-requests"] });
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

    socket.on("wallet:topup_created", handleWalletUpdate);
    socket.on("wallet:topup_updated", handleWalletUpdate);
    socket.on("wallet:updated", handleWalletUpdate);

    socket.on("dispute:created", handleDisputeUpdate);
    socket.on("dispute:updated", handleDisputeUpdate);
    socket.on("dispute:message", handleDisputeUpdate);

    socket.on("worker:updated", handleWorkerUpdate);
    socket.on("worker:verified", handleWorkerUpdate);
    socket.on("verification:submitted", handleWorkerUpdate);
    socket.on("verification:reviewed", handleWorkerUpdate);

    socket.on("support:created", handleSupportUpdate);
    socket.on("support:updated", handleSupportUpdate);

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

      socket.off("wallet:topup_created", handleWalletUpdate);
      socket.off("wallet:topup_updated", handleWalletUpdate);
      socket.off("wallet:updated", handleWalletUpdate);

      socket.off("dispute:created", handleDisputeUpdate);
      socket.off("dispute:updated", handleDisputeUpdate);
      socket.off("dispute:message", handleDisputeUpdate);

      socket.off("worker:updated", handleWorkerUpdate);
      socket.off("worker:verified", handleWorkerUpdate);
      socket.off("verification:submitted", handleWorkerUpdate);
      socket.off("verification:reviewed", handleWorkerUpdate);

      socket.off("support:created", handleSupportUpdate);
      socket.off("support:updated", handleSupportUpdate);
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
