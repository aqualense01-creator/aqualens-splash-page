import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend as RLegend,
  Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Download, FileText, FileSpreadsheet, FileDown, Calendar as CalIcon,
  Activity, ShieldCheck, AlertTriangle, Wifi, FlaskConical, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { PageHeader, MetricTile } from "@/components/app/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics — Acqua Lence" }] }),
  component: ReportsPage,
});

// ----- Mock data -----
const FARMS = [
  { id: "f1", name: "Sundarban Farm" },
  { id: "f2", name: "Khulna East Farm" },
];
const PONDS = [
  { id: "p1", farm_id: "f1", name: "Pond 1 — Rui" },
  { id: "p2", farm_id: "f1", name: "Pond 2 — Shrimp" },
  { id: "p3", farm_id: "f1", name: "Pond 3 — Tilapia" },
  { id: "p4", farm_id: "f2", name: "Pond 4 — Pangas" },
  { id: "p5", farm_id: "f2", name: "Pond 5 — Carp Mix" },
  { id: "p6", farm_id: "f2", name: "Pond 6 — Koi" },
];

type ParamKey = "do" | "ph" | "temp" | "sal";
type RangeKey = "7d" | "30d" | "90d" | "custom";
type ReportKey = "daily" | "weekly" | "monthly" | "device" | "custom";

const PARAM_META: Record<ParamKey, {
  labelEn: string; labelBn: string; unit: string;
  safe: [number, number]; warn: [number, number]; domain: [number, number];
}> = {
  do:   { labelEn: "Dissolved O₂", labelBn: "দ্রবীভূত O₂", unit: "mg/L", safe: [5, 9],    warn: [3.5, 11], domain: [0, 12] },
  ph:   { labelEn: "pH",           labelBn: "pH",           unit: "",     safe: [6.8, 8.2], warn: [6.2, 8.8], domain: [5, 10] },
  temp: { labelEn: "Temperature",  labelBn: "তাপমাত্রা",   unit: "°C",   safe: [24, 31],  warn: [22, 33],  domain: [18, 36] },
  sal:  { labelEn: "Salinity",     labelBn: "লবণাক্ততা",  unit: "ppt",  safe: [10, 18],  warn: [7, 22],   domain: [0, 30] },
};

// Deterministic pseudo random
const rand = (seed: number, i: number) => {
  const x = Math.sin(seed * 9301 + i * 49297) * 233280;
  return x - Math.floor(x);
};

function generateSeries(seed: number, days: number, base: number, amp: number, jitter: number, gapAt = 0.45) {
  const arr = [];
  for (let i = 0; i < days; i++) {
    const t = Date.now() - (days - 1 - i) * 86400_000;
    const missing = i / days > gapAt && i / days < gapAt + 0.03;
    const v = missing ? null : +(base + Math.sin(i / 4) * amp + (rand(seed, i) - 0.5) * jitter).toFixed(2);
    arr.push({
      day: new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }),
      v,
    });
  }
  return arr;
}

