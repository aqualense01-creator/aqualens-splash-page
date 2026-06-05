import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
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
  ArrowLeft,
  Download,
  Cpu,
  StickyNote,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  FileText,
  Activity,
  MapPin,
  Calendar,
  Waves,
  Battery,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/app/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/ponds/$pondId")({
  head: () => ({ meta: [{ title: "Pond Detail — Acqua Lence" }] }),
  component: PondDetailPage,
});

// ----- Mock pond static info -----
type PondInfo = {
  id: string;
  name: string;
  farm: string;
  location: string;
  pond_type: string;
  area_m2: number;
  depth_m: number;
  species: string;
  stocking_date: string;
  device_id: string;
};
const POND_INFO: Record<string, PondInfo> = {
  p1: {
    id: "p1",
    name: "Pond 1 — Rui",
    farm: "Sundarban Farm",
    location: "Dakope, Khulna",
    pond_type: "Earthen",
    area_m2: 1200,
    depth_m: 1.8,
    species: "Rui (Rohu)",
    stocking_date: "2026-04-20",
    device_id: "d1",
  },
  p2: {
    id: "p2",
    name: "Pond 2 — Shrimp",
    farm: "Sundarban Farm",
    location: "Dakope, Khulna",
    pond_type: "Lined / HDPE",
    area_m2: 2000,
    depth_m: 1.5,
    species: "Bagda Shrimp",
    stocking_date: "2026-05-08",
    device_id: "d2",
  },
  p3: {
    id: "p3",
    name: "Pond 3 — Tilapia",
    farm: "Sundarban Farm",
    location: "Dakope, Khulna",
    pond_type: "Earthen",
    area_m2: 1500,
    depth_m: 1.6,
    species: "Tilapia",
    stocking_date: "2026-04-05",
    device_id: "d3",
  },
  p4: {
    id: "p4",
    name: "Pond 4 — Pangas",
    farm: "Khulna East Farm",
    location: "Batiaghata, Khulna",
    pond_type: "Earthen",
    area_m2: 2400,
    depth_m: 2.0,
    species: "Pangasius",
    stocking_date: "2026-03-20",
    device_id: "d4",
  },
  p5: {
    id: "p5",
    name: "Pond 5 — Carp Mix",
    farm: "Khulna East Farm",
    location: "Batiaghata, Khulna",
    pond_type: "Earthen",
    area_m2: 1800,
    depth_m: 1.7,
    species: "Mixed carp",
    stocking_date: "2026-03-08",
    device_id: "d5",
  },
  p6: {
    id: "p6",
    name: "Pond 6 — Koi",
    farm: "Khulna East Farm",
    location: "Batiaghata, Khulna",
    pond_type: "Lined / HDPE",
    area_m2: 800,
    depth_m: 1.4,
    species: "Koi Carp",
    stocking_date: "2026-02-04",
    device_id: "d6",
  },
};

// ----- Parameters -----
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
const PARAMS: ParamDef[] = [
  {
    key: "do",
    labelEn: "Dissolved O₂",
    labelBn: "দ্রবীভূত O₂",
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
    unit: "°C",
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

type Range = "24h" | "7d" | "30d";

// ----- Deterministic mock series generator (per pond) -----
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}
function rand(seed: number, i: number) {
  const x = Math.sin(seed * 9301 + i * 49297) * 233280;
  return x - Math.floor(x);
}
function generateSeries(pondId: string, range: Range) {
  const points = range === "24h" ? 48 : range === "7d" ? 84 : 90;
  const stepMs =
    range === "24h"
      ? (24 * 3600_000) / points
      : range === "7d"
        ? (7 * 86400_000) / points
        : (30 * 86400_000) / points;
  const seed = hash(pondId);
  const now = Date.now();
  const baseDo = pondId === "p2" ? 3.2 : pondId === "p3" ? 4.6 : 6.6;
  const basePh = 7.3 + (seed - 0.5) * 0.6;
  const baseT = 28 + seed * 3;
  const baseTu = 18 + seed * 12;
  const baseSal = pondId === "p2" ? 14 : 0;
  const baseAm = 0.1 + seed * 0.15;
  const baseLv = 1.6 + (seed - 0.5) * 0.3;
  const baseBatt = pondId === "p3" ? 14 : pondId === "p5" ? 0 : 60 + seed * 35;
  const data = [] as Array<Record<string, number | string | null>>;
  for (let i = 0; i < points; i++) {
    const t = now - (points - 1 - i) * stepMs;
    const dayPhase = Math.sin((i / points) * Math.PI * (range === "24h" ? 2 : 6));
    // Inject a missing data gap mid-series
    const missing = i > points * 0.45 && i < points * 0.5;
    const row: Record<string, number | string | null> = {
      t,
      label:
        range === "24h"
          ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }),
    };
    if (missing) {
      for (const p of PARAMS) row[p.key] = null;
    } else {
      row.do = +(baseDo + dayPhase * 0.8 + (rand(seed, i) - 0.5) * 0.4).toFixed(2);
      row.ph = +(basePh + dayPhase * 0.2 + (rand(seed, i + 7) - 0.5) * 0.15).toFixed(2);
      row.temp = +(baseT + dayPhase * 1.2 + (rand(seed, i + 13) - 0.5) * 0.4).toFixed(1);
      row.turb = +(baseTu + (rand(seed, i + 19) - 0.5) * 6).toFixed(0);
      row.sal = baseSal === 0 ? null : +(baseSal + (rand(seed, i + 23) - 0.5) * 1.2).toFixed(1);
      row.amm = +(baseAm + dayPhase * 0.05 + (rand(seed, i + 29) - 0.5) * 0.04).toFixed(3);
      row.level = +(baseLv + (rand(seed, i + 31) - 0.5) * 0.08).toFixed(2);
      row.batt = pondId === "p5" ? 0 : Math.max(0, Math.round(baseBatt - i * 0.15));
    }
    data.push(row);
  }
  return data;
}

