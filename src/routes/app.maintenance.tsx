import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  History,
  Search,
  Wrench,
} from "lucide-react";
import { insforge, type Device, type Farm, type Pond } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, MetricTile, PageHeader, StatusBadge } from "@/components/app/StatusBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance - Acqua Lence" }] }),
  component: MaintenanceOverviewPage,
});

type MaintenanceRow = {
  id: string;
  device_id: string | null;
  visit_type?: string | null;
  issue_type?: string | null;
  device_status_after?: string | null;
  follow_up_required?: boolean | null;
  technician_name?: string | null;
  performed_at: string;
};

type MaintenanceFilter = "all" | "due" | "follow_up" | "offline";

type MaintenanceDevice = Device & {
  farmName: string;
  pondName: string;
  lastMaintenance: MaintenanceRow | null;
  needsFollowUp: boolean;
  maintenanceDue: boolean;
  isStale: boolean;
  daysSinceMaintenance: number | null;
};

function MaintenanceOverviewPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MaintenanceFilter>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["maintenance-overview"],
    enabled: !!user,
    queryFn: async () => {
      const [devicesRes, farmsRes, pondsRes, maintenanceRes] = await Promise.all([
        insforge.database.from("devices").select("*").order("created_at", { ascending: false }),
        insforge.database.from("farms").select("id,name"),
        insforge.database.from("ponds").select("id,name,farm_id"),
        insforge.database
          .from("maintenance_logs")
          .select(
            "id,device_id,visit_type,issue_type,device_status_after,follow_up_required,technician_name,performed_at",
          )
          .order("performed_at", { ascending: false }),
      ]);

      if (devicesRes.error) throw new Error(devicesRes.error.message);
      if (farmsRes.error) throw new Error(farmsRes.error.message);
      if (pondsRes.error) throw new Error(pondsRes.error.message);
      if (maintenanceRes.error) throw new Error(maintenanceRes.error.message);

      return {
        devices: (devicesRes.data ?? []) as Device[],
        farms: (farmsRes.data ?? []) as Pick<Farm, "id" | "name">[],
        ponds: (pondsRes.data ?? []) as Pick<Pond, "id" | "name" | "farm_id">[],
        maintenance: (maintenanceRes.data ?? []) as MaintenanceRow[],
      };
    },
  });

  const rows = useMemo<MaintenanceDevice[]>(() => {
    const farmsById = new Map((data?.farms ?? []).map((farm) => [farm.id, farm.name]));
    const pondsById = new Map((data?.ponds ?? []).map((pond) => [pond.id, pond]));
    const logsByDevice = new Map<string, MaintenanceRow[]>();

    for (const log of data?.maintenance ?? []) {
      if (!log.device_id) continue;
      const current = logsByDevice.get(log.device_id) ?? [];
      current.push(log);
      logsByDevice.set(log.device_id, current);
    }

    return (data?.devices ?? [])
      .map((device) => {
        const logs = logsByDevice.get(device.id) ?? [];
        const lastMaintenance = logs[0] ?? null;
        const daysSinceMaintenance = lastMaintenance
          ? Math.floor((Date.now() - new Date(lastMaintenance.performed_at).getTime()) / 86_400_000)
          : null;
        const needsFollowUp = logs.some((log) => log.follow_up_required);
        const maintenanceDue =
          device.status === "maintenance_due" ||
          !lastMaintenance ||
          needsFollowUp ||
          (daysSinceMaintenance != null && daysSinceMaintenance > 90);
        const isStale =
          !device.last_seen || Date.now() - new Date(device.last_seen).getTime() > 30 * 60_000;
        const pond = device.pond_id ? pondsById.get(device.pond_id) : undefined;

        return {
          ...device,
          farmName: device.farm_id
            ? (farmsById.get(device.farm_id) ?? "Unassigned farm")
            : "Unassigned farm",
          pondName: pond?.name ?? "Unassigned pond",
          lastMaintenance,
          needsFollowUp,
          maintenanceDue,
          isStale,
          daysSinceMaintenance,
        };
      })
      .sort((a, b) => Number(b.maintenanceDue) - Number(a.maintenanceDue));
  }, [data]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "due" && !row.maintenanceDue) return false;
      if (filter === "follow_up" && !row.needsFollowUp) return false;
      if (filter === "offline" && row.status !== "offline" && !row.isStale) return false;
      if (!q) return true;
      const haystack =
        `${row.name ?? ""} ${row.serial} ${row.farmName} ${row.pondName}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [filter, query, rows]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      due: rows.filter((row) => row.maintenanceDue).length,
      followUp: rows.filter((row) => row.needsFollowUp).length,
      stale: rows.filter((row) => row.status === "offline" || row.isStale).length,
    }),
    [rows],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Maintenance"
        subtitle="Plan service visits, follow-ups and device maintenance from one queue."
        actions={
          <Button asChild variant="outline">
            <Link to="/app/devices">
              <Wrench className="mr-2 h-4 w-4" />
              View devices
            </Link>
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Devices" value={counts.total} />
        <MetricTile label="Due" value={counts.due} accent="text-violet-600" />
        <MetricTile label="Follow-up" value={counts.followUp} accent="text-amber-600" />
        <MetricTile label="Offline / stale" value={counts.stale} accent="text-rose-600" />
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by device, serial, farm or pond"
            className="h-10 pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as MaintenanceFilter)}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1 md:w-auto md:grid-cols-4">
            <TabsTrigger value="all" className="min-h-9">
              All
            </TabsTrigger>
            <TabsTrigger value="due" className="min-h-9">
              Due
            </TabsTrigger>
            <TabsTrigger value="follow_up" className="min-h-9">
              Follow-up
            </TabsTrigger>
            <TabsTrigger value="offline" className="min-h-9">
              Offline
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading maintenance queue...</div>
        ) : isError ? (
          <MaintenanceError />
        ) : filteredRows.length === 0 ? (
          <EmptyMaintenanceState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground hover:bg-transparent">
                <TableHead className="px-4 py-3">Device</TableHead>
                <TableHead className="px-4 py-3">Location</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                <TableHead className="px-4 py-3">Last service</TableHead>
                <TableHead className="px-4 py-3">Next action</TableHead>
                <TableHead className="px-4 py-3 text-right">Log</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id} className="border-border/50">
                  <TableCell className="px-4 py-3">
                    <div>
                      <p className="font-medium">{row.name ?? row.serial}</p>
                      <p className="font-mono text-xs text-muted-foreground">{row.serial}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="text-sm">{row.pondName}</p>
                    <p className="text-xs text-muted-foreground">{row.farmName}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge status={row.status} />
                      {row.isStale && <StatusBadge status="offline" />}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <LastMaintenance row={row} />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <NextAction row={row} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Button asChild size="sm">
                      <Link to="/app/maintenance/$deviceId" params={{ deviceId: row.id }}>
                        Open log
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
            Loading maintenance queue...
          </div>
        ) : isError ? (
          <MaintenanceError />
        ) : filteredRows.length === 0 ? (
          <EmptyMaintenanceState />
        ) : (
          filteredRows.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.name ?? row.serial}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{row.serial}</p>
                </div>
                <StatusBadge status={row.maintenanceDue ? "maintenance_due" : "good"} />
              </div>
              <div className="mt-3 grid gap-2 rounded-xl bg-muted/30 p-3 text-xs">
                <InfoLine
                  icon={CalendarClock}
                  label="Location"
                  value={`${row.pondName} - ${row.farmName}`}
                />
                <InfoLine
                  icon={History}
                  label="Last service"
                  value={
                    row.lastMaintenance
                      ? new Date(row.lastMaintenance.performed_at).toLocaleDateString()
                      : "No service logged"
                  }
                />
                <InfoLine icon={Clock} label="Action" value={getActionText(row)} />
              </div>
              <Button asChild className="mt-3 w-full">
                <Link to="/app/maintenance/$deviceId" params={{ deviceId: row.id }}>
                  Open maintenance log
                </Link>
              </Button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function LastMaintenance({ row }: { row: MaintenanceDevice }) {
  if (!row.lastMaintenance) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-700">
        <AlertTriangle className="h-4 w-4" />
        No service logged
      </div>
    );
  }

  return (
    <div className="text-sm">
      <p>{new Date(row.lastMaintenance.performed_at).toLocaleDateString()}</p>
      <p className="text-xs text-muted-foreground">
        {row.daysSinceMaintenance} days ago
        {row.lastMaintenance.technician_name ? ` by ${row.lastMaintenance.technician_name}` : ""}
      </p>
    </div>
  );
}

function NextAction({ row }: { row: MaintenanceDevice }) {
  const action = getActionText(row);
  const Icon = row.maintenanceDue ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
        row.maintenanceDue
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {action}
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right">{value}</span>
    </div>
  );
}

function MaintenanceError() {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-6 w-6" />}
      title="Maintenance queue could not load"
      description="Refresh the page or check the backend connection before planning service visits."
    />
  );
}

function EmptyMaintenanceState() {
  return (
    <EmptyState
      icon={<Wrench className="h-6 w-6" />}
      title="No maintenance items"
      description="Devices will appear here when they are registered or need service."
      action={
        <Button asChild>
          <Link to="/app/setup">Set up a device</Link>
        </Button>
      }
    />
  );
}

function getActionText(row: MaintenanceDevice) {
  if (row.needsFollowUp) return "Follow-up required";
  if (!row.lastMaintenance) return "Create first log";
  if (row.status === "maintenance_due") return "Service needed";
  if (row.daysSinceMaintenance != null && row.daysSinceMaintenance > 90) return "Schedule service";
  if (row.isStale) return "Check device";
  return "Up to date";
}
