import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Cpu, Wifi, WifiOff, Battery, BatteryLow, FlaskConical, Wrench, Plus } from "lucide-react";
import { insforge, type Device, type Farm, type Pond } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, MetricTile, StatusBadge, EmptyState } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/app/devices")({
  head: () => ({ meta: [{ title: "Devices — Acqua Lence" }] }),
  component: DevicesPage,
});

function DevicesPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["devices-page"],
    enabled: !!user,
    queryFn: async () => {
      const [d, f, p] = await Promise.all([
        insforge.database.from("devices").select("*").order("created_at", { ascending: false }),
        insforge.database.from("farms").select("*"),
        insforge.database.from("ponds").select("*"),
      ]);
      return { devices: (d.data ?? []) as Device[], farms: (f.data ?? []) as Farm[], ponds: (p.data ?? []) as Pond[] };
    },
  });

  const devices = data?.devices ?? [];
  const farms = data?.farms ?? [];
  const ponds = data?.ponds ?? [];

  const counts = useMemo(() => ({
    total: devices.length,
    online: devices.filter((d) => d.status === "online").length,
    offline: devices.filter((d) => d.status === "offline").length,
    lowBattery: devices.filter((d) => (d.battery_pct ?? 100) < 25).length,
    calDue: devices.filter((d) => d.status === "calibration_due").length,
    maintDue: devices.filter((d) => d.status === "maintenance_due").length,
  }), [devices]);

  const filtered = devices.filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (query && !`${d.serial}${d.name ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Devices"
        subtitle="Health, signal and calibration status for every buoy."
        actions={<Button asChild><a href="/app/setup"><Plus className="mr-2 h-4 w-4" />Setup device</a></Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile label="Total" value={counts.total} />
        <MetricTile label="Online" value={counts.online} accent="text-emerald-600" />
        <MetricTile label="Offline" value={counts.offline} accent="text-rose-600" />
        <MetricTile label="Low battery" value={counts.lowBattery} accent="text-amber-600" />
        <MetricTile label="Calibration due" value={counts.calDue} accent="text-violet-600" />
        <MetricTile label="Maintenance" value={counts.maintDue} accent="text-sky-600" />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Input placeholder="Search by serial or name…" className="h-9 w-72" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="low_battery">Low battery</SelectItem>
            <SelectItem value="calibration_due">Calibration due</SelectItem>
            <SelectItem value="maintenance_due">Maintenance due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Cpu className="h-6 w-6" />} title="No devices" description="Run the setup wizard to register your first device." action={<Button asChild><a href="/app/setup">Setup device</a></Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Farm / Pond</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Battery</th>
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3">Firmware</th>
                <th className="px-4 py-3">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const farm = farms.find((f) => f.id === d.farm_id)?.name ?? "—";
                const pond = ponds.find((p) => p.id === d.pond_id)?.name ?? "—";
                const battery = d.battery_pct ?? 0;
                return (
                  <tr key={d.id} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <Link to="/app/devices/$deviceId" params={{ deviceId: d.id }} className="font-medium hover:text-primary">
                        {d.name ?? d.serial}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">{d.serial}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{farm} · {pond}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 tabular-nums ${battery < 25 ? "text-amber-600" : "text-foreground"}`}>
                        {battery < 25 ? <BatteryLow className="h-3.5 w-3.5" /> : <Battery className="h-3.5 w-3.5" />}
                        {battery}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        {(d.signal_pct ?? 0) > 30 ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5 text-rose-600" />}
                        {d.signal_pct ?? 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.firmware_version ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.last_seen ? new Date(d.last_seen).toLocaleString() : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
