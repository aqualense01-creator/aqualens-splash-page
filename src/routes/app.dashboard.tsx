import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Waves,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  WifiOff,
  Activity,
  Droplets,
  Thermometer,
  FlaskConical,
  BatteryLow,
  Wrench,
  Plus,
  ArrowRight,
  Zap,
  Clock,
  Cpu,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MOCK_PONDS,
  MOCK_DEVICES,
  MOCK_ALERTS,
  type MockPond,
  type MockAlert,
  type MockDevice,
} from "@/lib/mock-farm";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Acqua Lence" }] }),
  component: DashboardPage,
});

/* ───────── helpers ───────── */
function timeAgo(iso: string, isBn: boolean): { label: string; stale: boolean } {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60_000);
  const stale = mins >= 30;
  if (mins < 1) return { label: isBn ? "এইমাত্র" : "just now", stale };
  if (mins < 60) return { label: isBn ? `${mins} মিনিট আগে` : `${mins} min ago`, stale };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { label: isBn ? `${hrs} ঘন্টা আগে` : `${hrs}h ago`, stale };
  const days = Math.floor(hrs / 24);
  return { label: isBn ? `${days} দিন আগে` : `${days}d ago`, stale };
}

const statusTone: Record<string, { dot: string; pill: string; text: string }> = {
  good: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    text: "text-emerald-600",
  },
  watch: {
    dot: "bg-sky-500",
    pill: "bg-sky-500/10 text-sky-700 border-sky-500/30",
    text: "text-sky-600",
  },
  warning: {
    dot: "bg-amber-500",
    pill: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    text: "text-amber-600",
  },
  critical: {
    dot: "bg-rose-500",
    pill: "bg-rose-500/10 text-rose-700 border-rose-500/30",
    text: "text-rose-600",
  },
  offline: {
    dot: "bg-muted-foreground",
    pill: "bg-muted text-muted-foreground border-border",
    text: "text-muted-foreground",
  },
  calibration_due: {
    dot: "bg-violet-500",
    pill: "bg-violet-500/10 text-violet-700 border-violet-500/30",
    text: "text-violet-600",
  },
  online: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    text: "text-emerald-600",
  },
  low_battery: {
    dot: "bg-amber-500",
    pill: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    text: "text-amber-600",
  },
};

/* ───────── tiny components ───────── */
function Sparkline({
  values,
  tone = "primary",
}: {
  values: number[];
  tone?: "primary" | "warning" | "critical" | "muted";
}) {
  const w = 120;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(" ");
  const last = values.length - 1;
  const lastX = last * step;
  const lastY = h - ((values[last] - min) / range) * (h - 4) - 2;
  const stroke = {
    primary: "stroke-[oklch(0.55_0.10_200)]",
    warning: "stroke-amber-500",
    critical: "stroke-rose-500",
    muted: "stroke-muted-foreground/50",
  }[tone];
  const fill = {
    primary: "fill-[oklch(0.72_0.12_195)]/15",
    warning: "fill-amber-500/15",
    critical: "fill-rose-500/15",
    muted: "fill-muted-foreground/10",
  }[tone];
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  const dotFill = {
    primary: "fill-[oklch(0.55_0.10_200)]",
    warning: "fill-amber-500",
    critical: "fill-rose-500",
    muted: "fill-muted-foreground/50",
  }[tone];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
      <polygon points={areaPoints} className={fill} />
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={stroke}
      />
      <circle cx={lastX} cy={lastY} r="2" className={dotFill} />
    </svg>
  );
}

