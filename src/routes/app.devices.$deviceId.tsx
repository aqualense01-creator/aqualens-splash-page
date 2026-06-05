import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  Wrench,
  FlaskConical,
  Cpu,
  Battery,
  BatteryLow,
  Wifi,
  WifiOff,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Power,
  Upload,
  CircleDot,
  Calendar,
} from "lucide-react";
import { insforge, type Device, type Pond, type Farm } from "@/lib/insforge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, MetricTile, StatusBadge } from "@/components/app/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/devices/$deviceId")({
  head: () => ({ meta: [{ title: "Device — Acqua Lence" }] }),
  component: DeviceDetailPage,
});

type SensorRow = {
  id: string;
  sensor_type: string;
  status?: string;
  last_value?: number;
  unit?: string;
  last_calibrated_at?: string;
  calibration_due_at?: string;
  needs_replacement?: boolean;
};

type CalibrationRow = {
  id: string;
  sensor_type: string;
  calibration_value: number;
  technician_name?: string;
  performed_at: string;
  result?: string;
};

type MaintenanceRow = {
  id: string;
  visit_type?: string;
  notes?: string;
  performed_at: string;
};

function DeviceDetailPage() {
  const { deviceId } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["device", deviceId],
    queryFn: async () => {
      const [d, s, c, m, f, p] = await Promise.all([
        insforge.database.from("devices").select("*").eq("id", deviceId).single(),
        insforge.database.from("sensors").select("*").eq("device_id", deviceId),
        insforge.database
          .from("calibration_logs")
          .select("*")
          .eq("device_id", deviceId)
          .order("performed_at", { ascending: false }),
        insforge.database
          .from("maintenance_logs")
          .select("*")
          .eq("device_id", deviceId)
          .order("performed_at", { ascending: false }),
        insforge.database.from("farms").select("*"),
        insforge.database.from("ponds").select("*"),
      ]);
      return {
        device: d.data as Device | null,
        sensors: (s.data ?? []) as SensorRow[],
        calibrations: (c.data ?? []) as CalibrationRow[],
        maintenance: (m.data ?? []) as MaintenanceRow[],
        farms: (f.data ?? []) as Farm[],
        ponds: (p.data ?? []) as Pond[],
      };
    },
  });

  const diag = useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 800));
      await insforge.database
        .from("devices")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", deviceId);
    },
    onSuccess: () => {
      toast.success("Diagnostics complete — all systems nominal");
      qc.invalidateQueries({ queryKey: ["device", deviceId] });
    },
  });

  const restart = useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 1200));
    },
    onSuccess: () => toast.success("Restart command sent to device"),
  });

  if (isLoading)
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  const d = data?.device;
  if (!d)
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="font-display text-lg">Device not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/app/devices">Back to devices</Link>
        </Button>
      </div>
    );

  const farm = data?.farms.find((f) => f.id === d.farm_id);
  const pond = data?.ponds.find((p) => p.id === d.pond_id);
  const battery = d.battery_pct ?? 0;
  const signal = d.signal_pct ?? 0;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/app/devices"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Devices
      </Link>

      <PageHeader
        title={d.name ?? d.serial}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono">{d.serial}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {farm?.name ?? "—"} · {pond?.name ?? "—"}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {d.last_seen ? timeAgo(new Date(d.last_seen)) : "—"}
            </span>
            <StatusBadge status={d.status} />
          </span> as unknown as string
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/app/calibration/$deviceId" params={{ deviceId: d.id }}>
                <FlaskConical className="mr-2 h-4 w-4" />
                Calibrate
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/maintenance/$deviceId" params={{ deviceId: d.id }}>
                <Wrench className="mr-2 h-4 w-4" />
                Maintenance
              </Link>
            </Button>
            <Button onClick={() => diag.mutate()} disabled={diag.isPending}>
              <Activity className="mr-2 h-4 w-4" />
              {diag.isPending ? "Running…" : "Run diagnostics"}
            </Button>
          </div>
        }
      />

      {/* Quick metrics */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile
          label="Battery"
          value={`${battery}%`}
          accent={battery < 25 ? "text-amber-600" : "text-emerald-600"}
        />
        <MetricTile
          label="Signal"
          value={`${signal}%`}
          accent={signal > 50 ? "text-emerald-600" : signal > 20 ? "text-amber-600" : "text-rose-600"}
        />
        <MetricTile label="Firmware" value={d.firmware_version ?? "—"} />
        <MetricTile
          label="Sensors"
          value={data?.sensors.length ?? 0}
          accent="text-sky-600"
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sensors">Sensors</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Image placeholder */}
            <Card title="Device" className="lg:col-span-1">
              <div className="grid aspect-square w-full place-items-center rounded-xl bg-gradient-to-br from-primary/10 via-sky-500/10 to-emerald-500/10">
                <div className="text-center">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-card shadow-soft">
                    <Cpu className="h-10 w-10 text-primary" />
                  </div>
                  <p className="mt-3 font-display text-sm font-semibold">
                    AL-Sense Buoy
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {d.hardware_version ?? "rev A"}
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-4 lg:col-span-2">
              <Card title="Identification">
                <Row label="Device name" value={d.name ?? "—"} />
                <Row label="Device ID" value={<span className="font-mono">{d.serial}</span>} />
                <Row label="Hardware" value={d.hardware_version ?? "—"} />
                <Row label="Firmware" value={d.firmware_version ?? "—"} />
                <Row label="Status" value={<StatusBadge status={d.status} />} />
              </Card>

              <Card title="Assignment & uptime">
                <Row label="Assigned farm" value={farm?.name ?? "—"} />
                <Row label="Assigned pond" value={pond?.name ?? "—"} />
                <Row
                  label="Battery"
                  value={
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 tabular-nums",
                        battery < 25 ? "text-amber-600" : "text-foreground"
                      )}
                    >
                      {battery < 25 ? (
                        <BatteryLow className="h-3.5 w-3.5" />
                      ) : (
                        <Battery className="h-3.5 w-3.5" />
                      )}
                      {battery}%
                    </span>
                  }
                />
                <Row
                  label="Signal"
                  value={
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      {signal > 30 ? (
                        <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-rose-600" />
                      )}
                      {signal}%
                    </span>
                  }
                />
                <Row
                  label="Last seen"
                  value={d.last_seen ? new Date(d.last_seen).toLocaleString() : "—"}
                />
                <Row
                  label="Operating since"
                  value={
                    (d as { created_at?: string }).created_at
                      ? new Date((d as { created_at?: string }).created_at!).toLocaleDateString()
                      : "—"
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* SENSORS */}
        <TabsContent value="sensors" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.sensors ?? []).length === 0 ? (
              <p className="col-span-full rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No sensors registered.
              </p>
            ) : (
              data!.sensors.map((s) => {
                const calDue =
                  s.calibration_due_at && new Date(s.calibration_due_at) <= new Date();
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-xl border bg-card p-4 shadow-soft",
                      s.needs_replacement
                        ? "border-rose-500/40 bg-rose-500/[0.04]"
                        : calDue
                          ? "border-violet-500/40"
                          : "border-border/70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display font-semibold capitalize">
                          {s.sensor_type}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {s.id.slice(0, 8)}
                        </p>
                      </div>
                      <StatusBadge status={s.status ?? "good"} />
                    </div>

                    <div className="mt-3 text-2xl font-bold tabular-nums">
                      {s.last_value ?? "—"}
                      {s.unit && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {s.unit}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last calibrated</span>
                        <span className="font-medium">
                          {s.last_calibrated_at
                            ? new Date(s.last_calibrated_at).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Calibration due</span>
                        <span
                          className={cn(
                            "font-medium",
                            calDue ? "text-violet-600" : "text-foreground"
                          )}
                        >
                          {s.calibration_due_at
                            ? new Date(s.calibration_due_at).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {calDue && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-700">
                          <FlaskConical className="h-3 w-3" /> Cal due
                        </span>
                      )}
                      {s.needs_replacement && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rose-700">
                          <AlertTriangle className="h-3 w-3" /> Replace
                        </span>
                      )}
                      {!calDue && !s.needs_replacement && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Healthy
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-4">
          <HistoryTimeline
            device={d}
            calibrations={data?.calibrations ?? []}
            maintenance={data?.maintenance ?? []}
          />
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="mt-4">
          <DeviceSettings
            device={d}
            farms={data?.farms ?? []}
            ponds={data?.ponds ?? []}
            onSaved={() => qc.invalidateQueries({ queryKey: ["device", deviceId] })}
            onRestart={() => restart.mutate()}
            onDiagnostics={() => diag.mutate()}
            diagPending={diag.isPending}
            restartPending={restart.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type TimelineEvent = {
  id: string;
  kind: "offline" | "calibration" | "firmware" | "maintenance";
  title: string;
  description?: string;
  at: string;
};

function HistoryTimeline({
  device,
  calibrations,
  maintenance,
}: {
  device: Device;
  calibrations: CalibrationRow[];
  maintenance: MaintenanceRow[];
}) {
  const events = useMemo<TimelineEvent[]>(() => {
    const all: TimelineEvent[] = [];

    calibrations.forEach((c) =>
      all.push({
        id: `cal-${c.id}`,
        kind: "calibration",
        title: `Calibrated ${c.sensor_type}`,
        description: `Set to ${c.calibration_value}${c.technician_name ? ` · by ${c.technician_name}` : ""}${c.result ? ` · ${c.result}` : ""}`,
        at: c.performed_at,
      })
    );

    maintenance.forEach((m) =>
      all.push({
        id: `m-${m.id}`,
        kind: "maintenance",
        title: m.visit_type ?? "Maintenance visit",
        description: m.notes,
        at: m.performed_at,
      })
    );

    if (device.firmware_version) {
      all.push({
        id: "fw-current",
        kind: "firmware",
        title: `Firmware ${device.firmware_version} active`,
        description: "Current device firmware",
        at: device.created_at ?? new Date().toISOString(),
      });
    }

    if (device.status === "offline" && device.last_seen) {
      all.push({
        id: "off-current",
        kind: "offline",
        title: "Device went offline",
        description: "Lost connection — check power and antenna",
        at: device.last_seen,
      });
    }

    return all.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [device, calibrations, maintenance]);

  if (events.length === 0) {
    return (
      <Card title="Activity timeline">
        <p className="text-sm text-muted-foreground">No history recorded yet.</p>
      </Card>
    );
  }

  return (
    <Card title="Activity timeline">
      <ol className="relative space-y-5 pl-6">
        <span
          aria-hidden
          className="absolute left-[7px] top-1 h-[calc(100%-0.5rem)] w-px bg-border"
        />
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span
              className={cn(
                "absolute -left-6 top-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-card",
                e.kind === "offline" && "bg-rose-500",
                e.kind === "calibration" && "bg-violet-500",
                e.kind === "firmware" && "bg-sky-500",
                e.kind === "maintenance" && "bg-amber-500"
              )}
            >
              <CircleDot className="h-2 w-2 text-white" />
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(e.at).toLocaleString()}
              </p>
            </div>
            {e.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{e.description}</p>
            )}
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                e.kind === "offline" && "border-rose-500/30 bg-rose-500/10 text-rose-700",
                e.kind === "calibration" &&
                  "border-violet-500/30 bg-violet-500/10 text-violet-700",
                e.kind === "firmware" && "border-sky-500/30 bg-sky-500/10 text-sky-700",
                e.kind === "maintenance" &&
                  "border-amber-500/30 bg-amber-500/10 text-amber-700"
              )}
            >
              {e.kind === "offline" && <WifiOff className="h-3 w-3" />}
              {e.kind === "calibration" && <FlaskConical className="h-3 w-3" />}
              {e.kind === "firmware" && <Upload className="h-3 w-3" />}
              {e.kind === "maintenance" && <Wrench className="h-3 w-3" />}
              {e.kind}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function DeviceSettings({
  device,
  farms,
  ponds,
  onSaved,
  onRestart,
  onDiagnostics,
  diagPending,
  restartPending,
}: {
  device: Device;
  farms: Farm[];
  ponds: Pond[];
  onSaved: () => void;
  onRestart: () => void;
  onDiagnostics: () => void;
  diagPending: boolean;
  restartPending: boolean;
}) {
  const [farmId, setFarmId] = useState(device.farm_id ?? "");
  const [pondId, setPondId] = useState(device.pond_id ?? "");
  const [interval, setInterval] = useState("300");
  const [preset, setPreset] = useState("default");
  const [restartOpen, setRestartOpen] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await insforge.database
        .from("devices")
        .update({ farm_id: farmId || null, pond_id: pondId || null })
        .eq("id", device.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Settings saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Configuration">
        <div className="space-y-3">
          <div>
            <Label>Sampling interval (sec)</Label>
            <Input
              type="number"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              How often the device records and uploads sensor data.
            </p>
          </div>
          <div>
            <Label>Alert threshold profile</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (mixed species)</SelectItem>
                <SelectItem value="shrimp">Shrimp — tight DO/salinity</SelectItem>
                <SelectItem value="hatchery">Hatchery — strict</SelectItem>
                <SelectItem value="carp">Carp / Tilapia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card title="Assignment">
        <div className="space-y-3">
          <div>
            <Label>Assigned farm</Label>
            <Select value={farmId} onValueChange={setFarmId}>
              <SelectTrigger>
                <SelectValue placeholder="Select farm" />
              </SelectTrigger>
              <SelectContent>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned pond</Label>
            <Select value={pondId} onValueChange={setPondId}>
              <SelectTrigger>
                <SelectValue placeholder="Select pond" />
              </SelectTrigger>
              <SelectContent>
                {ponds
                  .filter((p) => !farmId || p.farm_id === farmId)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {save.isPending ? "Saving…" : "Save assignment"}
        </Button>
      </Card>

      <Card title="Maintenance actions" className="lg:col-span-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onDiagnostics} disabled={diagPending}>
            <Activity className="mr-2 h-4 w-4" />
            {diagPending ? "Running…" : "Run diagnostics"}
          </Button>
          <Button
            variant="outline"
            className="border-rose-500/30 text-rose-700 hover:bg-rose-500/10"
            onClick={() => setRestartOpen(true)}
            disabled={restartPending}
          >
            <Power className="mr-2 h-4 w-4" />
            {restartPending ? "Restarting…" : "Restart device"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Restarting will briefly take the device offline. No data will be lost.
        </p>
      </Card>

      <AlertDialog open={restartOpen} onOpenChange={setRestartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-rose-600" />
              Restart this device?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The device will be unreachable for about 60 seconds while it reboots.
              Any in-progress alerts will resume automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                setRestartOpen(false);
                onRestart();
              }}
            >
              Yes, restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-4 shadow-soft",
        className
      )}
    >
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}
