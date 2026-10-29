import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/specialty-requests")({
  component: () => <Navigate to="/categories" replace />,
});
