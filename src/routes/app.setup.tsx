import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Check, Circle, ArrowRight, ArrowLeft, QrCode, Wifi, MapPin, FlaskConical,
  ClipboardCheck, Camera, Signature, PartyPopper, AlertCircle, Loader2,
} from "lucide-react";
import { insforge } from "@/lib/insforge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/StatusBadge";
import { MOCK_FARMS, MOCK_PONDS } from "@/lib/mock-farm";
import { toast } from "sonner";

export const Route = createFileRoute("/app/setup")({
  head: () => ({ meta: [{ title: "Setup Device — Acqua Lence" }] }),
  component: SetupPage,
});

const steps = [
  { id: 1, label: "Installation", icon: MapPin },
  { id: 2, label: "Connectivity", icon: Wifi },
  { id: 3, label: "Registration", icon: QrCode },
  { id: 4, label: "Assign", icon: ClipboardCheck },
  { id: 5, label: "Calibration", icon: FlaskConical },
  { id: 6, label: "Finalize", icon: Check },
];

const checklistItems = [
  { key: "mounted", label: "Device mounted securely" },
  { key: "solar", label: "Solar panel connected" },
  { key: "sensors", label: "Sensors connected" },
  { key: "power", label: "Power indicator on" },
  { key: "network", label: "Network indicator active" },
  { key: "sealed", label: "Enclosure sealed" },
];

const connectivityTests = [
  { key: "network", label: "Network connection", detail: "LTE / 4G" },
  { key: "signal", label: "Signal strength", detail: "78% — Good" },
  { key: "cloud", label: "Cloud connection", detail: "Handshake OK" },
  { key: "ping", label: "Last ping", detail: "1s ago" },
  { key: "data", label: "Data transmission", detail: "12 KB/s upload" },
];

const sensors = [
  { key: "ph", name: "pH", ref: "Buffer 4.0 / 7.0 / 10.0" },
  { key: "do", name: "Dissolved Oxygen", ref: "0% / 100% saturation" },
  { key: "temp", name: "Temperature", ref: "Ice bath / boiling" },
  { key: "turbidity", name: "Turbidity", ref: "0 / 100 / 800 NTU" },
  { key: "salinity", name: "Salinity", ref: "0 / 35 ppt" },
  { key: "ammonia", name: "Ammonia", ref: "0.5 / 5 mg/L" },
];

type Calibration = { single: boolean; multi: boolean; offset: string; notes: string };

