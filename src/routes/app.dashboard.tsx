import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Waves, AlertTriangle, AlertCircle, CheckCircle2, Cpu, WifiOff } from "lucide-react";
import { insforge, type Farm, type Pond, type Device, type Alert } from "@/lib/insforge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Acqua Lence" }] }),
  component: DashboardPage,
});

const statusStyles: Record<string, string> = {
  good: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  watch: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  critical: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  offline: "bg-muted text-muted-foreground border-border",
  calibration_due: "bg-violet-500/10 text-violet-700 border-violet-500/30",
};

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold tabular-nums ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [farmsRes, pondsRes, devicesRes, alertsRes] = await Promise.all([
        insforge.database.from("farms").select("*"),
        insforge.database.from("ponds").select("*"),
        insforge.database.from("devices").select("*"),
        insforge.database.from("alerts").select("*").eq("status", "open").order("detected_at", { ascending: false }).limit(5),
      ]);
      return {
        farms: (farmsRes.data ?? []) as Farm[],
        ponds: (pondsRes.data ?? []) as Pond[],
        devices: (devicesRes.data ?? []) as Device[],
        alerts: (alertsRes.data ?? []) as Alert[],
      };
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading farm data…</div>;
  }

  const ponds = data?.ponds ?? [];
  const devices = data?.devices ?? [];
  const alerts = data?.alerts ?? [];

  const counts = {
    total: ponds.length,
    good: ponds.filter((p) => p.status === "good").length,
    warning: ponds.filter((p) => p.status === "warning").length,
    critical: ponds.filter((p) => p.status === "critical").length,
    offline: devices.filter((d) => d.status === "offline").length,
  };

  if (ponds.length === 0 && devices.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Waves className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold">{t("dashboard.empty.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Set up your first farm to start receiving live readings.</p>
        <div className="mt-5 flex gap-2">
          <Button>{t("dashboard.empty.cta1")}</Button>
          <Button variant="outline">{t("dashboard.empty.cta2")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label={t("dashboard.totalPonds")} value={counts.total} />
        <StatCard label={t("dashboard.good")} value={counts.good} accent="text-emerald-600" />
        <StatCard label={t("dashboard.warning")} value={counts.warning} accent="text-amber-600" />
        <StatCard label={t("dashboard.critical")} value={counts.critical} accent="text-rose-600" />
        <StatCard label={t("dashboard.offline")} value={counts.offline} accent="text-muted-foreground" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="font-display text-lg font-semibold">Ponds</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ponds.map((p) => (
              <div key={p.id} className="rounded-xl border border-border/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{p.name}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyles[p.status]}`}>
                    {t(`status.${p.status}`)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.species ?? "—"} · {p.water_type ?? "—"}</p>
              </div>
            ))}
            {ponds.length === 0 && <p className="text-sm text-muted-foreground">No ponds yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="font-display text-lg font-semibold">{t("dashboard.todaysAlerts")}</h2>
          <ul className="mt-3 space-y-2">
            {alerts.length === 0 && (
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> All clear.
              </li>
            )}
            {alerts.map((a) => {
              const Icon = a.severity === "critical" ? AlertCircle : a.severity === "warning" ? AlertTriangle : WifiOff;
              const tone = a.severity === "critical" ? "text-rose-600" : a.severity === "warning" ? "text-amber-600" : "text-muted-foreground";
              return (
                <li key={a.id} className="flex items-start gap-2 rounded-lg p-2 hover:bg-accent/40">
                  <Icon className={`mt-0.5 h-4 w-4 ${tone}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.message ?? a.alert_type}</p>
                    {a.recommended_action && (
                      <p className="truncate text-xs text-muted-foreground">{a.recommended_action}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border/70 bg-card p-4">
        <h2 className="font-display text-lg font-semibold">{t("dashboard.deviceHealth")}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
              <Cpu className="h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.name ?? d.serial}</p>
                <p className="text-xs text-muted-foreground">Battery {d.battery_pct ?? "—"}% · Signal {d.signal_pct ?? "—"}%</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusStyles[d.status] ?? statusStyles.good}`}>
                {d.status}
              </span>
            </div>
          ))}
          {devices.length === 0 && <p className="text-sm text-muted-foreground">No devices yet.</p>}
        </div>
      </section>
    </div>
  );
}
