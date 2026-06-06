import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Battery,
  Calendar,
  CheckCircle2,
  Cpu,
  Download,
  FileText,
  MapPin,
  StickyNote,
  Waves,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, StatusBadge } from "@/components/app/StatusBadge";
import { useI18n } from "@/lib/i18n";
import {
  insforge,
  type Alert as DbAlert,
  type Device,
  type Farm,
  type Pond,
  type PondStatus,
  type Reading,
} from "@/lib/insforge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/ponds/$pondId")({
  head: () => ({ meta: [{ title: "Pond Detail - Acqua Lence" }] }),
  component: PondDetailPage,
});

type Range = "24h" | "7d" | "30d";
type ParamKey = "do" | "ph" | "temp" | "turb" | "sal" | "amm" | "level" | "batt";
type ParamDef = {
  key: ParamKey;
  labelEn: string;
  labelBn: string;
  unit: string;
  safe: [number, number];
  warn: [number, number];
  min: number;
  max: number;
};

type PondRow = Pond & { created_at?: string | null; updated_at?: string | null };
type CalibrationRow = {
  id: string;
  sensor_type: string;
  calibration_value: number | null;
  technician_name?: string | null;
  result?: string | null;
  notes?: string | null;
  performed_at: string;
};
type MaintenanceRow = {
  id: string;
  visit_type?: string | null;
  notes?: string | null;
  performed_at: string;
};
type PondDetailData = {
  pond: PondRow;
  farm: Farm | null;
  device: Device | null;
  readings: Reading[];
  alerts: DbAlert[];
  calibrations: CalibrationRow[];
  maintenance: MaintenanceRow[];
};
type ChartPoint = {
  t: number;
  label: string;
  hasData: boolean;
} & Record<ParamKey, number | null>;
type TimelineEvent = {
  id: string;
  type: "alert" | "device" | "calibration" | "maintenance" | "note";
  severity?: string;
  title: string;
  detail: string;
  at: string;
};

const PARAMS: ParamDef[] = [
  {
    key: "do",
    labelEn: "Dissolved O2",
    labelBn: "দ্রবীভূত O2",
    unit: "mg/L",
    safe: [5, 9],
    warn: [3.5, 11],
    min: 0,
    max: 14,
  },
  {
    key: "ph",
    labelEn: "pH",
    labelBn: "pH",
    unit: "",
    safe: [6.8, 8.2],
    warn: [6.2, 8.8],
    min: 5,
    max: 10,
  },
  {
    key: "temp",
    labelEn: "Temperature",
    labelBn: "তাপমাত্রা",
    unit: "C",
    safe: [24, 31],
    warn: [22, 33],
    min: 18,
    max: 36,
  },
  {
    key: "turb",
    labelEn: "Turbidity",
    labelBn: "ঘোলাত্ব",
    unit: "NTU",
    safe: [10, 35],
    warn: [5, 60],
    min: 0,
    max: 100,
  },
  {
    key: "sal",
    labelEn: "Salinity",
    labelBn: "লবণাক্ততা",
    unit: "ppt",
    safe: [10, 18],
    warn: [7, 22],
    min: 0,
    max: 35,
  },
  {
    key: "amm",
    labelEn: "Ammonia",
    labelBn: "অ্যামোনিয়া",
    unit: "mg/L",
    safe: [0, 0.2],
    warn: [0, 0.4],
    min: 0,
    max: 1.2,
  },
  {
    key: "level",
    labelEn: "Water level",
    labelBn: "পানির স্তর",
    unit: "m",
    safe: [1.2, 2.2],
    warn: [0.9, 2.5],
    min: 0,
    max: 3,
  },
  {
    key: "batt",
    labelEn: "Battery",
    labelBn: "ব্যাটারি",
    unit: "%",
    safe: [30, 100],
    warn: [15, 100],
    min: 0,
    max: 100,
  },
];

const RANGE_MS: Record<Range, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

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

function rangeStart(range: Range) {
  return new Date(Date.now() - RANGE_MS[range]).toISOString();
}

function toFiniteNumber(value: unknown, digits = 2) {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Number(parsed.toFixed(digits));
}

function formatNumber(value: unknown, digits = 2) {
  const parsed = toFiniteNumber(value, digits);
  if (parsed == null) return "--";
  return String(parsed);
}

