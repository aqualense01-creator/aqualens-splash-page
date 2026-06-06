import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { useAuth } from "@/lib/auth";
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
  last_calibrated?: string;
  calibration_due?: string;
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

type DeviceCommandRow = {
  id: string;
  command_type: "diagnostics" | "restart" | "config_update" | string;
  status: string;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  error_message?: string | null;
  requested_by?: string | null;
  queued_at?: string | null;
  created_at: string;
  expires_at?: string | null;
};

type DeviceConfigRow = {
  device_id: string;
  sampling_interval_seconds: number;
  threshold_profile: string;
  version?: number;
  updated_at?: string;
};

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

function isMissingDeviceCommandBackend(error: unknown) {
  const message = dbErrorMessage(error, "").toLowerCase();
  return (
    message.includes("device_commands") ||
    message.includes("device_configurations") ||
    message.includes("enqueue_device_command") ||
    message.includes("schema cache")
  );
}

function DeviceDetailPage() {
  const { deviceId } = Route.useParams();
  const qc = useQueryClient();
  const { isAdmin, isTechnician } = useAuth();
  const canServiceDevice = isAdmin || isTechnician;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["device", deviceId],
    queryFn: async () => {
      const [d, s, c, m, f, p, commandRes, configRes] = await Promise.all([
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
        insforge.database
          .from("device_commands")
          .select("*")
          .eq("device_id", deviceId)
          .order("created_at", { ascending: false })
          .limit(12),
        insforge.database
          .from("device_configurations")
          .select("*")
          .eq("device_id", deviceId)
          .maybeSingle(),
      ]);
      assertDbOk(d, "Failed to load device");
      assertDbOk(s, "Failed to load sensors");
      assertDbOk(c, "Failed to load calibration history");
      assertDbOk(m, "Failed to load maintenance history");
      assertDbOk(f, "Failed to load farms");
      assertDbOk(p, "Failed to load ponds");
      if (commandRes.error && !isMissingDeviceCommandBackend(commandRes.error)) {
        assertDbOk(commandRes, "Failed to load device commands");
      }
      if (configRes.error && !isMissingDeviceCommandBackend(configRes.error)) {
        assertDbOk(configRes, "Failed to load device configuration");
      }
      return {
        device: d.data as Device | null,
        sensors: (s.data ?? []) as SensorRow[],
        calibrations: (c.data ?? []) as CalibrationRow[],
        maintenance: (m.data ?? []) as MaintenanceRow[],
        farms: (f.data ?? []) as Farm[],
        ponds: (p.data ?? []) as Pond[],
        commands: commandRes.error ? [] : ((commandRes.data ?? []) as DeviceCommandRow[]),
        config: configRes.error ? null : (configRes.data as DeviceConfigRow | null),
      };
    },
  });

  const diag = useMutation({
    mutationFn: async () => {
      if (!canServiceDevice) throw new Error("Technician access is required to run diagnostics.");
      const { error } = await insforge.database.rpc("enqueue_device_command", {
        _device_id: deviceId,
        _command_type: "diagnostics",
        _payload: { source: "device_detail" },
        _idempotency_key: crypto.randomUUID(),
      });
      if (error) {
        if (isMissingDeviceCommandBackend(error)) {
          throw new Error("Device command backend has not been deployed yet.");
        }
        throw new Error(dbErrorMessage(error, "Could not queue diagnostics"));
      }
    },
    onSuccess: () => {
      toast.success("Diagnostics command queued");
      qc.invalidateQueries({ queryKey: ["device", deviceId] });
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Could not queue diagnostics")),
  });

  const restart = useMutation({
    mutationFn: async () => {
      if (!canServiceDevice) throw new Error("Technician access is required to restart devices.");
      const { error } = await insforge.database.rpc("enqueue_device_command", {
        _device_id: deviceId,
        _command_type: "restart",
        _payload: { source: "device_detail" },
        _idempotency_key: crypto.randomUUID(),
      });
      if (error) {
        if (isMissingDeviceCommandBackend(error)) {
          throw new Error("Device command backend has not been deployed yet.");
        }
        throw new Error(dbErrorMessage(error, "Could not queue restart"));
      }
    },
    onSuccess: () => {
      toast.success("Restart command queued");
      qc.invalidateQueries({ queryKey: ["device", deviceId] });
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Could not queue restart")),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (isError)
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="font-display text-lg">Device did not load</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {dbErrorMessage(error, "Please refresh and try again.")}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
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
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canServiceDevice && (
              <>
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
                  {diag.isPending ? "Queueing..." : "Run diagnostics"}
                </Button>
              </>
            )}
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
          accent={
            signal > 50 ? "text-emerald-600" : signal > 20 ? "text-amber-600" : "text-rose-600"
          }
        />
        <MetricTile label="Firmware" value={d.firmware_version ?? "—"} />
        <MetricTile label="Sensors" value={data?.sensors.length ?? 0} accent="text-sky-600" />
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
                  <p className="mt-3 font-display text-sm font-semibold">AL-Sense Buoy</p>
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
                        battery < 25 ? "text-amber-600" : "text-foreground",
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
                  }
                />
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
                const lastCalibrated = s.last_calibrated_at ?? s.last_calibrated;
                const calibrationDue = s.calibration_due_at ?? s.calibration_due;
                const calDue = calibrationDue && new Date(calibrationDue) <= new Date();
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-xl border bg-card p-4 shadow-soft",
                      s.needs_replacement
                        ? "border-rose-500/40 bg-rose-500/[0.04]"
                        : calDue
                          ? "border-violet-500/40"
                          : "border-border/70",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display font-semibold capitalize">{s.sensor_type}</p>
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
                          {lastCalibrated ? new Date(lastCalibrated).toLocaleDateString() : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Calibration due</span>
                        <span
                          className={cn(
                            "font-medium",
                            calDue ? "text-violet-600" : "text-foreground",
                          )}
                        >
                          {calibrationDue ? new Date(calibrationDue).toLocaleDateString() : "—"}
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
            config={data?.config ?? null}
            commands={data?.commands ?? []}
            canServiceDevice={canServiceDevice}
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
      }),
    );

    maintenance.forEach((m) =>
      all.push({
        id: `m-${m.id}`,
        kind: "maintenance",
        title: m.visit_type ?? "Maintenance visit",
        description: m.notes,
        at: m.performed_at,
      }),
    );

    if (device.firmware_version) {
      all.push({
        id: "fw-current",
        kind: "firmware",
        title: `Firmware ${device.firmware_version} active`,
        description: "Current device firmware",
        at:
          (device as { created_at?: string }).created_at ??
          device.last_seen ??
          new Date().toISOString(),
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
                e.kind === "maintenance" && "bg-amber-500",
              )}
            >
              <CircleDot className="h-2 w-2 text-white" />
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString()}</p>
            </div>
            {e.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{e.description}</p>
            )}
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                e.kind === "offline" && "border-rose-500/30 bg-rose-500/10 text-rose-700",
                e.kind === "calibration" && "border-violet-500/30 bg-violet-500/10 text-violet-700",
                e.kind === "firmware" && "border-sky-500/30 bg-sky-500/10 text-sky-700",
                e.kind === "maintenance" && "border-amber-500/30 bg-amber-500/10 text-amber-700",
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
  config,
  commands,
  canServiceDevice,
  onSaved,
  onRestart,
  onDiagnostics,
  diagPending,
  restartPending,
}: {
  device: Device;
  farms: Farm[];
  ponds: Pond[];
  config: DeviceConfigRow | null;
  commands: DeviceCommandRow[];
  canServiceDevice: boolean;
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

  useEffect(() => {
    setFarmId(device.farm_id ?? "");
    setPondId(device.pond_id ?? "");
  }, [device.farm_id, device.pond_id]);

  useEffect(() => {
    setInterval(String(config?.sampling_interval_seconds ?? 300));
    setPreset(config?.threshold_profile ?? "default");
  }, [config?.sampling_interval_seconds, config?.threshold_profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!canServiceDevice) throw new Error("Technician access is required to update devices.");

      const intervalNumber = Number(interval);
      if (!Number.isInteger(intervalNumber) || intervalNumber < 30 || intervalNumber > 86400) {
        throw new Error("Sampling interval must be between 30 seconds and 24 hours.");
      }

      const result = await insforge.database.rpc("save_device_configuration", {
        _device_id: device.id,
        _farm_id: farmId || null,
        _pond_id: pondId || null,
        _sampling_interval_seconds: intervalNumber,
        _threshold_profile: preset,
        _idempotency_key: crypto.randomUUID(),
      });
      if (result.error) {
        if (isMissingDeviceCommandBackend(result.error)) {
          throw new Error("Device command backend has not been deployed yet.");
        }
        throw new Error(dbErrorMessage(result.error, "Could not save device settings"));
      }
    },
    onSuccess: () => {
      toast.success("Settings saved and command queued");
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
              min={30}
              max={86400}
              step={30}
              value={interval}
              disabled={!canServiceDevice}
              onChange={(e) => setInterval(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              How often the device records and uploads sensor data.
            </p>
          </div>
          <div>
            <Label>Alert threshold profile</Label>
            <Select value={preset} onValueChange={setPreset} disabled={!canServiceDevice}>
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
            <Select value={farmId} onValueChange={setFarmId} disabled={!canServiceDevice}>
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
            <Select value={pondId} onValueChange={setPondId} disabled={!canServiceDevice}>
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
          disabled={save.isPending || !canServiceDevice}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {save.isPending ? "Saving..." : "Save settings"}
        </Button>
      </Card>

      {canServiceDevice && (
        <Card title="Maintenance actions" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onDiagnostics} disabled={diagPending}>
              <Activity className="mr-2 h-4 w-4" />
              {diagPending ? "Queueing..." : "Run diagnostics"}
            </Button>
            <Button
              variant="outline"
              className="border-rose-500/30 text-rose-700 hover:bg-rose-500/10"
              onClick={() => setRestartOpen(true)}
              disabled={restartPending}
            >
              <Power className="mr-2 h-4 w-4" />
              {restartPending ? "Queueing..." : "Restart device"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Commands are queued for the device and completed when the hardware acknowledges them.
          </p>
        </Card>
      )}

      <CommandHistory commands={commands} />

      <AlertDialog open={restartOpen} onOpenChange={setRestartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-rose-600" />
              Restart this device?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The device will be unreachable for about 60 seconds while it reboots. Any in-progress
              alerts will resume automatically.
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

function CommandHistory({ commands }: { commands: DeviceCommandRow[] }) {
  return (
    <Card title="Command queue" className="lg:col-span-2">
      {commands.length === 0 ? (
        <p className="text-sm text-muted-foreground">No device commands queued yet.</p>
      ) : (
        <div className="space-y-2">
          {commands.map((command) => (
            <div
              key={command.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium capitalize">
                  {command.command_type.replace(/_/g, " ")}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(command.created_at ?? command.queued_at ?? "").toLocaleString()}
                </p>
              </div>
              <CommandStatusPill status={command.status} />
              {command.error_message && (
                <p className="basis-full text-xs text-rose-600">{command.error_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function CommandStatusPill({ status }: { status: string }) {
  const classes =
    status === "succeeded"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : status === "failed" || status === "expired" || status === "cancelled"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
        : status === "sent" || status === "acknowledged"
          ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        classes,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
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
    <div className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-soft", className)}>
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
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
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
