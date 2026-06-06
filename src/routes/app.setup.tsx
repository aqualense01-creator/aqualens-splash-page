import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Circle,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Wifi,
  MapPin,
  FlaskConical,
  ClipboardCheck,
  Camera,
  Signature,
  PartyPopper,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { insforge, type Farm, type Pond } from "@/lib/insforge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app/StatusBadge";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/setup")({
  head: () => ({ meta: [{ title: "Setup Device — Acqua Lence" }] }),
  component: SetupPage,
});

const steps = [
  { id: 1, label: "Installation", icon: MapPin },
  { id: 2, label: "Readiness", icon: Wifi },
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
  { key: "network", label: "Network connection", detail: "SIM and antenna recorded" },
  { key: "signal", label: "Signal strength", detail: "Awaiting live telemetry" },
  { key: "cloud", label: "Cloud connection", detail: "Diagnostics will be queued" },
  { key: "ping", label: "Last ping", detail: "Pending first device heartbeat" },
  { key: "data", label: "Data transmission", detail: "Pending first upload" },
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
type SensorKey = (typeof sensors)[number]["key"];
type InstallationPhotoDraft = { id: string; file: File; previewUrl: string };
type MaintenancePhotoRecord = {
  bucket: string;
  url: string;
  key: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  uploaded_at: string;
};

const MAINTENANCE_ATTACHMENTS_BUCKET = "maintenance-attachments";
const MAX_INSTALLATION_PHOTO_BYTES = 10 * 1024 * 1024;
const CALIBRATION_INTERVAL_DAYS = 90;

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

function isMissingDeviceCommandBackend(error: unknown) {
  const message = dbErrorMessage(error, "").toLowerCase();
  return message.includes("enqueue_device_command") || message.includes("schema cache");
}

function sensorTypeFor(key: SensorKey) {
  return key === "temp" ? "temperature" : key;
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Calibration offset must be numeric.");
  return parsed;
}

function safeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  return cleaned || "installation-photo";
}

