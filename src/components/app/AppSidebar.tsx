import { useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Radio,
  Waves,
  Bell,
  FileBarChart,
  Cpu,
  Settings,
  Wrench,
  Sparkles,
  ClipboardList,
  Users,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/landing/Logo";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { t } = useI18n();
  const { isAdmin, isTechnician } = useAuth();

  const farmer = [
    { url: "/app/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { url: "/app/live", label: t("nav.live"), icon: Radio },
    { url: "/app/farms", label: t("nav.farms"), icon: Waves },
    { url: "/app/alerts", label: t("nav.alerts"), icon: Bell },
    { url: "/app/reports", label: t("nav.reports"), icon: FileBarChart },
    { url: "/app/devices", label: t("nav.devices"), icon: Cpu },
    { url: "/app/settings", label: t("nav.settings"), icon: Settings },
  ];

  const tech = [
    { url: "/app/setup", label: t("nav.setup"), icon: Sparkles },
    { url: "/app/devices", label: t("nav.devices"), icon: Cpu },
    { url: "/app/maintenance", label: t("nav.maintenance"), icon: Wrench },
  ];

  const admin = [
    { url: "/admin/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { url: "/admin/farms", label: t("nav.farms"), icon: Waves },
    { url: "/admin/devices", label: t("nav.devices"), icon: Cpu },
    { url: "/admin/users", label: t("nav.users"), icon: Users },
    { url: "/admin/alerts", label: t("nav.alerts"), icon: Bell },
    { url: "/admin/support", label: t("nav.support"), icon: LifeBuoy },
    { url: "/admin/settings", label: t("nav.system"), icon: ShieldCheck },
  ];

  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/60 px-3 py-3">
        {collapsed ? (
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary font-bold">A</div>
        ) : (
          <Logo />
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Farmer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {farmer.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isTechnician || isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Technician</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {tech.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <a href={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {admin.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <a href={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
