import { useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Radio, Bell, Cpu, Settings, Waves, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type NavItem = {
  url: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function MobileBottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { t } = useI18n();

  const farmerItems: NavItem[] = [
    { url: "/app/dashboard", label: t("nav.dashboard") || "Dashboard", icon: LayoutDashboard },
    { url: "/app/live", label: t("nav.live") || "Live", icon: Radio },
    { url: "/app/alerts", label: t("nav.alerts") || "Alerts", icon: Bell },
    { url: "/app/devices", label: t("nav.devices") || "Devices", icon: Cpu },
    { url: "/app/settings", label: t("nav.settings") || "Settings", icon: Settings },
  ];

  const adminItems: NavItem[] = [
    { url: "/admin/dashboard", label: t("nav.dashboard") || "Dashboard", icon: LayoutDashboard },
    { url: "/admin/farms", label: t("nav.farms") || "Farms", icon: Waves },
    { url: "/admin/devices", label: t("nav.devices") || "Devices", icon: Cpu },
    { url: "/admin/alerts", label: t("nav.alerts") || "Alerts", icon: Bell },
    { url: "/admin/settings", label: t("nav.system") || "System", icon: ShieldCheck },
  ];

  const items = isAdmin ? adminItems : farmerItems;
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 block border-t border-border/60 bg-background px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md md:hidden">
      <nav className="flex min-w-0 items-center justify-around">
        {items.map((item) => {
          const active = isActive(item.url);
          const Icon = item.icon;
          return (
            <a
              key={item.url}
              href={item.url}
              className={cn(
                "flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-center transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  active ? "scale-110 stroke-[2.5]" : "scale-100 stroke-[2]",
                )}
              />
              <span className="max-w-full truncate text-[10px] font-semibold leading-none tracking-tight">
                {item.label}
              </span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
