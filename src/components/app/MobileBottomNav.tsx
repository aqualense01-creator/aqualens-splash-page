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
    <div className="fixed bottom-0 left-0 right-0 z-40 block border-t border-border/60 bg-background/90 px-2 pt-2 pb-safe-bottom backdrop-blur-md md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <nav className="flex items-center justify-around">
        {items.map((item) => {
          const active = isActive(item.url);
          const Icon = item.icon;
          return (
            <a
              key={item.url}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 px-3 text-center transition-colors min-h-[44px] min-w-[48px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  active ? "scale-110 stroke-[2.5]" : "scale-100 stroke-[2]",
                )}
              />
              <span className="text-[10px] font-semibold tracking-tight leading-none">
                {item.label}
              </span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