function readingValue(reading: Reading, key: ParamKey) {
  switch (key) {
    case "do":
      return toFiniteNumber(reading.do_mg_l, 2);
    case "ph":
      return toFiniteNumber(reading.ph, 2);
    case "temp":
      return toFiniteNumber(reading.temp_c, 1);
    case "turb":
      return toFiniteNumber(reading.turbidity_ntu, 0);
    case "sal":
      return toFiniteNumber(reading.salinity_ppt, 1);
    case "amm":
      return toFiniteNumber(reading.ammonia_mg_l, 3);
    case "level": {
      const levelCm = toFiniteNumber(reading.water_level_cm, 1);
      return levelCm == null ? null : toFiniteNumber(levelCm / 100, 2);
    }
    case "batt":
      return toFiniteNumber(reading.battery_pct, 0);
  }
}

function readingToPoint(reading: Reading, range: Range): ChartPoint {
  const t = new Date(reading.recorded_at).getTime();
  const point = {
    t,
    label:
      range === "24h"
        ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }),
    hasData: false,
  } as ChartPoint;

  for (const param of PARAMS) {
    point[param.key] = readingValue(reading, param.key);
    if (point[param.key] != null) point.hasData = true;
  }
  return point;
}

function emptyPoint(): ChartPoint {
  return {
    t: Date.now(),
    label: "",
    hasData: false,
    do: null,
    ph: null,
    temp: null,
    turb: null,
    sal: null,
    amm: null,
    level: null,
    batt: null,
  };
}

function classifyValue(p: ParamDef, v: number | null): "good" | "warning" | "critical" | "offline" {
  if (v == null) return "offline";
  if (v < p.warn[0] || v > p.warn[1]) return "critical";
  if (v < p.safe[0] || v > p.safe[1]) return "warning";
  return "good";
}

function deriveStatus(pond: PondRow, device: Device | null, latest: ChartPoint): PondStatus {
  if (device?.status === "offline") return "offline";
  if (latest.hasData) {
    const doDef = PARAMS.find((param) => param.key === "do")!;
    const doStatus = classifyValue(doDef, latest.do);
    if (doStatus === "critical" || doStatus === "warning") return doStatus;
  }
  return pond.status;
}

function toRecommendedStatus(status: PondStatus): "warning" | "critical" | "offline" | null {
  if (status === "critical" || status === "offline") return status;
  if (status === "warning" || status === "watch" || status === "calibration_due") return "warning";
  return null;
}

function buildTimeline(
  data: PondDetailData,
  t: (en: string, bn: string) => string,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const alert of data.alerts) {
    events.push({
      id: `alert-${alert.id}`,
      type: "alert",
      severity: alert.severity,
      title: alert.message || alert.alert_type.replace(/_/g, " "),
      detail: [
        alert.parameter,
        alert.value == null ? null : `value ${formatNumber(alert.value, 2)}`,
        alert.status,
      ]
        .filter(Boolean)
        .join(" - "),
      at: alert.detected_at,
    });
  }

  if (data.device?.last_seen) {
    events.push({
      id: `device-${data.device.id}`,
      type: "device",
      title: t("Device heartbeat received", "ডিভাইস হার্টবিট পাওয়া গেছে"),
      detail: data.device.serial,
      at: data.device.last_seen,
    });
  }

  for (const row of data.calibrations) {
    events.push({
      id: `cal-${row.id}`,
      type: "calibration",
      title: t("Sensor calibrated", "সেন্সর ক্যালিব্রেট হয়েছে"),
      detail: [row.sensor_type, row.result, row.technician_name].filter(Boolean).join(" - "),
      at: row.performed_at,
    });
  }

  for (const row of data.maintenance) {
    events.push({
      id: `maint-${row.id}`,
      type: "maintenance",
      title: row.visit_type || t("Maintenance visit", "রক্ষণাবেক্ষণ ভিজিট"),
      detail: row.notes || t("No notes recorded", "নোট নেই"),
      at: row.performed_at,
    });
  }

  return events.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 12);
}

function timeAgo(iso: string, lang: "en" | "bn") {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return lang === "bn" ? "এইমাত্র" : "just now";
  if (mins < 60) return lang === "bn" ? `${mins} মি আগে` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return lang === "bn" ? `${hrs} ঘ আগে` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return lang === "bn" ? `${days} দিন আগে` : `${days}d ago`;
}

