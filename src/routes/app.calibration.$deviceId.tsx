import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  History,
} from "lucide-react";
import { insforge } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatusBadge } from "@/components/app/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/calibration/$deviceId")({
  head: () => ({ meta: [{ title: "Sensor Calibration — Acqua Lence" }] }),
  component: CalibrationPage,
});

type SensorKey = "ph" | "do" | "temperature" | "turbidity" | "salinity" | "ammonia";
type Result = "pass" | "fail" | "needs_review";

const SENSORS: { key: SensorKey; label: string; unit: string; readingKey: string }[] = [
  { key: "ph", label: "pH", unit: "pH", readingKey: "ph" },
  { key: "do", label: "Dissolved O₂", unit: "mg/L", readingKey: "do_mg_l" },
  { key: "temperature", label: "Temperature", unit: "°C", readingKey: "temp_c" },
  { key: "turbidity", label: "Turbidity", unit: "NTU", readingKey: "turbidity_ntu" },
  { key: "salinity", label: "Salinity", unit: "ppt", readingKey: "salinity_ppt" },
  { key: "ammonia", label: "Ammonia", unit: "mg/L", readingKey: "ammonia_mg_l" },
];

// 90 days default cadence between calibrations
const NEXT_DUE_DAYS = 90;

type CardForm = {
  calibration_value: string;
  reference_value: string;
  result: Result;
  performed_at: string; // datetime-local
  technician_name: string;
  notes: string;
};

const emptyForm = (tech: string): CardForm => ({
  calibration_value: "",
  reference_value: "",
  result: "pass",
  performed_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16),
  technician_name: tech,
  notes: "",
});

type CalibrationRow = {
  id: string;
  sensor_type: string;
  calibration_value: number | null;
  reference_value?: number | null;
  technician_name?: string | null;
  result?: string | null;
  notes?: string | null;
  performed_at: string;
};

function resultMeta(result?: string | null) {
  switch (result) {
    case "pass":
      return { label: "Pass", icon: CheckCircle2, badge: "good" as const };
    case "fail":
      return { label: "Fail", icon: XCircle, badge: "critical" as const };
    case "needs_review":
      return { label: "Needs review", icon: AlertTriangle, badge: "warning" as const };
    default:
      return { label: result ?? "—", icon: AlertTriangle, badge: "offline" as const };
  }
}

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

