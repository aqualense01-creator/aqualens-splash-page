import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Cpu,
  FlaskConical,
  Search,
  Bell,
  MessageCircle,
  StickyNote,
  Mail,
  Smartphone,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, MetricTile, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/alerts")({
  head: () => ({ meta: [{ title: "Alerts — Acqua Lence" }] }),
  component: AlertsPage,
});

// ----- Types & mock data -----
type AlertCategory = "critical" | "warning" | "device" | "calibration";
type AlertStatus = "open" | "acknowledged" | "resolved";

type Alert = {
  id: string;
  category: AlertCategory;
  status: AlertStatus;
  pondId: string;
  pondName: string;
  parameter: string; // e.g. "Dissolved O₂"
  paramKey: "do" | "ph" | "temp" | "amm" | "device" | "calibration";
  currentValue: string; // formatted
  unit: string;
  safeRange: string; // "5 – 9 mg/L"
  thresholdLabel: string; // "< 4 mg/L"
  recommendedEn: string;
  recommendedBn: string;
  messageEn: string;
  messageBn: string;
  detectedAt: string; // ISO
  device: string;
  delivery: {
    sms: "sent" | "pending" | "failed";
    push: "sent" | "pending" | "failed";
    email: "sent" | "pending" | "failed";
  };
};

const now = Date.now();
const m = (mins: number) => new Date(now - mins * 60_000).toISOString();

const SEED_ALERTS: Alert[] = [
  {
    id: "a1",
    category: "critical",
    status: "open",
    pondId: "p2",
    pondName: "Pond 2 — Shrimp",
    parameter: "Dissolved O₂",
    paramKey: "do",
    currentValue: "2.8",
    unit: "mg/L",
    safeRange: "5 – 9 mg/L",
    thresholdLabel: "< 4 mg/L",
    recommendedEn: "Turn on aerators now for at least 60 minutes.",
    recommendedBn: "এখনই এয়ারেটর কমপক্ষে ৬০ মিনিট চালু করুন।",
    messageEn: "Pond 2: oxygen has dropped. Switch on aerator now.",
    messageBn: "পুকুর ২: অক্সিজেন কমে গেছে। এখনই এয়ারেটর চালু করুন।",
    detectedAt: m(8),
    device: "AL-SENSE-02",
    delivery: { sms: "sent", push: "sent", email: "sent" },
  },
  {
    id: "a2",
    category: "warning",
    status: "open",
    pondId: "p3",
    pondName: "Pond 3 — Tilapia",
    parameter: "pH",
    paramKey: "ph",
    currentValue: "8.6",
    unit: "",
    safeRange: "6.8 – 8.2",
    thresholdLabel: "> 8.5",
    recommendedEn: "Reduce feed and re-check in 1 hour.",
    recommendedBn: "খাবার কমিয়ে দিন এবং ১ ঘণ্টা পর পুনরায় পরীক্ষা করুন।",
    messageEn: "Pond 3: pH trending high.",
    messageBn: "পুকুর ৩: pH বাড়ছে।",
    detectedAt: m(35),
    device: "AL-SENSE-03",
    delivery: { sms: "sent", push: "sent", email: "pending" },
  },
  {
    id: "a3",
    category: "warning",
    status: "acknowledged",
    pondId: "p1",
    pondName: "Pond 1 — Rui",
    parameter: "Temperature",
    paramKey: "temp",
    currentValue: "31.8",
    unit: "°C",
    safeRange: "24 – 31 °C",
    thresholdLabel: "> 31.5 °C",
    recommendedEn: "Increase water depth or exchange water partially.",
    recommendedBn: "পানির গভীরতা বাড়ান বা আংশিক পানি পরিবর্তন করুন।",
    messageEn: "Pond 1: temperature above safe range.",
    messageBn: "পুকুর ১: তাপমাত্রা নিরাপদ সীমার বাইরে।",
    detectedAt: m(95),
    device: "AL-SENSE-01",
    delivery: { sms: "sent", push: "sent", email: "sent" },
  },
  {
    id: "a4",
    category: "device",
    status: "open",
    pondId: "p5",
    pondName: "Pond 5 — Carp Mix",
    parameter: "Device offline",
    paramKey: "device",
    currentValue: "—",
    unit: "",
    safeRange: "Online",
    thresholdLabel: "> 3 hours offline",
    recommendedEn: "Check device power and SIM signal at the pond.",
    recommendedBn: "পুকুরে ডিভাইসের পাওয়ার ও সিম সিগন্যাল পরীক্ষা করুন।",
    messageEn: "Pond 5: device offline for 3+ hours.",
    messageBn: "পুকুর ৫: ডিভাইস ৩+ ঘণ্টা অফলাইন।",
    detectedAt: m(185),
    device: "AL-SENSE-05",
    delivery: { sms: "sent", push: "failed", email: "sent" },
  },
  {
    id: "a5",
    category: "calibration",
    status: "open",
    pondId: "p6",
    pondName: "Pond 6 — Koi",
    parameter: "pH sensor calibration",
    paramKey: "calibration",
    currentValue: "Due",
    unit: "",
    safeRange: "Calibrated within 30 days",
    thresholdLabel: "31 days overdue",
    recommendedEn: "Schedule a calibration visit with the technician.",
    recommendedBn: "টেকনিশিয়ানের সাথে ক্যালিব্রেশন ভিজিট নির্ধারণ করুন।",
    messageEn: "Pond 6: pH sensor calibration overdue.",
    messageBn: "পুকুর ৬: pH সেন্সর ক্যালিব্রেশন বকেয়া।",
    detectedAt: m(60 * 26),
    device: "AL-SENSE-06",
    delivery: { sms: "pending", push: "sent", email: "sent" },
  },
  {
    id: "a6",
    category: "critical",
    status: "resolved",
    pondId: "p4",
    pondName: "Pond 4 — Pangas",
    parameter: "Ammonia",
    paramKey: "amm",
    currentValue: "0.18",
    unit: "mg/L",
    safeRange: "0 – 0.2 mg/L",
    thresholdLabel: "> 0.4 mg/L",
    recommendedEn: "Resolved after partial water exchange.",
    recommendedBn: "আংশিক পানি পরিবর্তনের পর সমাধান হয়েছে।",
    messageEn: "Pond 4: ammonia spike resolved.",
    messageBn: "পুকুর ৪: অ্যামোনিয়া বৃদ্ধি সমাধান হয়েছে।",
    detectedAt: m(60 * 12),
    device: "AL-SENSE-04",
    delivery: { sms: "sent", push: "sent", email: "sent" },
  },
  {
    id: "a7",
    category: "warning",
    status: "resolved",
    pondId: "p1",
    pondName: "Pond 1 — Rui",
    parameter: "Turbidity",
    paramKey: "ph",
    currentValue: "62",
    unit: "NTU",
    safeRange: "10 – 35 NTU",
    thresholdLabel: "> 60 NTU",
    recommendedEn: "Resolved with lime treatment.",
    recommendedBn: "চুন প্রয়োগে সমাধান হয়েছে।",
    messageEn: "Pond 1: turbidity high.",
    messageBn: "পুকুর ১: ঘোলাত্ব বেশি।",
    detectedAt: m(60 * 48),
    device: "AL-SENSE-01",
    delivery: { sms: "sent", push: "sent", email: "sent" },
  },
];