function PondDetailPage() {
  const { pondId } = Route.useParams();
  const { lang } = useI18n();
  const t = useCallback((en: string, bn: string) => (lang === "bn" ? bn : en), [lang]);
  const [range, setRange] = useState<Range>("24h");
  const [activeParam, setActiveParam] = useState<ParamKey>("do");

  const detailQuery = useQuery({
    queryKey: ["app-pond-detail", pondId, range],
    refetchInterval: 30_000,
    queryFn: async (): Promise<PondDetailData | null> => {
      const pondRes = await insforge.database.from("ponds").select("*").eq("id", pondId).limit(1);
      assertDbOk(pondRes, "Failed to load pond");
      const pond = ((pondRes.data ?? []) as PondRow[])[0];
      if (!pond) return null;

      const since = rangeStart(range);
      const [farmRes, devicesRes, readingsRes, alertsRes] = await Promise.all([
        insforge.database.from("farms").select("*").eq("id", pond.farm_id).limit(1),
        insforge.database.from("devices").select("*").eq("pond_id", pond.id).limit(1),
        insforge.database
          .from("readings")
          .select("*")
          .eq("pond_id", pond.id)
          .gte("recorded_at", since)
          .order("recorded_at", { ascending: true })
          .limit(2000),
        insforge.database
          .from("alerts")
          .select("*")
          .eq("pond_id", pond.id)
          .order("detected_at", { ascending: false })
          .limit(100),
      ]);

      assertDbOk(farmRes, "Failed to load farm");
      assertDbOk(devicesRes, "Failed to load device");
      assertDbOk(readingsRes, "Failed to load readings");
      assertDbOk(alertsRes, "Failed to load alerts");

      const farm = ((farmRes.data ?? []) as Farm[])[0] ?? null;
      const device = ((devicesRes.data ?? []) as Device[])[0] ?? null;
      let calibrations: CalibrationRow[] = [];
      let maintenance: MaintenanceRow[] = [];

      if (device) {
        const [calRes, maintenanceRes] = await Promise.all([
          insforge.database
            .from("calibration_logs")
            .select("*")
            .eq("device_id", device.id)
            .order("performed_at", { ascending: false })
            .limit(50),
          insforge.database
            .from("maintenance_logs")
            .select("*")
            .eq("device_id", device.id)
            .order("performed_at", { ascending: false })
            .limit(50),
        ]);
        assertDbOk(calRes, "Failed to load calibration logs");
        assertDbOk(maintenanceRes, "Failed to load maintenance logs");
        calibrations = (calRes.data ?? []) as CalibrationRow[];
        maintenance = (maintenanceRes.data ?? []) as MaintenanceRow[];
      }

      return {
        pond,
        farm,
        device,
        readings: (readingsRes.data ?? []) as Reading[],
        alerts: (alertsRes.data ?? []) as DbAlert[],
        calibrations,
        maintenance,
      };
    },
  });

  const detail = detailQuery.data ?? null;
  const series = useMemo(
    () => (detail?.readings ?? []).map((reading) => readingToPoint(reading, range)),
    [detail?.readings, range],
  );
  const liveSeries = useMemo(() => series.slice(-48), [series]);
  const latest = liveSeries[liveSeries.length - 1] ?? emptyPoint();
  const status = detail ? deriveStatus(detail.pond, detail.device, latest) : "offline";
  const activeDef = PARAMS.find((p) => p.key === activeParam)!;
  const events = useMemo(() => (detail ? buildTimeline(detail, t) : []), [detail, t]);
  const daysInCycle = detail?.pond.stocking_date
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(detail.pond.stocking_date).getTime()) / 86400_000),
      )
    : 0;
  const lastUpdated = latest.hasData
    ? new Date(latest.t).toISOString()
    : (detail?.device?.last_seen ??
      detail?.pond.updated_at ??
      detail?.pond.created_at ??
      new Date().toISOString());
  const recommendedStatus = toRecommendedStatus(status);

  function downloadCsv() {
    if (!series.length) {
      toast.error(t("No readings to export", "এক্সপোর্ট করার মতো রিডিং নেই"));
      return;
    }
    const header = ["time", ...PARAMS.map((p) => p.key)].join(",");
    const rows = series.map((row) =>
      [new Date(row.t).toISOString(), ...PARAMS.map((param) => row[param.key] ?? "")].join(","),
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pondId}_${range}_readings.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("Data exported", "ডেটা এক্সপোর্ট হয়েছে"));
  }

  if (detailQuery.isLoading) {
    return (
      <PondShell t={t}>
        <EmptyState
          icon={<Waves className="h-6 w-6" />}
          title={t("Loading pond", "পুকুর লোড হচ্ছে")}
          description={t("We are loading live pond data.", "লাইভ পুকুরের ডেটা লোড হচ্ছে।")}
        />
      </PondShell>
    );
  }

  if (detailQuery.isError) {
    return (
      <PondShell t={t}>
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title={t("Could not load pond", "পুকুর লোড করা যায়নি")}
          description={dbErrorMessage(detailQuery.error, "Please try again.")}
          action={
            <Button variant="outline" onClick={() => void detailQuery.refetch()}>
              {t("Try again", "আবার চেষ্টা করুন")}
            </Button>
          }
        />
      </PondShell>
    );
  }

  if (!detail) {
    return (
      <PondShell t={t}>
        <EmptyState
          icon={<Waves className="h-6 w-6" />}
          title={t("Pond not found", "পুকুর পাওয়া যায়নি")}
          description={t(
            "This pond is missing or your account does not have access to it.",
            "এই পুকুরটি নেই অথবা আপনার অ্যাকাউন্টে এর অ্যাক্সেস নেই।",
          )}
          action={
            <Button asChild variant="outline">
              <Link to="/app/farms">{t("Back to farms", "ফার্মে ফিরুন")}</Link>
            </Button>
          }
        />
      </PondShell>
    );
  }

  const { pond, farm, device } = detail;
  const pondType = pond.pond_type ?? "--";
  const area = pond.area_m2 == null ? "--" : `${Number(pond.area_m2).toLocaleString()} m2`;
  const depth = pond.depth_m == null ? "--" : `${formatNumber(pond.depth_m, 1)} m`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <BackLink t={t} />

      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{pond.name}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Waves className="h-3.5 w-3.5" />
                {farm?.name ?? t("Unknown farm", "অজানা ফার্ম")}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {farm?.location ?? farm?.district ?? "--"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {t("Last update", "শেষ আপডেট")}: {timeAgo(lastUpdated, lang)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> {t("Export", "এক্সপোর্ট")}
            </Button>
            {device ? (
              <Link to="/app/devices/$deviceId" params={{ deviceId: device.id }}>
                <Button size="sm" variant="outline">
                  <Cpu className="mr-1.5 h-3.5 w-3.5" /> {t("Open device", "ডিভাইস খুলুন")}
                </Button>
              </Link>
            ) : (
              <Button size="sm" variant="outline" disabled>
                <Cpu className="mr-1.5 h-3.5 w-3.5" /> {t("No device", "ডিভাইস নেই")}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled
              title={t("Pond notes need backend setup.", "পুকুর নোটের জন্য ব্যাকএন্ড সেটআপ দরকার।")}
            >
              <StickyNote className="mr-1.5 h-3.5 w-3.5" /> {t("Add note", "নোট যোগ")}
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Info label={t("Pond type", "পুকুরের ধরন")} value={pondType} />
          <Info label={t("Area", "এলাকা")} value={area} />
          <Info label={t("Depth", "গভীরতা")} value={depth} />
          <Info label={t("Species", "প্রজাতি")} value={pond.species ?? "--"} />
          <Info label={t("Stocked", "মজুদ")} value={pond.stocking_date ?? "--"} />
          <Info
            label={t("Days in cycle", "চক্রের দিন")}
            value={`${daysInCycle} ${t("days", "দিন")}`}
          />
        </dl>
      </div>

      {recommendedStatus && (
        <RecommendedAction status={recommendedStatus} pondName={pond.name} t={t} />
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">
          {t("Live water quality", "তাজা পানির গুণমান")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PARAMS.map((param) => (
            <LiveCard
              key={param.key}
              def={param}
              value={latest[param.key]}
              series={liveSeries}
              t={t}
              active={param.key === activeParam}
              onClick={() => setActiveParam(param.key)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">
              {t(activeDef.labelEn, activeDef.labelBn)}{" "}
              {activeDef.unit && (
                <span className="text-sm text-muted-foreground">({activeDef.unit})</span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("Safe range", "নিরাপদ পরিসর")}: {activeDef.safe[0]}-{activeDef.safe[1]}{" "}
              {activeDef.unit}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={activeParam} onValueChange={(v) => setActiveParam(v as ParamKey)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARAMS.map((param) => (
                  <SelectItem key={param.key} value={param.key}>
                    {t(param.labelEn, param.labelBn)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
              <TabsList>
                <TabsTrigger value="24h">24h</TabsTrigger>
                <TabsTrigger value="7d">7d</TabsTrigger>
                <TabsTrigger value="30d">30d</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {series.length ? (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="paramFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  domain={[activeDef.min, activeDef.max]}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <ReferenceArea
                  y1={activeDef.safe[0]}
                  y2={activeDef.safe[1]}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.06}
                />
                <ReferenceLine
                  y={activeDef.warn[0]}
                  stroke="rgb(245 158 11)"
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  y={activeDef.warn[1]}
                  stroke="rgb(245 158 11)"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey={activeParam}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#paramFill)"
                  connectNulls={false}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title={t("No readings yet", "এখনও রিডিং নেই")}
            description={t(
              "Charts will appear after the device sends telemetry.",
              "ডিভাইস টেলিমেট্রি পাঠালে চার্ট দেখা যাবে।",
            )}
          />
        )}
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <Legend dotClass="bg-primary/40" label={t("Safe range", "নিরাপদ পরিসর")} />
          <Legend dotClass="bg-amber-500" label={t("Warning threshold", "সতর্ক সীমা")} />
          <Legend
            dotClass="bg-muted-foreground/40"
            label={t("Gap = missing data", "ফাঁক = অনুপস্থিত ডেটা")}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("Timeline", "টাইমলাইন")}</h2>
          {events.length ? (
            <ol className="relative space-y-4 border-l border-border pl-5">
              {events.map((event) => (
                <TimelineItem key={event.id} event={event} lang={lang} />
              ))}
            </ol>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t(
                "No alerts or service events recorded yet.",
                "এখনও কোনো অ্যালার্ট বা সার্ভিস ইভেন্ট নেই।",
              )}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              {t("Sensor history", "সেন্সর ইতিহাস")}
            </h2>
            <Button size="sm" variant="ghost" onClick={downloadCsv}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t("Time", "সময়")}</TableHead>
                  <TableHead className="text-xs">DO</TableHead>
                  <TableHead className="text-xs">pH</TableHead>
                  <TableHead className="text-xs">C</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.length ? (
                  series
                    .slice()
                    .reverse()
                    .slice(0, 30)
                    .map((row) => (
                      <TableRow key={row.t}>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {row.label}
                        </TableCell>
                        <TableCell className="tabular-nums">{row.do ?? "--"}</TableCell>
                        <TableCell className="tabular-nums">{row.ph ?? "--"}</TableCell>
                        <TableCell className="tabular-nums">{row.temp ?? "--"}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      {t("No readings in this range.", "এই সময়সীমায় কোনো রিডিং নেই।")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}

function PondShell({
  children,
  t,
}: {
  children: ReactNode;
  t: (en: string, bn: string) => string;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <BackLink t={t} />
      {children}
    </div>
  );
}

function BackLink({ t }: { t: (en: string, bn: string) => string }) {
  return (
    <Link
      to="/app/farms"
      className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="mr-1 h-3 w-3" /> {t("Back to farms", "ফার্মে ফিরুন")}
    </Link>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Legend({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-3 rounded-sm", dotClass)} />
      {label}
    </span>
  );
}

function LiveCard({
  def,
  value,
  series,
  t,
  active,
  onClick,
}: {
  def: ParamDef;
  value: number | null;
  series: ChartPoint[];
  t: (en: string, bn: string) => string;
  active: boolean;
  onClick: () => void;
}) {
  const status = classifyValue(def, value);
  const trend = series.map((row) => ({ v: row[def.key] }));
  return (
    <button
      onClick={onClick}
      className={cn(
        "group rounded-2xl border bg-card p-3 text-left shadow-soft transition hover:border-primary/50",
        active ? "border-primary/70 ring-2 ring-primary/20" : "border-border/70",
        status === "critical" && "border-rose-500/40 bg-rose-500/5",
        status === "warning" && "border-amber-500/40",
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t(def.labelEn, def.labelBn)}
        </p>
        {def.key === "batt" ? (
          <Battery className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold tabular-nums">
          {value == null ? "--" : value}
        </span>
        {def.unit && <span className="text-xs text-muted-foreground">{def.unit}</span>}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <StatusBadge status={status} />
        <span className="text-[10px] text-muted-foreground">
          {def.safe[0]}-{def.safe[1]}
        </span>
      </div>
      <div className="mt-2 h-8 w-full">
        <ResponsiveContainer>
          <LineChart data={trend}>
            <Line
              type="monotone"
              dataKey="v"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
}

function TimelineItem({ event, lang }: { event: TimelineEvent; lang: "en" | "bn" }) {
  return (
    <li className="relative">
      <span
        className={cn(
          "absolute -left-[27px] grid h-5 w-5 place-items-center rounded-full border-2 border-card",
          event.type === "alert"
            ? event.severity === "critical"
              ? "bg-rose-500"
              : "bg-amber-500"
            : event.type === "device"
              ? "bg-sky-500"
              : event.type === "calibration"
                ? "bg-violet-500"
                : event.type === "maintenance"
                  ? "bg-emerald-500"
                  : "bg-amber-500",
        )}
      >
        {event.type === "alert" ? (
          <AlertTriangle className="h-2.5 w-2.5 text-white" />
        ) : event.type === "device" ? (
          <Cpu className="h-2.5 w-2.5 text-white" />
        ) : event.type === "calibration" ? (
          <Wrench className="h-2.5 w-2.5 text-white" />
        ) : event.type === "maintenance" ? (
          <FileText className="h-2.5 w-2.5 text-white" />
        ) : (
          <StickyNote className="h-2.5 w-2.5 text-white" />
        )}
      </span>
      <p className="text-sm font-medium">{event.title}</p>
      <p className="text-xs text-muted-foreground">{event.detail}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(event.at, lang)}</p>
    </li>
  );
}

function RecommendedAction({
  status,
  pondName,
  t,
}: {
  status: "warning" | "critical" | "offline";
  pondName: string;
  t: (en: string, bn: string) => string;
}) {
  const cfg = {
    critical: {
      problem: t("Water quality is in a critical range", "পানির গুণমান গুরুতর পর্যায়ে"),
      action: t(
        "Turn on aerators immediately and inspect the pond.",
        "অবিলম্বে এরেটর চালু করুন এবং পুকুর পরীক্ষা করুন।",
      ),
      reason: t(
        "Critical readings can cause rapid stress or mortality.",
        "গুরুতর রিডিং দ্রুত চাপ বা মৃত্যুর কারণ হতে পারে।",
      ),
      priority: t("Critical", "গুরুতর"),
      tone: "border-rose-500/50 bg-rose-500/5",
      dot: "bg-rose-500",
    },
    warning: {
      problem: t("Parameters are outside the preferred range", "প্যারামিটার পছন্দের সীমার বাইরে"),
      action: t(
        "Check aeration, feeding, and recent water changes.",
        "এরেশন, খাবার এবং সাম্প্রতিক পানি পরিবর্তন পরীক্ষা করুন।",
      ),
      reason: t(
        "Early action can prevent a critical pond condition.",
        "দ্রুত পদক্ষেপ গুরুতর অবস্থা প্রতিরোধ করতে পারে।",
      ),
      priority: t("High", "উচ্চ"),
      tone: "border-amber-500/50 bg-amber-500/5",
      dot: "bg-amber-500",
    },
    offline: {
      problem: t("Sensor device is offline", "সেন্সর ডিভাইস অফলাইন"),
      action: t(
        "Check device power, enclosure, and SIM signal at the pond.",
        "পুকুরে ডিভাইস পাওয়ার, এনক্লোজার ও সিম সিগন্যাল পরীক্ষা করুন।",
      ),
      reason: t(
        "Without live data, water quality cannot be monitored.",
        "লাইভ ডেটা ছাড়া পানির গুণমান পর্যবেক্ষণ করা যায় না।",
      ),
      priority: t("Medium", "মাঝারি"),
      tone: "border-muted-foreground/30 bg-muted/30",
      dot: "bg-muted-foreground",
    },
  }[status];

  return (
    <section className={cn("rounded-2xl border p-5 shadow-soft", cfg.tone)}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 grid h-9 w-9 place-items-center rounded-full", cfg.dot)}>
          {status === "critical" ? (
            <AlertTriangle className="h-5 w-5 text-white" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-white" />
          )}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold">
              {t("Recommended action", "প্রস্তাবিত পদক্ষেপ")}
            </h3>
            <span className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              {t("Priority", "অগ্রাধিকার")}: {cfg.priority}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium">
            {cfg.problem} - {pondName}
          </p>
          <p className="mt-2 text-sm">{cfg.action}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Why", "কেন")}: {cfg.reason}
          </p>
          <Link
            to="/app/alerts"
            className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
          >
            {t("View related alerts", "সম্পর্কিত অ্যালার্ট দেখুন")}
          </Link>
        </div>
      </div>
    </section>
  );
}
