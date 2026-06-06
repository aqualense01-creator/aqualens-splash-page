import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Wrench,
  Camera,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  WifiOff,
  History,
  CircleDot,
  X,
} from "lucide-react";
import { insforge } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
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

export const Route = createFileRoute("/app/maintenance/$deviceId")({
  head: () => ({ meta: [{ title: "Maintenance Log — Acqua Lence" }] }),
  component: MaintenancePage,
});

type MaintenanceRow = {
  id: string;
  visit_type?: string | null;
  issue_type?: string | null;
  work_performed?: string | null;
  parts_replaced?: string | null;
  device_status_after?: string | null;
  follow_up_required?: boolean | null;
  technician_name?: string | null;
  notes?: string | null;
  photos?: unknown;
  performed_at: string;
};

type MaintenancePhotoDraft = { id: string; file: File; previewUrl: string };
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
const MAX_MAINTENANCE_PHOTO_BYTES = 10 * 1024 * 1024;

const ISSUE_TYPES = [
  "Routine check",
  "Sensor fault",
  "Battery / power",
  "Connectivity",
  "Physical damage",
  "Calibration drift",
  "Other",
] as const;

const STATUS_AFTER = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "low_battery", label: "Low battery" },
  { value: "calibration_due", label: "Calibration due" },
  { value: "maintenance_due", label: "Needs more maintenance" },
] as const;

const emptyForm = (tech: string) => ({
  performed_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16),
  technician_name: tech,
  issue_type: "Routine check",
  work_performed: "",
  parts_replaced: "",
  device_status_after: "online",
  follow_up_required: false,
  notes: "",
});

function dbErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function safeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  return cleaned || "maintenance-photo";
}

function normalizeMaintenancePhotos(value: unknown): MaintenancePhotoRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Partial<MaintenancePhotoRecord>;
    if (typeof record.url !== "string" || !record.url) return [];
    return [
      {
        bucket:
          typeof record.bucket === "string" && record.bucket
            ? record.bucket
            : MAINTENANCE_ATTACHMENTS_BUCKET,
        url: record.url,
        key: typeof record.key === "string" ? record.key : "",
        file_name: typeof record.file_name === "string" ? record.file_name : "Maintenance photo",
        mime_type: typeof record.mime_type === "string" ? record.mime_type : null,
        size_bytes: typeof record.size_bytes === "number" ? record.size_bytes : 0,
        uploaded_at: typeof record.uploaded_at === "string" ? record.uploaded_at : "",
      },
    ];
  });
}

