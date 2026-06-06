import { useState, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { readFarmSelection, writeFarmSelection } from "@/lib/farm-selection";
import { insforge, type Farm } from "@/lib/insforge";
import { cn } from "@/lib/utils";

const EMPTY_FARMS: Pick<Farm, "id" | "name">[] = [];

function dbErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function AppTopbar() {
  const { lang, setLang } = useI18n();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isAppRoute = pathname.startsWith("/app");
  const [activeFarmId, setActiveFarmId] = useState<string>("all");

  const [demoEnabled, setDemoEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const val = window.localStorage.getItem("acqua_lence_demo_mode");
    setDemoEnabled(val !== "false");
  }, []);

  const toggleDemoMode = () => {
    const newVal = !demoEnabled;
    setDemoEnabled(newVal);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("acqua_lence_demo_mode", String(newVal));
      window.location.reload();
    }
  };

  const farmsQ = useQuery({
    queryKey: ["app-topbar-farms", user?.id],
    enabled: isAppRoute && !!user,
    queryFn: async () => {
      const r = await insforge.database.from("farms").select("id,name").order("name");
      if (r.error) throw new Error(dbErrorMessage(r.error, "Could not load farms"));
      return (r.data ?? []) as Pick<Farm, "id" | "name">[];
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveFarmId(readFarmSelection());
  }, []);

  const farms = farmsQ.data ?? EMPTY_FARMS;

  useEffect(() => {
    if (!isAppRoute || activeFarmId === "all" || farms.length === 0) return;
    if (farms.some((farm) => farm.id === activeFarmId)) return;
    setActiveFarmId(writeFarmSelection("all"));
  }, [activeFarmId, farms, isAppRoute]);

  const activeFarm = farms.find((f) => f.id === activeFarmId);

  const handleFarmSelect = (id: string) => {
    if (typeof window === "undefined") return;
    setActiveFarmId(writeFarmSelection(id));
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
                <span className="max-w-[104px] truncate sm:max-w-[160px]">
                  {activeFarm?.name ?? (lang === "bn" ? "সব খামার" : "All farms")}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "bn" ? "খামার নির্বাচন করুন" : "Select Farm"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleFarmSelect("all")}
                className="font-medium text-xs flex items-center justify-between cursor-pointer"
              >
                {lang === "bn" ? "সব খামার" : "All farms"}
                {activeFarmId === "all" && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </DropdownMenuItem>
              {farms.map((farm) => (
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
        {/* Demo Mode Toggle */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-2 py-1 select-none">
          <span className="relative flex h-2 w-2">
            <span className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75",
              demoEnabled ? "animate-ping bg-emerald-400" : "bg-muted-foreground"
            )}></span>
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              demoEnabled ? "bg-emerald-500" : "bg-muted-foreground/60"
            )}></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline">
            {lang === "bn" ? "ডেমো মোড" : "Demo Mode"}
          </span>
          <button
            onClick={toggleDemoMode}
            type="button"
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1",
              demoEnabled ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out",
                demoEnabled ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Notification Bell with Badge */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative h-9 w-9 rounded-xl hover:bg-muted cursor-pointer"
          onClick={() => {
            navigate({ to: isAppRoute ? "/app/alerts" : "/admin/alerts" });
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
                navigate({ to: "/app/settings" });
              }}
              className="cursor-pointer text-xs"
            >
              <UserIcon className="mr-2 h-4 w-4" /> Profile settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
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
