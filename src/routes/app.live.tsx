import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, RefreshCw, Radio } from "lucide-react";
import { insforge, type Pond, type Reading, type Device } from "@/lib/insforge";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/live")({
  head: () => ({ meta: [{ title: "Live View — Acqua Lence" }] }),
  component: LivePage,
});

const statusStyles: Record<string, string> = {
  good: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  watch: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  critical: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  offline: "bg-muted text-muted-foreground border-border",
  calibration_due: "bg-violet-500/10 text-violet-700 border-violet-500/30",
};

function staleness(ts?: string | null) {
  if (!ts) return { label: "no data", stale: true };
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return { label: "just now", stale: false };
  if (mins < 60) return { label: `${mins}m ago`, stale: mins > 15 };
  const hrs = Math.floor(mins / 60);
  return { label: `${hrs}h ago`, stale: true };
}

function LivePage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "warning" | "critical" | "offline">("all");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["live"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [pondsRes, devicesRes, readingsRes] = await Promise.all([
        insforge.database.from("ponds").select("*"),
        insforge.database.from("devices").select("*"),
        insforge.database.from("readings").select("*").order("recorded_at", { ascending: false }).limit(500),
      ]);
      const ponds = (pondsRes.data ?? []) as Pond[];
      const devices = (devicesRes.data ?? []) as Device[];
      const readings = (readingsRes.data ?? []) as Reading[];
      const latestByPond = new Map<string, Reading>();
      for (const r of readings) if (!latestByPond.has(r.pond_id)) latestByPond.set(r.pond_id, r);
      return { ponds, devices, latestByPond };
    },
  });

  const rows = useMemo(() => {
    const ponds = data?.ponds ?? [];
    return ponds
      .filter((p) => (q ? p.name.toLowerCase().includes(q.toLowerCase()) : true))
      .filter((p) => (filter === "all" ? true : filter === "offline" ? p.status === "offline" : p.status === filter));
  }, [data, q, filter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("nav.live")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Auto-refreshes every 30 seconds.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        {(["all", "warning", "critical", "offline"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "All" : t(`status.${f}`)}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((p) => {
          const r = data?.latestByPond.get(p.id);
          const s = staleness(r?.recorded_at);
          return (
            <Link
              key={p.id}
              to="/app/ponds/$pondId"
              params={{ pondId: p.id }}
              className="group rounded-2xl border border-border/70 bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.species ?? "—"} · {p.water_type ?? "—"}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyles[p.status]}`}>
                  {t(`status.${p.status}`)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Metric label="DO" value={r?.do_mg_l} unit="mg/L" />
                <Metric label="pH" value={r?.ph} unit="" />
                <Metric label="Temp" value={r?.temp_c} unit="°C" />
                <Metric label="Turb" value={r?.turbidity_ntu} unit="NTU" />
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Radio className={`h-3 w-3 ${s.stale ? "text-amber-500" : "text-emerald-500"}`} />
                  {s.label}
                </span>
                <span className="opacity-0 transition group-hover:opacity-100">View →</span>
              </div>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No ponds match the current filter.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value?: number | null; unit: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-base font-semibold tabular-nums">
        {value != null ? value.toFixed(unit === "" ? 2 : 1) : "—"}
        {value != null && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}
