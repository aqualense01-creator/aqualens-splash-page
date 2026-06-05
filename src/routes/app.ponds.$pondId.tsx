import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Beaker, Download, FlaskConical } from "lucide-react";
import { insforge, type Pond, type Reading } from "@/lib/insforge";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ponds/$pondId")({
  head: () => ({ meta: [{ title: "Pond — Acqua Lence" }] }),
  component: PondDetailPage,
});

type Param = "do_mg_l" | "ph" | "temp_c" | "turbidity_ntu";

const PARAMS: { key: Param; label: string; unit: string; band: [number, number] }[] = [
  { key: "do_mg_l", label: "Dissolved O₂", unit: "mg/L", band: [4, 9] },
  { key: "ph", label: "pH", unit: "", band: [6.5, 8.5] },
  { key: "temp_c", label: "Temperature", unit: "°C", band: [22, 32] },
  { key: "turbidity_ntu", label: "Turbidity", unit: "NTU", band: [10, 80] },
];

function PondDetailPage() {
  const { pondId } = Route.useParams();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [activeParam, setActiveParam] = useState<Param>("do_mg_l");

  const { data, isLoading } = useQuery({
    queryKey: ["pond", pondId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [pondRes, readingsRes] = await Promise.all([
        insforge.database.from("ponds").select("*").eq("id", pondId).single(),
        insforge.database
          .from("readings")
          .select("*")
          .eq("pond_id", pondId)
          .order("recorded_at", { ascending: false })
          .limit(200),
      ]);
      return {
        pond: pondRes.data as Pond | null,
        readings: ((readingsRes.data ?? []) as Reading[]).slice().reverse(),
      };
    },
  });

  const simulate = useMutation({
    mutationFn: async () => {
      const jitter = (mid: number, spread: number) => +(mid + (Math.random() - 0.5) * spread).toFixed(2);
      const row = {
        pond_id: pondId,
        recorded_at: new Date().toISOString(),
        do_mg_l: jitter(6.5, 3),
        ph: jitter(7.4, 0.8),
        temp_c: jitter(27, 4),
        turbidity_ntu: jitter(45, 30),
      };
      const { error } = await insforge.database.from("readings").insert([row]);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Simulated reading inserted");
      qc.invalidateQueries({ queryKey: ["pond", pondId] });
      qc.invalidateQueries({ queryKey: ["live"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pond = data?.pond;
  const readings = data?.readings ?? [];
  const latest = readings[readings.length - 1];

  const chartData = useMemo(
    () =>
      readings.map((r) => ({
        t: new Date(r.recorded_at).getTime(),
        label: new Date(r.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: r[activeParam] as number | null,
      })),
    [readings, activeParam],
  );

  const exportCsv = () => {
    const header = ["recorded_at", "do_mg_l", "ph", "temp_c", "turbidity_ntu"].join(",");
    const lines = readings.map((r) =>
      [r.recorded_at, r.do_mg_l, r.ph, r.temp_c, r.turbidity_ntu].map((v) => v ?? "").join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pond-${pondId}-readings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading pond…</div>;
  if (!pond) return <div className="text-sm text-muted-foreground">Pond not found.</div>;

  const band = PARAMS.find((p) => p.key === activeParam)!.band;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/app/live" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Live view
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{pond.name}</h1>
          <p className="text-sm text-muted-foreground">
            {pond.species ?? "—"} · {pond.water_type ?? "—"} · {pond.area_m2 ?? "—"} m²
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button size="sm" onClick={() => simulate.mutate()} disabled={simulate.isPending}>
            <FlaskConical className="mr-2 h-4 w-4" />
            {simulate.isPending ? "Simulating…" : "Simulate reading"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PARAMS.map((p) => {
          const v = latest?.[p.key] as number | null | undefined;
          const inBand = v != null && v >= p.band[0] && v <= p.band[1];
          return (
            <button
              key={p.key}
              onClick={() => setActiveParam(p.key)}
              className={`rounded-2xl border bg-card p-4 text-left transition ${
                activeParam === p.key ? "border-primary/60 ring-1 ring-primary/30" : "border-border/70 hover:border-primary/40"
              }`}
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{p.label}</p>
              <p className={`mt-1 font-display text-3xl font-bold tabular-nums ${inBand ? "text-foreground" : "text-amber-600"}`}>
                {v != null ? v.toFixed(p.unit === "" ? 2 : 1) : "—"}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{p.unit}</span>
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Safe {p.band[0]}–{p.band[1]} {p.unit}
              </p>
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">
            {PARAMS.find((p) => p.key === activeParam)!.label} trend
          </h2>
          <span className="text-xs text-muted-foreground">{readings.length} points</span>
        </div>
        <div className="mt-3 h-72 w-full">
          {chartData.length === 0 ? (
            <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Beaker className="h-5 w-5" />
                No readings yet — try "Simulate reading".
              </div>
            </div>
          ) : (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <ReferenceArea y1={band[0]} y2={band[1]} fill="hsl(var(--primary))" fillOpacity={0.06} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card">
        <div className="border-b border-border/60 p-4">
          <h2 className="font-display text-lg font-semibold">Sensor history</h2>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">DO</th>
                <th className="px-4 py-2">pH</th>
                <th className="px-4 py-2">Temp</th>
                <th className="px-4 py-2">Turb</th>
              </tr>
            </thead>
            <tbody>
              {readings
                .slice()
                .reverse()
                .map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-4 py-2 text-muted-foreground">{new Date(r.recorded_at).toLocaleString()}</td>
                    <td className="px-4 py-2 tabular-nums">{r.do_mg_l?.toFixed(1) ?? "—"}</td>
                    <td className="px-4 py-2 tabular-nums">{r.ph?.toFixed(2) ?? "—"}</td>
                    <td className="px-4 py-2 tabular-nums">{r.temp_c?.toFixed(1) ?? "—"}</td>
                    <td className="px-4 py-2 tabular-nums">{r.turbidity_ntu?.toFixed(0) ?? "—"}</td>
                  </tr>
                ))}
              {readings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No readings recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
