import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { MobileBottomNav } from "@/components/app/MobileBottomNav";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, isAdmin, isSupport, isTechnician } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!loading && !user && pathname.startsWith("/app")) {
      navigate({ to: "/login", search: { redirect: pathname }, replace: true });
    }
  }, [loading, user, navigate, pathname]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="relative isolate flex min-h-screen w-full overflow-x-clip bg-surface">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <AppTopbar />
          <main className="min-w-0 flex-1 overflow-x-clip p-4 pb-24 sm:p-6 md:pb-6">
            <Outlet />
          </main>
          <MobileBottomNav isAdmin={isAdmin} isSupport={isSupport} isTechnician={isTechnician} />
        </div>
      </div>
    </SidebarProvider>
  );
}
