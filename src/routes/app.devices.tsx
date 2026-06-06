import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  BatteryWarning,
  FlaskConical,
  Wrench,
  Plus,
  Search,
  ChevronRight,
  Signal,
  SignalLow,
  Activity,
  Clock,
  MapPin,
  HardDrive,
} from "lucide-react";
import { insforge, type Device, type Farm, type Pond } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { readFarmSelection, writeFarmSelection } from "@/lib/farm-selection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, MetricTile, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/devices")({
  head: () => ({ meta: [{ title: "Devices — Acqua Lence" }] }),
  component: DevicesPage,
});

function dbErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function assertDbOk(result: { error?: unknown }, fallback: string) {
  if (result.error) throw new Error(dbErrorMessage(result.error, fallback));
}

function DevicesPage() {
  const { user, isAdmin, isTechnician } = useAuth();
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["devices-page"],
    enabled: !!user,
    queryFn: async () => {
      const [d, f, p] = await Promise.all([
        insforge.database.from("devices").select("*").order("created_at", { ascending: false }),
        insforge.database.from("farms").select("*"),
        insforge.database.from("ponds").select("*"),
      ]);
      assertDbOk(d, "Failed to load devices");
      assertDbOk(f, "Failed to load farms");
      assertDbOk(p, "Failed to load ponds");
      return {
        devices: (d.data ?? []) as Device[],
        farms: (f.data ?? []) as Farm[],
        ponds: (p.data ?? []) as Pond[],
      };
    },
  });

  const [activeFarmId, setActiveFarmId] = useState<string>(() => {
    return readFarmSelection();
  });

  const farms = useMemo(() => data?.farms ?? [], [data?.farms]);
  const ponds = useMemo(() => data?.ponds ?? [], [data?.ponds]);
  const allDevices = useMemo(() => data?.devices ?? [], [data?.devices]);

  useEffect(() => {
    if (!activeFarmId || activeFarmId === "all") return;
    if (farms.some((farm) => farm.id === activeFarmId)) return;
    setActiveFarmId(writeFarmSelection("all"));
  }, [activeFarmId, farms]);

  const devices = useMemo(() => {
    return activeFarmId === "all"
      ? allDevices
      : allDevices.filter((d) => d.farm_id === activeFarmId);
  }, [activeFarmId, allDevices]);

  const counts = useMemo(
    () => ({
      total: devices.length,
      online: devices.filter((d) => d.status === "online").length,
      offline: devices.filter((d) => d.status === "offline").length,
      lowBattery: devices.filter((d) => d.status === "low_battery" || (d.battery_pct ?? 100) < 25)
        .length,
      calDue: devices.filter((d) => d.status === "calibration_due").length,
      maintDue: devices.filter((d) => d.status === "maintenance_due").length,
    }),
    [devices],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return devices.filter((d) => {
      if (
        statusFilter === "low_battery" &&
        d.status !== "low_battery" &&
        (d.battery_pct ?? 100) >= 25
      ) {
        return false;
      }
      if (statusFilter !== "all" && statusFilter !== "low_battery" && d.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const farm = farms.find((f) => f.id === d.farm_id)?.name ?? "";
      const pond = ponds.find((p) => p.id === d.pond_id)?.name ?? "";
      const text = `${d.name ?? ""} ${d.serial} ${farm} ${pond}`.toLowerCase();
      return text.includes(q);
    });
  }, [devices, statusFilter, query, farms, ponds]);

  const openDevice = (device: Device) => {
    setSelectedDevice(device);
    setDrawerOpen(true);
  };

  const selectedFarm = selectedDevice
    ? farms.find((f) => f.id === selectedDevice.farm_id)
    : undefined;
  const selectedPond = selectedDevice
    ? ponds.find((p) => p.id === selectedDevice.pond_id)
    : undefined;
  const canServiceDevices = isAdmin || isTechnician;
  const emptyDescription = canServiceDevices
    ? (t("devices.noDevicesDesc") ?? "Run the setup wizard to register your first device.")
    : "No devices are assigned to your farms yet.";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={t("devices.title") ?? "Devices"}
        subtitle={t("devices.subtitle") ?? "Health, signal and calibration status for every buoy."}
        actions={
          canServiceDevices ? (
            <Button asChild>
              <a href="/app/setup">
                <Plus className="mr-2 h-4 w-4" />
                {t("devices.setup") ?? "Setup device"}
              </a>
            </Button>
          ) : undefined
        }
      />

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile label={t("devices.total") ?? "Total"} value={counts.total} />
        <MetricTile
          label={t("devices.online") ?? "Online"}
          value={counts.online}
          accent="text-emerald-600"
        />
        <MetricTile
          label={t("devices.offline") ?? "Offline"}
          value={counts.offline}
          accent="text-rose-600"
        />
        <MetricTile
          label={t("devices.lowBattery") ?? "Low battery"}
          value={counts.lowBattery}
          accent="text-amber-600"
        />
        <MetricTile
          label={t("devices.calDue") ?? "Calibration due"}
          value={counts.calDue}
          accent="text-violet-600"
        />
        <MetricTile
          label={t("devices.maintenance") ?? "Maintenance"}
          value={counts.maintDue}
          accent="text-sky-600"
        />
      </div>

      {/* Search & filter bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("devices.searchPlaceholder") ?? "Search by name, serial, farm or pond…"}
            className="h-9 pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("devices.filterAll") ?? "All statuses"}</SelectItem>
            <SelectItem value="online">{t("devices.online") ?? "Online"}</SelectItem>
            <SelectItem value="offline">{t("devices.offline") ?? "Offline"}</SelectItem>
            <SelectItem value="low_battery">{t("devices.lowBattery") ?? "Low battery"}</SelectItem>
            <SelectItem value="calibration_due">
              {t("devices.calDue") ?? "Calibration due"}
            </SelectItem>
            <SelectItem value="maintenance_due">
              {t("devices.maintenance") ?? "Maintenance due"}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">
            {t("common.loading") ?? "Loading…"}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<WifiOff className="h-6 w-6" />}
            title="Devices did not load"
            description={dbErrorMessage(error, "Please refresh and try again.")}
            action={
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Cpu className="h-6 w-6" />}
            title={t("devices.noDevices") ?? "No devices"}
            description={emptyDescription}
            action={
              canServiceDevices ? (
                <Button asChild>
                  <a href="/app/setup">{t("devices.setup") ?? "Setup device"}</a>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground hover:bg-transparent">
                <TableHead className="px-4 py-3">{t("devices.colDevice") ?? "Device"}</TableHead>
                <TableHead className="px-4 py-3">
                  {t("devices.colFarmPond") ?? "Farm / Pond"}
                </TableHead>
                <TableHead className="px-4 py-3">{t("devices.colStatus") ?? "Status"}</TableHead>
                <TableHead className="px-4 py-3">{t("devices.colBattery") ?? "Battery"}</TableHead>
                <TableHead className="px-4 py-3">{t("devices.colSignal") ?? "Signal"}</TableHead>
                <TableHead className="px-4 py-3">
                  {t("devices.colFirmware") ?? "Firmware"}
                </TableHead>
                <TableHead className="px-4 py-3">
                  {t("devices.colLastSeen") ?? "Last seen"}
                </TableHead>
                <TableHead className="px-4 py-3">
                  {t("devices.colCalibration") ?? "Calibration"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => {
                const farm = farms.find((f) => f.id === d.farm_id);
                const pond = ponds.find((p) => p.id === d.pond_id);
                const battery = d.battery_pct ?? 0;
                const signal = d.signal_pct ?? 0;
                const isOffline = d.status === "offline";
                const isCalDue = d.status === "calibration_due";
                return (
                  <TableRow
                    key={d.id}
                    className={cn(
                      "border-b border-border/40 last:border-0 cursor-pointer",
                      isOffline && "bg-rose-500/[0.04]",
                      !isOffline && "hover:bg-accent/30",
                    )}
                    onClick={() => openDevice(d)}
                  >
                    <TableCell className="px-4 py-3">
                      <div className="font-medium">{d.name ?? d.serial}</div>
                      <div className="font-mono text-xs text-muted-foreground">{d.serial}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {farm?.name ?? "—"} · {pond?.name ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 tabular-nums",
                          battery < 15 && "text-rose-600",
                          battery >= 15 && battery < 25 && "text-amber-600",
                          battery >= 25 && "text-foreground",
                        )}
                      >
                        {battery < 15 ? (
                          <BatteryWarning className="h-3.5 w-3.5" />
                        ) : battery < 25 ? (
                          <BatteryLow className="h-3.5 w-3.5" />
                        ) : (
                          <Battery className="h-3.5 w-3.5" />
                        )}
                        {battery}%
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        {signal > 50 ? (
                          <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                        ) : signal > 20 ? (
                          <SignalLow className="h-3.5 w-3.5 text-amber-600" />
                        ) : (
                          <WifiOff className="h-3.5 w-3.5 text-rose-600" />
                        )}
                        {signal}%
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {d.firmware_version ?? "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                      {d.last_seen ? timeAgo(new Date(d.last_seen)) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {isCalDue ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-violet-700">
                          <FlaskConical className="h-3 w-3" />
                          {t("devices.calDue") ?? "Due"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("devices.ok") ?? "OK"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">
            {t("common.loading") ?? "Loading…"}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<WifiOff className="h-6 w-6" />}
            title="Devices did not load"
            description={dbErrorMessage(error, "Please refresh and try again.")}
            action={
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Cpu className="h-6 w-6" />}
            title={t("devices.noDevices") ?? "No devices"}
            description={emptyDescription}
            action={
              canServiceDevices ? (
                <Button asChild>
                  <a href="/app/setup">{t("devices.setup") ?? "Setup device"}</a>
                </Button>
              ) : undefined
            }
          />
        ) : (
          filtered.map((d) => {
            const farm = farms.find((f) => f.id === d.farm_id);
            const pond = ponds.find((p) => p.id === d.pond_id);
            const battery = d.battery_pct ?? 0;
            const signal = d.signal_pct ?? 0;
            const isOffline = d.status === "offline";
            const isCalDue = d.status === "calibration_due";
            return (
              <button
                key={d.id}
                onClick={() => openDevice(d)}
                className={cn(
                  "w-full rounded-2xl border bg-card p-4 text-left shadow-soft transition-colors",
                  isOffline
                    ? "border-rose-500/30 bg-rose-500/[0.04]"
                    : "border-border/70 hover:bg-accent/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{d.name ?? d.serial}</div>
                    <div className="font-mono text-xs text-muted-foreground">{d.serial}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isCalDue && (
                      <span className="inline-flex items-center rounded-full bg-violet-500/10 p-1">
                        <FlaskConical className="h-3.5 w-3.5 text-violet-600" />
                      </span>
                    )}
                    <StatusBadge status={d.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {pond?.name ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" />
                    {farm?.name ?? "—"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-accent/40 p-2 text-center">
                    <div
                      className={cn(
                        "flex items-center justify-center gap-1 font-medium tabular-nums",
                        battery < 15 && "text-rose-600",
                        battery >= 15 && battery < 25 && "text-amber-600",
                      )}
                    >
                      {battery < 15 ? (
                        <BatteryWarning className="h-3.5 w-3.5" />
                      ) : battery < 25 ? (
                        <BatteryLow className="h-3.5 w-3.5" />
                      ) : (
                        <Battery className="h-3.5 w-3.5" />
                      )}
                      {battery}%
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("devices.battery") ?? "Battery"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-accent/40 p-2 text-center">
                    <div className="flex items-center justify-center gap-1 font-medium tabular-nums">
                      {signal > 50 ? (
                        <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                      ) : signal > 20 ? (
                        <SignalLow className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-rose-600" />
                      )}
                      {signal}%
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("devices.signal") ?? "Signal"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-accent/40 p-2 text-center">
                    <div className="font-medium tabular-nums">
                      {d.last_seen ? timeAgo(new Date(d.last_seen), true) : "—"}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("devices.lastSeen") ?? "Last seen"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Device Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-lg">
          {selectedDevice && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  {selectedDevice.name ?? selectedDevice.serial}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {selectedDevice.serial}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Status strip */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedDevice.status} />
                  {selectedDevice.status === "calibration_due" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-violet-700">
                      <FlaskConical className="h-3 w-3" />
                      {t("devices.calDue") ?? "Calibration due"}
                    </span>
                  )}
                  {selectedDevice.status === "maintenance_due" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-sky-700">
                      <Wrench className="h-3 w-3" />
                      {t("devices.maintenance") ?? "Maintenance due"}
                    </span>
                  )}
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/70 bg-accent/30 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("devices.battery") ?? "Battery"}
                    </div>
                    <div
                      className={cn(
                        "mt-1 flex items-center gap-1.5 text-lg font-bold tabular-nums",
                        (selectedDevice.battery_pct ?? 0) < 25 && "text-amber-600",
                      )}
                    >
                      {(selectedDevice.battery_pct ?? 0) < 25 ? (
                        <BatteryLow className="h-4 w-4" />
                      ) : (
                        <Battery className="h-4 w-4" />
                      )}
                      {selectedDevice.battery_pct ?? 0}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-accent/30 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("devices.signal") ?? "Signal"}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-lg font-bold tabular-nums">
                      {(selectedDevice.signal_pct ?? 0) > 30 ? (
                        <Wifi className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-rose-600" />
                      )}
                      {selectedDevice.signal_pct ?? 0}%
                    </div>
                  </div>
                </div>

                {/* Info rows */}
                <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
                  <DrawerRow
                    icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                    label={t("devices.farm") ?? "Farm"}
                    value={selectedFarm?.name ?? "—"}
                  />
                  <DrawerRow
                    icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                    label={t("devices.pond") ?? "Pond"}
                    value={selectedPond?.name ?? "—"}
                  />
                  <DrawerRow
                    icon={<HardDrive className="h-4 w-4 text-muted-foreground" />}
                    label={t("devices.firmware") ?? "Firmware"}
                    value={selectedDevice.firmware_version ?? "—"}
                  />
                  <DrawerRow
                    icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
                    label={t("devices.hardware") ?? "Hardware"}
                    value={selectedDevice.hardware_version ?? "—"}
                  />
                  <DrawerRow
                    icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                    label={t("devices.lastSeen") ?? "Last seen"}
                    value={
                      selectedDevice.last_seen
                        ? new Date(selectedDevice.last_seen).toLocaleString()
                        : "—"
                    }
                  />
                </div>

                {/* Actions */}
                {canServiceDevices && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      asChild
                      onClick={() => setDrawerOpen(false)}
                    >
                      <Link
                        to="/app/calibration/$deviceId"
                        params={{ deviceId: selectedDevice.id }}
                      >
                        <FlaskConical className="mr-2 h-4 w-4" />
                        {t("devices.calibrate") ?? "Calibrate"}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      asChild
                      onClick={() => setDrawerOpen(false)}
                    >
                      <Link
                        to="/app/maintenance/$deviceId"
                        params={{ deviceId: selectedDevice.id }}
                      >
                        <Wrench className="mr-2 h-4 w-4" />
                        {t("devices.maintenance") ?? "Maintenance"}
                      </Link>
                    </Button>
                  </div>
                )}
                <Button className="w-full" asChild onClick={() => setDrawerOpen(false)}>
                  <Link to="/app/devices/$deviceId" params={{ deviceId: selectedDevice.id }}>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    {t("devices.viewDetail") ?? "View full detail"}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DrawerRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function timeAgo(date: Date, short = false): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return short ? `${days}d` : `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return short ? `${hours}h` : `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return short ? `${minutes}m` : `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}
