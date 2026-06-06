import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/app/AdminSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { MobileBottomNav } from "@/components/app/MobileBottomNav";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const { user, loading, isAdmin, isSupport } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const canUseAdminShell = isAdmin || isSupport;
  const supportOnlyAllowed =
    pathname === "/admin/support" || pathname.startsWith("/admin/support/");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (pathname.startsWith("/admin")) {
        navigate({ to: "/login", search: { redirect: pathname }, replace: true });
      }
      return;
    }
    if (!canUseAdminShell) navigate({ to: "/app/dashboard" });
    else if (!isAdmin && !supportOnlyAllowed) navigate({ to: "/admin/support" });
  }, [loading, user, canUseAdminShell, isAdmin, supportOnlyAllowed, navigate, pathname]);

  if (loading || !user || !canUseAdminShell || (!isAdmin && !supportOnlyAllowed)) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  return (
    <SidebarProvider>
      <div className="relative isolate flex min-h-screen w-full overflow-x-clip bg-surface">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <AppTopbar />
          <main className="min-w-0 flex-1 overflow-x-clip p-4 pb-24 sm:p-6 md:pb-6">
            <Outlet />
          </main>
          <MobileBottomNav isAdmin={isAdmin} isSupport={isSupport} />
        </div>
      </div>
    </SidebarProvider>
  );
}
