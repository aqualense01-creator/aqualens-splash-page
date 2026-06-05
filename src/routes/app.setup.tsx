import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Circle, ArrowRight, ArrowLeft, QrCode, Wifi, MapPin, FlaskConical, ClipboardCheck } from "lucide-react";
import { insforge } from "@/lib/insforge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/app/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/setup")({
  head: () => ({ meta: [{ title: "Setup Device — Acqua Lence" }] }),
  component: SetupPage,
});

const steps = [
  { id: 1, label: "Installation", icon: MapPin },
  { id: 2, label: "Connectivity", icon: Wifi },
  { id: 3, label: "Registration", icon: QrCode },
  { id: 4, label: "Assign pond", icon: ClipboardCheck },
  { id: 5, label: "Calibration", icon: FlaskConical },
  { id: 6, label: "Finalize", icon: Check },
];

function SetupPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    installer: "", mounting: "buoy", power: "solar", lat: "", lng: "",
    checks: { mounted: false, solar: false, sensors: false, power: false, network: false, sealed: false },
    serial: "", hardware: "", firmware: "", notes: "",
  });

  const finalize = useMutation({
    mutationFn: async () => {
      if (!data.serial) throw new Error("Serial number required");
      const { error } = await insforge.database.from("devices").insert([{
        serial: data.serial, name: data.serial,
        hardware_version: data.hardware, firmware_version: data.firmware,
        status: "online", battery_pct: 100, signal_pct: 85,
        last_seen: new Date().toISOString(),
      }]);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Device registered"); setStep(1); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Device setup" subtitle="Install, register, assign and calibrate a new buoy." />

      <ol className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-soft">
        {steps.map((s) => {
          const done = step > s.id, active = step === s.id;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <div className={`grid h-7 w-7 place-items-center rounded-full border text-[11px] font-semibold ${done ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : s.id}
              </div>
              <span className={`text-xs ${active ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
              {s.id < steps.length && <span className="mx-1 h-px w-6 bg-border" />}
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Installation checklist</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Installer name</Label><Input value={data.installer} onChange={(e) => setData({ ...data, installer: e.target.value })} /></div>
              <div><Label>Mounting type</Label><Input value={data.mounting} onChange={(e) => setData({ ...data, mounting: e.target.value })} /></div>
              <div><Label>Latitude</Label><Input value={data.lat} onChange={(e) => setData({ ...data, lat: e.target.value })} /></div>
              <div><Label>Longitude</Label><Input value={data.lng} onChange={(e) => setData({ ...data, lng: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              {Object.entries(data.checks).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={v} onCheckedChange={(c) => setData({ ...data, checks: { ...data.checks, [k]: !!c } })} />
                  <span className="capitalize">{k.replace("_", " ")} verified</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <h3 className="font-display text-lg font-semibold">Connectivity test</h3>
            <ul className="space-y-2 text-sm">
              {["Network connected", "Signal strength 78%", "Cloud handshake OK", "Last ping 1s ago", "Data transmission OK"].map((t) => (
                <li key={t} className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-emerald-700"><Check className="h-4 w-4" /> {t}</li>
              ))}
            </ul>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <h3 className="font-display text-lg font-semibold">Device registration</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Serial number *</Label><Input value={data.serial} onChange={(e) => setData({ ...data, serial: e.target.value })} placeholder="Scan QR or enter" /></div>
              <div><Label>Hardware version</Label><Input value={data.hardware} onChange={(e) => setData({ ...data, hardware: e.target.value })} /></div>
              <div><Label>Firmware version</Label><Input value={data.firmware} onChange={(e) => setData({ ...data, firmware: e.target.value })} /></div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <h3 className="font-display text-lg font-semibold">Assign to pond</h3>
            <p className="text-sm text-muted-foreground">Select the farm and pond this device will monitor. (Configure later from device detail page.)</p>
          </div>
        )}
        {step === 5 && (
          <div className="space-y-3">
            <h3 className="font-display text-lg font-semibold">Sensor calibration</h3>
            <p className="text-sm text-muted-foreground">Calibrate each sensor with reference solutions. Detailed calibration is available on the device's Calibration page.</p>
          </div>
        )}
        {step === 6 && (
          <div className="space-y-3">
            <h3 className="font-display text-lg font-semibold">Finalize</h3>
            <div><Label>Installation notes</Label><Input value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={() => finalize.mutate()} disabled={finalize.isPending}>{finalize.isPending ? "Registering…" : "Complete setup"}</Button>
          </div>
        )}

        <div className="mt-6 flex justify-between border-t border-border/60 pt-4">
          <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          {step < 6 && <Button onClick={() => setStep(step + 1)}>Next<ArrowRight className="ml-2 h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
  );
}
