import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { insforge } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/calibration/$deviceId")({
  head: () => ({ meta: [{ title: "Calibration — Acqua Lence" }] }),
  component: CalibrationPage,
});

const sensors = ["ph", "do", "temperature", "turbidity", "salinity", "ammonia"] as const;

function CalibrationPage() {
  const { deviceId } = Route.useParams();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [vals, setVals] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["cal-logs", deviceId],
    queryFn: async () => (await insforge.database.from("calibration_logs").select("*").eq("device_id", deviceId).order("performed_at", { ascending: false })).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (sensor: string) => {
      const v = Number(vals[sensor]);
      if (!v) throw new Error("Enter a calibration value");
      const { error } = await insforge.database.from("calibration_logs").insert([{
        device_id: deviceId,
        sensor_type: sensor,
        calibration_value: v,
        technician_id: user?.id,
        technician_name: profile?.full_name ?? user?.email ?? "Technician",
        result: "pass",
      }]);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Calibration logged"); qc.invalidateQueries({ queryKey: ["cal-logs", deviceId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Sensor calibration" subtitle={`Device ${deviceId.slice(0, 8)}…`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sensors.map((s) => (
          <div key={s} className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-violet-600" />
              <p className="font-display font-semibold capitalize">{s}</p>
            </div>
            <Label className="mt-3 block text-xs">Calibration value</Label>
            <Input type="number" step="0.01" value={vals[s] ?? ""} onChange={(e) => setVals({ ...vals, [s]: e.target.value })} />
            <Button size="sm" className="mt-3 w-full" onClick={() => save.mutate(s)} disabled={save.isPending}>Save</Button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <h3 className="mb-3 font-display text-sm font-semibold">Recent calibrations</h3>
        {(data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No history yet.</p> : (
          <ul className="space-y-1 text-sm">
            {data!.map((c: { id: string; sensor_type: string; calibration_value: number; technician_name?: string; performed_at: string }) => (
              <li key={c.id} className="flex items-center justify-between border-b border-border/40 py-2 last:border-0">
                <span className="capitalize">{c.sensor_type} → <span className="font-mono">{c.calibration_value}</span></span>
                <span className="text-xs text-muted-foreground">{c.technician_name} · {new Date(c.performed_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