function StatTile({
  label,
  value,
  icon,
  tone = "muted",
  hint,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: "good" | "warning" | "critical" | "muted" | "primary";
  hint?: string;
}) {
  const toneMap = {
    good: "from-emerald-500/15 to-emerald-500/0 text-emerald-700",
    warning: "from-amber-500/15 to-amber-500/0 text-amber-700",
    critical: "from-rose-500/15 to-rose-500/0 text-rose-700",
    muted: "from-muted to-transparent text-muted-foreground",
    primary: "from-[oklch(0.72_0.12_195)]/15 to-transparent text-[oklch(0.45_0.08_200)]",
  }[tone];
  const valueColor = {
    good: "text-emerald-600",
    warning: "text-amber-600",
    critical: "text-rose-600",
    muted: "text-foreground",
    primary: "text-foreground",
  }[tone];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-soft",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-80 blur-xl",
          toneMap,
        )}
      />
      <div className="relative flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full bg-background/70",
            toneMap.split(" ").slice(-1)[0],
          )}
        >
          {icon}
        </span>
      </div>
      <p className={cn("relative mt-2 font-display text-3xl font-bold tabular-nums", valueColor)}>
        {value}
      </p>
      {hint && <p className="relative mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PondCard({ pond, isBn }: { pond: MockPond; isBn: boolean }) {
  const ts = timeAgo(pond.last_updated, isBn);
  const tone = statusTone[pond.status] ?? statusTone.offline;
  const sparkTone =
    pond.status === "critical"
      ? "critical"
      : pond.status === "warning"
        ? "warning"
        : pond.status === "offline"
          ? "muted"
          : "primary";

  return (
    <Link
      to="/app/ponds/$pondId"
      params={{ pondId: pond.id }}
      className="group block rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-foreground">
            {pond.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{pond.species}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            tone.pill,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
          {isBn
            ? {
                good: "ভালো",
                watch: "নজরে",
                warning: "সতর্কতা",
                critical: "জরুরি",
                offline: "অফলাইন",
                calibration_due: "ক্যালি.",
              }[pond.status]
            : pond.status === "calibration_due"
              ? "Calib."
              : pond.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric
          icon={<Droplets className="h-3.5 w-3.5" />}
          label={isBn ? "DO" : "DO"}
          value={`${pond.do_mg_l.toFixed(1)}`}
          unit="mg/L"
          warn={pond.do_mg_l < 4}
          crit={pond.do_mg_l < 3}
        />
        <Metric
          icon={<FlaskConical className="h-3.5 w-3.5" />}
          label="pH"
          value={pond.ph.toFixed(1)}
          warn={pond.ph < 6.5 || pond.ph > 8.2}
          crit={pond.ph < 6 || pond.ph > 9}
        />
        <Metric
          icon={<Thermometer className="h-3.5 w-3.5" />}
          label={isBn ? "তাপ" : "Temp"}
          value={pond.temp_c.toFixed(1)}
          unit="°C"
          warn={pond.temp_c > 30}
          crit={pond.temp_c > 32}
        />
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>{isBn ? "DO ট্রেন্ড (২ঘণ্টা)" : "DO trend (2h)"}</span>
          <TrendingUp className="h-3 w-3" />
        </div>
        <Sparkline values={pond.trend} tone={sparkTone} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
        <span
          className={cn(
            "flex items-center gap-1 text-[11px]",
            ts.stale ? "text-rose-600 font-semibold" : "text-muted-foreground",
          )}
        >
          <Clock className="h-3 w-3" />
          {ts.label}
          {ts.stale && (
            <span className="ml-1 rounded bg-rose-500/10 px-1 py-px text-[9px] font-bold uppercase">
              stale
            </span>
          )}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-[11px] font-medium",
            statusTone[pond.device_status]?.text ?? "text-muted-foreground",
          )}
        >
          <Cpu className="h-3 w-3" />
          {pond.device_status.replace("_", " ")}
        </span>
      </div>
    </Link>
  );
}

function Metric({
  icon,
  label,
  value,
  unit,
  warn,
  crit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  warn?: boolean;
  crit?: boolean;
}) {
  const color = crit ? "text-rose-600" : warn ? "text-amber-600" : "text-foreground";
  const bg = crit
    ? "bg-rose-500/5 border-rose-500/20"
    : warn
      ? "bg-amber-500/5 border-amber-500/20"
      : "bg-muted/40 border-border/40";
  return (
    <div className={cn("rounded-lg border px-2 py-1.5", bg)}>
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={cn("mt-0.5 font-display text-base font-bold tabular-nums leading-tight", color)}
      >
        {value}
        {unit && (
          <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">{unit}</span>
        )}
      </p>
    </div>
  );
}

function alertIcon(type: MockAlert["alert_type"]) {
  if (type === "critical") return AlertCircle;
  if (type === "warning") return AlertTriangle;
  if (type === "device_offline") return WifiOff;
  return Wrench;
}

function alertTone(type: MockAlert["alert_type"]) {
  if (type === "critical")
    return {
      ring: "ring-rose-500/30",
      bg: "bg-rose-500/10",
      text: "text-rose-700",
      dot: "bg-rose-500",
    };
  if (type === "warning")
    return {
      ring: "ring-amber-500/30",
      bg: "bg-amber-500/10",
      text: "text-amber-700",
      dot: "bg-amber-500",
    };
  if (type === "device_offline")
    return {
      ring: "ring-slate-500/30",
      bg: "bg-slate-500/10",
      text: "text-slate-700",
      dot: "bg-slate-500",
    };
  return {
    ring: "ring-violet-500/30",
    bg: "bg-violet-500/10",
    text: "text-violet-700",
    dot: "bg-violet-500",
  };
}

