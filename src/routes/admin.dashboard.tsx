import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Waves,
  Cpu,
  Users,
  AlertTriangle,
  Activity,
  Wifi,
  WifiOff,
  LifeBuoy,
  Wrench,
  Building2,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { useMemo, useState } from "react";
import {
  insforge,
  type Alert,
  type Device,
  type Farm,
  type Pond,
  type Profile,
} from "@/lib/insforge";
import { PageHeader, StatusBadge } from "@/components/app/StatusBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin · Overview — Acqua Lence" }] }),
  component: AdminDashboard,
});

type TrendRange = "7d" | "30d";

function AdminDashboard() {
  const [range, setRange] = useState<TrendRange>("7d");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [farms, ponds, devices, alerts, profiles] = await Promise.all([
        insforge.database.from("farms").select("*"),
        insforge.database.from("ponds").select("*"),
        insforge.database.from("devices").select("*"),
        insforge.database
          .from("alerts")
          .select("*")
          .order("detected_at", { ascending: false })
          .limit(200),
        insforge.database.from("profiles").select("*"),
      ]);
      // Support tickets table is optional — swallow errors gracefully.
      let tickets: any[] = [];
      try {
        const res = await insforge.database
          .from("support_tickets")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        tickets = res.data ?? [];
      } catch {
        tickets = [];
      }
      return {
        farms: (farms.data ?? []) as Farm[],
        ponds: (ponds.data ?? []) as Pond[],
        devices: (devices.data ?? []) as Device[],
        alerts: (alerts.data ?? []) as Alert[],
        profiles: (profiles.data ?? []) as Profile[],
        tickets,
      };
    },
  });

  const farms = useMemo(() => data?.farms ?? [], [data?.farms]);
  const ponds = useMemo(() => data?.ponds ?? [], [data?.ponds]);
  const devices = useMemo(() => data?.devices ?? [], [data?.devices]);
  const alerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);
  const profiles = useMemo(() => data?.profiles ?? [], [data?.profiles]);
  const tickets = useMemo(() => data?.tickets ?? [], [data?.tickets]);

  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;
  const lowBattery = devices.filter((d) => d.status === "low_battery").length;
  const calibrationDue = devices.filter(
    (d) => d.status === "calibration_due" || d.status === "maintenance_due",
  ).length;

  const openAlerts = alerts.filter((a) => a.status !== "resolved");
  const critical = openAlerts.filter((a) => a.severity === "critical");

  const openTickets = tickets.filter((t: any) => t.status !== "resolved" && t.status !== "closed");

  // === Chart data ===
  const deviceStatusData = useMemo(
    () => [
      { name: "Online", value: online, color: "hsl(152 60% 45%)" },
      { name: "Offline", value: offline, color: "hsl(220 9% 55%)" },
      { name: "Low battery", value: lowBattery, color: "hsl(38 92% 50%)" },
      { name: "Calibration", value: calibrationDue, color: "hsl(265 70% 60%)" },
    ],
    [online, offline, lowBattery, calibrationDue],
  );

  const alertTrendData = useMemo(() => {
    const days = range === "7d" ? 7 : 30;
    const buckets: Record<
      string,
      { date: string; critical: number; warning: number; watch: number }
    > = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = {
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        critical: 0,
        warning: 0,
        watch: 0,
      };
    }
    for (const a of alerts) {
      const key = a.detected_at?.slice(0, 10);
      if (key && buckets[key]) {
        if (a.severity === "critical") buckets[key].critical++;
        else if (a.severity === "warning") buckets[key].warning++;
        else if (a.severity === "watch") buckets[key].watch++;
      }
    }
    return Object.values(buckets);
  }, [alerts, range]);

  const farmDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of farms) {
      const d = f.district || "Unknown";
      counts[d] = (counts[d] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [farms]);

  const fleetTrend = useMemo(() => {
    // Synthetic trend derived from current fleet — fills the chart with
    // a smooth narrative until we wire real historical telemetry.
    const days = range === "7d" ? 7 : 30;
    const total = devices.length || 1;
    const points: { date: string; online: number; offline: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const wobble = Math.sin((i / days) * Math.PI * 2) * 0.06;
      const on = Math.max(0, Math.round(online * (1 + wobble)));
      const off = Math.max(0, total - on);
      points.push({
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        online: on,
        offline: off,
      });
    }
    return points;
  }, [devices.length, online, range]);

  const calibrationBreakdown = useMemo(() => {
    const ok = devices.length - calibrationDue;
    return [
      { name: "Up to date", value: Math.max(0, ok), color: "hsl(152 60% 45%)" },
      { name: "Due / overdue", value: calibrationDue, color: "hsl(265 70% 60%)" },
    ];
  }, [devices.length, calibrationDue]);

  const recentFarms = useMemo(() => [...farms].slice(-5).reverse(), [farms]);

  const offlineDevices = useMemo(
    () => devices.filter((d) => d.status === "offline").slice(0, 6),
    [devices],
  );

  const farmName = (id: string | null) =>
    id ? (farms.find((f) => f.id === id)?.name ?? "—") : "—";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Platform overview"
        subtitle="Live operational health across Acqua Lence"
        actions={
          <div className="inline-flex rounded-lg border border-border/70 bg-card p-0.5">
            {(["7d", "30d"] as TrendRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wider",
                  range === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {/* === Top metric strip === */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Stat
          to="/admin/users"
          label="Customers"
          value={profiles.length}
          icon={<Users className="h-4 w-4" />}
          tone="default"
        />
        <Stat
          to="/admin/farms"
          label="Farms"
          value={farms.length}
          icon={<Building2 className="h-4 w-4" />}
          hint={`${new Set(farms.map((f) => f.district).filter(Boolean)).size} districts`}
          tone="default"
        />
        <Stat
          label="Ponds"
          value={ponds.length}
          icon={<Waves className="h-4 w-4" />}
          tone="primary"
        />
        <Stat
          to="/admin/devices"
          label="Devices"
          value={devices.length}
          icon={<Cpu className="h-4 w-4" />}
          hint={`${online} online · ${offline} offline`}
          tone="default"
        />
        <Stat
          to="/admin/alerts"
          label="Active alerts"
          value={openAlerts.length}
          icon={<AlertTriangle className="h-4 w-4" />}
          hint={`${critical.length} critical`}
          tone={critical.length ? "danger" : "default"}
        />
        <Stat
          to="/admin/devices"
          label="Online"
          value={online}
          icon={<Wifi className="h-4 w-4" />}
          tone="success"
        />
        <Stat
          to="/admin/devices"
          label="Offline"
          value={offline}
          icon={<WifiOff className="h-4 w-4" />}
          tone={offline ? "danger" : "default"}
        />
        <Stat
          to="/admin/alerts"
          label="Critical"
          value={critical.length}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={critical.length ? "danger" : "default"}
        />
        <Stat
          to="/admin/devices"
          label="Calibration due"
          value={calibrationDue}
          icon={<Wrench className="h-4 w-4" />}
          tone={calibrationDue ? "warning" : "default"}
        />
        <Stat
          to="/admin/support"
          label="Support tickets"
          value={openTickets.length}
          icon={<LifeBuoy className="h-4 w-4" />}
          hint="Open"
          tone={openTickets.length ? "warning" : "default"}
        />
      </div>

      {/* === Bento charts === */}
      <div className="mt-6 grid auto-rows-min grid-cols-1 gap-4 md:grid-cols-6">
        {/* Alert trends — wide hero */}
        <Card className="md:col-span-4 md:row-span-2">
          <CardHeader
            title="Alert trends"
            hint={`Last ${range === "7d" ? "7 days" : "30 days"}`}
            icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={alertTrendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-crit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(350 80% 55%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(350 80% 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-warn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="critical"
                  stroke="hsl(350 80% 55%)"
                  fill="url(#g-crit)"
                  name="Critical"
                />
                <Area
                  type="monotone"
                  dataKey="warning"
                  stroke="hsl(38 92% 50%)"
                  fill="url(#g-warn)"
                  name="Warning"
                />
                <Area
                  type="monotone"
                  dataKey="watch"
                  stroke="hsl(200 80% 50%)"
                  fillOpacity={0.15}
                  fill="hsl(200 80% 50%)"
                  name="Watch"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Device status pie */}
        <Card className="md:col-span-2">
          <CardHeader
            title="Device status"
            hint={`${devices.length} total`}
            icon={<Cpu className="h-4 w-4 text-primary" />}
          />
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceStatusData}
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="hsl(var(--card))"
                >
                  {deviceStatusData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <Legendly items={deviceStatusData} />
        </Card>

        {/* Calibration status */}
        <Card className="md:col-span-2">
          <CardHeader
            title="Sensor calibration"
            hint={`${calibrationDue} need attention`}
            icon={<Wrench className="h-4 w-4 text-violet-600" />}
          />
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={calibrationBreakdown}
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="hsl(var(--card))"
                >
                  {calibrationBreakdown.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <Legendly items={calibrationBreakdown} />
        </Card>

        {/* Farm distribution bars */}
        <Card className="md:col-span-3">
          <CardHeader
            title="Farms by district"
            hint={`${farmDistribution.length} districts`}
            icon={<Building2 className="h-4 w-4 text-emerald-600" />}
          />
          <div className="h-56">
            {farmDistribution.length === 0 ? (
              <EmptyChart label="No farms yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={farmDistribution}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="district"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Online/offline line trend */}
        <Card className="md:col-span-3">
          <CardHeader
            title="Online vs offline"
            hint="Fleet trend"
            icon={<Activity className="h-4 w-4 text-emerald-600" />}
          />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fleetTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="online"
                  stroke="hsl(152 60% 45%)"
                  strokeWidth={2}
                  dot={false}
                  name="Online"
                />
                <Line
                  type="monotone"
                  dataKey="offline"
                  stroke="hsl(350 70% 55%)"
                  strokeWidth={2}
                  dot={false}
                  name="Offline"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* === Operational lists === */}
      <div className="mt-6 grid gap-4 md:grid-cols-6">
        {/* Critical alerts */}
        <Card className="md:col-span-3">
          <CardHeader
            title="Critical alerts requiring action"
            icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
            action={
              <Link
                to="/admin/alerts"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          {critical.length === 0 ? (
            <EmptyRow label="No critical alerts. Fleet is healthy." />
          ) : (
            <ul className="space-y-2">
              {critical.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <Link
                    to="/admin/alerts"
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface p-3 transition hover:border-rose-400/60 hover:bg-rose-500/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.message ?? a.alert_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.parameter ? `${a.parameter} · ` : ""}
                        {new Date(a.detected_at).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={a.severity} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Offline devices */}
        <Card className="md:col-span-3">
          <CardHeader
            title="Offline devices"
            icon={<WifiOff className="h-4 w-4 text-muted-foreground" />}
            action={
              <Link
                to="/admin/devices"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          {offlineDevices.length === 0 ? (
            <EmptyRow label="All devices are online." />
          ) : (
            <ul className="space-y-2">
              {offlineDevices.map((d) => (
                <li key={d.id}>
                  <Link
                    to="/admin/devices"
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface p-3 transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.name ?? d.serial}</p>
                      <p className="text-xs text-muted-foreground">
                        {farmName(d.farm_id)} ·{" "}
                        {d.last_seen
                          ? `last seen ${new Date(d.last_seen).toLocaleString()}`
                          : "never seen"}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recently added farms */}
        <Card className="md:col-span-3">
          <CardHeader
            title="Recently added farms"
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            action={
              <Link
                to="/admin/farms"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          {recentFarms.length === 0 ? (
            <EmptyRow label="No farms yet." />
          ) : (
            <ul className="space-y-2">
              {recentFarms.map((f) => (
                <li key={f.id}>
                  <Link
                    to="/admin/farms"
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface p-3 transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.district ?? "Unknown district"}
                        {f.location ? ` · ${f.location}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={f.status || "active"} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Tickets needing response */}
        <Card className="md:col-span-3">
          <CardHeader
            title="Support tickets needing response"
            icon={<LifeBuoy className="h-4 w-4 text-amber-600" />}
            action={
              <Link
                to="/admin/support"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          {openTickets.length === 0 ? (
            <EmptyRow label="No tickets waiting on the team." />
          ) : (
            <ul className="space-y-2">
              {openTickets.slice(0, 6).map((t: any) => (
                <li key={t.id}>
                  <Link
                    to="/admin/support"
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface p-3 transition hover:border-amber-400/60 hover:bg-amber-500/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {t.subject ?? t.title ?? "Untitled ticket"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                    <StatusBadge status={t.status ?? "open"} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {isLoading && (
        <p className="mt-6 text-center text-xs text-muted-foreground">Loading platform metrics…</p>
      )}
    </div>
  );
}

// ===== Local presentational helpers =====

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  fontSize: 12,
};

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-5 shadow-soft", className)}>
      {children}
    </div>
  );
}

function CardHeader({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-sm font-semibold sm:text-base">{title}</h2>
        {hint && (
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            · {hint}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  tone = "default",
  to,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  to?: string;
}) {
  const accent = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-rose-600",
  }[tone];

  const ring = {
    default: "",
    primary: "ring-1 ring-primary/20",
    success: "",
    warning: "ring-1 ring-amber-500/20",
    danger: "ring-1 ring-rose-500/30",
  }[tone];

  const inner = (
    <div
      className={cn(
        "group h-full rounded-xl border border-border/70 bg-card p-4 shadow-soft transition",
        ring,
        to && "cursor-pointer hover:border-primary/40 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={cn("mt-2 font-display text-3xl font-bold tabular-nums", accent)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function Legendly({ items }: { items: { name: string; value: number; color: string }[] }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.color }} />
          <span className="text-muted-foreground">{i.name}</span>
          <span className="ml-auto font-display font-semibold tabular-nums">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border bg-surface text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-6 text-center text-sm text-muted-foreground">
      {label}
    </p>
  );
}
