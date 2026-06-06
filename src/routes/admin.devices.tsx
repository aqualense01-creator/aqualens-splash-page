import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Cpu,
  BatteryLow,
  Signal,
  Download,
  Wrench,
  UserCog,
  Power,
  Flag,
  MoreHorizontal,
  AlertTriangle,
  Wifi,
  ChevronRight,
  History,
  Building2,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import {
  insforge,
  type AppRole,
  type Device,
  type Farm,
  type Pond,
  type Profile,
  type Alert,
} from "@/lib/insforge";
import { PageHeader, MetricTile, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/devices")({
  head: () => ({ meta: [{ title: "Admin · Devices — Acqua Lence" }] }),
  component: AdminDevices,
});

// Some installations carry extra fields that aren't in the canonical Device
// type yet. Read them defensively without forcing a schema change.
type DeviceExtras = {
  sim_iccid?: string | null;
  network?: string | null;
  warranty_until?: string | null;
  warranty_status?: string | null;
  calibration_due?: string | null;
  last_calibrated?: string | null;
  assigned_technician_id?: string | null;
  flagged?: boolean | null;
  flag_reason?: string | null;
};
type DeviceRow = Device &
  DeviceExtras & {
    customerName?: string | null;
    farmName?: string | null;
    pondName?: string | null;
    district?: string | null;
    calStatus?: "ok" | "due" | "overdue" | "unknown";
    latestCommand?: DeviceCommandRow | null;
    hasPendingCommand?: boolean;
  };

type DeviceCommandRow = {
  id: string;
  device_id: string;
  command_type: string;
  status: string;
  error_message?: string | null;
  created_at?: string | null;
  queued_at?: string | null;
  updated_at?: string | null;
};

type UserRoleRow = { id: string; user_id: string; role: AppRole };
type AdminCommandType = "maintenance_due" | "deactivate";

const PENDING_COMMAND_STATUSES = new Set(["queued", "sent", "acknowledged"]);

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
    message.includes("enqueue_device_command") ||
    message.includes("schema cache")
  );
}

