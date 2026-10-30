import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/onboarding")({
  component: () => <Navigate to="/workers" replace />,
});
