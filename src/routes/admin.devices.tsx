import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Cpu, BatteryLow, Signal } from "lucide-react";
import { insforge, type Device } from "@/lib/insforge";
import { PageHeader, MetricTile, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/devices")({
  head: () => ({ meta: [{ title: "Admin · Devices — Acqua Lence" }] }),
  component: AdminDevices,
});

function AdminDevices() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-devices"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const d = await insforge.database.from("devices").select("*").order("serial");
      return (d.data ?? []) as Device[];
    },
  });
  const devices = data ?? [];
  const filtered = useMemo(
    () => devices.filter((d) => !q || d.serial.toLowerCase().includes(q.toLowerCase()) || (d.name ?? "").toLowerCase().includes(q.toLowerCase())),
    [devices, q],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Device fleet" subtitle="Acqua Lence sensor nodes across all farms" />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricTile label="Total" value={devices.length} />
        <MetricTile label="Online" value={devices.filter((d) => d.status === "online").length} accent="text-emerald-600" />
        <MetricTile label="Offline" value={devices.filter((d) => d.status === "offline").length} accent="text-rose-600" />
        <MetricTile label="Maintenance" value={devices.filter((d) => d.status === "maintenance_due" || d.status === "calibration_due").length} accent="text-violet-600" />
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by serial or name" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Cpu className="h-6 w-6" />} title="No devices" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Serial</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Battery</th>
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-border/60 hover:bg-surface/60">
                  <td className="px-4 py-3 font-mono text-xs">{d.serial}</td>
                  <td className="px-4 py-3">{d.name ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums"><span className="inline-flex items-center gap-1"><BatteryLow className="h-3 w-3 text-muted-foreground" />{d.battery_pct ?? "—"}%</span></td>
                  <td className="px-4 py-3 tabular-nums"><span className="inline-flex items-center gap-1"><Signal className="h-3 w-3 text-muted-foreground" />{d.signal_pct ?? "—"}%</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{d.last_seen ? new Date(d.last_seen).toLocaleString() : "Never"}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