// ----- Page -----
function ReportsPage() {
  const { lang } = useI18n();
  const t = (en: string, bn: string) => (lang === "bn" ? bn : en);

  const [range, setRange] = useState<RangeKey>("30d");
  const today = new Date().toISOString().slice(0, 10);
  const ago30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(ago30);
  const [to, setTo] = useState(today);

  const [farm, setFarm] = useState<string>("all");
  const [pond, setPond] = useState<string>("all");
  const [param, setParam] = useState<ParamKey>("do");
  const [reportType, setReportType] = useState<ReportKey>("weekly");

  const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "custom"
    ? Math.max(1, Math.round((+new Date(to) - +new Date(from)) / 86400_000) + 1)
    : 30;

  const ponds = useMemo(() => farm === "all" ? PONDS : PONDS.filter((p) => p.farm_id === farm), [farm]);
  const seed = useMemo(() => (pond === "all" ? 17 : pond.charCodeAt(1) * 13) + (param.charCodeAt(0)), [pond, param]);

  const doSeries   = useMemo(() => generateSeries(seed + 1, days, 6.4, 0.8, 0.6), [seed, days]);
  const phSeries   = useMemo(() => generateSeries(seed + 2, days, 7.4, 0.25, 0.15), [seed, days]);
  const tempSeries = useMemo(() => generateSeries(seed + 3, days, 28.5, 1.5, 0.6), [seed, days]);
  const salSeries  = useMemo(() => generateSeries(seed + 4, days, 13, 2, 1), [seed, days]);

  const alertSeries = useMemo(() => Array.from({ length: days }, (_, i) => ({
    day: doSeries[i]?.day ?? "",
    critical: Math.round(rand(seed + 9, i) * 2),
    warning: Math.round(rand(seed + 11, i) * 4),
    device: rand(seed + 13, i) > 0.85 ? 1 : 0,
  })), [doSeries, days, seed]);

  const pondComparison = useMemo(() =>
    PONDS.map((p, i) => ({
      name: p.name.replace(/ — .+/, ""),
      do: +(5.5 + rand(seed + 21, i) * 2.5).toFixed(1),
      ph: +(7 + rand(seed + 23, i) * 1.2).toFixed(2),
    })), [seed]);

  const summary = useMemo(() => {
    const inSafe = (s: Array<{ v: number | null }>, p: ParamKey) => {
      const meta = PARAM_META[p];
      const valid = s.filter((r) => r.v != null);
      if (!valid.length) return 0;
      const ok = valid.filter((r) => r.v! >= meta.safe[0] && r.v! <= meta.safe[1]).length;
      return Math.round((ok / valid.length) * 100);
    };
    const pctDo = inSafe(doSeries, "do");
    const pctPh = inSafe(phSeries, "ph");
    const pctTemp = inSafe(tempSeries, "temp");
    const pctSal = inSafe(salSeries, "sal");
    const wq = Math.round((pctDo + pctPh + pctTemp + pctSal) / 4);
    const safePct = wq;
    const totalAlerts = alertSeries.reduce((s, d) => s + d.critical + d.warning + d.device, 0);
    const uptime = Math.max(70, 100 - alertSeries.reduce((s, d) => s + d.device, 0) * 3);
    const calibrated = 4; // out of 6
    return { wq, safePct, totalAlerts, uptime, calibrated };
  }, [doSeries, phSeries, tempSeries, salSeries, alertSeries]);

  const exportFile = (fmt: "pdf" | "csv" | "xlsx") => {
    if (fmt === "csv") {
      const header = ["day", "do", "ph", "temp", "salinity"].join(",");
      const rows = doSeries.map((r, i) =>
        [r.day, r.v ?? "", phSeries[i]?.v ?? "", tempSeries[i]?.v ?? "", salSeries[i]?.v ?? ""].join(",")
      );
      const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
      triggerDownload(blob, `acqua-lence-report-${range}.csv`);
    } else if (fmt === "xlsx") {
      // Lightweight Excel-compatible: tab-separated .xls fallback
      const header = ["day", "do", "ph", "temp", "salinity"].join("\t");
      const rows = doSeries.map((r, i) =>
        [r.day, r.v ?? "", phSeries[i]?.v ?? "", tempSeries[i]?.v ?? "", salSeries[i]?.v ?? ""].join("\t")
      );
      const blob = new Blob([header + "\n" + rows.join("\n")], { type: "application/vnd.ms-excel" });
      triggerDownload(blob, `acqua-lence-report-${range}.xls`);
    } else {
      // Simple printable HTML "PDF" fallback
      const html = `<html><head><title>Report</title></head><body><h1>Acqua Lence — ${reportType} report</h1><p>${from} → ${to}</p><pre>${doSeries.map((r) => r.day + "\t" + r.v).join("\n")}</pre></body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      triggerDownload(blob, `acqua-lence-report-${range}.html`);
    }
    toast.success(t(`Exported ${fmt.toUpperCase()}`, `${fmt.toUpperCase()} এক্সপোর্ট হয়েছে`));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t("Reports & Analytics", "রিপোর্ট ও বিশ্লেষণ")}
        subtitle={t(
          "Historical pond and farm performance.",
          "পুকুর ও ফার্মের ঐতিহাসিক কর্মক্ষমতা।"
        )}
        actions={
          <Popover>
            <PopoverTrigger asChild>
              <Button><Download className="mr-2 h-4 w-4" /> {t("Export", "এক্সপোর্ট")}</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              <button onClick={() => exportFile("pdf")} className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
                <FileText className="h-4 w-4" /> {t("PDF report", "PDF রিপোর্ট")}
              </button>
              <button onClick={() => exportFile("csv")} className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
                <FileDown className="h-4 w-4" /> {t("CSV data", "CSV ডেটা")}
              </button>
              <button onClick={() => exportFile("xlsx")} className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
                <FileSpreadsheet className="h-4 w-4" /> {t("Excel (.xls)", "এক্সেল (.xls)")}
              </button>
            </PopoverContent>
          </Popover>
        }
      />

      {/* Controls */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="mb-1.5 block text-xs">{t("Date range", "তারিখ পরিসর")}</Label>
            <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t("Last 7 days", "শেষ ৭ দিন")}</SelectItem>
                <SelectItem value="30d">{t("Last 30 days", "শেষ ৩০ দিন")}</SelectItem>
                <SelectItem value="90d">{t("Last 90 days", "শেষ ৯০ দিন")}</SelectItem>
                <SelectItem value="custom">{t("Custom", "কাস্টম")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">{t("Farm", "ফার্ম")}</Label>
            <Select value={farm} onValueChange={(v) => { setFarm(v); setPond("all"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All farms", "সব ফার্ম")}</SelectItem>
                {FARMS.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">{t("Pond", "পুকুর")}</Label>
            <Select value={pond} onValueChange={setPond}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All ponds", "সব পুকুর")}</SelectItem>
                {ponds.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">{t("Parameter", "পরামিতি")}</Label>
            <Select value={param} onValueChange={(v) => setParam(v as ParamKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PARAM_META) as ParamKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{t(PARAM_META[k].labelEn, PARAM_META[k].labelBn)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">{t("Report type", "রিপোর্টের ধরন")}</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("Daily pond summary", "দৈনিক পুকুর সারসংক্ষেপ")}</SelectItem>
                <SelectItem value="weekly">{t("Weekly farm health", "সাপ্তাহিক ফার্ম স্বাস্থ্য")}</SelectItem>
                <SelectItem value="monthly">{t("Monthly report", "মাসিক রিপোর্ট")}</SelectItem>
                <SelectItem value="device">{t("Device health", "ডিভাইস স্বাস্থ্য")}</SelectItem>
                <SelectItem value="custom">{t("Custom export", "কাস্টম এক্সপোর্ট")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {range === "custom" && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs">{t("From", "থেকে")}</Label>
              <div className="relative">
                <CalIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input type="date" className="pl-9" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">{t("To", "পর্যন্ত")}</Label>
              <div className="relative">
                <CalIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input type="date" className="pl-9" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ScoreTile label={t("Water quality score", "পানির গুণমান স্কোর")} value={summary.wq} suffix="/100"
          icon={<Sparkles className="h-4 w-4" />} tone={summary.wq >= 80 ? "good" : summary.wq >= 60 ? "warn" : "bad"} />
        <ScoreTile label={t("Parameters in safe range", "নিরাপদ পরিসরে পরামিতি")} value={summary.safePct} suffix="%"
          icon={<ShieldCheck className="h-4 w-4" />} tone={summary.safePct >= 80 ? "good" : "warn"} />
        <MetricTile label={t("Total alerts", "মোট অ্যালার্ট")} value={summary.totalAlerts}
          accent={summary.totalAlerts > 20 ? "text-rose-600" : "text-amber-600"} />
        <ScoreTile label={t("Device uptime", "ডিভাইস আপটাইম")} value={summary.uptime} suffix="%"
          icon={<Wifi className="h-4 w-4" />} tone={summary.uptime >= 95 ? "good" : "warn"} />
        <ScoreTile label={t("Calibration", "ক্যালিব্রেশন")} value={summary.calibrated} suffix={` / ${PONDS.length}`}
          icon={<FlaskConical className="h-4 w-4" />} tone={summary.calibrated >= 5 ? "good" : "warn"} />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrendChart title={t("DO trend", "DO প্রবণতা")} data={doSeries} param="do" t={t} />
        <TrendChart title={t("pH trend", "pH প্রবণতা")} data={phSeries} param="ph" t={t} />
        <TrendChart title={t("Temperature trend", "তাপমাত্রার প্রবণতা")} data={tempSeries} param="temp" t={t} />
        <TrendChart title={t("Salinity trend", "লবণাক্ততার প্রবণতা")} data={salSeries} param="sal" t={t} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Alert trend */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">{t("Alert trend", "অ্যালার্ট প্রবণতা")}</h3>
            <span className="text-xs text-muted-foreground">{from} → {to}</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer>
              <BarChart data={alertSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={28} />
                <Tooltip contentStyle={tipStyle} />
                <RLegend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="critical" stackId="a" fill="rgb(244 63 94)" name={t("Critical", "গুরুতর")} />
                <Bar dataKey="warning"  stackId="a" fill="rgb(245 158 11)" name={t("Warning", "সতর্ক")} />
                <Bar dataKey="device"   stackId="a" fill="rgb(14 165 233)" name={t("Device", "ডিভাইস")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Pond comparison */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-1">
          <h3 className="mb-3 font-display text-base font-semibold">{t("Pond comparison (avg DO)", "পুকুর তুলনা (গড় DO)")}</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer>
              <BarChart data={pondComparison} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={60} />
                <Tooltip contentStyle={tipStyle} />
                <ReferenceLine x={5} stroke="rgb(245 158 11)" strokeDasharray="3 3" />
                <Bar dataKey="do" radius={[0, 6, 6, 0]}>
                  {pondComparison.map((p, i) => (
                    <Cell key={i} fill={p.do < 4 ? "rgb(244 63 94)" : p.do < 5 ? "rgb(245 158 11)" : "hsl(var(--primary))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Report types cards */}
      <section>
        <h3 className="mb-3 font-display text-base font-semibold">{t("Generate report", "রিপোর্ট তৈরি করুন")}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ReportCard active={reportType === "daily"} onClick={() => setReportType("daily")}
            icon={<Activity className="h-4 w-4" />} title={t("Daily pond", "দৈনিক পুকুর")}
            hint={t("24h key metrics per pond.", "২৪ ঘন্টার মূল মেট্রিক্স।")} />
          <ReportCard active={reportType === "weekly"} onClick={() => setReportType("weekly")}
            icon={<ShieldCheck className="h-4 w-4" />} title={t("Weekly farm", "সাপ্তাহিক ফার্ম")}
            hint={t("Farm-wide 7-day health.", "ফার্মের ৭ দিনের স্বাস্থ্য।")} />
          <ReportCard active={reportType === "monthly"} onClick={() => setReportType("monthly")}
            icon={<CalIcon className="h-4 w-4" />} title={t("Monthly", "মাসিক")}
            hint={t("30-day trend & alerts.", "৩০ দিনের প্রবণতা ও অ্যালার্ট।")} />
          <ReportCard active={reportType === "device"} onClick={() => setReportType("device")}
            icon={<Wifi className="h-4 w-4" />} title={t("Device health", "ডিভাইস স্বাস্থ্য")}
            hint={t("Uptime, battery, calibration.", "আপটাইম, ব্যাটারি, ক্যালিব্রেশন।")} />
          <ReportCard active={reportType === "custom"} onClick={() => setReportType("custom")}
            icon={<FileDown className="h-4 w-4" />} title={t("Custom export", "কাস্টম এক্সপোর্ট")}
            hint={t("Pick parameters & range.", "পরামিতি ও পরিসর বেছে নিন।")} />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => exportFile("csv")}>
            <FileDown className="mr-1.5 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => exportFile("xlsx")}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => exportFile("pdf")}>
            <FileText className="mr-1.5 h-4 w-4" /> PDF
          </Button>
        </div>
      </section>
    </div>
  );
}

// ----- Subcomponents -----
const tipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 11,
} as const;

function TrendChart({
  title, data, param, t,
}: { title: string; data: Array<{ day: string; v: number | null }>; param: ParamKey;
  t: (en: string, bn: string) => string }) {
  const meta = PARAM_META[param];
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <p className="text-[11px] text-muted-foreground">
            {t("Safe", "নিরাপদ")} {meta.safe[0]}–{meta.safe[1]} {meta.unit}
          </p>
        </div>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${param}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
            <YAxis domain={meta.domain} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={28} />
            <Tooltip contentStyle={tipStyle} formatter={(v) => [`${v} ${meta.unit}`, t(meta.labelEn, meta.labelBn)]} />
            <ReferenceArea y1={meta.safe[0]} y2={meta.safe[1]} fill="hsl(var(--primary))" fillOpacity={0.07} />
            <ReferenceLine y={meta.warn[0]} stroke="rgb(245 158 11)" strokeDasharray="4 4" />
            <ReferenceLine y={meta.warn[1]} stroke="rgb(245 158 11)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2}
              fill={`url(#g-${param})`} connectNulls={false} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <Legend dot="bg-primary/40" label={t("Safe range", "নিরাপদ")} />
        <Legend dot="bg-amber-500" label={t("Warning", "সতর্ক")} />
        <Legend dot="bg-muted-foreground/40" label={t("Gap = missing", "ফাঁক = অনুপস্থিত")} />
      </div>
    </section>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className={cn("h-2 w-3 rounded-sm", dot)} />{label}</span>;
}

function ScoreTile({
  label, value, suffix, icon, tone,
}: { label: string; value: number; suffix?: string; icon: React.ReactNode; tone: "good" | "warn" | "bad" }) {
  const accent = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-rose-600";
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={cn("mt-2 font-display text-3xl font-bold tabular-nums", accent)}>
        {value}<span className="text-base font-medium text-muted-foreground">{suffix}</span>
      </p>
    </div>
  );
}

function ReportCard({
  active, onClick, icon, title, hint,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; hint: string }) {
  return (
    <button onClick={onClick} className={cn(
      "rounded-2xl border bg-card p-4 text-left shadow-soft transition hover:border-primary/40",
      active ? "border-primary/60 ring-2 ring-primary/20" : "border-border/70"
    )}>
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </button>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
