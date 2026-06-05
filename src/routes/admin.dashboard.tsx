import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Waves, Cpu, Users, AlertTriangle, Activity } from "lucide-react";
import { insforge, type Alert, type Device, type Farm, type Pond } from "@/lib/insforge";
import { PageHeader, MetricTile, StatusBadge } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin · Overview — Acqua Lence" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [farms, ponds, devices, alerts] = await Promise.all([
        insforge.database.from("farms").select("*"),
        insforge.database.from("ponds").select("*"),
        insforge.database.from("devices").select("*"),
        insforge.database.from("alerts").select("*").order("detected_at", { ascending: false }).limit(50),
      ]);
      return {
        farms: (farms.data ?? []) as Farm[],
        ponds: (ponds.data ?? []) as Pond[],
        devices: (devices.data ?? []) as Device[],
        alerts: (alerts.data ?? []) as Alert[],
      };
    },
  });

  const farms = data?.farms ?? [];
  const ponds = data?.ponds ?? [];
  const devices = data?.devices ?? [];
  const alerts = data?.alerts ?? [];
  const critical = alerts.filter((a) => a.severity === "critical" && a.status !== "resolved");
  const offline = devices.filter((d) => d.status === "offline").length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Platform overview" subtitle="Live operational metrics across Acqua Lence" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <MetricTile label="Farms" value={farms.length} hint={`${new Set(farms.map((f) => f.district)).size} districts`} />
        <MetricTile label="Ponds" value={ponds.length} accent="text-primary" />
        <MetricTile label="Devices" value={devices.length} hint={`${offline} offline`} />
        <MetricTile label="Critical alerts" value={critical.length} accent="text-rose-600" />
        <MetricTile label="Open tickets" value={0} hint="Support backlog" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent critical alerts</h2>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          {critical.length === 0 ? (
            <p className="text-sm text-muted-foreground">No critical alerts.</p>
          ) : (
            <ul className="space-y-2">
              {critical.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.message ?? a.alert_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.detected_at).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={a.severity} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Fleet health</h2>
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-3 text-sm">
            <Row icon={<Activity className="h-4 w-4 text-emerald-600" />} label="Online" value={devices.filter((d) => d.status === "online").length} />
            <Row icon={<Cpu className="h-4 w-4 text-amber-600" />} label="Low battery" value={devices.filter((d) => d.status === "low_battery").length} />
            <Row icon={<Waves className="h-4 w-4 text-violet-600" />} label="Calibration due" value={devices.filter((d) => d.status === "calibration_due").length} />
            <Row icon={<Users className="h-4 w-4 text-muted-foreground" />} label="Offline" value={offline} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface px-3 py-2">
      <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
      <span className="font-display text-base font-bold tabular-nums">{value}</span>
    </div>
  );
}
