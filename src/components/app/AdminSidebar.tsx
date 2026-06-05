import { useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Waves,
  Cpu,
  Users,
  Bell,
  LifeBuoy,
  ShieldCheck,
  ArrowLeft,
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

const items = [
  { url: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { url: "/admin/farms", label: "Farms", icon: Waves },
  { url: "/admin/devices", label: "Devices", icon: Cpu },
  { url: "/admin/users", label: "Users", icon: Users },
  { url: "/admin/alerts", label: "Alerts", icon: Bell },
  { url: "/admin/support", label: "Support", icon: LifeBuoy },
  { url: "/admin/settings", label: "System", icon: ShieldCheck },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/60 px-3 py-3">
        {collapsed ? <Logo iconOnly /> : <Logo />}
        {!collapsed && (
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary">Admin console</p>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/app/dashboard" className="flex items-center gap-2 text-muted-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    {!collapsed && <span>Back to app</span>}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
