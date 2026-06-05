import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { insforge, type Alert } from "@/lib/insforge";
import { PageHeader, MetricTile, StatusBadge, EmptyState } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/admin/alerts")({
  head: () => ({ meta: [{ title: "Admin · Alerts — Acqua Lence" }] }),
  component: AdminAlerts,
});

function AdminAlerts() {
  const { data } = useQuery({
    queryKey: ["admin-alerts"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const r = await insforge.database.from("alerts").select("*").order("detected_at", { ascending: false }).limit(200);
      return (r.data ?? []) as Alert[];
    },
  });
  const alerts = data ?? [];
  const critical = alerts.filter((a) => a.severity === "critical");
  const open = alerts.filter((a) => a.status === "open");

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Platform alerts" subtitle="All critical and recent alerts across farms" />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricTile label="Total (last 200)" value={alerts.length} />
        <MetricTile label="Open" value={open.length} accent="text-rose-600" />
        <MetricTile label="Critical" value={critical.length} accent="text-rose-600" />
        <MetricTile label="Resolved" value={alerts.filter((a) => a.status === "resolved").length} accent="text-emerald-600" />
      </div>

      {alerts.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="No alerts" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Detected</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-t border-border/60 hover:bg-surface/60">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.detected_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider">{a.alert_type}</td>
                  <td className="px-4 py-3">{a.message ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.severity} /></td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