function SetupPage() {
  const { isAdmin, isTechnician, user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const canRegisterDevices = isAdmin || isTechnician;

  const assignmentsQ = useQuery({
    queryKey: ["setup", "assignments"],
    enabled: canRegisterDevices,
    queryFn: async () => {
      const [farmsRes, pondsRes] = await Promise.all([
        insforge.database.from("farms").select("*").order("name"),
        insforge.database.from("ponds").select("*").order("name"),
      ]);
      assertDbOk(farmsRes, "Failed to load farms");
      assertDbOk(pondsRes, "Failed to load ponds");
      return {
        farms: (farmsRes.data ?? []) as Farm[],
        ponds: (pondsRes.data ?? []) as Pond[],
      };
    },
  });

  // Step 1
  const [installedAt, setInstalledAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [installer, setInstaller] = useState("");
  const [mounting, setMounting] = useState("buoy");
  const [power, setPower] = useState("solar");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photos, setPhotos] = useState<InstallationPhotoDraft[]>([]);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoUrlsRef = useRef<string[]>([]);
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
    Object.fromEntries(
      sensors.map((s) => [s.key, { single: false, multi: false, offset: "", notes: "" }]),
    ),
  );

  // Step 6
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState("");

  const farms = useMemo(() => assignmentsQ.data?.farms ?? [], [assignmentsQ.data?.farms]);
  const ponds = useMemo(() => assignmentsQ.data?.ponds ?? [], [assignmentsQ.data?.ponds]);
  const farmById = useMemo(() => new Map(farms.map((f) => [f.id, f])), [farms]);
  const pondById = useMemo(() => new Map(ponds.map((p) => [p.id, p])), [ponds]);
  const pondsForFarm = useMemo(() => ponds.filter((p) => p.farm_id === farmId), [farmId, ponds]);

  useEffect(() => {
    if (!farmId || farmById.has(farmId)) return;
    setFarmId("");
    setPondId("");
  }, [farmById, farmId]);

  useEffect(() => {
    if (!pondId) return;
    const pond = pondById.get(pondId);
    if (pond && pond.farm_id === farmId) return;
    setPondId("");
  }, [farmId, pondById, pondId]);

  useEffect(() => {
    return () => {
      photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      photoUrlsRef.current = [];
    };
  }, []);

  const allChecked = checklistItems.every((c) => checks[c.key]);
  const step1Valid = !!installer && allChecked;
  const step3Valid = !!serial;
  const step4Valid = !!farmId && !!pondId;
  const step5Valid = sensors.every((s) => calibrations[s.key].single || calibrations[s.key].multi);
  const step6Valid = !!signature;

  const runTests = () => {
    setTesting(false);
    setTested(true);
    toast.success("Readiness checklist recorded");
  };

  const clearPhotoDrafts = () => {
    photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    photoUrlsRef.current = [];
    setPhotos([]);
  };

  const handlePhoto = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    const accepted: InstallationPhotoDraft[] = [];
    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file.`);
        continue;
      }
      if (file.size > MAX_INSTALLATION_PHOTO_BYTES) {
        toast.error(`${file.name} must be 10MB or smaller.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      photoUrlsRef.current.push(previewUrl);
      accepted.push({ id: crypto.randomUUID(), file, previewUrl });
    }

    if (accepted.length === 0) return;
    setPhotos((prev) => [...prev, ...accepted]);
    toast.success(`${accepted.length} photo${accepted.length === 1 ? "" : "s"} added`);
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const removed = prev.find((photo) => photo.id === photoId);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
        photoUrlsRef.current = photoUrlsRef.current.filter((url) => url !== removed.previewUrl);
      }
      return prev.filter((photo) => photo.id !== photoId);
    });
  };

  const uploadInstallationPhotos = async (deviceId: string) => {
    const uploaded: MaintenancePhotoRecord[] = [];

    try {
      for (const photo of photos) {
        const key = `${deviceId}/${crypto.randomUUID()}-${safeFileName(photo.file.name)}`;
        const upload = await insforge.storage
          .from(MAINTENANCE_ATTACHMENTS_BUCKET)
          .upload(key, photo.file);
        if (upload.error || !upload.data) {
          throw new Error(dbErrorMessage(upload.error, "Installation photo upload failed"));
        }

        uploaded.push({
          bucket: MAINTENANCE_ATTACHMENTS_BUCKET,
          url: upload.data.url,
          key: upload.data.key,
          file_name: photo.file.name,
          mime_type: photo.file.type || upload.data.mimeType || null,
          size_bytes: photo.file.size,
          uploaded_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      await Promise.all(
        uploaded.map((photo) =>
          insforge.storage.from(MAINTENANCE_ATTACHMENTS_BUCKET).remove(photo.key),
        ),
      );
      throw error;
    }

    return uploaded;
  };

  const finalize = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Please sign in again before registering a device.");
      const uploadedPhotos: MaintenancePhotoRecord[] = [];
      let createdDeviceId: string | null = null;
      const installedIso = installedAt
        ? new Date(installedAt).toISOString()
        : new Date().toISOString();
      try {
        const deviceRes = await insforge.database
          .from("devices")
          .insert([
            {
              serial: serial.trim(),
              name: serial.trim(),
              hardware_version: hardware.trim() || null,
              firmware_version: firmware.trim() || null,
              farm_id: farmId,
              pond_id: pondId,
              status: "offline",
              battery_pct: null,
              signal_pct: null,
              last_seen: null,
              installed_at: installedIso,
            },
          ])
          .select("*")
          .single();
        assertDbOk(deviceRes, "Device registration failed");

        const device = deviceRes.data as { id: string } | null;
        if (!device?.id) throw new Error("Device was created without a returned ID.");
        createdDeviceId = device.id;

        const sensorRows = sensors.map((sensor) => ({
          device_id: device.id,
          sensor_type: sensorTypeFor(sensor.key),
          status: "ok",
          last_calibrated: installedIso,
          calibration_due: new Date(
            new Date(installedIso).getTime() + CALIBRATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }));
        const sensorsRes = await insforge.database.from("sensors").insert(sensorRows);
        assertDbOk(sensorsRes, "Sensor registration failed");

        const calibrationRows = sensors.map((sensor) => {
          const calibration = calibrations[sensor.key];
          return {
            device_id: device.id,
            sensor_type: sensorTypeFor(sensor.key),
            calibration_value: nullableNumber(calibration.offset),
            technician_id: user.id,
            technician_name: installer.trim() || signature.trim(),
            result: calibration.multi ? "multi_point_complete" : "single_point_complete",
            notes: calibration.notes.trim() || null,
            performed_at: installedIso,
          };
        });
        const calibrationRes = await insforge.database
          .from("calibration_logs")
          .insert(calibrationRows);
        assertDbOk(calibrationRes, "Calibration log save failed");

        uploadedPhotos.push(...(await uploadInstallationPhotos(device.id)));

        const maintenanceRes = await insforge.database.from("maintenance_logs").insert([
          {
            device_id: device.id,
            technician_id: user.id,
            technician_name: installer.trim() || signature.trim(),
            visit_type: "installation",
            issue_type: "Installation",
            work_performed: `Mounted as ${mounting}; power source ${power}; package ${devicePkg}; sensors ${sensorPkg}.`,
            device_status_after: "offline",
            follow_up_required: true,
            notes:
              [
                notes.trim(),
                "Device starts offline until first telemetry heartbeat or diagnostics result.",
                sim.trim() ? `SIM/network: ${sim.trim()}` : "",
                lat.trim() || lng.trim()
                  ? `Location: ${lat.trim() || "n/a"}, ${lng.trim() || "n/a"}`
                  : "",
                `Checklist: ${checklistItems
                  .map((item) => `${item.label}=${checks[item.key] ? "yes" : "no"}`)
                  .join("; ")}`,
              ]
                .filter(Boolean)
                .join("\n") || null,
            photos: uploadedPhotos,
            performed_at: installedIso,
          },
        ]);
        assertDbOk(maintenanceRes, "Installation log save failed");

        const command = await insforge.database.rpc("enqueue_device_command", {
          _device_id: device.id,
          _command_type: "diagnostics",
          _payload: { source: "device_setup", serial: serial.trim() },
          _idempotency_key: crypto.randomUUID(),
        });
        if (command.error && !isMissingDeviceCommandBackend(command.error)) {
          throw new Error(dbErrorMessage(command.error, "Diagnostics command queue failed"));
        }
      } catch (error) {
        await Promise.all(
          uploadedPhotos.map((photo) =>
            insforge.storage.from(MAINTENANCE_ATTACHMENTS_BUCKET).remove(photo.key),
          ),
        );
        if (createdDeviceId) {
          await insforge.database.from("devices").delete().eq("id", createdDeviceId);
        }
        throw error;
      }
    },
    onSuccess: async () => {
      setDone(true);
      toast.success("Device registered successfully");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["devices-page"] }),
        queryClient.invalidateQueries({ queryKey: ["app-alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["app-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["app-live"] }),
      ]);
    },
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
    if (!canAdvance()) {
      toast.error("Complete required items first");
      return;
    }
    setStep((s) => Math.min(6, s + 1));
  };

  const reset = () => {
    setDone(false);
    setStep(1);
    setSerial("");
    setInstaller("");
    setSignature("");
    setChecks(Object.fromEntries(checklistItems.map((c) => [c.key, false])));
    setTested(false);
    clearPhotoDrafts();
    setNotes("");
    setFarmId("");
    setPondId("");
    setCalibrations(
      Object.fromEntries(
        sensors.map((s) => [s.key, { single: false, multi: false, offset: "", notes: "" }]),
      ),
    );
  };

  if (!canRegisterDevices) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Device setup requires technician access"
          subtitle="Farmers can view devices and request help, but installation and calibration are handled by technicians."
          actions={
            <Button asChild>
              <a href="/app/devices">View devices</a>
            </Button>
          }
        />
        <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground shadow-soft">
          Contact your Acqua Lence support team to schedule installation or device assignment.
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center shadow-soft">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-700">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold">Setup complete</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Device <span className="font-semibold text-foreground">{serial}</span> is registered and
            assigned. It will appear in live views after telemetry is received.
          </p>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            <SummaryRow label="Installer" value={installer} />
            <SummaryRow label="Installed at" value={installedAt.replace("T", " ")} />
            <SummaryRow label="Farm" value={farmById.get(farmId)?.name ?? "-"} />
            <SummaryRow label="Pond" value={pondById.get(pondId)?.name ?? "-"} />
            <SummaryRow label="Firmware" value={firmware} />
            <SummaryRow label="Sensors calibrated" value={`${sensors.length}/${sensors.length}`} />
            <SummaryRow label="Photos" value={String(photos.length)} />
          </div>
          <Button className="mt-6" onClick={reset}>
            Register another device
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Device setup"
        subtitle="Install, register, assign and calibrate a new buoy."
      />

      <ol className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-soft">
        {steps.map((s, i) => {
          const isDone = step > s.id,
            active = step === s.id;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <div
                className={`grid h-7 w-7 place-items-center rounded-full border text-[11px] font-semibold ${isDone ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : s.id}
              </div>
              <span className={`text-xs ${active ? "font-semibold" : "text-muted-foreground"}`}>
                {s.label}
              </span>
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
              <div>
                <Label>Installation date/time *</Label>
                <Input
                  type="datetime-local"
                  value={installedAt}
                  onChange={(e) => setInstalledAt(e.target.value)}
                />
              </div>
              <div>
                <Label>Installer name *</Label>
                <Input
                  value={installer}
                  onChange={(e) => setInstaller(e.target.value)}
                  placeholder="Md. Rahim"
                />
              </div>
              <div>
                <Label>Mounting type</Label>
                <Select value={mounting} onValueChange={setMounting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solar">Solar</SelectItem>
                    <SelectItem value="grid">Grid AC</SelectItem>
                    <SelectItem value="battery">Battery only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Latitude</Label>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="22.8456" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="89.5403" />
              </div>
            </div>

            <div>
              <Label>Installation photos</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoFiles}
                />
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <img
                      src={photo.previewUrl}
                      alt={photo.file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-muted-foreground shadow-sm hover:text-foreground"
                      aria-label={`Remove ${photo.file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handlePhoto}
                  className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Camera className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 bg-background p-3">
              <p className="text-sm font-medium">Required checks</p>
              {checklistItems.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checks[c.key]}
                    onCheckedChange={(v) => setChecks({ ...checks, [c.key]: !!v })}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
              {!allChecked && (
                <p className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" /> All checks required to continue
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Connectivity readiness</h3>
              <Button size="sm" variant="outline" onClick={runTests} disabled={testing}>
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Recording…
                  </>
                ) : tested ? (
                  "Record again"
                ) : (
                  "Record readiness"
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Live signal, ping, and upload status are confirmed after registration through the
              diagnostics queue and first telemetry heartbeat.
            </p>
            <ul className="space-y-2 text-sm">
              {connectivityTests.map((t) => (
                <li
                  key={t.key}
                  className={`flex items-center justify-between rounded-lg border p-2.5 ${tested ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700" : "border-border bg-background text-muted-foreground"}`}
                >
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
              <div className="sm:col-span-2">
                <Label>Serial number *</Label>
                <Input
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  placeholder="AL-SN-000123"
                />
              </div>
              <div>
                <Label>Hardware version</Label>
                <Input value={hardware} onChange={(e) => setHardware(e.target.value)} />
              </div>
              <div>
                <Label>Firmware version</Label>
                <Input value={firmware} onChange={(e) => setFirmware(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>SIM / network info</Label>
                <Input
                  value={sim}
                  onChange={(e) => setSim(e.target.value)}
                  placeholder="ICCID or APN"
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Assign to pond</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Customer / farmer</Label>
                <Input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Rahim Uddin"
                />
              </div>
              <div>
                <Label>Farm *</Label>
                <Select
                  value={farmId}
                  onValueChange={(v) => {
                    setFarmId(v);
                    setPondId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select farm" />
                  </SelectTrigger>
                  <SelectContent>
                    {farms.length === 0 && (
                      <SelectItem value="no-farms" disabled>
                        {assignmentsQ.isLoading ? "Loading farms" : "No farms available"}
                      </SelectItem>
                    )}
                    {farms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pond *</Label>
                <Select value={pondId} onValueChange={setPondId} disabled={!farmId}>
                  <SelectTrigger>
                    <SelectValue placeholder={farmId ? "Select pond" : "Choose farm first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {pondsForFarm.length === 0 && (
                      <SelectItem value="no-ponds" disabled>
                        {farmId ? "No ponds for this farm" : "Choose farm first"}
                      </SelectItem>
                    )}
                    {pondsForFarm.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Device package</Label>
                <Select value={devicePkg} onValueChange={setDevicePkg}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
            <p className="text-sm text-muted-foreground">
              Each sensor must have at least one calibration point completed.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {sensors.map((s) => {
                const c = calibrations[s.key];
                const ok = c.single || c.multi;
                return (
                  <div
                    key={s.key}
                    className={`rounded-xl border p-3 ${ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-background"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.ref}</p>
                      </div>
                      {ok && <Check className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={c.single}
                          onCheckedChange={(v) =>
                            setCalibrations({ ...calibrations, [s.key]: { ...c, single: !!v } })
                          }
                        />{" "}
                        Single-point
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={c.multi}
                          onCheckedChange={(v) =>
                            setCalibrations({ ...calibrations, [s.key]: { ...c, multi: !!v } })
                          }
                        />{" "}
                        Multi-point
                      </label>
                    </div>
                    <Input
                      className="mt-2 h-8 text-xs"
                      inputMode="decimal"
                      placeholder="Calibration offset"
                      value={c.offset}
                      onChange={(e) =>
                        setCalibrations({
                          ...calibrations,
                          [s.key]: { ...c, offset: e.target.value },
                        })
                      }
                    />
                    <Input
                      className="mt-2 h-8 text-xs"
                      placeholder="Calibration notes"
                      value={c.notes}
                      onChange={(e) =>
                        setCalibrations({
                          ...calibrations,
                          [s.key]: { ...c, notes: e.target.value },
                        })
                      }
                    />
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
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any anomalies, customer instructions, follow-ups…"
              />
            </div>
            <div>
              <Label>Technician signature *</Label>
              <div className="flex items-center gap-2">
                <Signature className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type full name to sign"
                />
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-background p-3 text-sm">
              <p className="mb-2 font-medium">Completion summary</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-600" /> Installation checklist complete
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-600" /> Connectivity readiness recorded
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-600" /> Device {serial || "—"} registered
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-600" /> Assigned to{" "}
                  {pondById.get(pondId)?.name ?? "pond"}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-600" /> All {sensors.length} sensors
                  calibrated
                </li>
              </ul>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!step6Valid) {
                  toast.error("Signature required");
                  return;
                }
                finalize.mutate();
              }}
              disabled={finalize.isPending}
            >
              {finalize.isPending ? "Registering…" : "Complete setup"}
            </Button>
          </div>
        )}

        <div className="mt-6 flex justify-between border-t border-border/60 pt-4">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {step < 6 && (
            <Button onClick={next}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
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
