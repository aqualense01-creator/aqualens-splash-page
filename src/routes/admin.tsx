import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/app/AdminSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { MobileBottomNav } from "@/components/app/MobileBottomNav";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/app/dashboard" });
  }, [loading, user, isAdmin, navigate]);
  if (loading || !user || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-surface">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">
            <Outlet />
          </main>
          <MobileBottomNav isAdmin />
        </div>
      </div>
    </SidebarProvider>
  );
}