function SetupPage() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  // Step 1
  const [installedAt, setInstalledAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [installer, setInstaller] = useState("");
  const [mounting, setMounting] = useState("buoy");
  const [power, setPower] = useState("solar");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(checklistItems.map((c) => [c.key, false])),
  );

  // Step 2
  const [tested, setTested] = useState(false);
  const [testing, setTesting] = useState(false);

  // Step 3
  const [serial, setSerial] = useState("");
  const [hardware, setHardware] = useState("v2.3");
  const [firmware, setFirmware] = useState("1.8.2");
  const [sim, setSim] = useState("");

  // Step 4
  const [customer, setCustomer] = useState("");
  const [farmId, setFarmId] = useState("");
  const [pondId, setPondId] = useState("");
  const [devicePkg, setDevicePkg] = useState("standard");
  const [sensorPkg, setSensorPkg] = useState("full");

  // Step 5
  const [calibrations, setCalibrations] = useState<Record<string, Calibration>>(
    Object.fromEntries(sensors.map((s) => [s.key, { single: false, multi: false, offset: "", notes: "" }])),
  );

  // Step 6
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState("");

  const pondsForFarm = useMemo(() => MOCK_PONDS.filter((p) => p.farm_id === farmId), [farmId]);

  const allChecked = checklistItems.every((c) => checks[c.key]);
  const step1Valid = !!installer && allChecked;
  const step3Valid = !!serial;
  const step4Valid = !!farmId && !!pondId;
  const step5Valid = sensors.every((s) => calibrations[s.key].single || calibrations[s.key].multi);
  const step6Valid = !!signature;

  const runTests = () => {
    setTesting(true);
    setTimeout(() => { setTesting(false); setTested(true); toast.success("Connectivity tests passed"); }, 1200);
  };

  const handlePhoto = () => {
    setPhotos((p) => [...p, `Photo ${p.length + 1}`]);
    toast.success("Photo added");
  };

  const finalize = useMutation({
    mutationFn: async () => {
      const { error } = await insforge.database.from("devices").insert([{
        serial, name: serial,
        hardware_version: hardware, firmware_version: firmware,
        status: "online", battery_pct: 100, signal_pct: 85,
        last_seen: new Date().toISOString(),
      }]);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setDone(true); toast.success("Device registered successfully"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const canAdvance = () => {
    if (step === 1) return step1Valid;
    if (step === 2) return tested;
    if (step === 3) return step3Valid;
    if (step === 4) return step4Valid;
    if (step === 5) return step5Valid;
    return true;
  };

  const next = () => {
    if (!canAdvance()) { toast.error("Complete required items first"); return; }
    setStep((s) => Math.min(6, s + 1));
  };

  const reset = () => {
    setDone(false); setStep(1); setSerial(""); setInstaller(""); setSignature("");
    setChecks(Object.fromEntries(checklistItems.map((c) => [c.key, false])));
    setTested(false); setPhotos([]); setNotes(""); setFarmId(""); setPondId("");
    setCalibrations(Object.fromEntries(sensors.map((s) => [s.key, { single: false, multi: false, offset: "", notes: "" }])));
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center shadow-soft">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-700">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold">Setup complete</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Device <span className="font-semibold text-foreground">{serial}</span> is registered, assigned, and reporting data.
          </p>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            <SummaryRow label="Installer" value={installer} />
            <SummaryRow label="Installed at" value={installedAt.replace("T", " ")} />
            <SummaryRow label="Farm" value={MOCK_FARMS.find((f) => f.id === farmId)?.name ?? "—"} />
            <SummaryRow label="Pond" value={MOCK_PONDS.find((p) => p.id === pondId)?.name ?? "—"} />
            <SummaryRow label="Firmware" value={firmware} />
            <SummaryRow label="Sensors calibrated" value={`${sensors.length}/${sensors.length}`} />
          </div>
          <Button className="mt-6" onClick={reset}>Register another device</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Device setup" subtitle="Install, register, assign and calibrate a new buoy." />

      <ol className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-soft">
        {steps.map((s, i) => {
          const isDone = step > s.id, active = step === s.id;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <div className={`grid h-7 w-7 place-items-center rounded-full border text-[11px] font-semibold ${isDone ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {isDone ? <Check className="h-3.5 w-3.5" /> : s.id}
              </div>
              <span className={`text-xs ${active ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="font-display text-lg font-semibold">Installation checklist</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Installation date/time *</Label><Input type="datetime-local" value={installedAt} onChange={(e) => setInstalledAt(e.target.value)} /></div>
              <div><Label>Installer name *</Label><Input value={installer} onChange={(e) => setInstaller(e.target.value)} placeholder="Md. Rahim" /></div>
              <div>
                <Label>Mounting type</Label>
                <Select value={mounting} onValueChange={setMounting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buoy">Floating buoy</SelectItem>
                    <SelectItem value="pole">Fixed pole</SelectItem>
                    <SelectItem value="wall">Wall mount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Power source</Label>
                <Select value={power} onValueChange={setPower}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solar">Solar</SelectItem>
                    <SelectItem value="grid">Grid AC</SelectItem>
                    <SelectItem value="battery">Battery only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Latitude</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="22.8456" /></div>
              <div><Label>Longitude</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="89.5403" /></div>
            </div>

            <div>
              <Label>Installation photos</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((p) => (
                  <div key={p} className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-border bg-muted text-xs text-muted-foreground">{p}</div>
                ))}
                <button type="button" onClick={handlePhoto} className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-border bg-background text-muted-foreground hover:border-primary hover:text-primary">
                  <Camera className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 bg-background p-3">
              <p className="text-sm font-medium">Required checks</p>
              {checklistItems.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={checks[c.key]} onCheckedChange={(v) => setChecks({ ...checks, [c.key]: !!v })} />
                  <span>{c.label}</span>
                </label>
              ))}
              {!allChecked && (
                <p className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="h-3 w-3" /> All checks required to continue</p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Connectivity test</h3>
              <Button size="sm" variant="outline" onClick={runTests} disabled={testing}>
                {testing ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Running…</> : tested ? "Re-run" : "Run tests"}
              </Button>
            </div>
            <ul className="space-y-2 text-sm">
              {connectivityTests.map((t) => (
                <li key={t.key} className={`flex items-center justify-between rounded-lg border p-2.5 ${tested ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700" : "border-border bg-background text-muted-foreground"}`}>
                  <span className="flex items-center gap-2">
                    {tested ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    {t.label}
                  </span>
                  <span className="text-xs">{tested ? t.detail : "Pending"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Device registration</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>QR scan</Label>
                <div className="mt-2 grid h-32 place-items-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground">
                  <div className="text-center">
                    <QrCode className="mx-auto h-8 w-8" />
                    <p className="mt-1 text-xs">Point camera at device QR or enter serial below</p>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2"><Label>Serial number *</Label><Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="AL-SN-000123" /></div>
              <div><Label>Hardware version</Label><Input value={hardware} onChange={(e) => setHardware(e.target.value)} /></div>
              <div><Label>Firmware version</Label><Input value={firmware} onChange={(e) => setFirmware(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>SIM / network info</Label><Input value={sim} onChange={(e) => setSim(e.target.value)} placeholder="ICCID or APN" /></div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Assign to pond</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Customer / farmer</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Rahim Uddin" /></div>
              <div>
                <Label>Farm *</Label>
                <Select value={farmId} onValueChange={(v) => { setFarmId(v); setPondId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select farm" /></SelectTrigger>
                  <SelectContent>
                    {MOCK_FARMS.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pond *</Label>
                <Select value={pondId} onValueChange={setPondId} disabled={!farmId}>
                  <SelectTrigger><SelectValue placeholder={farmId ? "Select pond" : "Choose farm first"} /></SelectTrigger>
                  <SelectContent>
                    {pondsForFarm.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Device package</Label>
                <Select value={devicePkg} onValueChange={setDevicePkg}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic buoy</SelectItem>
                    <SelectItem value="standard">Standard buoy + solar</SelectItem>
                    <SelectItem value="pro">Pro buoy + extended sensors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Sensor package</Label>
                <Select value={sensorPkg} onValueChange={setSensorPkg}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">pH + DO + Temp</SelectItem>
                    <SelectItem value="full">Full suite (6 sensors)</SelectItem>
                    <SelectItem value="shrimp">Shrimp pack (+ salinity, ammonia)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Sensor calibration</h3>
            <p className="text-sm text-muted-foreground">Each sensor must have at least one calibration point completed.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {sensors.map((s) => {
                const c = calibrations[s.key];
                const ok = c.single || c.multi;
                return (
                  <div key={s.key} className={`rounded-xl border p-3 ${ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-background"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.ref}</p>
                      </div>
                      {ok && <Check className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <label className="flex items-center gap-2"><Checkbox checked={c.single} onCheckedChange={(v) => setCalibrations({ ...calibrations, [s.key]: { ...c, single: !!v } })} /> Single-point</label>
                      <label className="flex items-center gap-2"><Checkbox checked={c.multi} onCheckedChange={(v) => setCalibrations({ ...calibrations, [s.key]: { ...c, multi: !!v } })} /> Multi-point</label>
                    </div>
                    <Input className="mt-2 h-8 text-xs" placeholder="Offset / notes" value={c.notes} onChange={(e) => setCalibrations({ ...calibrations, [s.key]: { ...c, notes: e.target.value } })} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Finalize</h3>
            <div>
              <Label>Installation notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any anomalies, customer instructions, follow-ups…" />
            </div>
            <div>
              <Label>Technician signature *</Label>
              <div className="flex items-center gap-2">
                <Signature className="h-4 w-4 text-muted-foreground" />
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Type full name to sign" />
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-background p-3 text-sm">
              <p className="mb-2 font-medium">Completion summary</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-emerald-600" /> Installation checklist complete</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-emerald-600" /> Connectivity verified</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-emerald-600" /> Device {serial || "—"} registered</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-emerald-600" /> Assigned to {MOCK_PONDS.find((p) => p.id === pondId)?.name ?? "pond"}</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-emerald-600" /> All {sensors.length} sensors calibrated</li>
              </ul>
            </div>
            <Button className="w-full" onClick={() => { if (!step6Valid) { toast.error("Signature required"); return; } finalize.mutate(); }} disabled={finalize.isPending}>
              {finalize.isPending ? "Registering…" : "Complete setup"}
            </Button>
          </div>
        )}

        <div className="mt-6 flex justify-between border-t border-border/60 pt-4">
          <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          {step < 6 && <Button onClick={next}>Next<ArrowRight className="ml-2 h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
