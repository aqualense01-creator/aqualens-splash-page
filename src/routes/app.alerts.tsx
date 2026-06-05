import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, Cpu, FlaskConical, Filter } from "lucide-react";
import { insforge, type Alert, type Pond } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader, MetricTile, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/alerts")({
  head: () => ({ meta: [{ title: "Alerts — Acqua Lence" }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [openAlert, setOpenAlert] = useState<Alert | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["alerts-page"],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const [a, p] = await Promise.all([
        insforge.database.from("alerts").select("*").order("detected_at", { ascending: false }).limit(200),
        insforge.database.from("ponds").select("*"),
      ]);
      return { alerts: (a.data ?? []) as Alert[], ponds: (p.data ?? []) as Pond[] };
    },
  });

  const alerts = data?.alerts ?? [];
  const ponds = data?.ponds ?? [];
  const pondName = (id: string | null) => (id ? ponds.find((p) => p.id === id)?.name ?? "—" : "—");

  const counts = useMemo(() => ({
    critical: alerts.filter((a) => a.severity === "critical" && a.status !== "resolved").length,
    warning: alerts.filter((a) => a.severity === "warning" && a.status !== "resolved").length,
    device: alerts.filter((a) => a.alert_type === "device_offline" && a.status !== "resolved").length,
    calibration: alerts.filter((a) => a.alert_type === "calibration_due" && a.status !== "resolved").length,
    resolved: alerts.filter((a) => a.status === "resolved").length,
  }), [alerts]);

  const filtered = alerts.filter((a) => {
    if (tab === "critical" && a.severity !== "critical") return false;
    if (tab === "warning" && a.severity !== "warning") return false;
    if (tab === "device" && a.alert_type !== "device_offline") return false;
    if (tab === "calibration" && a.alert_type !== "calibration_due") return false;
    if (tab === "resolved" && a.status !== "resolved") return false;
    if (query && !`${a.message ?? ""}${a.parameter ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const ack = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await insforge.database.from("alerts")
        .update({ status: "acknowledged", acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Acknowledged"); qc.invalidateQueries({ queryKey: ["alerts-page"] }); setOpenAlert(null); },
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await insforge.database.from("alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Resolved"); qc.invalidateQueries({ queryKey: ["alerts-page"] }); setOpenAlert(null); },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Alerts center" subtitle="Acknowledge and resolve issues across all your ponds." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricTile label="Critical" value={counts.critical} accent="text-rose-600" />
        <MetricTile label="Warning" value={counts.warning} accent="text-amber-600" />
        <MetricTile label="Device" value={counts.device} accent="text-sky-600" />
        <MetricTile label="Calibration" value={counts.calibration} accent="text-violet-600" />
        <MetricTile label="Resolved" value={counts.resolved} accent="text-emerald-600" />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
            <TabsTrigger value="warning">Warning</TabsTrigger>
            <TabsTrigger value="device">Device</TabsTrigger>
            <TabsTrigger value="calibration">Calibration</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search alerts…" className="h-9 w-64 pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card shadow-soft">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No alerts" description="Nothing requires your attention right now." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Pond</th>
                <th className="px-4 py-3">Parameter</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Threshold</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setOpenAlert(a)}
                  className="cursor-pointer border-b border-border/40 last:border-0 hover:bg-accent/30"
                >
                  <td className="px-4 py-3 font-medium">{pondName(a.pond_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.parameter ?? a.alert_type}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{a.value ?? "—"}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">{a.threshold ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.severity} /></td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(a.detected_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Sheet open={!!openAlert} onOpenChange={(v) => !v && setOpenAlert(null)}>
        <SheetContent className="sm:max-w-md">
          {openAlert && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {openAlert.severity === "critical" ? <AlertCircle className="h-5 w-5 text-rose-600" /> :
                   openAlert.severity === "warning" ? <AlertTriangle className="h-5 w-5 text-amber-600" /> :
                   openAlert.alert_type === "device_offline" ? <Cpu className="h-5 w-5 text-sky-600" /> :
                   <FlaskConical className="h-5 w-5 text-violet-600" />}
                  {openAlert.message ?? openAlert.alert_type}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <Row label="Pond" value={pondName(openAlert.pond_id)} />
                <Row label="Parameter" value={openAlert.parameter ?? "—"} />
                <Row label="Current value" value={openAlert.value ?? "—"} />
                <Row label="Threshold" value={openAlert.threshold ?? "—"} />
                <Row label="Severity" value={<StatusBadge status={openAlert.severity} />} />
                <Row label="Status" value={<StatusBadge status={openAlert.status} />} />
                <Row label="Detected" value={new Date(openAlert.detected_at).toLocaleString()} />
                {openAlert.acknowledged_at && <Row label="Acknowledged" value={new Date(openAlert.acknowledged_at).toLocaleString()} />}
                {openAlert.resolved_at && <Row label="Resolved" value={new Date(openAlert.resolved_at).toLocaleString()} />}
                {openAlert.recommended_action && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary">Recommended action</p>
                    <p className="mt-1">{openAlert.recommended_action}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-2">
                {openAlert.status === "open" && (
                  <Button variant="outline" className="flex-1" onClick={() => ack.mutate(openAlert.id)} disabled={ack.isPending}>
                    Acknowledge
                  </Button>
                )}
                {openAlert.status !== "resolved" && (
                  <Button className="flex-1" onClick={() => resolve.mutate(openAlert.id)} disabled={resolve.isPending}>
                    Mark resolved
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