// ----- Page -----
function AlertsPage() {
  const { lang } = useI18n();
  const t = (en: string, bn: string) => (lang === "bn" ? bn : en);

  const [alerts, setAlerts] = useState<Alert[]>(SEED_ALERTS);
  const [tab, setTab] = useState<"all" | AlertCategory | "resolved">("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeFarmId, setActiveFarmId] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return localStorage.getItem("active_farm_id") || "all";
  });

  const filteredAlertsByFarm = useMemo(() => {
    return alerts.filter((a) => {
      const matchPond = MOCK_PONDS.find((p) => p.id === a.pondId);
      return activeFarmId === "all" || (matchPond ? matchPond.farm_id === activeFarmId : true);
    });
  }, [alerts, activeFarmId]);

  const counts = useMemo(
    () => ({
      critical: filteredAlertsByFarm.filter(
        (a) => a.category === "critical" && a.status !== "resolved",
      ).length,
      warning: filteredAlertsByFarm.filter(
        (a) => a.category === "warning" && a.status !== "resolved",
      ).length,
      device: filteredAlertsByFarm.filter((a) => a.category === "device" && a.status !== "resolved")
        .length,
      calibration: filteredAlertsByFarm.filter(
        (a) => a.category === "calibration" && a.status !== "resolved",
      ).length,
      resolved: filteredAlertsByFarm.filter((a) => a.status === "resolved").length,
    }),
    [filteredAlertsByFarm],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return filteredAlertsByFarm
      .filter((a) => {
        if (tab === "all") return true;
        if (tab === "resolved") return a.status === "resolved";
        return a.category === tab && a.status !== "resolved";
      })
      .filter((a) => {
        if (!q) return true;
        return [a.pondName, a.parameter, a.messageEn, a.messageBn, a.device].some((x) =>
          x.toLowerCase().includes(q),
        );
      })
      .sort((a, b) => {
        const rank = (c: AlertCategory) =>
          c === "critical" ? 0 : c === "warning" ? 1 : c === "device" ? 2 : 3;
        if (a.status === "resolved" && b.status !== "resolved") return 1;
        if (a.status !== "resolved" && b.status === "resolved") return -1;
        const cr = rank(a.category) - rank(b.category);
        if (cr) return cr;
        return +new Date(b.detectedAt) - +new Date(a.detectedAt);
      });
  }, [filteredAlertsByFarm, tab, query]);

  const update = (id: string, patch: Partial<Alert>) =>
    setAlerts((arr) => arr.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const openAlert = alerts.find((a) => a.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("Alerts Center", "অ্যালার্ট সেন্টার")}
        subtitle={t(
          "Critical first. Take action and keep ponds safe.",
          "গুরুতর প্রথমে। পদক্ষেপ নিন এবং পুকুর নিরাপদ রাখুন।",
        )}
      />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricTile
          label={t("Critical", "গুরুতর")}
          value={counts.critical}
          accent="text-rose-600"
        />
        <MetricTile label={t("Warning", "সতর্ক")} value={counts.warning} accent="text-amber-600" />
        <MetricTile label={t("Device", "ডিভাইস")} value={counts.device} accent="text-sky-600" />
        <MetricTile
          label={t("Calibration", "ক্যালিব্রেশন")}
          value={counts.calibration}
          accent="text-violet-600"
        />
        <MetricTile
          label={t("Resolved", "সমাধান হয়েছে")}
          value={counts.resolved}
          accent="text-emerald-600"
        />
      </div>

      {/* Sample Bangla critical alert banner */}
      {counts.critical > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/5 p-4 shadow-soft">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-500 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
              {t("Critical alert", "গুরুতর অ্যালার্ট")}
            </p>
            <p className="mt-0.5 font-display text-base font-semibold">
              পুকুর ২: অক্সিজেন কমে গেছে। এখনই এয়ারেটর চালু করুন।
            </p>
            <p className="text-sm text-muted-foreground">
              {t("Pond 2: oxygen has dropped. Switch on aerator now.", "ইংরেজি অনুবাদ উপরে।")}
            </p>
          </div>
        </div>
      )}

      {/* Tabs + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">
              {t("All", "সব")} ({alerts.length})
            </TabsTrigger>
            <TabsTrigger value="critical">
              {t("Critical", "গুরুতর")} ({counts.critical})
            </TabsTrigger>
            <TabsTrigger value="warning">
              {t("Warning", "সতর্ক")} ({counts.warning})
            </TabsTrigger>
            <TabsTrigger value="device">
              {t("Device", "ডিভাইস")} ({counts.device})
            </TabsTrigger>
            <TabsTrigger value="calibration">
              {t("Calibration", "ক্যালিব্রেশন")} ({counts.calibration})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              {t("Resolved", "সমাধান হয়েছে")} ({counts.resolved})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search alerts…", "অ্যালার্ট খুঁজুন…")}
            className="pl-9"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" />}
          title={t("No alerts here", "এখানে কোনো অ্যালার্ট নেই")}
          description={t("All clear in this category.", "এই বিভাগে সব ঠিক আছে।")}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Pond", "পুকুর")}</TableHead>
                  <TableHead>{t("Parameter", "পরামিতি")}</TableHead>
                  <TableHead>{t("Current", "বর্তমান")}</TableHead>
                  <TableHead>{t("Threshold", "সীমা")}</TableHead>
                  <TableHead>{t("Severity", "গুরুত্ব")}</TableHead>
                  <TableHead>{t("Time", "সময়")}</TableHead>
                  <TableHead>{t("Recommended", "প্রস্তাবিত")}</TableHead>
                  <TableHead>{t("Status", "অবস্থা")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((a) => (
                  <TableRow
                    key={a.id}
                    onClick={() => setOpenId(a.id)}
                    className={cn(
                      "cursor-pointer",
                      a.category === "critical" &&
                        a.status !== "resolved" &&
                        "bg-rose-500/5 hover:bg-rose-500/10",
                    )}
                  >
                    <TableCell className="font-medium">{a.pondName}</TableCell>
                    <TableCell className="text-muted-foreground">{a.parameter}</TableCell>
                    <TableCell className="tabular-nums">
                      {a.currentValue} {a.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.thresholdLabel}</TableCell>
                    <TableCell>
                      <SeverityBadge category={a.category} t={t} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(a.detectedAt, lang)}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm">
                      {t(a.recommendedEn, a.recommendedBn)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {visible.map((a) => (
              <button
                key={a.id}
                onClick={() => setOpenId(a.id)}
                className={cn(
                  "block w-full rounded-2xl border bg-card p-4 text-left shadow-soft",
                  a.category === "critical" && a.status !== "resolved"
                    ? "border-rose-500/40 bg-rose-500/5"
                    : "border-border/70",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold">{a.pondName}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.parameter} · {a.currentValue} {a.unit}
                    </p>
                  </div>
                  <SeverityBadge category={a.category} t={t} />
                </div>
                <p className="mt-2 text-sm">{t(a.recommendedEn, a.recommendedBn)}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{timeAgo(a.detectedAt, lang)}</span>
                  <StatusBadge status={a.status} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <AlertDetailDrawer
        alert={openAlert}
        onClose={() => setOpenId(null)}
        onAck={(id) => {
          update(id, { status: "acknowledged" });
          toast.success(t("Alert acknowledged", "অ্যালার্ট স্বীকৃত"));
        }}
        onResolve={(id) => {
          update(id, { status: "resolved" });
          toast.success(t("Alert resolved", "অ্যালার্ট সমাধান হয়েছে"));
          setOpenId(null);
        }}
        onNote={() => toast.success(t("Note added", "নোট যোগ হয়েছে"))}
        onContact={() => toast.success(t("Support contacted", "সাপোর্টের সাথে যোগাযোগ করা হয়েছে"))}
        t={t}
        lang={lang}
      />
    </div>
  );
}

// ----- Severity badge -----
function SeverityBadge({
  category,
  t,
}: {
  category: AlertCategory;
  t: (en: string, bn: string) => string;
}) {
  const map = {
    critical: {
      cls: "bg-rose-500/10 text-rose-700 border-rose-500/30",
      Icon: AlertTriangle,
      label: t("Critical", "গুরুতর"),
    },
    warning: {
      cls: "bg-amber-500/10 text-amber-700 border-amber-500/30",
      Icon: AlertCircle,
      label: t("Warning", "সতর্ক"),
    },
    device: {
      cls: "bg-sky-500/10 text-sky-700 border-sky-500/30",
      Icon: Cpu,
      label: t("Device", "ডিভাইস"),
    },
    calibration: {
      cls: "bg-violet-500/10 text-violet-700 border-violet-500/30",
      Icon: FlaskConical,
      label: t("Calibration", "ক্যালিব্রেশন"),
    },
  }[category];
  const Icon = map.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        map.cls,
      )}
    >
      <Icon className="h-3 w-3" /> {map.label}
    </span>
  );
}

// ----- Drawer -----
function AlertDetailDrawer({
  alert,
  onClose,
  onAck,
  onResolve,
  onNote,
  onContact,
  t,
  lang,
}: {
  alert: Alert | null;
  onClose: () => void;
  onAck: (id: string) => void;
  onResolve: (id: string) => void;
  onNote: (id: string, text: string) => void;
  onContact: (id: string) => void;
  t: (en: string, bn: string) => string;
  lang: "en" | "bn";
}) {
  const [note, setNote] = useState("");
  if (!alert) return null;

  const duration = (() => {
    const mins = Math.floor((Date.now() - new Date(alert.detectedAt).getTime()) / 60_000);
    if (mins < 60) return `${mins} ${t("min", "মি")}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${t("h", "ঘ")} ${mins % 60}${t("m", "মি")}`;
    return `${Math.floor(hrs / 24)} ${t("days", "দিন")}`;
  })();

  // Mock history chart
  const history = Array.from({ length: 24 }, (_, i) => {
    const baseDo = parseFloat(alert.currentValue) || 5;
    const v = baseDo + Math.sin(i / 3) * 0.8 + (i / 24) * (alert.status === "resolved" ? 2 : -1);
    return { t: `${i}:00`, v: +v.toFixed(2) };
  });

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="font-display text-xl">{alert.parameter}</SheetTitle>
              <SheetDescription>
                {alert.pondName} · {alert.device}
              </SheetDescription>
            </div>
            <SeverityBadge category={alert.category} t={t} />
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Bangla/English message */}
          <div
            className={cn(
              "rounded-xl border p-3 text-sm",
              alert.category === "critical"
                ? "border-rose-500/40 bg-rose-500/5"
                : "border-border bg-muted/30",
            )}
          >
            <p className="font-medium">{lang === "bn" ? alert.messageBn : alert.messageEn}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "bn" ? alert.messageEn : alert.messageBn}
            </p>
          </div>

          {/* Key facts */}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Fact
              label={t("Current value", "বর্তমান মান")}
              value={`${alert.currentValue} ${alert.unit}`}
            />
            <Fact label={t("Safe range", "নিরাপদ পরিসর")} value={alert.safeRange} />
            <Fact
              label={t("Time detected", "সনাক্তের সময়")}
              value={new Date(alert.detectedAt).toLocaleString()}
            />
            <Fact label={t("Duration", "সময়কাল")} value={duration} />
            <Fact label={t("Device", "ডিভাইস")} value={alert.device} />
            <Fact label={t("Status", "অবস্থা")} value={<StatusBadge status={alert.status} />} />
          </dl>

          {/* Recommended action */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {t("Recommended action", "প্রস্তাবিত পদক্ষেপ")}
            </p>
            <p className="mt-1 text-sm font-medium">
              {t(alert.recommendedEn, alert.recommendedBn)}
            </p>
          </div>

          {/* History chart */}
          <div>
            <p className="mb-2 text-sm font-semibold">
              {t("Alert history (24h)", "অ্যালার্ট ইতিহাস (২৪ ঘ)")}
            </p>
            <div className="h-40 w-full rounded-xl border border-border/70 bg-card p-2">
              <ResponsiveContainer>
                <LineChart data={history}>
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={28} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <ReferenceArea y1={5} y2={9} fill="hsl(var(--primary))" fillOpacity={0.08} />
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Delivery status */}
          <div>
            <p className="mb-2 text-sm font-semibold">{t("Delivery status", "ডেলিভারির অবস্থা")}</p>
            <div className="grid grid-cols-3 gap-2">
              <DeliveryPill
                icon={<Smartphone className="h-3.5 w-3.5" />}
                label={t("SMS", "এসএমএস")}
                state={alert.delivery.sms}
                t={t}
              />
              <DeliveryPill
                icon={<Send className="h-3.5 w-3.5" />}
                label={t("Push", "পুশ")}
                state={alert.delivery.push}
                t={t}
              />
              <DeliveryPill
                icon={<Mail className="h-3.5 w-3.5" />}
                label={t("Email", "ইমেইল")}
                state={alert.delivery.email}
                t={t}
              />
            </div>
          </div>

          {/* Add note */}
          <div>
            <Label className="mb-1.5 block text-sm">{t("Add note", "নোট যোগ করুন")}</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("e.g. Aerator on at 14:30.", "যেমন: এরেটর ১৪:৩০ এ চালু।")}
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                if (!note.trim()) {
                  toast.error(t("Note cannot be empty", "নোট খালি হতে পারে না"));
                  return;
                }
                onNote(alert.id, note);
                setNote("");
              }}
            >
              <StickyNote className="mr-1.5 h-3.5 w-3.5" /> {t("Save note", "সংরক্ষণ")}
            </Button>
          </div>

          <div className="flex justify-between">
            <Link
              to="/app/ponds/$pondId"
              params={{ pondId: alert.pondId }}
              className="text-xs text-primary hover:underline"
            >
              {t("Open pond detail →", "পুকুর বিস্তারিত দেখুন →")}
            </Link>
            <button
              onClick={() => onContact(alert.id)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <MessageCircle className="h-3 w-3" /> {t("Contact support", "সাপোর্টে যোগাযোগ")}
            </button>
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2">
          {alert.status === "open" && (
            <Button variant="outline" onClick={() => onAck(alert.id)}>
              <Bell className="mr-1.5 h-3.5 w-3.5" /> {t("Acknowledge", "স্বীকার করুন")}
            </Button>
          )}
          {alert.status !== "resolved" && (
            <Button onClick={() => onResolve(alert.id)}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />{" "}
              {t("Mark resolved", "সমাধান হিসেবে চিহ্নিত")}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function DeliveryPill({
  icon,
  label,
  state,
  t,
}: {
  icon: React.ReactNode;
  label: string;
  state: "sent" | "pending" | "failed";
  t: (en: string, bn: string) => string;
}) {
  const cls =
    state === "sent"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
      : state === "pending"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
        : "border-rose-500/40 bg-rose-500/10 text-rose-700";
  const stateLabel =
    state === "sent"
      ? t("Sent", "পাঠানো")
      : state === "pending"
        ? t("Pending", "অপেক্ষমাণ")
        : t("Failed", "ব্যর্থ");
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-2", cls)}>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
        {icon}
        {label}
      </span>
      <span className="text-[10px] uppercase tracking-wider">{stateLabel}</span>
    </div>
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