/* ───────── page ───────── */
function DashboardPage() {
  const { lang, t } = useI18n();
  const { profile } = useAuth();
  const isBn = lang === "bn";

  const [activeFarmId, setActiveFarmId] = useState<string>("f1");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("active_farm_id");
    if (saved) setActiveFarmId(saved);
  }, []);

  // Filter mock data by the active farm
  const ponds = useMemo(() => MOCK_PONDS.filter((p) => p.farm_id === activeFarmId), [activeFarmId]);
  const devices = useMemo(() => {
    return MOCK_DEVICES.filter((d) => {
      const matchPond = MOCK_PONDS.find((p) => p.name.startsWith(d.pond_name));
      return matchPond ? matchPond.farm_id === activeFarmId : true;
    });
  }, [activeFarmId]);
  const alerts = useMemo(() => {
    return MOCK_ALERTS.filter((a) => {
      if (!a.pond_name) return true;
      const matchPond = MOCK_PONDS.find((p) => a.pond_name?.includes(p.name.split(" — ")[0]));
      return matchPond ? matchPond.farm_id === activeFarmId : true;
    });
  }, [activeFarmId]);

  const counts = useMemo(
    () => ({
      total: ponds.length,
      good: ponds.filter((p) => p.status === "good").length,
      warning: ponds.filter((p) => p.status === "warning").length,
      critical: ponds.filter((p) => p.status === "critical").length,
      offlineDevices: devices.filter((d) => d.status === "offline").length,
    }),
    [ponds, devices],
  );

  const deviceCounts = useMemo(
    () => ({
      online: devices.filter((d) => d.status === "online").length,
      offline: devices.filter((d) => d.status === "offline").length,
      lowBattery: devices.filter((d) => d.status === "low_battery").length,
      calibrationDue: devices.filter((d) => d.status === "calibration_due").length,
    }),
    [devices],
  );

  const alertCounts = useMemo(
    () => ({
      critical: alerts.filter((a) => a.alert_type === "critical").length,
      warning: alerts.filter((a) => a.alert_type === "warning").length,
      deviceOffline: alerts.filter((a) => a.alert_type === "device_offline").length,
      calibration: alerts.filter((a) => a.alert_type === "calibration_due").length,
    }),
    [alerts],
  );

  const sortedAlerts = useMemo(() => {
    const rank = { critical: 0, warning: 1, device_offline: 2, calibration_due: 3 } as const;
    return [...alerts].sort(
      (a, b) =>
        rank[a.alert_type] - rank[b.alert_type] ||
        +new Date(b.detected_at) - +new Date(a.detected_at),
    );
  }, [alerts]);

  const topCritical = sortedAlerts.find((a) => a.alert_type === "critical");
  const recommended = topCritical ?? sortedAlerts[0];

  const overallStatus: "good" | "warning" | "critical" =
    counts.critical > 0
      ? "critical"
      : counts.warning > 0 || counts.offlineDevices > 0
        ? "warning"
        : "good";

  const greetingName = profile?.full_name?.split(" ")[0] ?? (isBn ? "কৃষক" : "Farmer");

  /* ─── empty state ─── */
  if (ponds.length === 0 && devices.length === 0) {
    return (
      <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card p-12 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Waves className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold">{t("dashboard.empty.title")}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {isBn
            ? "মনিটরিং শুরু করতে একটি পুকুর যোগ করুন এবং প্রথম ডিভাইস সেট আপ করুন।"
            : "Add a pond and set up your first device to start monitoring."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/app/farms">
              <Plus className="mr-1.5 h-4 w-4" />
              {t("dashboard.empty.cta1")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app/setup">
              <Cpu className="mr-1.5 h-4 w-4" />
              {t("dashboard.empty.cta2")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {isBn ? "স্বাগতম, " : "Welcome back, "}
            <span className="font-semibold text-foreground">{greetingName}</span>
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("dashboard.title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/alerts">
              <AlertCircle className="mr-1.5 h-4 w-4" />
              {t("dashboard.todaysAlerts")}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/app/farms">
              <Plus className="mr-1.5 h-4 w-4" />
              {isBn ? "পুকুর যোগ" : "Add pond"}
            </Link>
          </Button>
        </div>
      </header>

      {/* Critical alert banner — above the fold */}
      {topCritical && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-4 shadow-soft">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-500 text-white">
              <AlertCircle className="h-5 w-5" />
              <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {isBn ? "জরুরি" : "Critical"}
                </span>
                <p className="text-sm font-semibold text-foreground">{topCritical.pond_name}</p>
              </div>
              <p className="mt-1 text-sm text-foreground">{topCritical.message}</p>
              {topCritical.recommended_action && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <Zap className="mr-1 inline h-3 w-3 text-amber-500" />
                  {topCritical.recommended_action}
                </p>
              )}
            </div>
            <Button asChild size="sm" className="shrink-0 bg-rose-600 hover:bg-rose-700">
              <Link to="/app/alerts">
                {isBn ? "ব্যবস্থা নিন" : "Take action"}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Recommended Action (order-1 on mobile, 3 on desktop) */}
        {recommended && (
          <section className="order-1 lg:order-3 lg:col-span-4 relative overflow-hidden rounded-2xl border border-[oklch(0.72_0.12_195)]/30 bg-gradient-to-br from-[oklch(0.72_0.12_195)]/10 via-card to-card p-4 shadow-soft">
            <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-[oklch(0.72_0.12_195)]/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[oklch(0.72_0.12_195)]/20 text-[oklch(0.40_0.10_200)]">
                  <Zap className="h-4 w-4" />
                </span>
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.40_0.10_200)]">
                  {t("dashboard.recommended")}
                </h2>
              </div>
              <p className="mt-3 font-display text-base font-semibold leading-snug text-foreground">
                {recommended.message}
              </p>
              {recommended.recommended_action && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {recommended.recommended_action}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link to="/app/alerts">
                    {isBn ? "এখনই করুন" : "Do it now"}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm">
                  {isBn ? "পরে" : "Later"}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Farm Health Summary — full width (order-2 on mobile, 1 on desktop) */}
        <section className="order-2 lg:order-1 lg:col-span-12">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? "খামারের স্বাস্থ্য" : "Farm health"}
            </h2>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                statusTone[overallStatus].pill,
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              {isBn
                ? { good: "সব ঠিক", warning: "সতর্কতা", critical: "জরুরি" }[overallStatus]
                : { good: "All good", warning: "Needs attention", critical: "Action required" }[
                    overallStatus
                  ]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile
              label={isBn ? "মোট পুকুর" : "Total ponds"}
              value={counts.total}
              icon={<Waves className="h-3.5 w-3.5" />}
              tone="primary"
            />
            <StatTile
              label={isBn ? "ভালো" : "Good"}
              value={counts.good}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              tone="good"
            />
            <StatTile
              label={isBn ? "সতর্কতা" : "Warning"}
              value={counts.warning}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              tone="warning"
            />
            <StatTile
              label={isBn ? "জরুরি" : "Critical"}
              value={counts.critical}
              icon={<AlertCircle className="h-3.5 w-3.5" />}
              tone="critical"
            />
            <StatTile
              label={isBn ? "অফলাইন ডিভাইস" : "Offline devices"}
              value={counts.offlineDevices}
              icon={<WifiOff className="h-3.5 w-3.5" />}
              tone={counts.offlineDevices > 0 ? "warning" : "muted"}
            />
            <StatTile
              label={isBn ? "মোট ডিভাইস" : "Total devices"}
              value={devices.length}
              icon={<Cpu className="h-3.5 w-3.5" />}
              tone="muted"
            />
          </div>
        </section>

        {/* Ponds — left big bento (order-3 on mobile, 2 on desktop) */}
        <section className="order-3 lg:order-2 lg:col-span-8 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">{isBn ? "পুকুরসমূহ" : "Ponds"}</h2>
              <p className="text-xs text-muted-foreground">
                {isBn ? "লাইভ পরিমাপ এবং প্রবণতা" : "Live readings and trends"}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/farms">
                {t("common.viewAll")}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ponds.map((p) => (
              <PondCard key={p.id} pond={p} isBn={isBn} />
            ))}
          </div>
        </section>

        {/* Today's Alerts (order-4 on mobile, 4 on desktop) */}
        <section className="order-4 lg:order-4 lg:col-span-4 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{t("dashboard.todaysAlerts")}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/alerts">{t("common.viewAll")}</Link>
            </Button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <AlertCountPill
              label={isBn ? "জরুরি" : "Critical"}
              count={alertCounts.critical}
              tone="critical"
              icon={<AlertCircle className="h-3 w-3" />}
            />
            <AlertCountPill
              label={isBn ? "সতর্কতা" : "Warning"}
              count={alertCounts.warning}
              tone="warning"
              icon={<AlertTriangle className="h-3 w-3" />}
            />
            <AlertCountPill
              label={isBn ? "ডিভাইস অফ" : "Device off"}
              count={alertCounts.deviceOffline}
              tone="muted"
              icon={<WifiOff className="h-3 w-3" />}
            />
            <AlertCountPill
              label={isBn ? "ক্যালি." : "Calibration"}
              count={alertCounts.calibration}
              tone="violet"
              icon={<Wrench className="h-3 w-3" />}
            />
          </div>

          <ul className="space-y-2">
            {sortedAlerts.length === 0 && (
              <li className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> {isBn ? "সব ঠিক আছে।" : "All clear."}
              </li>
            )}
            {sortedAlerts.slice(0, 4).map((a) => {
              const Icon = alertIcon(a.alert_type);
              const tone = alertTone(a.alert_type);
              const ts = timeAgo(a.detected_at, isBn);
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl ring-1 p-2.5",
                    tone.ring,
                    tone.bg,
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white",
                      tone.dot,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {a.pond_name ?? a.device_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{a.message}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{ts.label}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Device Health Summary — full width (order-5 on mobile, 5 on desktop) */}
        <section className="order-5 lg:order-5 lg:col-span-12 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">{t("dashboard.deviceHealth")}</h2>
              <p className="text-xs text-muted-foreground">
                {isBn ? "সমস্ত সেন্সর এবং গেটওয়ে" : "All sensors and gateways"}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/devices">
                {t("common.viewAll")}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DeviceStat
              icon={<Activity className="h-3.5 w-3.5" />}
              label={isBn ? "অনলাইন" : "Online"}
              value={deviceCounts.online}
              tone="good"
            />
            <DeviceStat
              icon={<WifiOff className="h-3.5 w-3.5" />}
              label={isBn ? "অফলাইন" : "Offline"}
              value={deviceCounts.offline}
              tone={deviceCounts.offline ? "critical" : "muted"}
            />
            <DeviceStat
              icon={<BatteryLow className="h-3.5 w-3.5" />}
              label={isBn ? "লো ব্যাটারি" : "Low battery"}
              value={deviceCounts.lowBattery}
              tone={deviceCounts.lowBattery ? "warning" : "muted"}
            />
            <DeviceStat
              icon={<Wrench className="h-3.5 w-3.5" />}
              label={isBn ? "ক্যালি. বাকি" : "Calibration due"}
              value={deviceCounts.calibrationDue}
              tone={deviceCounts.calibrationDue ? "violet" : "muted"}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((d) => (
              <DeviceRow key={d.id} device={d} isBn={isBn} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AlertCountPill({
  label,
  count,
  tone,
  icon,
}: {
  label: string;
  count: number;
  tone: "critical" | "warning" | "muted" | "violet";
  icon: React.ReactNode;
}) {
  const cls = {
    critical: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    warning: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    muted: "bg-muted text-muted-foreground border-border",
    violet: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  }[tone];
  return (
    <div className={cn("flex items-center justify-between rounded-lg border px-2.5 py-1.5", cls)}>
      <span className="flex items-center gap-1.5 text-[11px] font-medium">
        {icon}
        {label}
      </span>
      <span className="font-display text-sm font-bold tabular-nums">{count}</span>
    </div>
  );
}

function DeviceStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "good" | "warning" | "critical" | "muted" | "violet";
}) {
  const cls = {
    good: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    critical: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    muted: "bg-muted text-muted-foreground border-border",
    violet: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  }[tone];
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5", cls)}>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-background/60">{icon}</span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">{label}</p>
        <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function DeviceRow({ device, isBn }: { device: MockDevice; isBn: boolean }) {
  const ts = timeAgo(device.last_seen, isBn);
  const tone = statusTone[device.status] ?? statusTone.offline;
  const battTone =
    device.battery_pct === 0
      ? "bg-muted-foreground"
      : device.battery_pct < 20
        ? "bg-amber-500"
        : device.battery_pct < 50
          ? "bg-sky-500"
          : "bg-emerald-500";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-2.5">
      <span className={cn("grid h-9 w-9 place-items-center rounded-full", tone.pill)}>
        <Cpu className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{device.name}</p>
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", tone.text)}>
            {device.status.replace("_", " ")}
          </span>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          {device.pond_name} · {ts.label}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 overflow-hidden rounded-full bg-border/60">
            <div
              className={cn("h-1 rounded-full", battTone)}
              style={{ width: `${device.battery_pct}%` }}
            />
          </div>
          <span className="w-9 text-right text-[10px] tabular-nums text-muted-foreground">
            {device.battery_pct}%
          </span>
        </div>
      </div>
    </div>
  );
}
