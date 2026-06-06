import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as RLegend,
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
  Calendar as CalIcon,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState, MetricTile, PageHeader } from "@/components/app/StatusBadge";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { readFarmSelection, writeFarmSelection } from "@/lib/farm-selection";
import {
  insforge,
  type Alert as DbAlert,
  type Device,
  type Farm,
  type Pond,
  type Reading,
} from "@/lib/insforge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics - Acqua Lence" }] }),
  component: ReportsPage,
});

type ParamKey = "do" | "ph" | "temp" | "sal";
type RangeKey = "7d" | "30d" | "90d" | "custom";
type ReportKey = "daily" | "weekly" | "monthly" | "device" | "custom";
type CalibrationRow = {
  id: string;
  device_id: string;
  sensor_type: string;
  performed_at: string;
};
type ReportsData = {
  farms: Farm[];
  ponds: Pond[];
  devices: Device[];
  readings: Reading[];
  alerts: DbAlert[];
  calibrations: CalibrationRow[];
};
type TrendRow = {
  date: string;
  day: string;
  do: number | null;
  ph: number | null;
  temp: number | null;
  sal: number | null;
};
type AlertTrendRow = {
  date: string;
  day: string;
  critical: number;
  warning: number;
  device: number;
};
type PondComparisonRow = {
  id: string;
  name: string;
  do: number;
  hasData: boolean;
};

const EMPTY_REPORTS: ReportsData = {
  farms: [],
  ponds: [],
  devices: [],
  readings: [],
  alerts: [],
  calibrations: [],
};

const PARAM_META: Record<
  ParamKey,
  {
    labelEn: string;
    labelBn: string;
    unit: string;
    safe: [number, number];
    warn: [number, number];
    domain: [number, number];
  }
> = {
  do: {
    labelEn: "Dissolved O2",
    labelBn: "দ্রবীভূত O2",
    unit: "mg/L",
    safe: [5, 9],
    warn: [3.5, 11],
    domain: [0, 12],
  },
  ph: {
    labelEn: "pH",
    labelBn: "pH",
    unit: "",
    safe: [6.8, 8.2],
    warn: [6.2, 8.8],
    domain: [5, 10],
  },
  temp: {
    labelEn: "Temperature",
    labelBn: "তাপমাত্রা",
    unit: "C",
    safe: [24, 31],
    warn: [22, 33],
    domain: [18, 36],
  },
  sal: {
    labelEn: "Salinity",
    labelBn: "লবণাক্ততা",
    unit: "ppt",
    safe: [10, 18],
    warn: [7, 22],
    domain: [0, 30],
  },
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

function toFiniteNumber(value: unknown, digits = 2) {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Number(parsed.toFixed(digits));
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value != null);
  if (!valid.length) return null;
  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(2));
}

