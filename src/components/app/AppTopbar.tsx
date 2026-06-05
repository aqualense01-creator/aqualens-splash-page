import { useState, useEffect } from "react";
import { Bell, ChevronDown, Globe, LogOut, User as UserIcon, Waves } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { MOCK_FARMS } from "@/lib/mock-farm";

export function AppTopbar() {
  const { lang, setLang } = useI18n();
  const { user, profile, signOut } = useAuth();
  const [activeFarmId, setActiveFarmId] = useState<string>("f1");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("active_farm_id");
    if (saved) {
      setActiveFarmId(saved);
    } else {
      localStorage.setItem("active_farm_id", "f1");
    }
  }, []);

  const activeFarm = MOCK_FARMS.find((f) => f.id === activeFarmId) || MOCK_FARMS[0];
  const isAppRoute =
    typeof window !== "undefined" ? window.location.pathname.startsWith("/app") : true;

  const handleFarmSelect = (id: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("active_farm_id", id);
    setActiveFarmId(id);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/95 px-3 shadow-[0_1px_0_rgba(15,44,68,0.03)] backdrop-blur sm:px-4">
      <SidebarTrigger className="-ml-1 h-9 w-9 shrink-0 rounded-xl border border-border/60 bg-background/80 text-foreground hover:bg-muted md:h-8 md:w-8" />

      {/* Farm Selector (Only for Farmer app /app routes) */}
      {isAppRoute && (
        <div className="ml-1 sm:ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-border/70 bg-card/70 px-2.5 text-xs font-semibold backdrop-blur hover:border-primary/40"
              >
                <Waves className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="max-w-[104px] truncate sm:max-w-[160px]">{activeFarm.name}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "bn" ? "খামার নির্বাচন করুন" : "Select Farm"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MOCK_FARMS.map((farm) => (
                <DropdownMenuItem
                  key={farm.id}
                  onClick={() => handleFarmSelect(farm.id)}
                  className="font-medium text-xs flex items-center justify-between cursor-pointer"
                >
                  {farm.name}
                  {farm.id === activeFarmId && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {!isAppRoute && (
        <div className="ml-2 font-display text-xs font-bold uppercase tracking-[0.1em] text-primary">
          Admin Console
        </div>
      )}

      <div className="ml-2 hidden text-xs font-medium text-muted-foreground md:block">
        {new Date().toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })}
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* Notification Bell with Badge */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative h-9 w-9 rounded-xl hover:bg-muted cursor-pointer"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.assign(isAppRoute ? "/app/alerts" : "/admin/alerts");
            }
          }}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        </Button>

        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 h-9 rounded-xl cursor-pointer">
              <Globe className="h-4 w-4" />
              <span className="hidden text-xs font-medium uppercase sm:inline">{lang}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLang("en")} className="cursor-pointer text-xs">
              English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang("bn")} className="cursor-pointer text-xs">
              বাংলা
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 h-9 rounded-xl cursor-pointer">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {(profile?.full_name ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-[120px] truncate text-sm sm:inline">
                {profile?.full_name ?? user?.email}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate text-xs">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.assign("/app/settings");
                }
              }}
              className="cursor-pointer text-xs"
            >
              <UserIcon className="mr-2 h-4 w-4" /> Profile settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                if (typeof window !== "undefined") {
                  window.location.assign("/login");
                }
              }}
              className="cursor-pointer text-xs text-rose-600 hover:text-rose-700"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
