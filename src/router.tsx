import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AdminPageLoader } from "./components/admin/AdminPageLoader";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: AdminPageLoader,
    defaultPendingMs: 150,
    defaultPendingMinMs: 300,
  });

  return router;
};
