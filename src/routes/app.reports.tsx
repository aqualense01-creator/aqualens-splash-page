import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Line, LineChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Download, FileText } from "lucide-react";
import { insforge, type Pond, type Reading, type Alert, type Farm } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, MetricTile } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports — Acqua Lence" }] }),
  component: ReportsPage,
});

type Range = "24h" | "7d" | "30d";

function ReportsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("7d");
  const [pondId, setPondId] = useState<string>("all");
  const [farmId, setFarmId] = useState<string>("all");
  const [reportType, setReportType] = useState("daily");

  const since = useMemo(() => {
    const ms = range === "24h" ? 86400000 : range === "7d" ? 86400000 * 7 : 86400000 * 30;
    return new Date(Date.now() - ms).toISOString();
  }, [range]);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", range, pondId, farmId],
    enabled: !!user,
    queryFn: async () => {
      const [f, p, r, a] = await Promise.all([
        insforge.database.from("farms").select("*"),
        insforge.database.from("ponds").select("*"),
        insforge.database.from("readings").select("*").gte("recorded_at", since).order("recorded_at", { ascending: true }).limit(2000),
        insforge.database.from("alerts").select("*").gte("detected_at", since),
      ]);
      return {
        farms: (f.data ?? []) as Farm[],
        ponds: (p.data ?? []) as Pond[],
        readings: (r.data ?? []) as Reading[],
        alerts: (a.data ?? []) as Alert[],
      };
    },
  });

  const ponds = data?.ponds ?? [];
  const farms = data?.farms ?? [];
  let readings = data?.readings ?? [];
  let alerts = data?.alerts ?? [];
  if (farmId !== "all") {
    const allowedPondIds = new Set(ponds.filter((p) => p.farm_id === farmId).map((p) => p.id));
    readings = readings.filter((r) => allowedPondIds.has(r.pond_id));
    alerts = alerts.filter((a) => a.pond_id && allowedPondIds.has(a.pond_id));
  }
  if (pondId !== "all") {
    readings = readings.filter((r) => r.pond_id === pondId);
    alerts = alerts.filter((a) => a.pond_id === pondId);
  }

  const safePct = useMemo(() => {
    if (!readings.length) return 0;
    const safe = readings.filter((r) =>
      (r.do_mg_l == null || (r.do_mg_l >= 4 && r.do_mg_l <= 9)) &&
      (r.ph == null || (r.ph >= 6.5 && r.ph <= 8.5)) &&
      (r.temp_c == null || (r.temp_c >= 22 && r.temp_c <= 32))
    ).length;
    return Math.round((safe / readings.length) * 100);
  }, [readings]);

  const score = Math.max(0, Math.min(100, safePct - alerts.filter((a) => a.severity === "critical").length * 2));

  const chartData = useMemo(() => {
    const buckets: Record<string, { time: string; do: number; ph: number; temp: number; salinity: number; n: number }> = {};
    readings.forEach((r) => {
      const t = new Date(r.recorded_at);
      const key = range === "24h" ? `${t.getHours()}:00` : `${t.getMonth() + 1}/${t.getDate()}`;
      if (!buckets[key]) buckets[key] = { time: key, do: 0, ph: 0, temp: 0, salinity: 0, n: 0 };
      const b = buckets[key];
      b.do += r.do_mg_l ?? 0; b.ph += r.ph ?? 0; b.temp += r.temp_c ?? 0; b.salinity += r.salinity_ppt ?? 0; b.n += 1;
    });
    return Object.values(buckets).map((b) => ({
      time: b.time,
      do: +(b.do / b.n).toFixed(2),
      ph: +(b.ph / b.n).toFixed(2),
      temp: +(b.temp / b.n).toFixed(2),
      salinity: +(b.salinity / b.n).toFixed(2),
    }));
  }, [readings, range]);

  const alertChart = useMemo(() => {
    const buckets: Record<string, { day: string; critical: number; warning: number }> = {};
    alerts.forEach((a) => {
      const t = new Date(a.detected_at);
      const key = `${t.getMonth() + 1}/${t.getDate()}`;
      if (!buckets[key]) buckets[key] = { day: key, critical: 0, warning: 0 };
      if (a.severity === "critical") buckets[key].critical++;
      if (a.severity === "warning") buckets[key].warning++;
    });
    return Object.values(buckets);
  }, [alerts]);

  function exportCsv() {
    const headers = ["recorded_at", "pond", "do_mg_l", "ph", "temp_c", "turbidity_ntu", "salinity_ppt"];
    const lines = readings.map((r) => [
      r.recorded_at,
      ponds.find((p) => p.id === r.pond_id)?.name ?? r.pond_id,
      r.do_mg_l ?? "", r.ph ?? "", r.temp_c ?? "", r.turbidity_ntu ?? "", r.salinity_ppt ?? "",
    ].join(","));
    const blob = new Blob([headers.join(",") + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `acqua-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Reports & analytics"
        subtitle="Compare ponds, spot trends, export records."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => window.print()}><FileText className="mr-2 h-4 w-4" />PDF</Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList><TabsTrigger value="24h">24h</TabsTrigger><TabsTrigger value="7d">7 days</TabsTrigger><TabsTrigger value="30d">30 days</TabsTrigger></TabsList>
        </Tabs>
        <Select value={farmId} onValueChange={setFarmId}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All farms</SelectItem>
            {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={pondId} onValueChange={setPondId}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ponds</SelectItem>
            {ponds.filter((p) => farmId === "all" || p.farm_id === farmId).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily pond summary</SelectItem>
            <SelectItem value="weekly">Weekly farm health</SelectItem>
            <SelectItem value="monthly">Monthly report</SelectItem>
            <SelectItem value="device">Device health</SelectItem>
            <SelectItem value="custom">Custom export</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="Water quality score" value={score} accent="text-primary" />
        <MetricTile label="% in safe range" value={`${safePct}%`} accent="text-emerald-600" />
        <MetricTile label="Total alerts" value={alerts.length} accent="text-amber-600" />
        <MetricTile label="Device uptime" value={isLoading ? "—" : "98%"} accent="text-sky-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Dissolved O₂ & pH trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="time" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="do" stroke="#0ea5e9" name="DO mg/L" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="ph" stroke="#8b5cf6" name="pH" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Temperature & salinity">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="time" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="temp" stroke="#f59e0b" name="Temp °C" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="salinity" stroke="#10b981" name="Salinity ppt" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Alert trend">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={alertChart}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip /><Legend />
              <Bar dataKey="critical" fill="#ef4444" name="Critical" />
              <Bar dataKey="warning" fill="#f59e0b" name="Warning" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pond comparison (DO mg/L)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ponds.slice(0, 8).map((p) => {
              const rs = (data?.readings ?? []).filter((r) => r.pond_id === p.id && r.do_mg_l != null);
              const avg = rs.length ? rs.reduce((s, r) => s + (r.do_mg_l ?? 0), 0) / rs.length : 0;
              return { name: p.name, do: +avg.toFixed(2) };
            })}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} /><Tooltip />
              <Bar dataKey="do" fill="hsl(var(--primary))" name="Avg DO" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
      <h3 className="mb-3 font-display text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