function MaintenancePage() {
  const { deviceId } = Route.useParams();
  const { user, profile, isAdmin, isTechnician } = useAuth();
  const qc = useQueryClient();
  const defaultTech = profile?.full_name ?? user?.email ?? "Technician";
  const canWriteMaintenance = isAdmin || isTechnician;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(defaultTech));
  const [photos, setPhotos] = useState<MaintenancePhotoDraft[]>([]);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      photoUrlsRef.current = [];
    };
  }, []);

  // ── Device header data
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
        last_seen?: string | null;
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

  // ── Maintenance history
  const { data: history } = useQuery({
    queryKey: ["maint-logs", deviceId],
    queryFn: async () => {
      const { data } = await insforge.database
        .from("maintenance_logs")
        .select("*")
        .eq("device_id", deviceId)
        .order("performed_at", { ascending: false });
      return (data ?? []) as MaintenanceRow[];
    },
  });

  // ── Recent open alerts (issue summary)
  const { data: openAlerts } = useQuery({
    queryKey: ["device-open-alerts", deviceId],
    queryFn: async () => {
      const { data } = await insforge.database
        .from("alerts")
        .select("*")
        .eq("device_id", deviceId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as {
        id: string;
        alert_type: string;
        severity?: string;
        message?: string;
        created_at: string;
      }[];
    },
  });

  const lastMaintenance = history?.[0];
  const followUps = useMemo(() => (history ?? []).filter((h) => h.follow_up_required), [history]);

  // Maintenance "due" if no log in the last 90 days OR device flagged maintenance_due
  const maintenanceDue = useMemo(() => {
    if (device?.status === "maintenance_due") return true;
    if (!lastMaintenance) return true;
    const days = (Date.now() - new Date(lastMaintenance.performed_at).getTime()) / 86_400_000;
    return days > 90;
  }, [device?.status, lastMaintenance]);

  const isStale = useMemo(() => {
    if (!device?.last_seen) return true;
    return Date.now() - new Date(device.last_seen).getTime() > 30 * 60_000;
  }, [device?.last_seen]);

  const clearPhotoDrafts = () => {
    photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    photoUrlsRef.current = [];
    setPhotos([]);
  };

  const handlePhotoFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    const accepted: MaintenancePhotoDraft[] = [];
    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file.`);
        continue;
      }
      if (file.size > MAX_MAINTENANCE_PHOTO_BYTES) {
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

  const uploadMaintenancePhotos = async () => {
    const uploaded: MaintenancePhotoRecord[] = [];
    try {
      for (const photo of photos) {
        const key = `${deviceId}/${crypto.randomUUID()}-${safeFileName(photo.file.name)}`;
        const upload = await insforge.storage
          .from(MAINTENANCE_ATTACHMENTS_BUCKET)
          .upload(key, photo.file);
        if (upload.error || !upload.data) {
          throw new Error(dbErrorMessage(upload.error, "Maintenance photo upload failed"));
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

  const save = useMutation({
    mutationFn: async () => {
      if (!canWriteMaintenance) {
        throw new Error("Maintenance logs require technician access.");
      }

      // Validation
      if (!form.performed_at) throw new Error("Visit date/time is required");
      if (!form.technician_name.trim()) throw new Error("Technician name is required");
      if (!form.issue_type) throw new Error("Issue type is required");
      if (!form.work_performed.trim()) throw new Error("Work performed is required");

      const performedAt = new Date(form.performed_at).toISOString();
      const uploadedPhotos = await uploadMaintenancePhotos();
      const { error } = await insforge.database.from("maintenance_logs").insert([
        {
          device_id: deviceId,
          technician_id: user?.id,
          technician_name: form.technician_name.trim().slice(0, 120),
          visit_type: form.issue_type === "Routine check" ? "routine" : "issue",
          issue_type: form.issue_type,
          work_performed: form.work_performed.trim().slice(0, 1000),
          parts_replaced: form.parts_replaced.trim().slice(0, 500) || null,
          device_status_after: form.device_status_after,
          follow_up_required: form.follow_up_required,
          notes: form.notes.trim().slice(0, 1000) || null,
          photos: uploadedPhotos,
          performed_at: performedAt,
        },
      ]);
      if (error) {
        await Promise.all(
          uploadedPhotos.map((photo) =>
            insforge.storage.from(MAINTENANCE_ATTACHMENTS_BUCKET).remove(photo.key),
          ),
        );
        throw new Error(error.message);
      }

      const statusUpdate = await insforge.database
        .from("devices")
        .update({ status: form.device_status_after })
        .eq("id", deviceId);
      if (statusUpdate.error) {
        throw new Error(
          dbErrorMessage(statusUpdate.error, "Maintenance saved, but device status update failed."),
        );
      }
    },
    onSuccess: () => {
      toast.success("Maintenance log saved");
      setForm(emptyForm(defaultTech));
      clearPhotoDrafts();
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["maint-logs", deviceId] });
      qc.invalidateQueries({ queryKey: ["device-detail", deviceId] });
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeader
            title="Maintenance log"
            subtitle={device?.name ?? device?.serial ?? `Device ${deviceId.slice(0, 8)}…`}
          />
          {canWriteMaintenance ? (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button className="gap-1">
                  <Plus className="h-4 w-4" /> Add maintenance log
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Add maintenance log</SheetTitle>
                  <SheetDescription>
                    Record a service visit for {device?.name ?? device?.serial ?? "this device"}.
                  </SheetDescription>
                </SheetHeader>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    save.mutate();
                  }}
                  className="mt-5 grid gap-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Visit date / time *</Label>
                      <Input
                        type="datetime-local"
                        required
                        value={form.performed_at}
                        onChange={(e) => setForm((p) => ({ ...p, performed_at: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Technician *</Label>
                      <Input
                        required
                        maxLength={120}
                        value={form.technician_name}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, technician_name: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Issue type *</Label>
                    <Select
                      value={form.issue_type}
                      onValueChange={(v) => setForm((p) => ({ ...p, issue_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Work performed *</Label>
                    <Textarea
                      required
                      rows={3}
                      maxLength={1000}
                      value={form.work_performed}
                      onChange={(e) => setForm((p) => ({ ...p, work_performed: e.target.value }))}
                      placeholder="Cleaned probes, recalibrated DO sensor…"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Parts replaced</Label>
                    <Input
                      maxLength={500}
                      value={form.parts_replaced}
                      onChange={(e) => setForm((p) => ({ ...p, parts_replaced: e.target.value }))}
                      placeholder="e.g. DO membrane, battery pack"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Photos</Label>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoFiles}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted"
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
                        className="grid h-20 min-w-20 place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <span className="grid justify-items-center gap-1">
                          <Camera className="h-4 w-4" />
                          Add photos
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Device status after maintenance *</Label>
                    <Select
                      value={form.device_status_after}
                      onValueChange={(v) => setForm((p) => ({ ...p, device_status_after: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_AFTER.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Follow-up required</p>
                      <p className="text-[11px] text-muted-foreground">
                        Schedule another visit for this device.
                      </p>
                    </div>
                    <Switch
                      checked={form.follow_up_required}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, follow_up_required: v }))}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      rows={2}
                      maxLength={1000}
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Optional observations"
                    />
                  </div>

                  <SheetFooter className="mt-2 flex-row justify-end gap-2">
                    <SheetClose asChild>
                      <Button type="button" variant="ghost">
                        Cancel
                      </Button>
                    </SheetClose>
                    <Button type="submit" disabled={save.isPending}>
                      {save.isPending ? "Saving…" : "Save log"}
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          ) : (
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Maintenance history is read-only for this account.
            </div>
          )}
        </div>
      </div>

      {/* Header summary */}
      <div className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-6">
        <HeaderField label="Device ID" value={device?.serial ?? deviceId.slice(0, 8)} mono />
        <HeaderField label="Assigned farm" value={farm?.name ?? "—"} />
        <HeaderField label="Assigned pond" value={pond?.name ?? "—"} />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </p>
          <div className="mt-2">
            {device?.status ? (
              <StatusBadge status={device.status} />
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Last seen
          </p>
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-sm font-semibold",
              isStale && "text-amber-600",
            )}
          >
            {isStale && <WifiOff className="h-3.5 w-3.5" />}
            {device?.last_seen ? new Date(device.last_seen).toLocaleString() : "Never"}
          </p>
          {isStale && <p className="text-[10px] text-amber-600">Device may be offline / stale</p>}
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Maintenance
          </p>
          <div className="mt-2">
            <StatusBadge status={maintenanceDue ? "maintenance_due" : "good"} />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {lastMaintenance
                ? `Last: ${new Date(lastMaintenance.performed_at).toLocaleDateString()}`
                : "No service logged"}
            </p>
          </div>
        </div>
      </div>

      {/* Issue summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          icon={AlertTriangle}
          label="Open alerts"
          value={openAlerts?.length ?? 0}
          tone="critical"
        />
        <SummaryCard
          icon={Clock}
          label="Awaiting follow-up"
          value={followUps.length}
          tone="warning"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Total visits"
          value={history?.length ?? 0}
          tone="good"
        />
      </div>

      {(openAlerts?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700">
            <AlertTriangle className="h-4 w-4" /> Active device issues
          </h3>
          <ul className="space-y-1.5 text-sm">
            {openAlerts!.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <CircleDot className="h-3 w-3 text-rose-500" />
                  <span className="font-medium capitalize">{a.alert_type.replace(/_/g, " ")}</span>
                  {a.message && <span className="text-muted-foreground">— {a.message}</span>}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* History */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display text-sm font-semibold">Service history</h3>
        </div>
        {(history ?? []).length === 0 ? (
          <div className="py-10 text-center">
            <Wrench className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No maintenance logged yet.</p>
            <Button className="mt-3" size="sm" onClick={() => setOpen(true)}>
              Add the first log
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Action taken</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Follow-up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history!.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(m.performed_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{m.technician_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{m.issue_type ?? m.visit_type ?? "—"}</TableCell>
                    <TableCell className="max-w-[260px] text-sm">
                      <p className="line-clamp-2">{m.work_performed ?? m.notes ?? "—"}</p>
                      {m.parts_replaced && (
                        <p className="text-[11px] text-muted-foreground">
                          Parts: {m.parts_replaced}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {normalizeMaintenancePhotos(m.photos).length === 0 ? (
                        <span className="text-xs text-muted-foreground">No</span>
                      ) : (
                        <div className="flex -space-x-2">
                          {normalizeMaintenancePhotos(m.photos)
                            .slice(0, 3)
                            .map((photo) => (
                              <a
                                key={photo.key || photo.url}
                                href={photo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block h-9 w-9 overflow-hidden rounded-md border-2 border-card bg-muted"
                                title={photo.file_name}
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.file_name}
                                  className="h-full w-full object-cover"
                                />
                              </a>
                            ))}
                          {normalizeMaintenancePhotos(m.photos).length > 3 && (
                            <span className="grid h-9 w-9 place-items-center rounded-md border-2 border-card bg-muted text-[11px] font-medium text-muted-foreground">
                              +{normalizeMaintenancePhotos(m.photos).length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.device_status_after ? (
                        <StatusBadge status={m.device_status_after} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.follow_up_required ? (
                        <StatusBadge status="warning" />
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  tone: "critical" | "warning" | "good";
}) {
  const toneCls =
    tone === "critical"
      ? "text-rose-600 bg-rose-500/10"
      : tone === "warning"
        ? "text-amber-600 bg-amber-500/10"
        : "text-emerald-600 bg-emerald-500/10";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
      <span className={cn("grid h-10 w-10 place-items-center rounded-xl", toneCls)}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