function CalibrationPage() {
  const { deviceId } = Route.useParams();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const defaultTech = profile?.full_name ?? user?.email ?? "Technician";

  const [forms, setForms] = useState<Record<SensorKey, CardForm>>(() =>
    SENSORS.reduce(
      (acc, s) => ({ ...acc, [s.key]: emptyForm(defaultTech) }),
      {} as Record<SensorKey, CardForm>,
    ),
  );

  // ── Device + farm + pond header data
  const { data: device } = useQuery({
    queryKey: ["device-detail", deviceId],
    queryFn: async () => {
      const { data } = await insforge.database
        .from("devices")
        .select("*")
        .eq("id", deviceId)
        .single();
      return data as {
        id: string;
        serial: string;
        name?: string | null;
        status: string;
        farm_id?: string | null;
        pond_id?: string | null;
      } | null;
    },
  });

  const { data: farm } = useQuery({
    queryKey: ["device-farm", device?.farm_id],
    enabled: !!device?.farm_id,
    queryFn: async () => {
      const { data } = await insforge.database
        .from("farms")
        .select("id,name")
        .eq("id", device!.farm_id!)
        .single();
      return data as { id: string; name: string } | null;
    },
  });

  const { data: pond } = useQuery({
    queryKey: ["device-pond", device?.pond_id],
    enabled: !!device?.pond_id,
    queryFn: async () => {
      const { data } = await insforge.database
        .from("ponds")
        .select("id,name")
        .eq("id", device!.pond_id!)
        .single();
      return data as { id: string; name: string } | null;
    },
  });

  // ── Latest reading for "current reading" values
  const { data: latestReading } = useQuery({
    queryKey: ["device-latest-reading", deviceId, device?.pond_id],
    enabled: !!device?.pond_id,
    queryFn: async () => {
      const { data } = await insforge.database
        .from("readings")
        .select("*")
        .eq("device_id", deviceId)
        .order("recorded_at", { ascending: false })
        .limit(1);
      return (data?.[0] ?? null) as Record<string, number | string | null> | null;
    },
  });

  // ── Sensor rows for last_calibrated / due
  const { data: sensorRows } = useQuery({
    queryKey: ["device-sensors", deviceId],
    queryFn: async () => {
      const { data } = await insforge.database
        .from("sensors")
        .select("*")
        .eq("device_id", deviceId);
      return (data ?? []) as {
        id: string;
        sensor_type: string;
        last_calibrated?: string | null;
        calibration_due?: string | null;
        status?: string | null;
      }[];
    },
  });

  // ── Calibration history
  const { data: history } = useQuery({
    queryKey: ["cal-logs", deviceId],
    queryFn: async () => {
      const { data } = await insforge.database
        .from("calibration_logs")
        .select("*")
        .eq("device_id", deviceId)
        .order("performed_at", { ascending: false });
      return (data ?? []) as CalibrationRow[];
    },
  });

  const lastCalibrationAt = useMemo(() => {
    if (!history || history.length === 0) return null;
    return history[0].performed_at;
  }, [history]);

  const save = useMutation({
    mutationFn: async (sensor: SensorKey) => {
      const f = forms[sensor];
      // Validation
      if (!f.calibration_value.trim()) throw new Error("Calibration value is required");
      if (!f.performed_at) throw new Error("Calibration date/time is required");
      if (!f.technician_name.trim()) throw new Error("Technician name is required");
      if (!f.result) throw new Error("Result status is required");

      const cal = Number(f.calibration_value);
      const ref = f.reference_value.trim() === "" ? null : Number(f.reference_value);
      if (Number.isNaN(cal)) throw new Error("Calibration value must be a number");
      if (ref !== null && Number.isNaN(ref)) throw new Error("Reference value must be a number");

      const performedAt = new Date(f.performed_at).toISOString();

      const { error } = await insforge.database.from("calibration_logs").insert([
        {
          device_id: deviceId,
          sensor_type: sensor,
          calibration_value: cal,
          reference_value: ref,
          technician_id: user?.id,
          technician_name: f.technician_name.trim().slice(0, 120),
          result: f.result,
          notes: f.notes.trim().slice(0, 500) || null,
          performed_at: performedAt,
        },
      ]);
      if (error) throw new Error(error.message);

      // Best-effort: update the matching sensors row so headers reflect the new dates.
      const row = sensorRows?.find((s) => s.sensor_type === sensor);
      const nextDue = addDays(performedAt, NEXT_DUE_DAYS).toISOString();
      if (row) {
        await insforge.database
          .from("sensors")
          .update({
            last_calibrated: performedAt,
            calibration_due: nextDue,
            status: f.result === "fail" ? "fault" : "ok",
          })
          .eq("id", row.id);
      } else {
        await insforge.database.from("sensors").insert([
          {
            device_id: deviceId,
            sensor_type: sensor,
            last_calibrated: performedAt,
            calibration_due: nextDue,
            status: f.result === "fail" ? "fault" : "ok",
          },
        ]);
      }
    },
    onSuccess: (_d, sensor) => {
      toast.success(`${SENSORS.find((s) => s.key === sensor)?.label} calibration saved`);
      setForms((prev) => ({ ...prev, [sensor]: emptyForm(defaultTech) }));
      qc.invalidateQueries({ queryKey: ["cal-logs", deviceId] });
      qc.invalidateQueries({ queryKey: ["device-sensors", deviceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          to="/app/devices/$deviceId"
          params={{ deviceId }}
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to device
        </Link>
        <PageHeader
          title="Sensor calibration"
          subtitle={device?.name ?? device?.serial ?? `Device ${deviceId.slice(0, 8)}…`}
        />
      </div>

      {/* Header summary */}
      <div className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-5">
        <HeaderField label="Device ID" value={device?.serial ?? deviceId.slice(0, 8)} mono />
        <HeaderField label="Assigned farm" value={farm?.name ?? "—"} />
        <HeaderField label="Assigned pond" value={pond?.name ?? "—"} />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Current status
          </p>
          <div className="mt-2">
            {device?.status ? (
              <StatusBadge status={device.status} />
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <HeaderField
          label="Last calibration"
          value={lastCalibrationAt ? new Date(lastCalibrationAt).toLocaleString() : "Never"}
        />
      </div>

      {/* Sensor cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SENSORS.map((s) => {
          const f = forms[s.key];
          const row = sensorRows?.find((r) => r.sensor_type === s.key);
          const reading = latestReading?.[s.readingKey];
          const lastCalForSensor = history?.find((h) => h.sensor_type === s.key);
          const lastCalibratedAt = row?.last_calibrated ?? lastCalForSensor?.performed_at ?? null;
          const nextDueAt =
            row?.calibration_due ??
            (lastCalibratedAt ? addDays(lastCalibratedAt, NEXT_DUE_DAYS).toISOString() : null);
          const overdue = nextDueAt ? new Date(nextDueAt).getTime() < Date.now() : false;
          const isSaving = save.isPending && save.variables === s.key;

          return (
            <form
              key={s.key}
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(s.key);
              }}
              className="flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
                    <FlaskConical className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">Sensor</p>
                  </div>
                </div>
                {lastCalForSensor?.result && (
                  <StatusBadge status={resultMeta(lastCalForSensor.result).badge} />
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border/50 bg-muted/30 p-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Current reading
                  </p>
                  <p className="mt-1 font-display text-lg font-bold tabular-nums">
                    {typeof reading === "number" ? reading.toFixed(2) : "—"}{" "}
                    <span className="text-xs font-normal text-muted-foreground">{s.unit}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Last calibrated
                  </p>
                  <p className="mt-1 text-xs font-medium">
                    {lastCalibratedAt ? new Date(lastCalibratedAt).toLocaleDateString() : "Never"}
                  </p>
                </div>
                <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Next due:{" "}
                  <span
                    className={cn("font-medium", overdue ? "text-rose-600" : "text-foreground")}
                  >
                    {nextDueAt ? new Date(nextDueAt).toLocaleDateString() : "—"}
                  </span>
                  {overdue && <span className="text-rose-600">(overdue)</span>}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Calibration value *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={f.calibration_value}
                      onChange={(e) =>
                        setForms((p) => ({
                          ...p,
                          [s.key]: { ...p[s.key], calibration_value: e.target.value },
                        }))
                      }
                      placeholder={s.unit}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reference value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={f.reference_value}
                      onChange={(e) =>
                        setForms((p) => ({
                          ...p,
                          [s.key]: { ...p[s.key], reference_value: e.target.value },
                        }))
                      }
                      placeholder={s.unit}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Result *</Label>
                  <Select
                    value={f.result}
                    onValueChange={(v) =>
                      setForms((p) => ({ ...p, [s.key]: { ...p[s.key], result: v as Result } }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="needs_review">Needs review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Calibration date / time *</Label>
                  <Input
                    type="datetime-local"
                    required
                    value={f.performed_at}
                    onChange={(e) =>
                      setForms((p) => ({
                        ...p,
                        [s.key]: { ...p[s.key], performed_at: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs">Technician *</Label>
                  <Input
                    required
                    maxLength={120}
                    value={f.technician_name}
                    onChange={(e) =>
                      setForms((p) => ({
                        ...p,
                        [s.key]: { ...p[s.key], technician_name: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs">Notes</Label>
                  <Input
                    maxLength={500}
                    value={f.notes}
                    onChange={(e) =>
                      setForms((p) => ({
                        ...p,
                        [s.key]: { ...p[s.key], notes: e.target.value },
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <Button type="submit" className="mt-4 w-full" disabled={isSaving}>
                {isSaving ? "Saving…" : "Save calibration"}
              </Button>
            </form>
          );
        })}
      </div>

      {/* History */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display text-sm font-semibold">Calibration history</h3>
        </div>
        {(history ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No calibrations recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sensor</TableHead>
                  <TableHead>Calibration</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Technician</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history!.map((h) => {
                  const meta = resultMeta(h.result);
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(h.performed_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="capitalize">{h.sensor_type}</TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {h.calibration_value ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {h.reference_value ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={meta.badge} />
                      </TableCell>
                      <TableCell className="text-xs">{h.technician_name ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-2 text-sm font-semibold", mono && "font-mono")}>{value}</p>
    </div>
  );
}
