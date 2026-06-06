import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cpu,
  FlaskConical,
  MessageCircle,
  Search,
  StickyNote,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
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
import { PageHeader, MetricTile, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { readFarmSelection, writeFarmSelection } from "@/lib/farm-selection";
import {
  insforge,
  type Alert as DbAlertBase,
  type Device,
  type Farm,
  type Pond,
  type Reading,
} from "@/lib/insforge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/alerts")({
  head: () => ({ meta: [{ title: "Alerts - Acqua Lence" }] }),
  component: AlertsPage,
});

type AlertCategory = "critical" | "warning" | "device" | "calibration";
type AlertStatus = "open" | "acknowledged" | "resolved";
type AlertParamKey =
  | "do"
  | "ph"
  | "temp"
  | "amm"
  | "turb"
  | "salinity"
  | "level"
  | "device"
  | "calibration";

type DbAlert = DbAlertBase & {
  acknowledged_by?: string | null;
  resolved_by?: string | null;
};

type AlertNote = {
  id: string;
  alert_id: string;
  author_id: string | null;
  kind: "note" | "assignment" | "escalation" | "resolution" | "status_change";
  body: string | null;
  created_at: string;
  visibility?: "public" | "internal";
};

type AlertView = {
  id: string;
  category: AlertCategory;
  status: AlertStatus;
  pondId: string | null;
  farmId: string | null;
  deviceId: string | null;
  pondName: string;
  farmName: string;
  parameter: string;
  paramKey: AlertParamKey;
  currentValue: string;
  unit: string;
  safeRange: string;
  thresholdLabel: string;
  recommendedEn: string;
  recommendedBn: string;
  messageEn: string;
  messageBn: string;
  detectedAt: string;
  device: string;
};

type AlertHistoryPoint = {
  t: string;
  v: number;
};