function readingValue(reading: Reading, param: ParamKey) {
  if (param === "do") return toFiniteNumber(reading.do_mg_l, 2);
  if (param === "ph") return toFiniteNumber(reading.ph, 2);
  if (param === "temp") return toFiniteNumber(reading.temp_c, 1);
  return toFiniteNumber(reading.salinity_ppt, 1);
}

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function dayLabel(key: string) {
  return new Date(`${key}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
}

function rangeBounds(range: RangeKey, from: string, to: string) {
  if (range === "custom") {
    return {
      fromIso: new Date(`${from}T00:00:00`).toISOString(),
      toIso: new Date(`${to}T23:59:59.999`).toISOString(),
    };
  }
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return {
    fromIso: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    toIso: new Date().toISOString(),
  };
}

function buildTrendRows(readings: Reading[]): TrendRow[] {
  const groups = new Map<
    string,
    {
      do: Array<number | null>;
      ph: Array<number | null>;
      temp: Array<number | null>;
      sal: Array<number | null>;
    }
  >();

  for (const reading of readings) {
    const key = dateKey(reading.recorded_at);
    const bucket = groups.get(key) ?? { do: [], ph: [], temp: [], sal: [] };
    bucket.do.push(readingValue(reading, "do"));
    bucket.ph.push(readingValue(reading, "ph"));
    bucket.temp.push(readingValue(reading, "temp"));
    bucket.sal.push(readingValue(reading, "sal"));
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      day: dayLabel(date),
      do: average(bucket.do),
      ph: average(bucket.ph),
      temp: average(bucket.temp),
      sal: average(bucket.sal),
    }));
}

function isDeviceAlert(alert: DbAlert) {
  const text = `${alert.alert_type} ${alert.parameter ?? ""}`.toLowerCase();
  return (
    text.includes("device") ||
    text.includes("offline") ||
    text.includes("battery") ||
    text.includes("signal")
  );
}

function buildAlertRows(alerts: DbAlert[]): AlertTrendRow[] {
  const groups = new Map<string, AlertTrendRow>();
  for (const alert of alerts) {
    const key = dateKey(alert.detected_at);
    const row = groups.get(key) ?? {
      date: key,
      day: dayLabel(key),
      critical: 0,
      warning: 0,
      device: 0,
    };
    if (isDeviceAlert(alert)) row.device += 1;
    else if (alert.severity === "critical") row.critical += 1;
    else row.warning += 1;
    groups.set(key, row);
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildPondComparison(ponds: Pond[], readings: Reading[]): PondComparisonRow[] {
  return ponds.map((pond) => {
    const pondReadings = readings.filter((reading) => reading.pond_id === pond.id);
    const avgDo = average(pondReadings.map((reading) => readingValue(reading, "do")));
    return {
      id: pond.id,
      name: pond.name.length > 18 ? `${pond.name.slice(0, 17)}...` : pond.name,
      do: avgDo ?? 0,
      hasData: avgDo != null,
    };
  });
}

function buildSummary({
  readings,
  alerts,
  devices,
  calibrations,
}: {
  readings: Reading[];
  alerts: DbAlert[];
  devices: Device[];
  calibrations: CalibrationRow[];
}) {
  let valid = 0;
  let safe = 0;
  for (const reading of readings) {
    for (const param of Object.keys(PARAM_META) as ParamKey[]) {
      const value = readingValue(reading, param);
      if (value == null) continue;
      valid += 1;
      const meta = PARAM_META[param];
      if (value >= meta.safe[0] && value <= meta.safe[1]) safe += 1;
    }
  }
  const safePct = valid ? Math.round((safe / valid) * 100) : 0;
  const uptime = devices.length
    ? Math.round(
        (devices.filter((device) => device.status !== "offline").length / devices.length) * 100,
      )
    : 0;
  return {
    wq: safePct,
    safePct,
    totalAlerts: alerts.length,
    uptime,
    calibrated: calibrations.length,
  };
}

function ReportsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (en: string, bn: string) => (lang === "bn" ? bn : en);

  const today = new Date().toISOString().slice(0, 10);
  const ago30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [range, setRange] = useState<RangeKey>("30d");
  const [from, setFrom] = useState(ago30);
  const [to, setTo] = useState(today);
  const [farm, setFarm] = useState<string>(() => {
    return readFarmSelection();
  });
  const [pond, setPond] = useState<string>("all");
  const [param, setParam] = useState<ParamKey>("do");
  const [reportType, setReportType] = useState<ReportKey>("weekly");

  const bounds = useMemo(() => rangeBounds(range, from, to), [from, range, to]);
  const reportsQuery = useQuery({
    queryKey: ["app-reports", user?.id, bounds.fromIso, bounds.toIso],
    enabled: !!user,
    queryFn: async (): Promise<ReportsData> => {
      const [farmsRes, pondsRes, devicesRes, readingsRes, alertsRes, calibrationsRes] =
        await Promise.all([
          insforge.database.from("farms").select("*").order("name"),
          insforge.database.from("ponds").select("*").order("name"),
          insforge.database.from("devices").select("*"),
          insforge.database
            .from("readings")
            .select("*")
            .gte("recorded_at", bounds.fromIso)
            .lte("recorded_at", bounds.toIso)
            .order("recorded_at", { ascending: true })
            .limit(5000),
          insforge.database
            .from("alerts")
            .select("*")
            .gte("detected_at", bounds.fromIso)
            .lte("detected_at", bounds.toIso)
            .order("detected_at", { ascending: false })
            .limit(1000),
          insforge.database
            .from("calibration_logs")
            .select("*")
            .gte("performed_at", bounds.fromIso)
            .lte("performed_at", bounds.toIso)
            .order("performed_at", { ascending: false })
            .limit(1000),
        ]);

      assertDbOk(farmsRes, "Failed to load farms");
      assertDbOk(pondsRes, "Failed to load ponds");
      assertDbOk(devicesRes, "Failed to load devices");
      assertDbOk(readingsRes, "Failed to load readings");
      assertDbOk(alertsRes, "Failed to load alerts");
      assertDbOk(calibrationsRes, "Failed to load calibration logs");

      return {
        farms: (farmsRes.data ?? []) as Farm[],
        ponds: (pondsRes.data ?? []) as Pond[],
        devices: (devicesRes.data ?? []) as Device[],
        readings: (readingsRes.data ?? []) as Reading[],
        alerts: (alertsRes.data ?? []) as DbAlert[],
        calibrations: (calibrationsRes.data ?? []) as CalibrationRow[],
      };
    },
  });

  const data = reportsQuery.data ?? EMPTY_REPORTS;
  const farms = data.farms;
  const allPonds = data.ponds;
  const pondOptions = useMemo(
    () => (farm === "all" ? allPonds : allPonds.filter((item) => item.farm_id === farm)),
    [allPonds, farm],
  );
  const visiblePonds = useMemo(
    () => (pond === "all" ? pondOptions : pondOptions.filter((item) => item.id === pond)),
    [pond, pondOptions],
  );
  const visiblePondIds = useMemo(
    () => new Set(visiblePonds.map((item) => item.id)),
    [visiblePonds],
  );
  const visibleDevices = useMemo(() => {
    if (farm === "all" && pond === "all") return data.devices;
    return data.devices.filter(
      (device) =>
        (device.pond_id && visiblePondIds.has(device.pond_id)) ||
        (pond === "all" && farm !== "all" && device.farm_id === farm),
    );
  }, [data.devices, farm, pond, visiblePondIds]);
  const visibleDeviceIds = useMemo(
    () => new Set(visibleDevices.map((device) => device.id)),
    [visibleDevices],
  );
  const visibleReadings = useMemo(
    () => data.readings.filter((reading) => visiblePondIds.has(reading.pond_id)),
    [data.readings, visiblePondIds],
  );
  const visibleAlerts = useMemo(
    () =>
      data.alerts.filter((alert) => {
        if (alert.pond_id && visiblePondIds.has(alert.pond_id)) return true;
        if (alert.device_id && visibleDeviceIds.has(alert.device_id)) return true;
        return farm === "all" && pond === "all" && alert.pond_id == null;
      }),
    [data.alerts, farm, pond, visibleDeviceIds, visiblePondIds],
  );
  const visibleCalibrations = useMemo(
    () => data.calibrations.filter((row) => visibleDeviceIds.has(row.device_id)),
    [data.calibrations, visibleDeviceIds],
  );
  const trendRows = useMemo(() => buildTrendRows(visibleReadings), [visibleReadings]);
  const alertRows = useMemo(() => buildAlertRows(visibleAlerts), [visibleAlerts]);
  const pondComparison = useMemo(
    () => buildPondComparison(visiblePonds, visibleReadings),
    [visiblePonds, visibleReadings],
  );
  const summary = useMemo(
    () =>
      buildSummary({
        readings: visibleReadings,
        alerts: visibleAlerts,
        devices: visibleDevices,
        calibrations: visibleCalibrations,
      }),
    [visibleAlerts, visibleCalibrations, visibleDevices, visibleReadings],
  );

  useEffect(() => {
    if (farm === "all" || farms.length === 0) return;
    if (farms.some((item) => item.id === farm)) return;
    setFarm(writeFarmSelection("all"));
    setPond("all");
  }, [farm, farms]);

  useEffect(() => {
    if (pond === "all" || pondOptions.some((item) => item.id === pond)) return;
    setPond("all");
  }, [pond, pondOptions]);

  function selectFarm(id: string) {
    setFarm(writeFarmSelection(id));
    setPond("all");
  }

  function exportFile(fmt: "pdf" | "csv" | "xlsx") {
    if (fmt === "pdf") {
      toast.error(t("PDF generation is not connected yet", "PDF তৈরি এখনও সংযুক্ত নয়"), {
        description: t(
          "A real PDF should be generated by a backend report job.",
          "বাস্তব PDF ব্যাকএন্ড রিপোর্ট জব থেকে তৈরি হওয়া দরকার।",
        ),
      });
      return;
    }

    if (!visibleReadings.length) {
      toast.error(t("No readings to export", "এক্সপোর্ট করার মতো রিডিং নেই"));
      return;
    }

    const header = [
      "recorded_at",
      "pond_id",
      "device_id",
      "do_mg_l",
      "ph",
      "temp_c",
      "salinity_ppt",
      "turbidity_ntu",
      "ammonia_mg_l",
      "water_level_cm",
      "battery_pct",
      "signal_pct",
    ];
    const separator = fmt === "csv" ? "," : "\t";
    const rows = visibleReadings.map((reading) =>
      [
        reading.recorded_at,
        reading.pond_id,
        reading.device_id ?? "",
        reading.do_mg_l ?? "",
        reading.ph ?? "",
        reading.temp_c ?? "",
        reading.salinity_ppt ?? "",
        reading.turbidity_ntu ?? "",
        reading.ammonia_mg_l ?? "",
        reading.water_level_cm ?? "",
        reading.battery_pct ?? "",
        reading.signal_pct ?? "",
      ].join(separator),
    );
    const blob = new Blob([header.join(separator) + "\n" + rows.join("\n")], {
      type: fmt === "csv" ? "text/csv" : "application/vnd.ms-excel",
    });
    triggerDownload(blob, `acqua-lence-${reportType}-${range}.${fmt === "csv" ? "csv" : "xls"}`);
    toast.success(t("Data exported", "ডেটা এক্সপোর্ট হয়েছে"));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t("Reports & Analytics", "রিপোর্ট ও বিশ্লেষণ")}
        subtitle={t(
          "Historical pond and farm performance.",
          "পুকুর ও ফার্মের ঐতিহাসিক কর্মক্ষমতা।",
        )}
        actions={
          <Popover>
            <PopoverTrigger asChild>
              <Button>
                <Download className="mr-2 h-4 w-4" /> {t("Export", "এক্সপোর্ট")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              <button
                onClick={() => exportFile("csv")}
                className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent"
              >
                <FileDown className="h-4 w-4" /> {t("CSV data", "CSV ডেটা")}
              </button>
              <button
                onClick={() => exportFile("xlsx")}
                className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent"
              >
                <FileSpreadsheet className="h-4 w-4" /> {t("Excel (.xls)", "এক্সেল (.xls)")}
              </button>
              <button
                onClick={() => exportFile("pdf")}
                className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-accent"
              >
                <FileText className="h-4 w-4" /> {t("PDF report", "PDF রিপোর্ট")}
              </button>
            </PopoverContent>
          </Popover>
        }
      />

      {reportsQuery.isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title={t("Could not load reports", "রিপোর্ট লোড করা যায়নি")}
          description={dbErrorMessage(reportsQuery.error, "Please try again.")}
          action={
            <Button variant="outline" onClick={() => void reportsQuery.refetch()}>
              {t("Try again", "আবার চেষ্টা করুন")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label className="mb-1.5 block text-xs">{t("Date range", "তারিখ পরিসর")}</Label>
                <Select value={range} onValueChange={(value) => setRange(value as RangeKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Select value={farm} onValueChange={selectFarm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All farms", "সব ফার্ম")}</SelectItem>
                    {farms.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">{t("Pond", "পুকুর")}</Label>
                <Select value={pond} onValueChange={setPond}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All ponds", "সব পুকুর")}</SelectItem>
                    {pondOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">{t("Parameter", "প্যারামিটার")}</Label>
                <Select value={param} onValueChange={(value) => setParam(value as ParamKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PARAM_META) as ParamKey[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(PARAM_META[key].labelEn, PARAM_META[key].labelBn)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">{t("Report type", "রিপোর্টের ধরন")}</Label>
                <Select
                  value={reportType}
                  onValueChange={(value) => setReportType(value as ReportKey)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">
                      {t("Daily pond summary", "দৈনিক পুকুর সারাংশ")}
                    </SelectItem>
                    <SelectItem value="weekly">
                      {t("Weekly farm health", "সাপ্তাহিক ফার্ম স্বাস্থ্য")}
                    </SelectItem>
                    <SelectItem value="monthly">{t("Monthly report", "মাসিক রিপোর্ট")}</SelectItem>
                    <SelectItem value="device">{t("Device health", "ডিভাইস স্বাস্থ্য")}</SelectItem>
                    <SelectItem value="custom">{t("Custom export", "কাস্টম এক্সপোর্ট")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {range === "custom" && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateInput label={t("From", "থেকে")} value={from} max={to} onChange={setFrom} />
                <DateInput
                  label={t("To", "পর্যন্ত")}
                  value={to}
                  min={from}
                  max={today}
                  onChange={setTo}
                />
              </div>
            )}
          </div>

          {reportsQuery.isLoading ? (
            <EmptyState
              icon={<Activity className="h-6 w-6" />}
              title={t("Loading report data", "রিপোর্ট ডেটা লোড হচ্ছে")}
              description={t(
                "We are loading your farms, ponds and readings.",
                "ফার্ম, পুকুর ও রিডিং লোড হচ্ছে।",
              )}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <ScoreTile
                  label={t("Water quality score", "পানির গুণমান স্কোর")}
                  value={summary.wq}
                  suffix="/100"
                  icon={<Sparkles className="h-4 w-4" />}
                  tone={summary.wq >= 80 ? "good" : summary.wq >= 60 ? "warn" : "bad"}
                />
                <ScoreTile
                  label={t("Parameters in safe range", "নিরাপদ পরিসরে প্যারামিটার")}
                  value={summary.safePct}
                  suffix="%"
                  icon={<ShieldCheck className="h-4 w-4" />}
                  tone={summary.safePct >= 80 ? "good" : summary.safePct >= 50 ? "warn" : "bad"}
                />
                <MetricTile
                  label={t("Total alerts", "মোট অ্যালার্ট")}
                  value={summary.totalAlerts}
                  accent={summary.totalAlerts > 20 ? "text-rose-600" : "text-amber-600"}
                />
                <ScoreTile
                  label={t("Device uptime", "ডিভাইস আপটাইম")}
                  value={summary.uptime}
                  suffix="%"
                  icon={<Wifi className="h-4 w-4" />}
                  tone={summary.uptime >= 95 ? "good" : summary.uptime >= 70 ? "warn" : "bad"}
                />
                <ScoreTile
                  label={t("Calibration logs", "ক্যালিব্রেশন লগ")}
                  value={summary.calibrated}
                  icon={<FlaskConical className="h-4 w-4" />}
                  tone={summary.calibrated > 0 ? "good" : "warn"}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TrendChart title={t("DO trend", "DO প্রবণতা")} rows={trendRows} param="do" t={t} />
                <TrendChart title={t("pH trend", "pH প্রবণতা")} rows={trendRows} param="ph" t={t} />
                <TrendChart
                  title={t("Temperature trend", "তাপমাত্রার প্রবণতা")}
                  rows={trendRows}
                  param="temp"
                  t={t}
                />
                <TrendChart
                  title={t("Salinity trend", "লবণাক্ততার প্রবণতা")}
                  rows={trendRows}
                  param="sal"
                  t={t}
                />
              </div>

              <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
                <h3 className="mb-3 font-display text-base font-semibold">
                  {t(PARAM_META[param].labelEn, PARAM_META[param].labelBn)} {t("focus", "ফোকাস")}
                </h3>
                <TrendChartContent rows={trendRows} param={param} t={t} heightClass="h-64" />
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold">
                      {t("Alert trend", "অ্যালার্ট প্রবণতা")}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(bounds.fromIso).toISOString().slice(0, 10)} -{" "}
                      {new Date(bounds.toIso).toISOString().slice(0, 10)}
                    </span>
                  </div>
                  {alertRows.length ? (
                    <div className="h-60 w-full">
                      <ResponsiveContainer>
                        <BarChart
                          data={alertRows}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 10 }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            stroke="hsl(var(--muted-foreground))"
                            width={28}
                          />
                          <Tooltip contentStyle={tipStyle} />
                          <RLegend wrapperStyle={{ fontSize: 11 }} />
                          <Bar
                            dataKey="critical"
                            stackId="a"
                            fill="rgb(244 63 94)"
                            name={t("Critical", "গুরুতর")}
                          />
                          <Bar
                            dataKey="warning"
                            stackId="a"
                            fill="rgb(245 158 11)"
                            name={t("Warning", "সতর্ক")}
                          />
                          <Bar
                            dataKey="device"
                            stackId="a"
                            fill="rgb(14 165 233)"
                            name={t("Device", "ডিভাইস")}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      {t("No alerts in this range.", "এই সময়সীমায় কোনো অ্যালার্ট নেই।")}
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft lg:col-span-1">
                  <h3 className="mb-3 font-display text-base font-semibold">
                    {t("Pond comparison (avg DO)", "পুকুর তুলনা (গড় DO)")}
                  </h3>
                  {pondComparison.length ? (
                    <div className="h-60 w-full">
                      <ResponsiveContainer>
                        <BarChart
                          data={pondComparison}
                          layout="vertical"
                          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            domain={[0, 10]}
                            tick={{ fontSize: 10 }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 10 }}
                            stroke="hsl(var(--muted-foreground))"
                            width={72}
                          />
                          <Tooltip contentStyle={tipStyle} />
                          <ReferenceLine x={5} stroke="rgb(245 158 11)" strokeDasharray="3 3" />
                          <Bar dataKey="do" radius={[0, 6, 6, 0]}>
                            {pondComparison.map((item) => (
                              <Cell
                                key={item.id}
                                fill={
                                  !item.hasData
                                    ? "hsl(var(--muted-foreground) / 0.35)"
                                    : item.do < 4
                                      ? "rgb(244 63 94)"
                                      : item.do < 5
                                        ? "rgb(245 158 11)"
                                        : "hsl(var(--primary))"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      {t("No ponds available for comparison.", "তুলনার জন্য কোনো পুকুর নেই।")}
                    </p>
                  )}
                </section>
              </div>

              <section>
                <h3 className="mb-3 font-display text-base font-semibold">
                  {t("Report scope", "রিপোর্টের পরিসর")}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <ReportCard
                    active={reportType === "daily"}
                    onClick={() => setReportType("daily")}
                    icon={<Activity className="h-4 w-4" />}
                    title={t("Daily pond", "দৈনিক পুকুর")}
                    hint={t("24h key metrics per pond.", "২৪ ঘণ্টার মূল মেট্রিক্স।")}
                  />
                  <ReportCard
                    active={reportType === "weekly"}
                    onClick={() => setReportType("weekly")}
                    icon={<ShieldCheck className="h-4 w-4" />}
                    title={t("Weekly farm", "সাপ্তাহিক ফার্ম")}
                    hint={t("Farm-wide 7-day health.", "ফার্মের ৭ দিনের স্বাস্থ্য।")}
                  />
                  <ReportCard
                    active={reportType === "monthly"}
                    onClick={() => setReportType("monthly")}
                    icon={<CalIcon className="h-4 w-4" />}
                    title={t("Monthly", "মাসিক")}
                    hint={t("30-day trend and alerts.", "৩০ দিনের প্রবণতা ও অ্যালার্ট।")}
                  />
                  <ReportCard
                    active={reportType === "device"}
                    onClick={() => setReportType("device")}
                    icon={<Wifi className="h-4 w-4" />}
                    title={t("Device health", "ডিভাইস স্বাস্থ্য")}
                    hint={t("Uptime, battery, calibration.", "আপটাইম, ব্যাটারি, ক্যালিব্রেশন।")}
                  />
                  <ReportCard
                    active={reportType === "custom"}
                    onClick={() => setReportType("custom")}
                    icon={<FileDown className="h-4 w-4" />}
                    title={t("Custom export", "কাস্টম এক্সপোর্ট")}
                    hint={t("Pick parameters and range.", "প্যারামিটার ও পরিসর বেছে নিন।")}
                  />
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
            </>
          )}
        </>
      )}
    </div>
  );
}

const tipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 11,
} as const;

function DateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <div className="relative">
        <CalIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="date"
          className="pl-9"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function TrendChart({
  title,
  rows,
  param,
  t,
}: {
  title: string;
  rows: TrendRow[];
  param: ParamKey;
  t: (en: string, bn: string) => string;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <p className="text-[11px] text-muted-foreground">
            {t("Safe", "নিরাপদ")} {PARAM_META[param].safe[0]}-{PARAM_META[param].safe[1]}{" "}
            {PARAM_META[param].unit}
          </p>
        </div>
      </div>
      <TrendChartContent rows={rows} param={param} t={t} heightClass="h-48" />
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <Legend dot="bg-primary/40" label={t("Safe range", "নিরাপদ")} />
        <Legend dot="bg-amber-500" label={t("Warning", "সতর্ক")} />
        <Legend dot="bg-muted-foreground/40" label={t("Gap = missing", "ফাঁক = অনুপস্থিত")} />
      </div>
    </section>
  );
}

function TrendChartContent({
  rows,
  param,
  t,
  heightClass,
}: {
  rows: TrendRow[];
  param: ParamKey;
  t: (en: string, bn: string) => string;
  heightClass: string;
}) {
  const meta = PARAM_META[param];
  const data = rows.map((row) => ({ day: row.day, v: row[param] }));
  if (!data.length) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-lg border border-dashed border-border",
          heightClass,
        )}
      >
        <p className="text-sm text-muted-foreground">
          {t("No readings in this range.", "এই সময়সীমায় কোনো রিডিং নেই।")}
        </p>
      </div>
    );
  }
  return (
    <div className={cn("w-full", heightClass)}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-${param}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            interval="preserveStartEnd"
          />
          <YAxis
            domain={meta.domain}
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            width={28}
          />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(value) => [`${value} ${meta.unit}`, t(meta.labelEn, meta.labelBn)]}
          />
          <ReferenceArea
            y1={meta.safe[0]}
            y2={meta.safe[1]}
            fill="hsl(var(--primary))"
            fillOpacity={0.07}
          />
          <ReferenceLine y={meta.warn[0]} stroke="rgb(245 158 11)" strokeDasharray="4 4" />
          <ReferenceLine y={meta.warn[1]} stroke="rgb(245 158 11)" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="v"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill={`url(#g-${param})`}
            connectNulls={false}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-2 w-3 rounded-sm", dot)} />
      {label}
    </span>
  );
}

function ScoreTile({
  label,
  value,
  suffix,
  icon,
  tone,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: ReactNode;
  tone: "good" | "warn" | "bad";
}) {
  const accent =
    tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-rose-600";
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={cn("mt-2 font-display text-3xl font-bold tabular-nums", accent)}>
        {value}
        {suffix && <span className="text-base font-medium text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}

function ReportCard({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-card p-4 text-left shadow-soft transition hover:border-primary/40",
        active ? "border-primary/60 ring-2 ring-primary/20" : "border-border/70",
      )}
    >
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </button>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
