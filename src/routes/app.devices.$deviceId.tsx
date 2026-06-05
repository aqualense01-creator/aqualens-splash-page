import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, RefreshCw, Activity, Wrench, FlaskConical } from "lucide-react";
import { insforge, type Device, type Pond, type Farm } from "@/lib/insforge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, MetricTile, StatusBadge } from "@/components/app/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/devices/$deviceId")({
  head: () => ({ meta: [{ title: "Device — Acqua Lence" }] }),
  component: DeviceDetailPage,
});

function DeviceDetailPage() {
  const { deviceId } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["device", deviceId],
    queryFn: async () => {
      const [d, s, c, m, f, p] = await Promise.all([
        insforge.database.from("devices").select("*").eq("id", deviceId).single(),
        insforge.database.from("sensors").select("*").eq("device_id", deviceId),
        insforge.database.from("calibration_logs").select("*").eq("device_id", deviceId).order("performed_at", { ascending: false }),
        insforge.database.from("maintenance_logs").select("*").eq("device_id", deviceId).order("performed_at", { ascending: false }),
        insforge.database.from("farms").select("*"),
        insforge.database.from("ponds").select("*"),
      ]);
      return {
        device: d.data as Device | null,
        sensors: s.data ?? [],
        calibrations: c.data ?? [],
        maintenance: m.data ?? [],
        farms: (f.data ?? []) as Farm[],
        ponds: (p.data ?? []) as Pond[],
      };
    },
  });

  const diag = useMutation({
    mutationFn: async () => {
      await insforge.database.from("devices").update({ last_seen: new Date().toISOString() }).eq("id", deviceId);
    },
    onSuccess: () => { toast.success("Diagnostics complete"); qc.invalidateQueries({ queryKey: ["device", deviceId] }); },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const d = data?.device;
  if (!d) return <div>Device not found</div>;
  const farm = data?.farms.find((f) => f.id === d.farm_id);
  const pond = data?.ponds.find((p) => p.id === d.pond_id);

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/app/devices" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Devices
      </Link>
      <PageHeader
        title={d.name ?? d.serial}
        subtitle={`Serial ${d.serial} · ${farm?.name ?? "—"} · ${pond?.name ?? "—"}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/app/calibration/$deviceId" params={{ deviceId: d.id }}><FlaskConical className="mr-2 h-4 w-4" />Calibrate</Link></Button>
            <Button variant="outline" asChild><Link to="/app/maintenance/$deviceId" params={{ deviceId: d.id }}><Wrench className="mr-2 h-4 w-4" />Maintenance</Link></Button>
            <Button onClick={() => diag.mutate()} disabled={diag.isPending}><Activity className="mr-2 h-4 w-4" />Run diagnostics</Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="Status" value={<StatusBadge status={d.status} /> as unknown as string} />
        <MetricTile label="Battery" value={`${d.battery_pct ?? 0}%`} accent={(d.battery_pct ?? 0) < 25 ? "text-amber-600" : "text-emerald-600"} />
        <MetricTile label="Signal" value={`${d.signal_pct ?? 0}%`} accent="text-sky-600" />
        <MetricTile label="Firmware" value={d.firmware_version ?? "—"} accent="text-foreground" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sensors">Sensors</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Device info">
              <Row label="Serial" value={<span className="font-mono">{d.serial}</span>} />
              <Row label="Hardware" value={d.hardware_version ?? "—"} />
              <Row label="Firmware" value={d.firmware_version ?? "—"} />
              <Row label="Farm" value={farm?.name ?? "—"} />
              <Row label="Pond" value={pond?.name ?? "—"} />
              <Row label="Last seen" value={d.last_seen ? new Date(d.last_seen).toLocaleString() : "—"} />
            </Card>
            <Card title="Health summary">
              <Row label="Status" value={<StatusBadge status={d.status} />} />
              <Row label="Battery" value={`${d.battery_pct ?? 0}%`} />
              <Row label="Signal" value={`${d.signal_pct ?? 0}%`} />
              <Row label="Sensors" value={`${data?.sensors.length ?? 0} attached`} />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sensors" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.sensors ?? []).length === 0 ? (
              <p className="col-span-full rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">No sensors registered.</p>
            ) : data?.sensors.map((s: { id: string; sensor_type: string; status?: string; last_value?: number; last_calibrated_at?: string }) => (
              <div key={s.id} className="rounded-xl border border-border/70 bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display font-semibold capitalize">{s.sensor_type}</p>
                  <StatusBadge status={s.status ?? "good"} />
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">Last value: {s.last_value ?? "—"}</p>
                <p className="font-mono text-xs text-muted-foreground">Last cal: {s.last_calibrated_at ? new Date(s.last_calibrated_at).toLocaleDateString() : "—"}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card title="Calibration history">
            {data?.calibrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No calibrations yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data?.calibrations.map((c: { id: string; sensor_type: string; calibration_value: number; technician_name?: string; performed_at: string; result?: string }) => (
                  <li key={c.id} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                    <span className="font-medium capitalize">{c.sensor_type} → {c.calibration_value}</span>
                    <span className="text-xs text-muted-foreground">{c.technician_name ?? "—"} · {new Date(c.performed_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div className="mt-4">
            <Card title="Maintenance log">
              {data?.maintenance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No maintenance recorded.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data?.maintenance.map((m: { id: string; visit_type?: string; notes?: string; performed_at: string }) => (
                    <li key={m.id} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                      <span>{m.visit_type ?? "Visit"} — {m.notes ?? ""}</span>
                      <span className="text-xs text-muted-foreground">{new Date(m.performed_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <DeviceSettings device={d} farms={data?.farms ?? []} ponds={data?.ponds ?? []} onSaved={() => qc.invalidateQueries({ queryKey: ["device", deviceId] })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeviceSettings({ device, farms, ponds, onSaved }: { device: Device; farms: Farm[]; ponds: Pond[]; onSaved: () => void }) {
  const [farmId, setFarmId] = useState(device.farm_id ?? "");
  const [pondId, setPondId] = useState(device.pond_id ?? "");
  const [interval, setInterval] = useState("300");
  const [preset, setPreset] = useState("default");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await insforge.database.from("devices")
        .update({ farm_id: farmId || null, pond_id: pondId || null })
        .eq("id", device.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card title="Configuration">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Assigned farm</Label>
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger><SelectValue placeholder="Select farm" /></SelectTrigger>
            <SelectContent>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Assigned pond</Label>
          <Select value={pondId} onValueChange={setPondId}>
            <SelectTrigger><SelectValue placeholder="Select pond" /></SelectTrigger>
            <SelectContent>{ponds.filter((p) => !farmId || p.farm_id === farmId).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sampling interval (sec)</Label>
          <Input type="number" value={interval} onChange={(e) => setInterval(e.target.value)} />
        </div>
        <div>
          <Label>Threshold profile</Label>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="shrimp">Shrimp tight</SelectItem>
              <SelectItem value="hatchery">Hatchery</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => m.mutate()} disabled={m.isPending}><RefreshCw className="mr-2 h-4 w-4" />Save</Button>
        <Button variant="outline">Restart device</Button>
      </div>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
      <h3 className="mb-3 font-display text-sm font-semibold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