function pondStatus(
  latest: Record<string, number | string | null>,
  pondId: string,
): "good" | "warning" | "critical" | "offline" {
  if (pondId === "p5") return "offline";
  const doVal = latest.do as number | null;
  if (doVal == null) return "offline";
  if (doVal < 3.5) return "critical";
  if (doVal < 5) return "warning";
  return "good";
}

function classifyValue(p: ParamDef, v: number | null): "good" | "warning" | "critical" | "offline" {
  if (v == null) return "offline";
  if (v < p.warn[0] || v > p.warn[1]) return "critical";
  if (v < p.safe[0] || v > p.safe[1]) return "warning";
  return "good";
}

// ----- Component -----
function PondDetailPage() {
  const { pondId } = Route.useParams();
  const { lang } = useI18n();
  const t = useCallback((en: string, bn: string) => (lang === "bn" ? bn : en), [lang]);
  const info = POND_INFO[pondId] ?? POND_INFO.p1;

  const [range, setRange] = useState<Range>("24h");
  const [activeParam, setActiveParam] = useState<ParamKey>("do");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const series = useMemo(() => generateSeries(info.id, range), [info.id, range]);
  const liveSeries = useMemo(() => generateSeries(info.id, "24h"), [info.id]);
  const latest = liveSeries[liveSeries.length - 1];
  const status = pondStatus(latest, info.id);

  const daysInCycle = Math.max(
    0,
    Math.floor((Date.now() - new Date(info.stocking_date).getTime()) / 86400_000),
  );
  const lastUpdated = new Date((latest.t as number) ?? Date.now());

  const activeDef = PARAMS.find((p) => p.key === activeParam)!;

  const downloadCsv = () => {
    const header = ["time", ...PARAMS.map((p) => p.key)].join(",");
    const rows = series.map((r) =>
      [new Date(r.t as number).toISOString(), ...PARAMS.map((p) => r[p.key] ?? "")].join(","),
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${info.id}_${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("Data exported", "ডেটা এক্সপোর্ট হয়েছে"));
  };

  // Timeline events
  const events = useMemo(() => {
    const now = Date.now();
    const m = (mins: number) => new Date(now - mins * 60_000).toISOString();
    return [
      {
        id: "e1",
        type: "alert" as const,
        severity: status === "critical" ? "critical" : "warning",
        title: t("Low dissolved oxygen detected", "নিম্ন দ্রবীভূত অক্সিজেন"),
        detail: t("DO dropped below 4 mg/L", "DO 4 mg/L এর নিচে নেমেছে"),
        at: m(8),
      },
      {
        id: "e2",
        type: "device" as const,
        title: t("Device reconnected", "ডিভাইস পুনরায় সংযুক্ত"),
        detail: info.device_id,
        at: m(120),
      },
      {
        id: "e3",
        type: "calibration" as const,
        title: t("pH sensor calibrated", "pH সেন্সর ক্যালিব্রেট হয়েছে"),
        detail: t("Technician onsite", "টেকনিশিয়ান অনসাইট"),
        at: m(60 * 26),
      },
      {
        id: "e4",
        type: "note" as const,
        title: t("Manual note", "ম্যানুয়াল নোট"),
        detail: t("Aerator switched on for 2 hours.", "এরেটর ২ ঘণ্টা চালু রাখা হয়েছে।"),
        at: m(60 * 30),
      },
      {
        id: "e5",
        type: "report" as const,
        title: t("Weekly report generated", "সাপ্তাহিক রিপোর্ট তৈরি"),
        detail: t("PDF · 4 pages", "PDF · ৪ পৃষ্ঠা"),
        at: m(60 * 72),
      },
    ];
  }, [info.device_id, status, t]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          to="/app/farms"
          className="mb-2 inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-3 w-3" /> {t("Back to farms", "ফার্মে ফিরে যান")}
        </Link>

        {/* Header */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold sm:text-3xl">{info.name}</h1>
                <StatusBadge status={status} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Waves className="h-3.5 w-3.5" />
                  {info.farm}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {info.location}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("Last update", "শেষ আপডেট")}: {timeAgo(lastUpdated.toISOString(), lang)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={downloadCsv}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> {t("Export", "এক্সপোর্ট")}
              </Button>
              <Link to="/app/devices/$deviceId" params={{ deviceId: info.device_id }}>
                <Button size="sm" variant="outline">
                  <Cpu className="mr-1.5 h-3.5 w-3.5" /> {t("Open device", "ডিভাইস খুলুন")}
                </Button>
              </Link>
              <Button size="sm" onClick={() => setNoteOpen(true)}>
                <StickyNote className="mr-1.5 h-3.5 w-3.5" /> {t("Add note", "নোট যোগ")}
              </Button>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <Info label={t("Pond type", "পুকুরের ধরন")} value={info.pond_type} />
            <Info label={t("Area", "এলাকা")} value={`${info.area_m2.toLocaleString()} m²`} />
            <Info label={t("Depth", "গভীরতা")} value={`${info.depth_m} m`} />
            <Info label={t("Species", "প্রজাতি")} value={info.species} />
            <Info label={t("Stocked", "মজুদ")} value={info.stocking_date} />
            <Info
              label={t("Days in cycle", "চক্রের দিন")}
              value={`${daysInCycle} ${t("days", "দিন")}`}
            />
          </dl>
        </div>
      </div>

      {/* Recommended action — kept high on mobile */}
      {status !== "good" && <RecommendedAction status={status} pondName={info.name} t={t} />}

      {/* Live cards */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">
          {t("Live water quality", "তাজা পানির গুণমান")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PARAMS.map((p) => (
            <LiveCard
              key={p.key}
              def={p}
              value={latest[p.key] as number | null}
              series={liveSeries}
              t={t}
              active={p.key === activeParam}
              onClick={() => setActiveParam(p.key)}
            />
          ))}
        </div>
      </section>

      {/* Main chart */}
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
              {t("Safe range", "নিরাপদ পরিসর")}: {activeDef.safe[0]}–{activeDef.safe[1]}{" "}
              {activeDef.unit}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={activeParam} onValueChange={(v) => setActiveParam(v as ParamKey)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARAMS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {t(p.labelEn, p.labelBn)}
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
              <ReferenceLine y={activeDef.warn[0]} stroke="rgb(245 158 11)" strokeDasharray="4 4" />
              <ReferenceLine y={activeDef.warn[1]} stroke="rgb(245 158 11)" strokeDasharray="4 4" />
              <ReferenceLine
                y={activeDef.min}
                stroke="rgb(244 63 94)"
                strokeDasharray="2 2"
                strokeOpacity={0.4}
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
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <Legend dotClass="bg-primary/40" label={t("Safe range", "নিরাপদ পরিসর")} />
          <Legend dotClass="bg-amber-500" label={t("Warning threshold", "সতর্ক সীমা")} />
          <Legend dotClass="bg-rose-500" label={t("Critical threshold", "গুরুতর সীমা")} />
          <Legend
            dotClass="bg-muted-foreground/40"
            label={t("Gap = missing data", "ফাঁক = অনুপস্থিত ডেটা")}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("Timeline", "টাইমলাইন")}</h2>
          <ol className="relative space-y-4 border-l border-border pl-5">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[27px] grid h-5 w-5 place-items-center rounded-full border-2 border-card",
                    e.type === "alert"
                      ? "bg-rose-500"
                      : e.type === "device"
                        ? "bg-sky-500"
                        : e.type === "calibration"
                          ? "bg-violet-500"
                          : e.type === "report"
                            ? "bg-emerald-500"
                            : "bg-amber-500",
                  )}
                >
                  {e.type === "alert" ? (
                    <AlertTriangle className="h-2.5 w-2.5 text-white" />
                  ) : e.type === "device" ? (
                    <Cpu className="h-2.5 w-2.5 text-white" />
                  ) : e.type === "calibration" ? (
                    <Wrench className="h-2.5 w-2.5 text-white" />
                  ) : e.type === "report" ? (
                    <FileText className="h-2.5 w-2.5 text-white" />
                  ) : (
                    <StickyNote className="h-2.5 w-2.5 text-white" />
                  )}
                </span>
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.detail}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(e.at, lang)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Sensor history */}
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
                  <TableHead className="text-xs">°C</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {series
                  .slice()
                  .reverse()
                  .slice(0, 30)
                  .map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-[11px] text-muted-foreground">{r.label}</TableCell>
                      <TableCell className="tabular-nums">{r.do ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{r.ph ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{r.temp ?? "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      {/* Add note drawer */}
      <Sheet open={noteOpen} onOpenChange={setNoteOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("Add manual note", "ম্যানুয়াল নোট যোগ করুন")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Label>{t("Note", "নোট")}</Label>
            <Textarea
              rows={5}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t(
                "e.g. Aerator turned on for 1 hour.",
                "যেমন: এরেটর ১ ঘণ্টা চালু রাখা হয়েছে।",
              )}
            />
            <Input placeholder={t("Tag (optional)", "ট্যাগ (ঐচ্ছিক)")} />
          </div>
          <SheetFooter className="mt-6 gap-2">
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              {t("Cancel", "বাতিল")}
            </Button>
            <Button
              onClick={() => {
                if (!noteText.trim()) {
                  toast.error(t("Note cannot be empty", "নোট খালি হতে পারে না"));
                  return;
                }
                toast.success(t("Note added", "নোট যোগ হয়েছে"));
                setNoteText("");
                setNoteOpen(false);
              }}
            >
              {t("Save note", "সংরক্ষণ")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ----- Subcomponents -----
function Info({ label, value }: { label: string; value: string }) {
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
  series: Array<Record<string, number | string | null>>;
  t: (en: string, bn: string) => string;
  active: boolean;
  onClick: () => void;
}) {
  const status = classifyValue(def, value);
  const trend = series.map((r) => ({ v: r[def.key] as number | null }));
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
          {value == null ? "—" : value}
        </span>
        {def.unit && <span className="text-xs text-muted-foreground">{def.unit}</span>}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <StatusBadge status={status} />
        <span className="text-[10px] text-muted-foreground">
          {def.safe[0]}–{def.safe[1]}
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
      problem: t("Dissolved oxygen below safe range", "দ্রবীভূত অক্সিজেন নিরাপদ সীমার নিচে"),
      action: t(
        "Turn on aerators immediately for at least 60 minutes.",
        "অবিলম্বে এরেটর কমপক্ষে ৬০ মিনিট চালু করুন।",
      ),
      reason: t(
        "Low DO causes stress and rapid mortality for stocked species.",
        "নিম্ন DO চাপ ও দ্রুত মৃত্যুর কারণ হতে পারে।",
      ),
      priority: t("Critical", "গুরুতর"),
      tone: "border-rose-500/50 bg-rose-500/5",
      dot: "bg-rose-500",
    },
    warning: {
      problem: t("Parameters drifting outside safe range", "পরামিতি নিরাপদ সীমার বাইরে যাচ্ছে"),
      action: t(
        "Run aerators for 30 minutes and re-check in 1 hour.",
        "৩০ মিনিট এরেটর চালান এবং ১ ঘণ্টা পর পুনরায় পরীক্ষা করুন।",
      ),
      reason: t(
        "Early intervention prevents critical conditions.",
        "দ্রুত পদক্ষেপ গুরুতর অবস্থা প্রতিরোধ করে।",
      ),
      priority: t("High", "উচ্চ"),
      tone: "border-amber-500/50 bg-amber-500/5",
      dot: "bg-amber-500",
    },
    offline: {
      problem: t("Sensor device is offline", "সেন্সর ডিভাইস অফলাইন"),
      action: t(
        "Check the device power and SIM signal at the pond.",
        "পুকুরে ডিভাইসের পাওয়ার ও সিম সিগন্যাল পরীক্ষা করুন।",
      ),
      reason: t(
        "Without live data, water quality cannot be monitored.",
        "তাজা ডেটা ছাড়া পানির গুণমান পর্যবেক্ষণ সম্ভব নয়।",
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
            {cfg.problem} — {pondName}
          </p>
          <p className="mt-2 text-sm">{cfg.action}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Why", "কেন")}: {cfg.reason}
          </p>
          <Link
            to="/app/alerts"
            className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
          >
            {t("View related alert →", "সম্পর্কিত অ্যালার্ট দেখুন →")}
          </Link>
        </div>
      </div>
    </section>
  );
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
