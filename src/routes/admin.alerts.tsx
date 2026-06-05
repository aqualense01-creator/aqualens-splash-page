import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Activity,
  UserCog,
  CheckCircle2,
  Flame,
  StickyNote,
  Clock,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  insforge,
  type Alert,
  type AppRole,
  type Device,
  type Farm,
  type Pond,
  type Profile,
  type Reading,
} from "@/lib/insforge";
import { PageHeader, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/alerts")({
  head: () => ({ meta: [{ title: "Admin · Alerts — Acqua Lence" }] }),
  component: AdminAlerts,
});

type ExtAlert = Alert & {
  assigned_technician_id?: string | null;
  escalated_at?: string | null;
};

type AlertNote = {
  id: string;
  alert_id: string;
  author_id: string | null;
  kind: "note" | "assignment" | "escalation" | "resolution" | "status_change";
  body: string | null;
  created_at: string;
};

type UserRoleRow = { id: string; user_id: string; role: AppRole };

const SEVERITIES = ["critical", "warning", "watch", "info"] as const;

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

function duration(from: string, to?: string | null) {
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

const severityRowTone: Record<string, string> = {
  critical: "bg-rose-500/5 border-l-4 border-l-rose-500",
  warning: "bg-amber-500/5 border-l-4 border-l-amber-500",
  watch: "bg-sky-500/5 border-l-4 border-l-sky-500",
  info: "",
};

function AdminAlerts() {
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [sev, setSev] = useState<string>("all");
  const [farmFilter, setFarmFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTechId, setAssignTechId] = useState<string>("");
  const [resolveOpen, setResolveOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const alertsQ = useQuery({
    queryKey: ["admin-alerts", "list"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const r = await insforge.database
        .from("alerts")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(500);
      if (r.error) throw r.error;
      return (r.data ?? []) as ExtAlert[];
    },
  });

  const farmsQ = useQuery({
    queryKey: ["admin-alerts", "farms"],
    queryFn: async () => ((await insforge.database.from("farms").select("*")).data ?? []) as Farm[],
  });
  const pondsQ = useQuery({
    queryKey: ["admin-alerts", "ponds"],
    queryFn: async () => ((await insforge.database.from("ponds").select("*")).data ?? []) as Pond[],
  });
  const devicesQ = useQuery({
    queryKey: ["admin-alerts", "devices"],
    queryFn: async () =>
      ((await insforge.database.from("devices").select("*")).data ?? []) as Device[],
  });
  const profilesQ = useQuery({
    queryKey: ["admin-alerts", "profiles"],
    queryFn: async () =>
      ((await insforge.database.from("profiles").select("*")).data ?? []) as Profile[],
  });
  const rolesQ = useQuery({
    queryKey: ["admin-alerts", "roles"],
    queryFn: async () =>
      ((await insforge.database.from("user_roles").select("*")).data ?? []) as UserRoleRow[],
  });

  const alerts = useMemo(() => alertsQ.data ?? [], [alertsQ.data]);
  const farms = useMemo(() => farmsQ.data ?? [], [farmsQ.data]);
  const ponds = useMemo(() => pondsQ.data ?? [], [pondsQ.data]);
  const devices = useMemo(() => devicesQ.data ?? [], [devicesQ.data]);
  const profiles = useMemo(() => profilesQ.data ?? [], [profilesQ.data]);
  const roles = useMemo(() => rolesQ.data ?? [], [rolesQ.data]);

  const farmById = useMemo(() => new Map(farms.map((f) => [f.id, f])), [farms]);
  const pondById = useMemo(() => new Map(ponds.map((p) => [p.id, p])), [ponds]);
  const deviceById = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const technicians = useMemo(() => {
    const techIds = new Set(roles.filter((r) => r.role === "technician").map((r) => r.user_id));
    return profiles.filter((p) => techIds.has(p.id));
  }, [roles, profiles]);

  const districts = useMemo(
    () => Array.from(new Set(farms.map((f) => f.district).filter((d): d is string => !!d))).sort(),
    [farms],
  );

  const enriched = useMemo(
    () =>
      alerts.map((a) => {
        const pond = a.pond_id ? pondById.get(a.pond_id) : undefined;
        const farm = pond ? farmById.get(pond.farm_id) : undefined;
        const device = a.device_id ? deviceById.get(a.device_id) : undefined;
        return { alert: a, pond, farm, device };
      }),
    [alerts, pondById, farmById, deviceById],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return enriched.filter(({ alert, pond, farm, device }) => {
      if (sev !== "all" && alert.severity !== sev) return false;
      if (statusFilter !== "all" && alert.status !== statusFilter) return false;
      if (farmFilter !== "all" && farm?.id !== farmFilter) return false;
      if (districtFilter !== "all" && farm?.district !== districtFilter) return false;
      if (deviceFilter !== "all" && device?.id !== deviceFilter) return false;
      if (!ql) return true;
      return (
        (alert.message ?? "").toLowerCase().includes(ql) ||
        (alert.parameter ?? "").toLowerCase().includes(ql) ||
        (farm?.name ?? "").toLowerCase().includes(ql) ||
        (pond?.name ?? "").toLowerCase().includes(ql) ||
        (device?.name ?? device?.serial ?? "").toLowerCase().includes(ql)
      );
    });
  }, [enriched, q, sev, statusFilter, farmFilter, districtFilter, deviceFilter]);

  // Sort: critical first, then by detected_at desc
  const sorted = useMemo(() => {
    const sevOrder = { critical: 0, warning: 1, watch: 2, info: 3 } as const;
    return [...filtered].sort((a, b) => {
      const s = (sevOrder[a.alert.severity] ?? 9) - (sevOrder[b.alert.severity] ?? 9);
      if (s !== 0) return s;
      return new Date(b.alert.detected_at).getTime() - new Date(a.alert.detected_at).getTime();
    });
  }, [filtered]);

  // Summary metrics (based on all alerts, not filtered)
  const summary = useMemo(() => {
    const open = alerts.filter((a) => a.status === "open");
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    return {
      critical: open.filter((a) => a.severity === "critical").length,
      warning: open.filter((a) => a.severity === "warning").length,
      offline: devices.filter((d) => d.status === "offline").length,
      calibrationDue: devices.filter((d) => d.status === "calibration_due").length,
      resolvedToday: alerts.filter(
        (a) => a.status === "resolved" && a.resolved_at && new Date(a.resolved_at) >= startToday,
      ).length,
    };
  }, [alerts, devices]);

  // ===== Drawer data =====
  const drawerCtx =
    sorted.find((e) => e.alert.id === drawerId) ?? enriched.find((e) => e.alert.id === drawerId);
  const drawerAlert = drawerCtx?.alert ?? null;
  const drawerFarmer = drawerCtx?.farm ? profileById.get(drawerCtx.farm.owner_id) : undefined;

  const notesQ = useQuery({
    queryKey: ["admin-alerts", "notes", drawerId],
    enabled: !!drawerId,
    queryFn: async () => {
      const r = await insforge.database
        .from("alert_notes")
        .select("*")
        .eq("alert_id", drawerId!)
        .order("created_at", { ascending: false });
      return (r.data ?? []) as AlertNote[];
    },
  });

  const readingsQ = useQuery({
    queryKey: ["admin-alerts", "readings", drawerCtx?.pond?.id, drawerAlert?.parameter],
    enabled: !!drawerCtx?.pond?.id,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const r = await insforge.database
        .from("readings")
        .select("*")
        .eq("pond_id", drawerCtx!.pond!.id)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true })
        .limit(200);
      return (r.data ?? []) as Reading[];
    },
  });

  const paramKey = useMemo(() => {
    const p = drawerAlert?.parameter ?? "";
    const map: Record<string, keyof Reading> = {
      do: "do_mg_l",
      ph: "ph",
      temperature: "temp_c",
      temp: "temp_c",
      turbidity: "turbidity_ntu",
      salinity: "salinity_ppt",
      ammonia: "ammonia_mg_l",
      water_level: "water_level_cm",
    };
    return map[p] ?? null;
  }, [drawerAlert]);

  const chartData = useMemo(() => {
    if (!paramKey) return [];
    return (readingsQ.data ?? []).map((r) => ({
      t: new Date(r.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      v: r[paramKey] as number | null,
    }));
  }, [readingsQ.data, paramKey]);

  // ===== Mutations =====
  const addNote = async (alertId: string, kind: AlertNote["kind"], body: string | null) => {
    await insforge.database.from("alert_notes").insert([{ alert_id: alertId, kind, body }]);
  };

  const assignMut = useMutation({
    mutationFn: async ({ id, techId }: { id: string; techId: string }) => {
      const r = await insforge.database
        .from("alerts")
        .update({ assigned_technician_id: techId })
        .eq("id", id);
      if (r.error) throw r.error;
      const tech = profileById.get(techId);
      await addNote(id, "assignment", `Assigned to ${tech?.full_name ?? "technician"}`);
    },
    onSuccess: () => {
      toast.success("Technician assigned");
      qc.invalidateQueries({ queryKey: ["admin-alerts"] });
      setAssignOpen(false);
      setAssignTechId("");
    },
    onError: () => toast.error("Failed to assign"),
  });

  const noteMut = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      await addNote(id, "note", body);
    },
    onSuccess: () => {
      toast.success("Note added");
      setNoteDraft("");
      qc.invalidateQueries({ queryKey: ["admin-alerts", "notes"] });
    },
    onError: () => toast.error("Failed to add note"),
  });

  const resolveMut = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const r = await insforge.database
        .from("alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (r.error) throw r.error;
      await addNote(id, "resolution", body || "Marked resolved");
    },
    onSuccess: () => {
      toast.success("Alert resolved");
      qc.invalidateQueries({ queryKey: ["admin-alerts"] });
      setResolveOpen(false);
      setNoteDraft("");
    },
    onError: () => toast.error("Failed to resolve"),
  });

  const escalateMut = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const r = await insforge.database
        .from("alerts")
        .update({
          severity: "critical",
          escalated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (r.error) throw r.error;
      await addNote(id, "escalation", body || "Escalated to critical");
    },
    onSuccess: () => {
      toast.success("Alert escalated");
      qc.invalidateQueries({ queryKey: ["admin-alerts"] });
      setEscalateOpen(false);
      setNoteDraft("");
    },
    onError: () => toast.error("Failed to escalate"),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Platform alerts"
        subtitle="Monitor and triage unresolved alerts across all farms"
      />

      {/* Top summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryTile
          label="Critical unresolved"
          value={summary.critical}
          tone="critical"
          icon={<Flame className="h-4 w-4" />}
        />
        <SummaryTile
          label="Warning unresolved"
          value={summary.warning}
          tone="warning"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <SummaryTile label="Devices offline" value={summary.offline} tone="muted" />
        <SummaryTile label="Calibration due" value={summary.calibrationDue} tone="muted" />
        <SummaryTile
          label="Resolved today"
          value={summary.resolvedToday}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search message, parameter, farm…"
            className="pl-9"
          />
        </div>
        <Select value={sev} onValueChange={setSev}>
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={farmFilter} onValueChange={setFarmFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Farm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All farms</SelectItem>
            {farms.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={districtFilter} onValueChange={setDistrictFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="District" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All districts</SelectItem>
            {districts.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deviceFilter} onValueChange={setDeviceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Device" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All devices</SelectItem>
            {devices.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name ?? d.serial}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="No alerts match"
          description="Try adjusting the filters or check back later."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Severity</th>
                  <th className="px-3 py-3">Farm</th>
                  <th className="px-3 py-3">Pond</th>
                  <th className="px-3 py-3">Device</th>
                  <th className="px-3 py-3">Parameter</th>
                  <th className="px-3 py-3">Value</th>
                  <th className="px-3 py-3">Threshold</th>
                  <th className="px-3 py-3">Duration</th>
                  <th className="px-3 py-3">Assigned</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ alert, farm, pond, device }) => {
                  const tech = alert.assigned_technician_id
                    ? profileById.get(alert.assigned_technician_id)
                    : null;
                  return (
                    <tr
                      key={alert.id}
                      onClick={() => setDrawerId(alert.id)}
                      className={cn(
                        "cursor-pointer border-t border-border/60 hover:bg-surface/60",
                        severityRowTone[alert.severity],
                      )}
                    >
                      <td className="px-3 py-3">
                        <StatusBadge status={alert.severity} />
                      </td>
                      <td className="px-3 py-3 font-medium">{farm?.name ?? "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{pond?.name ?? "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {device?.name ?? device?.serial ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-xs uppercase tracking-wider">
                        {alert.parameter ?? "—"}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{alert.value ?? "—"}</td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {alert.threshold ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {duration(alert.detected_at, alert.resolved_at)}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {tech?.full_name ?? "Unassigned"}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={alert.status} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerId(alert.id);
                          }}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {sorted.map(({ alert, farm, pond, device }) => (
              <button
                key={alert.id}
                onClick={() => setDrawerId(alert.id)}
                className={cn(
                  "rounded-xl border border-border/70 bg-card p-4 text-left shadow-soft",
                  severityRowTone[alert.severity],
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {farm?.name ?? "—"} · {pond?.name ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {alert.parameter ?? alert.alert_type} ·{" "}
                      {device?.name ?? device?.serial ?? "—"}
                    </p>
                  </div>
                  <StatusBadge status={alert.severity} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{duration(alert.detected_at, alert.resolved_at)}</span>
                  <StatusBadge status={alert.status} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Detail drawer */}
      <Sheet
        open={!!drawerId}
        onOpenChange={(o) => {
          if (!o) {
            setDrawerId(null);
            setNoteDraft("");
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {drawerAlert && drawerCtx && (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={drawerAlert.severity} />
                  {drawerCtx.farm?.name ?? "Unknown farm"} · {drawerCtx.pond?.name ?? "—"}
                </SheetTitle>
                <SheetDescription>{drawerAlert.message ?? drawerAlert.alert_type}</SheetDescription>
              </SheetHeader>

              {/* Action bar */}
              <div className="mt-4 flex flex-wrap gap-2">
                {drawerAlert.severity !== "critical" && (
                  <Button size="sm" variant="destructive" onClick={() => setEscalateOpen(true)}>
                    <Flame className="mr-1.5 h-3.5 w-3.5" /> Escalate
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAssignTechId(drawerAlert.assigned_technician_id ?? "");
                    setAssignOpen(true);
                  }}
                >
                  <UserCog className="mr-1.5 h-3.5 w-3.5" /> Assign technician
                </Button>
                {drawerAlert.status !== "resolved" && (
                  <Button size="sm" onClick={() => setResolveOpen(true)}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark resolved
                  </Button>
                )}
              </div>

              {/* Chart */}
              <section className="mt-6">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" /> Last 24h · {drawerAlert.parameter ?? "—"}
                </h3>
                {chartData.length === 0 ? (
                  <div className="grid h-40 place-items-center rounded-md border border-dashed border-border bg-surface/40 text-xs text-muted-foreground">
                    No reading history available
                  </div>
                ) : (
                  <div className="h-40 w-full rounded-md border border-border/60 bg-surface/40 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="alertVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke="hsl(var(--primary))"
                          fill="url(#alertVal)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {drawerAlert.threshold != null && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Threshold: <span className="font-medium">{drawerAlert.threshold}</span> ·
                    Current: <span className="font-medium">{drawerAlert.value ?? "—"}</span>
                  </p>
                )}
              </section>

              {/* Farmer contact */}
              <section className="mt-6 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Farmer contact
                </h3>
                <DRow
                  icon={<UserCog className="h-4 w-4" />}
                  label="Owner"
                  value={drawerFarmer?.full_name ?? "—"}
                />
                <DRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={drawerFarmer?.phone ?? "—"}
                />
                <DRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={(drawerFarmer as Profile & { email?: string | null })?.email ?? "—"}
                />
                <DRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="District"
                  value={drawerCtx.farm?.district ?? "—"}
                />
              </section>

              {/* Recommended action */}
              {drawerAlert.recommended_action && (
                <section className="mt-6">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recommended action
                  </h3>
                  <p className="rounded-md border border-border/60 bg-surface/40 p-3 text-sm">
                    {drawerAlert.recommended_action}
                  </p>
                </section>
              )}

              {/* Internal notes */}
              <section className="mt-6">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <StickyNote className="h-3.5 w-3.5" /> Add internal note
                </h3>
                <Textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Visible to admins and technicians only…"
                  rows={2}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    disabled={!noteDraft.trim() || noteMut.isPending}
                    onClick={() => noteMut.mutate({ id: drawerAlert.id, body: noteDraft.trim() })}
                  >
                    Add note
                  </Button>
                </div>
              </section>

              {/* Resolution log */}
              <section className="mt-6">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> History
                </h3>
                <ol className="space-y-2 border-l border-border/60 pl-3">
                  <li className="relative text-xs">
                    <span className="absolute -left-[7px] top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                    <p className="font-medium">Detected</p>
                    <p className="text-muted-foreground">{fmtDate(drawerAlert.detected_at)}</p>
                  </li>
                  {(notesQ.data ?? []).map((n) => (
                    <li key={n.id} className="relative text-xs">
                      <span
                        className={cn(
                          "absolute -left-[7px] top-1.5 h-2 w-2 rounded-full",
                          n.kind === "resolution" && "bg-emerald-500",
                          n.kind === "escalation" && "bg-rose-500",
                          n.kind === "assignment" && "bg-sky-500",
                          n.kind === "note" && "bg-muted-foreground/70",
                          n.kind === "status_change" && "bg-amber-500",
                        )}
                      />
                      <p className="font-medium capitalize">{n.kind.replace("_", " ")}</p>
                      {n.body && <p className="text-foreground/80">{n.body}</p>}
                      <p className="text-muted-foreground">{fmtDate(n.created_at)}</p>
                    </li>
                  ))}
                  {drawerAlert.resolved_at && (
                    <li className="relative text-xs">
                      <span className="absolute -left-[7px] top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                      <p className="font-medium">Resolved</p>
                      <p className="text-muted-foreground">{fmtDate(drawerAlert.resolved_at)}</p>
                    </li>
                  )}
                </ol>
              </section>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign dialog */}
      <AlertDialog open={assignOpen} onOpenChange={setAssignOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign technician</AlertDialogTitle>
            <AlertDialogDescription>
              Pick a technician to take ownership of this alert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Technician
            </Label>
            <Select value={assignTechId} onValueChange={setAssignTechId}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No technicians found
                  </SelectItem>
                ) : (
                  technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name ?? t.id}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (drawerId && assignTechId)
                  assignMut.mutate({ id: drawerId, techId: assignTechId });
              }}
            >
              Assign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resolve dialog */}
      <AlertDialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark alert resolved</AlertDialogTitle>
            <AlertDialogDescription>
              Optionally add a resolution note for the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="What was the resolution?"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteDraft("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (drawerId) resolveMut.mutate({ id: drawerId, body: noteDraft.trim() });
              }}
            >
              Resolve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Escalate dialog */}
      <AlertDialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Escalate to critical?</AlertDialogTitle>
            <AlertDialogDescription>
              This will raise the severity and notify on-call responders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Why is this critical?"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteDraft("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={(e) => {
                e.preventDefault();
                if (drawerId) escalateMut.mutate({ id: drawerId, body: noteDraft.trim() });
              }}
            >
              Escalate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "critical" | "warning" | "muted" | "success";
  icon?: React.ReactNode;
}) {
  const toneStyles: Record<typeof tone, string> = {
    critical: "border-rose-500/40 bg-rose-500/10",
    warning: "border-amber-500/40 bg-amber-500/10",
    muted: "border-border/70 bg-card",
    success: "border-emerald-500/40 bg-emerald-500/10",
  };
  const valTone: Record<typeof tone, string> = {
    critical: "text-rose-600",
    warning: "text-amber-700",
    muted: "text-foreground",
    success: "text-emerald-600",
  };
  return (
    <div className={cn("rounded-xl border p-3 shadow-soft", toneStyles[tone])}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </p>
      <p className={cn("mt-1 font-display text-2xl font-bold tabular-nums", valTone[tone])}>
        {value}
      </p>
    </div>
  );
}

function DRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