type AlertsQueryData = {
  alerts: DbAlert[];
  farms: Farm[];
  ponds: Pond[];
  devices: Device[];
  readings: Reading[];
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

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "Unknown";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function normalizeParam(input: string | null | undefined) {
  return (input ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function paramKeyFor(alert: DbAlert): AlertParamKey {
  const text = `${normalizeParam(alert.parameter)}_${normalizeParam(alert.alert_type)}`;
  if (text.includes("calibration")) return "calibration";
  if (
    text.includes("device") ||
    text.includes("offline") ||
    text.includes("battery") ||
    text.includes("signal")
  ) {
    return "device";
  }
  if (text.includes("oxygen") || text.includes("do_mg_l") || text.includes("_do_")) return "do";
  if (text.includes("ph")) return "ph";
  if (text.includes("temp")) return "temp";
  if (text.includes("ammonia") || text.includes("nh3")) return "amm";
  if (text.includes("turb")) return "turb";
  if (text.includes("salinity")) return "salinity";
  if (text.includes("level")) return "level";
  return "do";
}

function unitForParam(paramKey: AlertParamKey) {
  const units: Record<AlertParamKey, string> = {
    do: "mg/L",
    ph: "",
    temp: "deg C",
    amm: "mg/L",
    turb: "NTU",
    salinity: "ppt",
    level: "cm",
    device: "",
    calibration: "",
  };
  return units[paramKey];
}

function humanizeParameter(alert: DbAlert, paramKey: AlertParamKey) {
  if (alert.parameter?.trim()) return alert.parameter.trim();
  const labels: Record<AlertParamKey, string> = {
    do: "Dissolved oxygen",
    ph: "pH",
    temp: "Temperature",
    amm: "Ammonia",
    turb: "Turbidity",
    salinity: "Salinity",
    level: "Water level",
    device: "Device status",
    calibration: "Sensor calibration",
  };
  return labels[paramKey] ?? alert.alert_type;
}

function categoryFor(alert: DbAlert, paramKey: AlertParamKey): AlertCategory {
  if (paramKey === "device") return "device";
  if (paramKey === "calibration") return "calibration";
  if (alert.severity === "critical") return "critical";
  return "warning";
}

function readingValue(reading: Reading, paramKey: AlertParamKey) {
  const values: Partial<Record<AlertParamKey, number | null>> = {
    do: reading.do_mg_l,
    ph: reading.ph,
    temp: reading.temp_c,
    amm: reading.ammonia_mg_l,
    turb: reading.turbidity_ntu,
    salinity: reading.salinity_ppt,
    level: reading.water_level_cm,
  };
  return values[paramKey] ?? null;
}

function sortRank(category: AlertCategory) {
  if (category === "critical") return 0;
  if (category === "warning") return 1;
  if (category === "device") return 2;
  return 3;
}

function toAlertView(
  alert: DbAlert,
  pondsById: Map<string, Pond>,
  farmsById: Map<string, Farm>,
  devicesById: Map<string, Device>,
): AlertView {
  const pond = alert.pond_id ? pondsById.get(alert.pond_id) : undefined;
  const farm = pond?.farm_id ? farmsById.get(pond.farm_id) : undefined;
  const device = alert.device_id ? devicesById.get(alert.device_id) : undefined;
  const paramKey = paramKeyFor(alert);
  const unit = unitForParam(paramKey);
  const parameter = humanizeParameter(alert, paramKey);
  const currentValue =
    alert.value == null
      ? paramKey === "device" || paramKey === "calibration"
        ? "Needs check"
        : "Unknown"
      : formatNumber(alert.value);
  const thresholdValue = alert.threshold == null ? null : formatNumber(alert.threshold);
  const pondName = pond?.name ?? "Unassigned pond";
  const message = alert.message?.trim() || `${pondName}: ${parameter} needs attention.`;
  const recommended =
    alert.recommended_action?.trim() ||
    "Review the alert, inspect the pond, and update the status after action is taken.";

  return {
    id: alert.id,
    category: categoryFor(alert, paramKey),
    status: alert.status,
    pondId: alert.pond_id,
    farmId: pond?.farm_id ?? null,
    deviceId: alert.device_id,
    pondName,
    farmName: farm?.name ?? "Farm not linked",
    parameter,
    paramKey,
    currentValue,
    unit,
    safeRange: thresholdValue
      ? `Configured threshold: ${thresholdValue} ${unit}`.trim()
      : "Configured in backend",
    thresholdLabel: thresholdValue ? `${thresholdValue} ${unit}`.trim() : "Configured threshold",
    recommendedEn: recommended,
    recommendedBn: recommended,
    messageEn: message,
    messageBn: message,
    detectedAt: alert.detected_at,
    device: device?.name || device?.serial || "No device linked",
  };
}

function historyForAlert(alert: AlertView | null, readings: Reading[]): AlertHistoryPoint[] {
  if (!alert?.pondId) return [];
  if (alert.paramKey === "device" || alert.paramKey === "calibration") return [];

  return readings
    .filter((reading) => reading.pond_id === alert.pondId)
    .map((reading) => {
      const value = readingValue(reading, alert.paramKey);
      if (value == null || !Number.isFinite(value)) return null;
      return {
        t: new Date(reading.recorded_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        v: Number(value.toFixed(2)),
      };
    })
    .filter((point): point is AlertHistoryPoint => point !== null)
    .slice(-80);
}

function useAlertsData(activeFarmId: string) {
  return useQuery({
    queryKey: ["app-alerts", "live-data", activeFarmId],
    refetchInterval: 30_000,
    queryFn: async (): Promise<AlertsQueryData> => {
      const [alertsRes, farmsRes, pondsRes, devicesRes, readingsRes] = await Promise.all([
        insforge.database
          .from("alerts")
          .select("*")
          .order("detected_at", { ascending: false })
          .limit(500),
        insforge.database.from("farms").select("*").order("name"),
        insforge.database.from("ponds").select("*").order("name"),
        insforge.database.from("devices").select("*"),
        insforge.database.rpc("get_recent_visible_readings", {
          _farm_id: activeFarmId === "all" ? null : activeFarmId,
          _lookback_hours: 24,
          _per_pond_limit: 40,
        }),
      ]);

      assertDbOk(alertsRes, "Failed to load alerts");
      assertDbOk(farmsRes, "Failed to load farms");
      assertDbOk(pondsRes, "Failed to load ponds");
      assertDbOk(devicesRes, "Failed to load devices");
      assertDbOk(readingsRes, "Failed to load readings");

      return {
        alerts: (alertsRes.data ?? []) as DbAlert[],
        farms: (farmsRes.data ?? []) as Farm[],
        ponds: (pondsRes.data ?? []) as Pond[],
        devices: (devicesRes.data ?? []) as Device[],
        readings: (readingsRes.data ?? []) as Reading[],
      };
    },
  });
}

function AlertsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const t = (en: string, bn: string) => (lang === "bn" ? bn : en);

  const [tab, setTab] = useState<"all" | AlertCategory | "resolved">("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeFarmId, setActiveFarmId] = useState<string>(() => {
    return readFarmSelection();
  });
  const alertsQ = useAlertsData(activeFarmId);
  const data = alertsQ.data;

  const farmsById = useMemo(
    () => new Map((data?.farms ?? []).map((farm) => [farm.id, farm])),
    [data],
  );
  const pondsById = useMemo(
    () => new Map((data?.ponds ?? []).map((pond) => [pond.id, pond])),
    [data],
  );
  const devicesById = useMemo(
    () => new Map((data?.devices ?? []).map((device) => [device.id, device])),
    [data],
  );

  useEffect(() => {
    if (!data?.farms.length || activeFarmId === "all") return;
    if (data.farms.some((farm) => farm.id === activeFarmId)) return;
    setActiveFarmId(writeFarmSelection("all"));
  }, [activeFarmId, data?.farms]);

  const alerts = useMemo(() => {
    if (!data) return [];
    return data.alerts.map((alert) => toAlertView(alert, pondsById, farmsById, devicesById));
  }, [data, devicesById, farmsById, pondsById]);

  const filteredAlertsByFarm = useMemo(() => {
    return alerts.filter((alert) => activeFarmId === "all" || alert.farmId === activeFarmId);
  }, [alerts, activeFarmId]);

  const counts = useMemo(
    () => ({
      critical: filteredAlertsByFarm.filter(
        (alert) => alert.category === "critical" && alert.status !== "resolved",
      ).length,
      warning: filteredAlertsByFarm.filter(
        (alert) => alert.category === "warning" && alert.status !== "resolved",
      ).length,
      device: filteredAlertsByFarm.filter(
        (alert) => alert.category === "device" && alert.status !== "resolved",
      ).length,
      calibration: filteredAlertsByFarm.filter(
        (alert) => alert.category === "calibration" && alert.status !== "resolved",
      ).length,
      resolved: filteredAlertsByFarm.filter((alert) => alert.status === "resolved").length,
    }),
    [filteredAlertsByFarm],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return filteredAlertsByFarm
      .filter((alert) => {
        if (tab === "all") return true;
        if (tab === "resolved") return alert.status === "resolved";
        return alert.category === tab && alert.status !== "resolved";
      })
      .filter((alert) => {
        if (!q) return true;
        return [
          alert.pondName,
          alert.farmName,
          alert.parameter,
          alert.messageEn,
          alert.messageBn,
          alert.device,
        ].some((value) => value.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (a.status === "resolved" && b.status !== "resolved") return 1;
        if (a.status !== "resolved" && b.status === "resolved") return -1;
        const categoryRank = sortRank(a.category) - sortRank(b.category);
        if (categoryRank) return categoryRank;
        return +new Date(b.detectedAt) - +new Date(a.detectedAt);
      });
  }, [filteredAlertsByFarm, query, tab]);

  const openAlert = alerts.find((alert) => alert.id === openId) ?? null;
  const selectedHistory = useMemo(
    () => historyForAlert(openAlert, data?.readings ?? []),
    [data?.readings, openAlert],
  );

  const notesQ = useQuery({
    queryKey: ["app-alerts", "notes", openId],
    enabled: Boolean(openId),
    queryFn: async () => {
      const result = await insforge.database
        .from("alert_notes")
        .select("*")
        .eq("alert_id", openId)
        .order("created_at", { ascending: false });
      assertDbOk(result, "Failed to load alert notes");
      return (result.data ?? []) as AlertNote[];
    },
  });

  const acknowledgeMut = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Please sign in again before updating alerts.");
      const result = await insforge.database.rpc("acknowledge_alert", { _alert_id: id });
      assertDbOk(result, "Failed to acknowledge alert");
    },
    onSuccess: async () => {
      toast.success(t("Alert acknowledged", "Alert acknowledged"));
      await queryClient.invalidateQueries({ queryKey: ["app-alerts"] });
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Alert update failed")),
  });

  const resolveMut = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Please sign in again before updating alerts.");
      const result = await insforge.database.rpc("resolve_alert", { _alert_id: id });
      assertDbOk(result, "Failed to resolve alert");
    },
    onSuccess: async () => {
      toast.success(t("Alert resolved", "Alert resolved"));
      setOpenId(null);
      await queryClient.invalidateQueries({ queryKey: ["app-alerts"] });
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Alert update failed")),
  });

  const noteMut = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      if (!user?.id) throw new Error("Please sign in again before saving a note.");
      const result = await insforge.database.from("alert_notes").insert([
        {
          alert_id: id,
          author_id: user.id,
          kind: "note",
          body: text.trim(),
          visibility: "public",
        },
      ]);
      assertDbOk(result, "Failed to save note");
    },
    onSuccess: async () => {
      toast.success(t("Note saved", "Note saved"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["app-alerts", "notes", openId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-alerts"] }),
      ]);
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Note save failed")),
  });

  const contactSupportMut = useMutation({
    mutationFn: async (alert: AlertView) => {
      if (!user?.id) throw new Error("Please sign in again before contacting support.");
      const description = [
        `Alert: ${alert.parameter}`,
        `Pond: ${alert.pondName}`,
        `Current value: ${alert.currentValue} ${alert.unit}`.trim(),
        `Message: ${alert.messageEn}`,
      ].join("\n");
      const result = await insforge.database
        .from("support_tickets")
        .insert([
          {
            created_by: user.id,
            farm_id: alert.farmId,
            pond_id: alert.pondId,
            device_id: alert.deviceId,
            issue_type: "Alert follow-up",
            priority: alert.category === "critical" ? "critical" : "normal",
            description,
          },
        ])
        .select("id");
      assertDbOk(result, "Failed to create support ticket");
      const ticket = ((result.data ?? []) as { id: string }[])[0];
      if (!ticket?.id) throw new Error("Support ticket was created without a returned id.");

      const activity = await insforge.database.from("support_ticket_activities").insert([
        {
          ticket_id: ticket.id,
          actor_id: user.id,
          kind: "created",
          body: description,
          metadata: { source: "app_alerts", alert_id: alert.id },
        },
      ]);

      return {
        activityWarning: activity.error
          ? dbErrorMessage(activity.error, "Ticket timeline was not recorded.")
          : null,
      };
    },
    onSuccess: (data) => {
      toast.success(t("Support ticket created", "Support ticket created"));
      if (data.activityWarning) toast.warning(data.activityWarning);
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Could not contact support")),
  });

  const actionsBusy =
    acknowledgeMut.isPending ||
    resolveMut.isPending ||
    noteMut.isPending ||
    contactSupportMut.isPending;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("Alerts Center", "Alerts Center")}
        subtitle={t(
          "Live alerts from your ponds, devices, and sensor thresholds.",
          "Live alerts from your ponds, devices, and sensor thresholds.",
        )}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricTile
          label={t("Critical", "Critical")}
          value={counts.critical}
          accent="text-rose-600"
        />
        <MetricTile
          label={t("Warning", "Warning")}
          value={counts.warning}
          accent="text-amber-600"
        />
        <MetricTile label={t("Device", "Device")} value={counts.device} accent="text-sky-600" />
        <MetricTile
          label={t("Calibration", "Calibration")}
          value={counts.calibration}
          accent="text-violet-600"
        />
        <MetricTile
          label={t("Resolved", "Resolved")}
          value={counts.resolved}
          accent="text-emerald-600"
        />
      </div>

      {counts.critical > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/5 p-4 shadow-soft">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-500 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
              {t("Critical alert", "Critical alert")}
            </p>
            <p className="mt-0.5 font-display text-base font-semibold">
              {filteredAlertsByFarm.find(
                (alert) => alert.category === "critical" && alert.status !== "resolved",
              )?.messageEn ??
                t(
                  "A critical pond alert needs attention.",
                  "A critical pond alert needs attention.",
                )}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(
                "Open the alert details before marking it resolved.",
                "Open the alert details before marking it resolved.",
              )}
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all">
              {t("All", "All")} ({filteredAlertsByFarm.length})
            </TabsTrigger>
            <TabsTrigger value="critical">
              {t("Critical", "Critical")} ({counts.critical})
            </TabsTrigger>
            <TabsTrigger value="warning">
              {t("Warning", "Warning")} ({counts.warning})
            </TabsTrigger>
            <TabsTrigger value="device">
              {t("Device", "Device")} ({counts.device})
            </TabsTrigger>
            <TabsTrigger value="calibration">
              {t("Calibration", "Calibration")} ({counts.calibration})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              {t("Resolved", "Resolved")} ({counts.resolved})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search alerts...", "Search alerts...")}
            className="pl-9"
          />
        </div>
      </div>

      {alertsQ.isLoading ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title={t("Loading alerts", "Loading alerts")}
          description={t(
            "Checking your latest pond and device alerts.",
            "Checking your latest pond and device alerts.",
          )}
        />
      ) : alertsQ.isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title={t("Alerts did not load", "Alerts did not load")}
          description={dbErrorMessage(alertsQ.error, "Please refresh and try again.")}
          action={
            <Button variant="outline" onClick={() => alertsQ.refetch()}>
              {t("Try again", "Try again")}
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" />}
          title={t("No alerts here", "No alerts here")}
          description={t("All clear in this category.", "All clear in this category.")}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Pond", "Pond")}</TableHead>
                  <TableHead>{t("Parameter", "Parameter")}</TableHead>
                  <TableHead>{t("Current", "Current")}</TableHead>
                  <TableHead>{t("Threshold", "Threshold")}</TableHead>
                  <TableHead>{t("Severity", "Severity")}</TableHead>
                  <TableHead>{t("Time", "Time")}</TableHead>
                  <TableHead>{t("Recommended", "Recommended")}</TableHead>
                  <TableHead>{t("Status", "Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((alert) => (
                  <TableRow
                    key={alert.id}
                    onClick={() => setOpenId(alert.id)}
                    className={cn(
                      "cursor-pointer",
                      alert.category === "critical" &&
                        alert.status !== "resolved" &&
                        "bg-rose-500/5 hover:bg-rose-500/10",
                    )}
                  >
                    <TableCell className="font-medium">{alert.pondName}</TableCell>
                    <TableCell className="text-muted-foreground">{alert.parameter}</TableCell>
                    <TableCell className="tabular-nums">
                      {alert.currentValue} {alert.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{alert.thresholdLabel}</TableCell>
                    <TableCell>
                      <SeverityBadge category={alert.category} t={t} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(alert.detectedAt, lang)}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm">
                      {t(alert.recommendedEn, alert.recommendedBn)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={alert.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {visible.map((alert) => (
              <button
                key={alert.id}
                onClick={() => setOpenId(alert.id)}
                className={cn(
                  "block w-full rounded-2xl border bg-card p-4 text-left shadow-soft",
                  alert.category === "critical" && alert.status !== "resolved"
                    ? "border-rose-500/40 bg-rose-500/5"
                    : "border-border/70",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold">
                      {alert.pondName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alert.parameter} - {alert.currentValue} {alert.unit}
                    </p>
                  </div>
                  <SeverityBadge category={alert.category} t={t} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm">
                  {t(alert.recommendedEn, alert.recommendedBn)}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{timeAgo(alert.detectedAt, lang)}</span>
                  <StatusBadge status={alert.status} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <AlertDetailDrawer
        alert={openAlert}
        notes={notesQ.data ?? []}
        notesLoading={notesQ.isLoading}
        history={selectedHistory}
        actionsBusy={actionsBusy}
        onClose={() => setOpenId(null)}
        onAck={(id) => acknowledgeMut.mutate(id)}
        onResolve={(id) => resolveMut.mutate(id)}
        onNote={(id, text) => noteMut.mutate({ id, text })}
        onContact={(alert) => contactSupportMut.mutate(alert)}
        t={t}
        lang={lang}
      />
    </div>
  );
}

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
      label: t("Critical", "Critical"),
    },
    warning: {
      cls: "bg-amber-500/10 text-amber-700 border-amber-500/30",
      Icon: AlertCircle,
      label: t("Warning", "Warning"),
    },
    device: {
      cls: "bg-sky-500/10 text-sky-700 border-sky-500/30",
      Icon: Cpu,
      label: t("Device", "Device"),
    },
    calibration: {
      cls: "bg-violet-500/10 text-violet-700 border-violet-500/30",
      Icon: FlaskConical,
      label: t("Calibration", "Calibration"),
    },
  }[category];
  const Icon = map.Icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        map.cls,
      )}
    >
      <Icon className="h-3 w-3" /> {map.label}
    </span>
  );
}

function AlertDetailDrawer({
  alert,
  notes,
  notesLoading,
  history,
  actionsBusy,
  onClose,
  onAck,
  onResolve,
  onNote,
  onContact,
  t,
  lang,
}: {
  alert: AlertView | null;
  notes: AlertNote[];
  notesLoading: boolean;
  history: AlertHistoryPoint[];
  actionsBusy: boolean;
  onClose: () => void;
  onAck: (id: string) => void;
  onResolve: (id: string) => void;
  onNote: (id: string, text: string) => void;
  onContact: (alert: AlertView) => void;
  t: (en: string, bn: string) => string;
  lang: "en" | "bn";
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!alert) setNote("");
  }, [alert]);

  if (!alert) return null;

  const duration = (() => {
    const mins = Math.floor((Date.now() - new Date(alert.detectedAt).getTime()) / 60_000);
    if (mins < 60) return `${mins} ${t("min", "min")}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${t("h", "h")} ${mins % 60}${t("m", "m")}`;
    return `${Math.floor(hrs / 24)} ${t("days", "days")}`;
  })();

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="font-display text-xl">{alert.parameter}</SheetTitle>
              <SheetDescription>
                {alert.pondName} - {alert.device}
              </SheetDescription>
            </div>
            <SeverityBadge category={alert.category} t={t} />
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-5">
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

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Fact
              label={t("Current value", "Current value")}
              value={`${alert.currentValue} ${alert.unit}`.trim()}
            />
            <Fact label={t("Safe range", "Safe range")} value={alert.safeRange} />
            <Fact
              label={t("Time detected", "Time detected")}
              value={new Date(alert.detectedAt).toLocaleString()}
            />
            <Fact label={t("Duration", "Duration")} value={duration} />
            <Fact label={t("Device", "Device")} value={alert.device} />
            <Fact label={t("Status", "Status")} value={<StatusBadge status={alert.status} />} />
          </dl>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {t("Recommended action", "Recommended action")}
            </p>
            <p className="mt-1 text-sm font-medium">
              {t(alert.recommendedEn, alert.recommendedBn)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">{t("Recent readings", "Recent readings")}</p>
            <div className="h-40 w-full rounded-xl border border-border/70 bg-card p-2">
              {history.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={history}>
                    <XAxis
                      dataKey="t"
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
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
              ) : (
                <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
                  {t(
                    "No recent readings are available for this alert parameter.",
                    "No recent readings are available for this alert parameter.",
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <p className="text-sm font-semibold">{t("Delivery status", "Delivery status")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "Notification delivery tracking is not connected for this alert yet.",
                "Notification delivery tracking is not connected for this alert yet.",
              )}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label className="text-sm">{t("Notes", "Notes")}</Label>
              {notesLoading && (
                <span className="text-xs text-muted-foreground">{t("Loading", "Loading")}</span>
              )}
            </div>
            {notes.length > 0 && (
              <div className="mb-3 max-h-36 space-y-2 overflow-auto rounded-xl border border-border/70 bg-card p-3">
                {notes.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-border/50 pb-2 last:border-0 last:pb-0"
                  >
                    <p className="text-sm">{item.body || t("No note body", "No note body")}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t(
                "e.g. Aerator turned on at 14:30.",
                "e.g. Aerator turned on at 14:30.",
              )}
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={actionsBusy}
              onClick={() => {
                if (!note.trim()) {
                  toast.error(t("Note cannot be empty", "Note cannot be empty"));
                  return;
                }
                onNote(alert.id, note);
                setNote("");
              }}
            >
              <StickyNote className="mr-1.5 h-3.5 w-3.5" /> {t("Save note", "Save note")}
            </Button>
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            {alert.pondId ? (
              <Link
                to="/app/ponds/$pondId"
                params={{ pondId: alert.pondId }}
                className="text-xs text-primary hover:underline"
              >
                {t("Open pond detail", "Open pond detail")}
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("No pond is linked to this alert", "No pond is linked to this alert")}
              </span>
            )}
            <button
              type="button"
              disabled={actionsBusy}
              onClick={() => onContact(alert)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              <MessageCircle className="h-3 w-3" /> {t("Contact support", "Contact support")}
            </button>
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2">
          {alert.status === "open" && (
            <Button variant="outline" disabled={actionsBusy} onClick={() => onAck(alert.id)}>
              <Bell className="mr-1.5 h-3.5 w-3.5" /> {t("Acknowledge", "Acknowledge")}
            </Button>
          )}
          {alert.status !== "resolved" && (
            <Button disabled={actionsBusy} onClick={() => onResolve(alert.id)}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {t("Mark resolved", "Mark resolved")}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function timeAgo(iso: string, lang: "en" | "bn") {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return lang === "bn" ? "just now" : "just now";
  if (mins < 60) return lang === "bn" ? `${mins}m ago` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return lang === "bn" ? `${hrs}h ago` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return lang === "bn" ? `${days}d ago` : `${days}d ago`;
}