function commandLabel(type: string) {
  const labels: Record<string, string> = {
    diagnostics: "Diagnostics",
    restart: "Restart",
    config_update: "Configuration update",
    maintenance_due: "Maintenance check",
    deactivate: "Deactivate",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}

type FilterState = {
  q: string;
  status: string;
  district: string;
  firmware: string;
  calibration: "all" | "ok" | "due" | "overdue";
  assignment: "all" | "assigned" | "unassigned";
  maintenance: "all" | "due";
};

const DEFAULTS: FilterState = {
  q: "",
  status: "all",
  district: "all",
  firmware: "all",
  calibration: "all",
  assignment: "all",
  maintenance: "all",
};

function AdminDevices() {
  const qc = useQueryClient();
  const [f, setF] = useState<FilterState>(DEFAULTS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openDevice, setOpenDevice] = useState<DeviceRow | null>(null);
  const [tab, setTab] = useState("overview");
  const [confirmDeactivate, setConfirmDeactivate] = useState<DeviceRow[] | null>(null);
  const [flagDialog, setFlagDialog] = useState<{
    open: boolean;
    devices: DeviceRow[];
    reason: string;
  }>({ open: false, devices: [], reason: "" });
  const [techDialog, setTechDialog] = useState<{
    open: boolean;
    devices: DeviceRow[];
    techId: string;
  }>({ open: false, devices: [], techId: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-devices-all"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [devices, farms, ponds, profiles, alerts, roles, commands] = await Promise.all([
        insforge.database.from("devices").select("*").order("serial"),
        insforge.database.from("farms").select("*"),
        insforge.database.from("ponds").select("*"),
        insforge.database.from("profiles").select("*"),
        insforge.database
          .from("alerts")
          .select("*")
          .order("detected_at", { ascending: false })
          .limit(200),
        insforge.database.from("user_roles").select("*"),
        insforge.database
          .from("device_commands")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      assertDbOk(devices, "Failed to load devices");
      assertDbOk(farms, "Failed to load farms");
      assertDbOk(ponds, "Failed to load ponds");
      assertDbOk(profiles, "Failed to load profiles");
      assertDbOk(alerts, "Failed to load alerts");
      assertDbOk(roles, "Failed to load user roles");
      if (commands.error && !isMissingDeviceCommandBackend(commands.error)) {
        assertDbOk(commands, "Failed to load device commands");
      }

      const maintenanceLogs = await insforge.database
        .from("maintenance_logs")
        .select("*")
        .order("performed_at", { ascending: false })
        .limit(500);
      assertDbOk(maintenanceLogs, "Failed to load maintenance logs");

      return {
        devices: (devices.data ?? []) as DeviceRow[],
        farms: (farms.data ?? []) as Farm[],
        ponds: (ponds.data ?? []) as Pond[],
        profiles: (profiles.data ?? []) as Profile[],
        alerts: (alerts.data ?? []) as Alert[],
        roles: (roles.data ?? []) as UserRoleRow[],
        maintenance: maintenanceLogs.data ?? [],
        commands: commands.error ? [] : ((commands.data ?? []) as DeviceCommandRow[]),
      };
    },
  });

  const devices = useMemo(() => data?.devices ?? [], [data?.devices]);
  const farms = useMemo(() => data?.farms ?? [], [data?.farms]);
  const ponds = useMemo(() => data?.ponds ?? [], [data?.ponds]);
  const profiles = useMemo(() => data?.profiles ?? [], [data?.profiles]);
  const alerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);
  const roles = useMemo(() => data?.roles ?? [], [data?.roles]);
  const maintenance = useMemo(() => data?.maintenance ?? [], [data?.maintenance]);
  const commands = useMemo(() => data?.commands ?? [], [data?.commands]);

  const technicians = useMemo(() => {
    const technicianIds = new Set(
      roles.filter((r) => r.role === "technician" || r.role === "admin").map((r) => r.user_id),
    );
    return profiles.filter((p) => technicianIds.has(p.id));
  }, [profiles, roles]);

  const latestCommandByDevice = useMemo(() => {
    const latest = new Map<string, DeviceCommandRow>();
    commands.forEach((command) => {
      if (!latest.has(command.device_id)) latest.set(command.device_id, command);
    });
    return latest;
  }, [commands]);

  // === Enrichment ===
  type Enriched = DeviceRow & {
    customerName: string | null;
    farmName: string | null;
    pondName: string | null;
    district: string | null;
    calStatus: "ok" | "due" | "overdue" | "unknown";
    latestCommand: DeviceCommandRow | null;
    hasPendingCommand: boolean;
  };

  const enriched: Enriched[] = useMemo(() => {
    const now = Date.now();
    return devices.map((d) => {
      const farm = farms.find((x) => x.id === d.farm_id) ?? null;
      const pond = ponds.find((x) => x.id === d.pond_id) ?? null;
      const owner = farm ? (profiles.find((p) => p.id === farm.owner_id) ?? null) : null;
      let calStatus: Enriched["calStatus"] = "unknown";
      if (d.calibration_due) {
        const due = new Date(d.calibration_due).getTime();
        if (Number.isFinite(due)) {
          if (due < now) calStatus = "overdue";
          else if (due - now < 1000 * 60 * 60 * 24 * 14) calStatus = "due";
          else calStatus = "ok";
        }
      } else if (d.status === "calibration_due") {
        calStatus = "due";
      } else if (d.last_calibrated) {
        calStatus = "ok";
      }
      return {
        ...d,
        customerName: owner?.full_name ?? null,
        farmName: farm?.name ?? null,
        pondName: pond?.name ?? null,
        district: farm?.district ?? null,
        calStatus,
        latestCommand: latestCommandByDevice.get(d.id) ?? null,
        hasPendingCommand: PENDING_COMMAND_STATUSES.has(
          latestCommandByDevice.get(d.id)?.status ?? "",
        ),
      };
    });
  }, [devices, farms, ponds, profiles, latestCommandByDevice]);

  const districts = useMemo(
    () => Array.from(new Set(enriched.map((d) => d.district).filter(Boolean))).sort() as string[],
    [enriched],
  );
  const firmwares = useMemo(
    () =>
      Array.from(
        new Set(enriched.map((d) => d.firmware_version).filter(Boolean)),
      ).sort() as string[],
    [enriched],
  );

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return enriched.filter((d) => {
      if (q) {
        const hay = [d.serial, d.name, d.customerName, d.farmName, d.pondName, d.sim_iccid]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (f.status !== "all" && d.status !== f.status) return false;
      if (f.district !== "all" && d.district !== f.district) return false;
      if (f.firmware !== "all" && d.firmware_version !== f.firmware) return false;
      if (f.calibration !== "all" && d.calStatus !== f.calibration) return false;
      if (f.assignment === "assigned" && !d.farm_id) return false;
      if (f.assignment === "unassigned" && d.farm_id) return false;
      if (
        f.maintenance === "due" &&
        d.status !== "maintenance_due" &&
        d.status !== "calibration_due"
      )
        return false;
      return true;
    });
  }, [enriched, f]);

  const total = devices.length;
  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;
  const maintDue = devices.filter(
    (d) => d.status === "maintenance_due" || d.status === "calibration_due",
  ).length;
  const unassigned = devices.filter((d) => !d.farm_id).length;

  // === Selection ===
  const allFilteredSelected = filtered.length > 0 && filtered.every((d) => selected.has(d.id));
  const someSelected = filtered.some((d) => selected.has(d.id));
  const selectedDevices = enriched.filter((d) => selected.has(d.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selected);
      filtered.forEach((d) => next.delete(d.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((d) => next.add(d.id));
      setSelected(next);
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  // === Mutations ===
  const patchDevices = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Record<string, unknown> }) => {
      const results = await Promise.all(
        ids.map((id) => insforge.database.from("devices").update(patch).eq("id", id)),
      );
      results.forEach((result) => assertDbOk(result, "Device update failed"));
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-devices-all"] });
      toast.success(`${v.ids.length} device${v.ids.length === 1 ? "" : "s"} updated`);
    },
    onError: (e: Error) => {
      qc.invalidateQueries({ queryKey: ["admin-devices-all"] });
      toast.error(e.message || "Update failed");
    },
  });

  const queueDeviceCommands = useMutation({
    mutationFn: async ({
      devices: targetDevices,
      commandType,
      payload,
      afterQueuePatch,
    }: {
      devices: DeviceRow[];
      commandType: AdminCommandType;
      payload?: Record<string, unknown>;
      afterQueuePatch?: Record<string, unknown>;
    }) => {
      if (targetDevices.length === 0) throw new Error("Select at least one device.");

      const results = await Promise.all(
        targetDevices.map((device) =>
          insforge.database.rpc("enqueue_device_command", {
            _device_id: device.id,
            _command_type: commandType,
            _payload: {
              source: "admin_devices",
              serial: device.serial,
              ...payload,
            },
            _idempotency_key: crypto.randomUUID(),
          }),
        ),
      );

      results.forEach((result) => {
        if (result.error) {
          if (isMissingDeviceCommandBackend(result.error)) {
            throw new Error("Device command backend has not been deployed yet.");
          }
          throw new Error(dbErrorMessage(result.error, "Could not queue device command"));
        }
      });

      if (afterQueuePatch) {
        const updates = await Promise.all(
          targetDevices.map((device) =>
            insforge.database.from("devices").update(afterQueuePatch).eq("id", device.id),
          ),
        );
        updates.forEach((result) =>
          assertDbOk(result, "Queued command but device status update failed"),
        );
      }

      return { count: targetDevices.length, commandType };
    },
    onSuccess: ({ count, commandType }) => {
      qc.invalidateQueries({ queryKey: ["admin-devices-all"] });
      setSelected(new Set());
      toast.success(
        `${count} ${commandLabel(commandType).toLowerCase()} command${count === 1 ? "" : "s"} queued`,
      );
    },
    onError: (e: Error) => {
      qc.invalidateQueries({ queryKey: ["admin-devices-all"] });
      toast.error(e.message || "Could not queue device command");
    },
  });

  // === Bulk action handlers ===
  const bulkMarkMaintenance = () => {
    if (selectedDevices.length === 0) return;
    queueDeviceCommands.mutate({
      devices: selectedDevices,
      commandType: "maintenance_due",
      payload: { reason: "admin_marked_maintenance_due" },
      afterQueuePatch: { status: "maintenance_due" },
    });
  };

  const bulkAssignTech = () => {
    setTechDialog({ open: true, devices: selectedDevices, techId: "" });
  };

  const bulkFlag = () => {
    setFlagDialog({ open: true, devices: selectedDevices, reason: "" });
  };

  const bulkDeactivate = () => {
    setConfirmDeactivate(selectedDevices);
  };

  const exportCsv = (rows: Enriched[]) => {
    const cols: { key: keyof Enriched | string; label: string }[] = [
      { key: "name", label: "Device name" },
      { key: "serial", label: "Device ID" },
      { key: "customerName", label: "Customer" },
      { key: "farmName", label: "Farm" },
      { key: "pondName", label: "Pond" },
      { key: "district", label: "District" },
      { key: "status", label: "Status" },
      { key: "battery_pct", label: "Battery %" },
      { key: "signal_pct", label: "Signal %" },
      { key: "firmware_version", label: "Firmware" },
      { key: "sim_iccid", label: "SIM ICCID" },
      { key: "network", label: "Network" },
      { key: "warranty_until", label: "Warranty until" },
      { key: "last_seen", label: "Last seen" },
      { key: "calStatus", label: "Calibration" },
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      cols.map((c) => c.label).join(","),
      ...rows.map((r) => cols.map((c) => escape((r as any)[c.key])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acqua-lence-devices-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} devices`);
  };

  // Reset selection when filters narrow rows out of view
  useEffect(() => {
    if (selected.size === 0) return;
    const visible = new Set(filtered.map((d) => d.id));
    const next = new Set(Array.from(selected).filter((id) => visible.has(id)));
    if (next.size !== selected.size) setSelected(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const openMaintenance = openDevice
    ? maintenance.filter((m: any) => m.device_id === openDevice.id)
    : [];
  const openAlerts = openDevice ? alerts.filter((a) => a.device_id === openDevice.id) : [];
  const openCommands = openDevice
    ? commands.filter((command) => command.device_id === openDevice.id).slice(0, 10)
    : [];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Device fleet"
        subtitle="All Acqua Lence sensor nodes across the platform"
        actions={
          <Button size="sm" variant="outline" onClick={() => exportCsv(filtered)}>
            <Download className="mr-1.5 h-4 w-4" /> Export visible
          </Button>
        }
      />

      {/* Metrics */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <MetricTile label="Total" value={total} />
        <MetricTile label="Online" value={online} accent="text-emerald-600" />
        <MetricTile label="Offline" value={offline} accent="text-rose-600" />
        <MetricTile label="Maintenance / cal" value={maintDue} accent="text-violet-600" />
        <MetricTile label="Unassigned" value={unassigned} accent="text-amber-600" />
      </div>

      {/* Filters */}
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
        <div className="relative col-span-2 md:col-span-2 lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={f.q}
            onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))}
            placeholder="Search serial, name, customer, SIM"
            className="pl-9"
            maxLength={120}
          />
        </div>
        <FilterSelect
          value={f.status}
          onChange={(v) => setF((s) => ({ ...s, status: v }))}
          placeholder="Status"
          options={[
            { v: "all", l: "All statuses" },
            { v: "online", l: "Online" },
            { v: "offline", l: "Offline" },
            { v: "low_battery", l: "Low battery" },
            { v: "calibration_due", l: "Calibration due" },
            { v: "maintenance_due", l: "Maintenance due" },
          ]}
        />
        <FilterSelect
          value={f.district}
          onChange={(v) => setF((s) => ({ ...s, district: v }))}
          placeholder="District"
          options={[{ v: "all", l: "All districts" }, ...districts.map((d) => ({ v: d, l: d }))]}
        />
        <FilterSelect
          value={f.firmware}
          onChange={(v) => setF((s) => ({ ...s, firmware: v }))}
          placeholder="Firmware"
          options={[{ v: "all", l: "All firmware" }, ...firmwares.map((d) => ({ v: d, l: d }))]}
        />
        <FilterSelect
          value={f.calibration}
          onChange={(v) => setF((s) => ({ ...s, calibration: v as any }))}
          placeholder="Calibration"
          options={[
            { v: "all", l: "All calibration" },
            { v: "ok", l: "Up to date" },
            { v: "due", l: "Due soon" },
            { v: "overdue", l: "Overdue" },
          ]}
        />
        <FilterSelect
          value={f.assignment}
          onChange={(v) => setF((s) => ({ ...s, assignment: v as any }))}
          placeholder="Assignment"
          options={[
            { v: "all", l: "All assignments" },
            { v: "assigned", l: "Assigned" },
            { v: "unassigned", l: "Unassigned" },
          ]}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            setF((s) => ({
              ...s,
              maintenance: s.maintenance === "due" ? "all" : "due",
            }))
          }
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
            f.maintenance === "due"
              ? "border-violet-500/40 bg-violet-500/10 text-violet-700"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          <Wrench className="h-3 w-3" /> Maintenance due
        </button>
        {Object.entries(f).some(([k, v]) => v !== (DEFAULTS as any)[k]) && (
          <button
            onClick={() => setF(DEFAULTS)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Reset filters
          </button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {total} devices
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedDevices.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium">{selectedDevices.length} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={bulkMarkMaintenance}
              disabled={queueDeviceCommands.isPending}
            >
              <Wrench className="mr-1.5 h-4 w-4" />
              {queueDeviceCommands.isPending ? "Queueing..." : "Queue maintenance"}
            </Button>
            <Button size="sm" variant="outline" onClick={bulkAssignTech}>
              <UserCog className="mr-1.5 h-4 w-4" /> Assign technician
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportCsv(selectedDevices)}>
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
            <Button size="sm" variant="outline" onClick={bulkFlag} className="text-amber-700">
              <Flag className="mr-1.5 h-4 w-4" /> Flag issue
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={bulkDeactivate}
              disabled={queueDeviceCommands.isPending}
            >
              <Power className="mr-1.5 h-4 w-4" /> Queue deactivation
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading devices…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Cpu className="h-6 w-6" />}
          title="No devices match"
          description="Try clearing some filters."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-3">
                      <Checkbox
                        checked={
                          allFilteredSelected ? true : someSelected ? "indeterminate" : false
                        }
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                    <Th>Device</Th>
                    <Th>Device ID</Th>
                    <Th>Customer</Th>
                    <Th>Farm</Th>
                    <Th>Pond</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Battery</Th>
                    <Th className="text-right">Signal</Th>
                    <Th>Firmware</Th>
                    <Th>SIM / network</Th>
                    <Th>Warranty</Th>
                    <Th>Last seen</Th>
                    <Th>Calibration</Th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const isSelected = selected.has(d.id);
                    return (
                      <tr
                        key={d.id}
                        className={cn(
                          "cursor-pointer border-t border-border/60 transition hover:bg-surface/60",
                          isSelected && "bg-primary/5",
                        )}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("[data-stop-row-click]")) return;
                          setOpenDevice(d);
                          setTab("overview");
                        }}
                      >
                        <td
                          className="px-3 py-3"
                          data-stop-row-click
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(d.id)}
                            aria-label={`Select ${d.serial}`}
                          />
                        </td>
                        <td className="px-3 py-3 font-medium">
                          {d.name ?? "—"}
                          {d.flagged && <Flag className="ml-1.5 inline h-3 w-3 text-amber-600" />}
                          {d.hasPendingCommand && d.latestCommand && (
                            <p className="mt-1 text-[11px] font-normal text-sky-700">
                              {commandLabel(d.latestCommand.command_type)} pending
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                          {d.serial}
                        </td>
                        <td className="px-3 py-3">{d.customerName ?? "—"}</td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {d.farmName ?? <span className="text-amber-600">Unassigned</span>}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{d.pondName ?? "—"}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <BatteryCell pct={d.battery_pct} />
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <SignalCell pct={d.signal_pct} />
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">{d.firmware_version ?? "—"}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {d.sim_iccid ? (
                            <>
                              <span className="font-mono">{d.sim_iccid.slice(-6)}</span>
                              {d.network ? ` · ${d.network}` : ""}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <WarrantyCell until={d.warranty_until} />
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {d.last_seen ? new Date(d.last_seen).toLocaleString() : "Never"}
                        </td>
                        <td className="px-3 py-3">
                          <CalibrationBadge status={d.calStatus} />
                        </td>
                        <td
                          className="px-3 py-3"
                          data-stop-row-click
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setOpenDevice(d);
                                  setTab("overview");
                                }}
                              >
                                <ChevronRight className="mr-2 h-4 w-4" /> View details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  queueDeviceCommands.mutate({
                                    devices: [d],
                                    commandType: "maintenance_due",
                                    payload: { reason: "admin_marked_maintenance_due" },
                                    afterQueuePatch: { status: "maintenance_due" },
                                  })
                                }
                                disabled={queueDeviceCommands.isPending}
                              >
                                <Wrench className="mr-2 h-4 w-4" /> Queue maintenance
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setTechDialog({
                                    open: true,
                                    devices: [d],
                                    techId: "",
                                  })
                                }
                              >
                                <UserCog className="mr-2 h-4 w-4" /> Assign technician
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setFlagDialog({
                                    open: true,
                                    devices: [d],
                                    reason: "",
                                  })
                                }
                              >
                                <Flag className="mr-2 h-4 w-4" /> Flag issue
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600"
                                onClick={() => setConfirmDeactivate([d])}
                                disabled={queueDeviceCommands.isPending}
                              >
                                <Power className="mr-2 h-4 w-4" /> Queue deactivation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {filtered.map((d) => {
              const isSelected = selected.has(d.id);
              return (
                <li key={d.id}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-soft",
                      isSelected && "ring-1 ring-primary/40",
                    )}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(d.id)} />
                    <button
                      onClick={() => {
                        setOpenDevice(d);
                        setTab("overview");
                      }}
                      className="flex flex-1 items-center justify-between gap-2 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.name ?? d.serial}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.customerName ?? "—"} · {d.farmName ?? "Unassigned"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                          Bat {d.battery_pct ?? "—"}% · Sig {d.signal_pct ?? "—"}% ·{" "}
                          {d.firmware_version ?? "—"}
                        </p>
                        {d.hasPendingCommand && d.latestCommand && (
                          <p className="mt-1 text-xs font-medium text-sky-700">
                            {commandLabel(d.latestCommand.command_type)} pending
                          </p>
                        )}
                      </div>
                      <StatusBadge status={d.status} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* === Device drawer === */}
      <Sheet open={!!openDevice} onOpenChange={(o) => !o && setOpenDevice(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {openDevice && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="font-display text-xl">
                      {openDevice.name ?? openDevice.serial}
                    </SheetTitle>
                    <SheetDescription className="font-mono text-xs">
                      {openDevice.serial} · <StatusBadge status={openDevice.status} />
                    </SheetDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          queueDeviceCommands.mutate({
                            devices: [openDevice],
                            commandType: "maintenance_due",
                            payload: { reason: "admin_marked_maintenance_due" },
                            afterQueuePatch: { status: "maintenance_due" },
                          })
                        }
                        disabled={queueDeviceCommands.isPending}
                      >
                        <Wrench className="mr-2 h-4 w-4" /> Queue maintenance
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setTechDialog({
                            open: true,
                            devices: [openDevice],
                            techId: "",
                          })
                        }
                      >
                        <UserCog className="mr-2 h-4 w-4" /> Assign technician
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setFlagDialog({
                            open: true,
                            devices: [openDevice],
                            reason: "",
                          })
                        }
                      >
                        <Flag className="mr-2 h-4 w-4" /> Flag issue
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-600 focus:text-rose-600"
                        onClick={() => setConfirmDeactivate([openDevice])}
                        disabled={queueDeviceCommands.isPending}
                      >
                        <Power className="mr-2 h-4 w-4" /> Queue deactivation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SheetHeader>

              <Tabs value={tab} onValueChange={setTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="assignment">Assignment</TabsTrigger>
                  <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                  <TabsTrigger value="alerts">Alerts</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-2">
                  <InfoRow
                    icon={<Cpu className="h-4 w-4" />}
                    label="Hardware"
                    value={openDevice.hardware_version ?? "—"}
                  />
                  <InfoRow
                    icon={<Cpu className="h-4 w-4" />}
                    label="Firmware"
                    value={openDevice.firmware_version ?? "—"}
                  />
                  <InfoRow
                    icon={<BatteryLow className="h-4 w-4" />}
                    label="Battery"
                    value={`${openDevice.battery_pct ?? "—"}%`}
                  />
                  <InfoRow
                    icon={<Signal className="h-4 w-4" />}
                    label="Signal"
                    value={`${openDevice.signal_pct ?? "—"}%`}
                  />
                  <InfoRow
                    icon={<Wifi className="h-4 w-4" />}
                    label="SIM / network"
                    value={
                      openDevice.sim_iccid
                        ? `${openDevice.sim_iccid}${openDevice.network ? ` · ${openDevice.network}` : ""}`
                        : "—"
                    }
                  />
                  <InfoRow
                    icon={<History className="h-4 w-4" />}
                    label="Last seen"
                    value={
                      openDevice.last_seen
                        ? new Date(openDevice.last_seen).toLocaleString()
                        : "Never"
                    }
                  />
                  <InfoRow
                    icon={<Wrench className="h-4 w-4" />}
                    label="Calibration"
                    value={<CalibrationBadge status={openDevice.calStatus ?? "unknown"} />}
                  />
                  <InfoRow
                    icon={<AlertTriangle className="h-4 w-4" />}
                    label="Warranty"
                    value={<WarrantyCell until={openDevice.warranty_until} />}
                  />
                  <div className="rounded-lg border border-border/60 bg-surface p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Recent commands</p>
                      {openDevice.hasPendingCommand && (
                        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-700">
                          Pending
                        </span>
                      )}
                    </div>
                    {openCommands.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No commands queued yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {openCommands.map((command) => (
                          <CommandRow key={command.id} command={command} />
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="assignment" className="mt-4 space-y-2">
                  <InfoRow
                    icon={<Building2 className="h-4 w-4" />}
                    label="Customer"
                    value={openDevice.customerName ?? "—"}
                  />
                  <InfoRow
                    icon={<Building2 className="h-4 w-4" />}
                    label="Farm"
                    value={openDevice.farmName ?? "Unassigned"}
                  />
                  <InfoRow
                    icon={<Waves className="h-4 w-4" />}
                    label="Pond"
                    value={openDevice.pondName ?? "—"}
                  />
                  <p className="pt-2 text-xs text-muted-foreground">
                    To reassign this device to a different farm or pond, open the customer profile
                    from the Farms & Customers page.
                  </p>
                </TabsContent>

                <TabsContent value="maintenance" className="mt-4 space-y-2">
                  {openMaintenance.length === 0 ? (
                    <EmptyRow label="No maintenance logs yet." />
                  ) : (
                    openMaintenance.slice(0, 25).map((m: any) => (
                      <div key={m.id} className="rounded-lg border border-border/60 bg-surface p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {m.issue_type ?? m.issue ?? "Maintenance visit"}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {m.performed_at ? new Date(m.performed_at).toLocaleString() : ""}
                          </span>
                        </div>
                        {m.work_performed && (
                          <p className="mt-1 text-xs text-muted-foreground">{m.work_performed}</p>
                        )}
                        {m.technician_name && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            By {m.technician_name}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="alerts" className="mt-4 space-y-2">
                  {openAlerts.length === 0 ? (
                    <EmptyRow label="No alerts from this device." />
                  ) : (
                    openAlerts.slice(0, 25).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-surface p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {a.message ?? a.alert_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.detected_at).toLocaleString()}
                          </p>
                        </div>
                        <StatusBadge status={a.severity} />
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* === Deactivate confirm === */}
      <AlertDialog
        open={!!confirmDeactivate}
        onOpenChange={(o) => !o && setConfirmDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Queue deactivation for {confirmDeactivate?.length ?? 0} device
              {confirmDeactivate?.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This creates a device command and marks the device offline after the command is
              accepted. The hardware still needs to acknowledge the queued operation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDeactivate) return;
                queueDeviceCommands.mutate({
                  devices: confirmDeactivate,
                  commandType: "deactivate",
                  payload: { reason: "admin_deactivation" },
                  afterQueuePatch: { status: "offline" },
                });
                setConfirmDeactivate(null);
              }}
              disabled={queueDeviceCommands.isPending}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              Queue deactivation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* === Flag device dialog === */}
      <Dialog
        open={flagDialog.open}
        onOpenChange={(o) => !o && setFlagDialog({ open: false, devices: [], reason: "" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Flag {flagDialog.devices.length} device
              {flagDialog.devices.length === 1 ? "" : "s"}
            </DialogTitle>
            <DialogDescription>
              Add a short reason so technicians know what to investigate.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={flagDialog.reason}
            onChange={(e) => setFlagDialog((s) => ({ ...s, reason: e.target.value }))}
            placeholder="e.g. Pump giving false offline alerts"
            maxLength={200}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setFlagDialog({ open: false, devices: [], reason: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!flagDialog.reason.trim()) {
                  toast.error("Add a reason");
                  return;
                }
                patchDevices.mutate({
                  ids: flagDialog.devices.map((d) => d.id),
                  patch: { flagged: true, flag_reason: flagDialog.reason.trim() },
                });
                setFlagDialog({ open: false, devices: [], reason: "" });
              }}
            >
              Flag {flagDialog.devices.length === 1 ? "device" : "devices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Assign technician dialog === */}
      <Dialog
        open={techDialog.open}
        onOpenChange={(o) => !o && setTechDialog({ open: false, devices: [], techId: "" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign technician to {techDialog.devices.length} device
              {techDialog.devices.length === 1 ? "" : "s"}
            </DialogTitle>
            <DialogDescription>
              Choose who should handle the next visit or calibration.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={techDialog.techId}
            onValueChange={(v) => setTechDialog((s) => ({ ...s, techId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select technician" />
            </SelectTrigger>
            <SelectContent>
              {technicians.length === 0 ? (
                <SelectItem value="__none" disabled>
                  No technicians available
                </SelectItem>
              ) : (
                technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name ?? t.id.slice(0, 8)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setTechDialog({ open: false, devices: [], techId: "" })}
            >
              Cancel
            </Button>
            <Button
              disabled={!techDialog.techId}
              onClick={() => {
                patchDevices.mutate({
                  ids: techDialog.devices.map((d) => d.id),
                  patch: { assigned_technician_id: techDialog.techId },
                });
                setTechDialog({ open: false, devices: [], techId: "" });
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Helpers ==========

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-3 whitespace-nowrap", className)}>{children}</th>;
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { v: string; l: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.v} value={o.v}>
            {o.l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CommandRow({ command }: { command: DeviceCommandRow }) {
  const at = command.created_at ?? command.queued_at ?? command.updated_at;
  const date = at ? new Date(at) : null;
  const dateLabel = date && Number.isFinite(date.getTime()) ? date.toLocaleString() : "Queued";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 bg-card px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{commandLabel(command.command_type)}</p>
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
        {command.error_message && (
          <p className="mt-1 text-xs text-rose-600">{command.error_message}</p>
        )}
      </div>
      <CommandStatus status={command.status} />
    </div>
  );
}

function CommandStatus({ status }: { status: string }) {
  const cls =
    status === "succeeded"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : status === "failed" || status === "expired" || status === "cancelled"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
        : PENDING_COMMAND_STATUSES.has(status)
          ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
          : "border-border bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        cls,
      )}
    >
      {status}
    </span>
  );
}

function BatteryCell({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <span className="text-muted-foreground">—</span>;
  const cls = pct < 20 ? "text-rose-600" : pct < 40 ? "text-amber-600" : "text-emerald-600";
  return (
    <span className={cn("inline-flex items-center justify-end gap-1", cls)}>
      <BatteryLow className="h-3 w-3" />
      {pct}%
    </span>
  );
}

function SignalCell({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <span className="text-muted-foreground">—</span>;
  const cls = pct < 25 ? "text-rose-600" : pct < 60 ? "text-amber-600" : "text-emerald-600";
  return (
    <span className={cn("inline-flex items-center justify-end gap-1", cls)}>
      <Signal className="h-3 w-3" />
      {pct}%
    </span>
  );
}

function CalibrationBadge({ status }: { status: "ok" | "due" | "overdue" | "unknown" }) {
  const map = {
    ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    due: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    overdue: "border-rose-500/30 bg-rose-500/10 text-rose-700",
    unknown: "border-border bg-muted text-muted-foreground",
  }[status];
  const label = {
    ok: "Up to date",
    due: "Due soon",
    overdue: "Overdue",
    unknown: "Unknown",
  }[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        map,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function WarrantyCell({ until }: { until: string | null | undefined }) {
  if (!until) return <span className="text-muted-foreground">—</span>;
  const date = new Date(until);
  if (Number.isNaN(date.getTime())) return <span className="text-muted-foreground">—</span>;
  const days = Math.round((date.getTime() - Date.now()) / 86400000);
  const expired = days < 0;
  const expiringSoon = days >= 0 && days <= 60;
  return (
    <span
      className={cn(
        "inline-flex flex-col leading-tight",
        expired ? "text-rose-600" : expiringSoon ? "text-amber-600" : "text-foreground",
      )}
    >
      <span className="tabular-nums">{date.toLocaleDateString()}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-80">
        {expired ? `Expired ${-days}d ago` : expiringSoon ? `In ${days}d` : "Active"}
      </span>
    </span>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface p-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-6 text-center text-sm text-muted-foreground">
      {label}
    </p>
  );
}
