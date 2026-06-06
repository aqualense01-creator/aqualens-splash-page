import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Waves,
  MapPin,
  Pencil,
  Archive,
  Search,
  Cpu,
  SlidersHorizontal,
  Building2,
  Fish,
} from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, EmptyState, StatusBadge } from "@/components/app/StatusBadge";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  insforge,
  type Device as DbDevice,
  type Farm as DbFarm,
  type Pond as DbPond,
  type PondStatus,
} from "@/lib/insforge";

export const Route = createFileRoute("/app/farms")({
  head: () => ({ meta: [{ title: "Farms & Ponds — Acqua Lence" }] }),
  component: FarmsPage,
});

// ----- Types -----
type FarmStatus = "active" | "suspended";
type PondKind = "earthen" | "lined" | "concrete" | "cage";
type WaterKind = "fresh" | "brackish" | "marine";

type Farm = {
  id: string;
  owner_id: string;
  name: string;
  district: string;
  location: string;
  status: FarmStatus;
};

type Pond = {
  id: string;
  name: string;
  farm_id: string;
  species: string;
  pond_type: PondKind;
  water_type: WaterKind;
  area_m2: number;
  depth_m: number;
  stocking_date: string;
  stocking_density: number;
  device_id: string | null;
  threshold_preset: string;
  status: PondStatus;
  last_update: string;
};

type Device = { id: string; serial: string; pond_id: string | null; farm_id: string | null };
type DbFarmRow = DbFarm & { updated_at?: string | null };
type DbPondRow = DbPond & { updated_at?: string | null };
type FarmFormData = Omit<Farm, "id" | "owner_id"> & { id?: string };
type PondFormData = Omit<Pond, "id" | "status" | "last_update"> & { id?: string };

type FarmsQueryData = {
  farms: DbFarmRow[];
  ponds: DbPondRow[];
  devices: DbDevice[];
};

const POND_KINDS: PondKind[] = ["earthen", "lined", "concrete", "cage"];
const WATER_KINDS: WaterKind[] = ["fresh", "brackish", "marine"];

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

function toFarmStatus(status: unknown): FarmStatus {
  return status === "suspended" ? "suspended" : "active";
}

function toPondKind(value: unknown): PondKind {
  return typeof value === "string" && POND_KINDS.includes(value as PondKind)
    ? (value as PondKind)
    : "earthen";
}

function toWaterKind(value: unknown): WaterKind {
  return typeof value === "string" && WATER_KINDS.includes(value as WaterKind)
    ? (value as WaterKind)
    : "fresh";
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: number) {
  return Number.isFinite(value) ? value : null;
}

function toNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toFarmView(farm: DbFarmRow): Farm {
  return {
    id: farm.id,
    owner_id: farm.owner_id,
    name: farm.name,
    district: farm.district ?? "",
    location: farm.location ?? "",
    status: toFarmStatus(farm.status),
  };
}

function toDeviceView(device: DbDevice): Device {
  return {
    id: device.id,
    serial: device.serial,
    pond_id: device.pond_id,
    farm_id: device.farm_id,
  };
}

function toPondView(pond: DbPondRow, devices: Device[]): Pond {
  const linkedDevice = devices.find((device) => device.pond_id === pond.id);
  return {
    id: pond.id,
    name: pond.name,
    farm_id: pond.farm_id,
    species: pond.species ?? "",
    pond_type: toPondKind(pond.pond_type),
    water_type: toWaterKind(pond.water_type),
    area_m2: toNumber(pond.area_m2),
    depth_m: toNumber(pond.depth_m),
    stocking_date: pond.stocking_date ?? "",
    stocking_density: toNumber(pond.stocking_density),
    device_id: linkedDevice?.id ?? null,
    threshold_preset: pond.threshold_preset ?? "fish_default",
    status: pond.status,
    last_update: pond.updated_at ?? pond.stocking_date ?? new Date().toISOString(),
  };
}

function buildPondPayload(data: PondFormData) {
  return {
    farm_id: data.farm_id,
    name: data.name.trim(),
    pond_type: data.pond_type,
    water_type: data.water_type,
    species: toNullableText(data.species),
    area_m2: toNullableNumber(data.area_m2),
    depth_m: toNullableNumber(data.depth_m),
    stocking_date: data.stocking_date || null,
    stocking_density: toNullableNumber(data.stocking_density),
    threshold_preset: data.threshold_preset || "fish_default",
  };
}

async function persistDeviceAssignment({
  pondId,
  farmId,
  deviceId,
}: {
  pondId: string;
  farmId: string;
  deviceId: string | null;
}) {
  const clearExisting = await insforge.database
    .from("devices")
    .update({ pond_id: null, farm_id: farmId })
    .eq("pond_id", pondId);
  assertDbOk(clearExisting, "Failed to clear the current device assignment");

  if (!deviceId) return;

  const assignDevice = await insforge.database
    .from("devices")
    .update({ pond_id: pondId, farm_id: farmId })
    .eq("id", deviceId);
  assertDbOk(assignDevice, "Failed to assign the device");
}

const BD_DISTRICTS = [
  "Khulna",
  "Satkhira",
  "Bagerhat",
  "Cox's Bazar",
  "Chattogram",
  "Barishal",
  "Patuakhali",
  "Noakhali",
  "Mymensingh",
  "Dhaka",
];

// ----- Page -----
function FarmsPage() {
  const { lang } = useI18n();
  const t = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const { user, isAdmin, isTechnician, isFarmer, isFarmManager } = useAuth();
  const queryClient = useQueryClient();

  const farmsQuery = useQuery({
    queryKey: ["app-farms", "data"],
    enabled: !!user,
    queryFn: async (): Promise<FarmsQueryData> => {
      const [farmsRes, pondsRes, devicesRes] = await Promise.all([
        insforge.database.from("farms").select("*").order("created_at", { ascending: false }),
        insforge.database.from("ponds").select("*").order("created_at", { ascending: false }),
        insforge.database.from("devices").select("*").order("created_at", { ascending: false }),
      ]);
      assertDbOk(farmsRes, "Failed to load farms");
      assertDbOk(pondsRes, "Failed to load ponds");
      assertDbOk(devicesRes, "Failed to load devices");
      return {
        farms: (farmsRes.data ?? []) as DbFarmRow[],
        ponds: (pondsRes.data ?? []) as DbPondRow[],
        devices: (devicesRes.data ?? []) as DbDevice[],
      };
    },
  });

  const farms = useMemo(
    () => (farmsQuery.data?.farms ?? []).map(toFarmView),
    [farmsQuery.data?.farms],
  );
  const devices = useMemo(
    () => (farmsQuery.data?.devices ?? []).map(toDeviceView),
    [farmsQuery.data?.devices],
  );
  const ponds = useMemo(
    () => (farmsQuery.data?.ponds ?? []).map((pond) => toPondView(pond, devices)),
    [devices, farmsQuery.data?.ponds],
  );
  const canManageFarmRecords = isAdmin || isFarmer || isFarmManager;
  const canAssignDevices = isAdmin || isTechnician || isFarmer || isFarmManager;
  const canUsePondActions = canManageFarmRecords || canAssignDevices;

  const [tab, setTab] = useState<"farms" | "ponds">("farms");
  const [search, setSearch] = useState("");
  const [farmStatusFilter, setFarmStatusFilter] = useState<"all" | FarmStatus>("all");
  const [pondStatusFilter, setPondStatusFilter] = useState<"all" | PondStatus>("all");
  const [pondFarmFilter, setPondFarmFilter] = useState<string>("all");

  const [farmDrawer, setFarmDrawer] = useState<{ mode: "add" | "edit"; farm?: Farm } | null>(null);
  const [pondDrawer, setPondDrawer] = useState<{ mode: "add" | "edit"; pond?: Pond } | null>(null);
  const [assignDrawer, setAssignDrawer] = useState<Pond | null>(null);
  const [thresholdDrawer, setThresholdDrawer] = useState<Pond | null>(null);
  const [archiveConfirmFarm, setArchiveConfirmFarm] = useState<Farm | null>(null);

  useEffect(() => {
    if (pondFarmFilter === "all") return;
    if (farms.some((farm) => farm.id === pondFarmFilter)) return;
    setPondFarmFilter("all");
  }, [farms, pondFarmFilter]);

  const filteredFarms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return farms.filter((f) => {
      if (farmStatusFilter !== "all" && f.status !== farmStatusFilter) return false;
      if (!q) return true;
      return [f.name, f.district, f.location].some((x) => x.toLowerCase().includes(q));
    });
  }, [farms, search, farmStatusFilter]);

  const filteredPonds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ponds.filter((p) => {
      if (pondStatusFilter !== "all" && p.status !== pondStatusFilter) return false;
      if (pondFarmFilter !== "all" && p.farm_id !== pondFarmFilter) return false;
      if (!q) return true;
      return [p.name, p.species, farms.find((f) => f.id === p.farm_id)?.name ?? ""].some((x) =>
        x.toLowerCase().includes(q),
      );
    });
  }, [ponds, search, pondStatusFilter, pondFarmFilter, farms]);

  // ----- Handlers -----
  const refreshFarms = () => queryClient.invalidateQueries({ queryKey: ["app-farms", "data"] });

  const saveFarmMutation = useMutation({
    mutationFn: async (data: FarmFormData) => {
      if (!user?.id) throw new Error("Please sign in again before saving a farm.");
      const payload = {
        name: data.name.trim(),
        district: toNullableText(data.district),
        location: toNullableText(data.location),
        status: data.status,
      };

      const result = data.id
        ? await insforge.database.from("farms").update(payload).eq("id", data.id)
        : await insforge.database.from("farms").insert([{ ...payload, owner_id: user.id }]);
      assertDbOk(result, data.id ? "Failed to update farm" : "Failed to create farm");
    },
    onSuccess: (_data, form) => {
      toast.success(
        form.id ? t("Farm updated", "ফার্ম আপডেট হয়েছে") : t("Farm created", "ফার্ম তৈরি হয়েছে"),
      );
      setFarmDrawer(null);
      void refreshFarms();
    },
    onError: (error: Error) => toast.error(error.message || "Could not save farm"),
  });

  const archiveFarmMutation = useMutation({
    mutationFn: async (farm: Farm) => {
      const nextStatus: FarmStatus = farm.status === "active" ? "suspended" : "active";
      const result = await insforge.database
        .from("farms")
        .update({ status: nextStatus })
        .eq("id", farm.id);
      assertDbOk(result, "Failed to update farm status");
      return nextStatus;
    },
    onSuccess: (nextStatus) => {
      toast.success(
        nextStatus === "suspended"
          ? t("Farm archived", "ফার্ম আর্কাইভ করা হয়েছে")
          : t("Farm restored", "ফার্ম পুনরুদ্ধার করা হয়েছে"),
      );
      setArchiveConfirmFarm(null);
      void refreshFarms();
    },
    onError: (error: Error) => toast.error(error.message || "Could not update farm status"),
  });

  const savePondMutation = useMutation({
    mutationFn: async (data: PondFormData) => {
      const payload = buildPondPayload(data);
      if (data.id) {
        const updateResult = await insforge.database
          .from("ponds")
          .update(payload)
          .eq("id", data.id);
        assertDbOk(updateResult, "Failed to update pond");
        await persistDeviceAssignment({
          pondId: data.id,
          farmId: data.farm_id,
          deviceId: data.device_id,
        });
        return;
      }

      const insertResult = await insforge.database
        .from("ponds")
        .insert([payload])
        .select("*")
        .single();
      assertDbOk(insertResult, "Failed to create pond");
      const insertedPond = insertResult.data as DbPondRow | null;
      if (!insertedPond?.id) throw new Error("Pond was created, but its ID was not returned.");
      await persistDeviceAssignment({
        pondId: insertedPond.id,
        farmId: data.farm_id,
        deviceId: data.device_id,
      });
    },
    onSuccess: (_data, form) => {
      toast.success(
        form.id ? t("Pond updated", "পুকুর আপডেট হয়েছে") : t("Pond created", "পুকুর তৈরি হয়েছে"),
      );
      setPondDrawer(null);
      void refreshFarms();
    },
    onError: (error: Error) => toast.error(error.message || "Could not save pond"),
  });

  const assignDeviceMutation = useMutation({
    mutationFn: async ({ pond, deviceId }: { pond: Pond; deviceId: string | null }) => {
      await persistDeviceAssignment({ pondId: pond.id, farmId: pond.farm_id, deviceId });
    },
    onSuccess: () => {
      toast.success(t("Device assigned", "ডিভাইস বরাদ্দ হয়েছে"));
      setAssignDrawer(null);
      void refreshFarms();
    },
    onError: (error: Error) => toast.error(error.message || "Could not assign device"),
  });

  const saveThresholdMutation = useMutation({
    mutationFn: async ({ pond, preset }: { pond: Pond; preset: string }) => {
      const result = await insforge.database
        .from("ponds")
        .update({ threshold_preset: preset })
        .eq("id", pond.id);
      assertDbOk(result, "Failed to update thresholds");
    },
    onSuccess: () => {
      toast.success(t("Thresholds updated", "থ্রেশহোল্ড আপডেট হয়েছে"));
      setThresholdDrawer(null);
      void refreshFarms();
    },
    onError: (error: Error) => toast.error(error.message || "Could not update thresholds"),
  });

  const saveFarm = (data: FarmFormData) => saveFarmMutation.mutate(data);
  const archiveFarm = (farm: Farm) => archiveFarmMutation.mutate(farm);
  const savePond = (data: PondFormData) => savePondMutation.mutate(data);
  const assignDevice = (pond: Pond, deviceId: string | null) =>
    assignDeviceMutation.mutate({ pond, deviceId });

  const farmsHeaderActions = (
    <>
      <Button variant="outline" onClick={() => setTab("ponds")} className="hidden sm:inline-flex">
        <Fish className="mr-2 h-4 w-4" /> {t("Manage ponds", "পুকুর ব্যবস্থাপনা")}
      </Button>
      {canManageFarmRecords && (
        <Button onClick={() => setFarmDrawer({ mode: "add" })}>
          <Plus className="mr-2 h-4 w-4" /> {t("Add farm", "ফার্ম যোগ করুন")}
        </Button>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("Farms & Ponds", "ফার্ম ও পুকুর")}
        subtitle={t(
          "Organize farms, ponds and assigned devices.",
          "ফার্ম, পুকুর ও ডিভাইস ব্যবস্থাপনা করুন।",
        )}
        actions={
          tab === "farms" ? (
            farmsHeaderActions
          ) : canManageFarmRecords ? (
            <Button onClick={() => setPondDrawer({ mode: "add" })}>
              <Plus className="mr-2 h-4 w-4" /> {t("Add pond", "পুকুর যোগ করুন")}
            </Button>
          ) : undefined
        }
      />

      {farmsQuery.isLoading ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={t("Loading farms", "ফার্ম লোড হচ্ছে")}
          description={t(
            "We are loading your farms, ponds and devices.",
            "আপনার ফার্ম, পুকুর ও ডিভাইস লোড হচ্ছে।",
          )}
        />
      ) : farmsQuery.isError ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={t("Could not load farms", "ফার্ম লোড করা যায়নি")}
          description={
            farmsQuery.error instanceof Error
              ? farmsQuery.error.message
              : t("Please try again.", "আবার চেষ্টা করুন।")
          }
          action={
            <Button variant="outline" onClick={() => void farmsQuery.refetch()}>
              {t("Try again", "আবার চেষ্টা করুন")}
            </Button>
          }
        />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "farms" | "ponds")} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="farms">
              <Building2 className="mr-2 h-4 w-4" /> {t("Farms", "ফার্ম")} ({farms.length})
            </TabsTrigger>
            <TabsTrigger value="ponds">
              <Waves className="mr-2 h-4 w-4" /> {t("Ponds", "পুকুর")} ({ponds.length})
            </TabsTrigger>
          </TabsList>

          {/* Search + filters */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === "farms"
                    ? t("Search farms, district, location…", "ফার্ম, জেলা, অবস্থান খুঁজুন…")
                    : t("Search ponds, species, farm…", "পুকুর, প্রজাতি, ফার্ম খুঁজুন…")
                }
                className="pl-9"
              />
            </div>
            {tab === "farms" ? (
              <Select
                value={farmStatusFilter}
                onValueChange={(v) => setFarmStatusFilter(v as "all" | FarmStatus)}
              >
                <SelectTrigger className="sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All statuses", "সব স্ট্যাটাস")}</SelectItem>
                  <SelectItem value="active">{t("Active", "সক্রিয়")}</SelectItem>
                  <SelectItem value="suspended">{t("Suspended", "স্থগিত")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <>
                <Select value={pondFarmFilter} onValueChange={setPondFarmFilter}>
                  <SelectTrigger className="sm:w-44">
                    <SelectValue placeholder="Farm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All farms", "সব ফার্ম")}</SelectItem>
                    {farms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={pondStatusFilter}
                  onValueChange={(v) => setPondStatusFilter(v as "all" | PondStatus)}
                >
                  <SelectTrigger className="sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All statuses", "সব স্ট্যাটাস")}</SelectItem>
                    <SelectItem value="good">{t("Good", "ভালো")}</SelectItem>
                    <SelectItem value="warning">{t("Warning", "সতর্ক")}</SelectItem>
                    <SelectItem value="critical">{t("Critical", "গুরুতর")}</SelectItem>
                    <SelectItem value="offline">{t("Offline", "অফলাইন")}</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          <TabsContent value="farms" className="mt-0">
            {filteredFarms.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title={t("No farms found", "কোনো ফার্ম নেই")}
                description={t(
                  "Add your first farm to group ponds and devices.",
                  "প্রথম ফার্ম যোগ করুন।",
                )}
                action={
                  canManageFarmRecords ? (
                    <Button onClick={() => setFarmDrawer({ mode: "add" })}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("Add farm", "ফার্ম যোগ করুন")}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Farm name", "ফার্মের নাম")}</TableHead>
                        <TableHead>{t("District", "জেলা")}</TableHead>
                        <TableHead>{t("Location", "অবস্থান")}</TableHead>
                        <TableHead className="text-center">{t("Ponds", "পুকুর")}</TableHead>
                        <TableHead>{t("Status", "অবস্থা")}</TableHead>
                        {canManageFarmRecords && (
                          <TableHead className="text-right">{t("Actions", "কর্ম")}</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFarms.map((f) => {
                        const count = ponds.filter((p) => p.farm_id === f.id).length;
                        return (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium">{f.name}</TableCell>
                            <TableCell className="text-muted-foreground">{f.district}</TableCell>
                            <TableCell className="text-muted-foreground">{f.location}</TableCell>
                            <TableCell className="text-center tabular-nums">{count}</TableCell>
                            <TableCell>
                              <StatusBadge status={f.status} />
                            </TableCell>
                            {canManageFarmRecords && (
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setFarmDrawer({ mode: "edit", farm: f })}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setArchiveConfirmFarm(f)}
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {filteredFarms.map((f) => {
                    const count = ponds.filter((p) => p.farm_id === f.id).length;
                    return (
                      <div
                        key={f.id}
                        className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-base font-semibold">{f.name}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {f.district} · {f.location}
                            </p>
                          </div>
                          <StatusBadge status={f.status} />
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {count} {t("ponds", "পুকুর")}
                          </span>
                          {canManageFarmRecords && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setFarmDrawer({ mode: "edit", farm: f })}
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                {t("Edit", "এডিট")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setArchiveConfirmFarm(f)}
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="ponds" className="mt-0">
            {filteredPonds.length === 0 ? (
              <EmptyState
                icon={<Waves className="h-6 w-6" />}
                title={t("No ponds found", "কোনো পুকুর নেই")}
                description={t("Add your first pond to start monitoring.", "প্রথম পুকুর যোগ করুন।")}
                action={
                  canManageFarmRecords ? (
                    <Button onClick={() => setPondDrawer({ mode: "add" })}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("Add pond", "পুকুর যোগ করুন")}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-soft md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Pond", "পুকুর")}</TableHead>
                        <TableHead>{t("Farm", "ফার্ম")}</TableHead>
                        <TableHead>{t("Species", "প্রজাতি")}</TableHead>
                        <TableHead>{t("Type", "ধরন")}</TableHead>
                        <TableHead>{t("Water", "পানি")}</TableHead>
                        <TableHead>{t("Stocked", "মজুদ")}</TableHead>
                        <TableHead>{t("Device", "ডিভাইস")}</TableHead>
                        <TableHead>{t("Status", "অবস্থা")}</TableHead>
                        <TableHead>{t("Updated", "আপডেট")}</TableHead>
                        {canUsePondActions && (
                          <TableHead className="text-right">{t("Actions", "কর্ম")}</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPonds.map((p) => {
                        const dev = devices.find((d) => d.id === p.device_id);
                        const farmName = farms.find((f) => f.id === p.farm_id)?.name ?? "—";
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              <Link
                                to="/app/ponds/$pondId"
                                params={{ pondId: p.id }}
                                className="hover:underline"
                              >
                                {p.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{farmName}</TableCell>
                            <TableCell>{p.species}</TableCell>
                            <TableCell className="capitalize">{p.pond_type}</TableCell>
                            <TableCell className="capitalize">{p.water_type}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {p.stocking_date}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {dev?.serial ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={p.status} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {timeAgo(p.last_update, lang)}
                            </TableCell>
                            {canUsePondActions && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-0.5">
                                  {canManageFarmRecords && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title={t("Edit", "এডিট")}
                                      onClick={() => setPondDrawer({ mode: "edit", pond: p })}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {canAssignDevices && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title={t("Assign device", "ডিভাইস বরাদ্দ")}
                                      onClick={() => setAssignDrawer(p)}
                                    >
                                      <Cpu className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {canManageFarmRecords && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title={t("Set thresholds", "থ্রেশহোল্ড")}
                                      onClick={() => setThresholdDrawer(p)}
                                    >
                                      <SlidersHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {filteredPonds.map((p) => {
                    const dev = devices.find((d) => d.id === p.device_id);
                    const farmName = farms.find((f) => f.id === p.farm_id)?.name ?? "—";
                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to="/app/ponds/$pondId"
                              params={{ pondId: p.id }}
                              className="font-display text-base font-semibold hover:underline"
                            >
                              {p.name}
                            </Link>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {farmName} · {p.species}
                            </p>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <dt className="text-muted-foreground">{t("Type", "ধরন")}</dt>
                            <dd className="capitalize">
                              {p.pond_type} / {p.water_type}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">{t("Stocked", "মজুদ")}</dt>
                            <dd>{p.stocking_date}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-muted-foreground">{t("Device", "ডিভাইস")}</dt>
                            <dd className="font-mono">{dev?.serial ?? "—"}</dd>
                          </div>
                        </dl>
                        {canUsePondActions && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {canManageFarmRecords && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPondDrawer({ mode: "edit", pond: p })}
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                {t("Edit", "এডিট")}
                              </Button>
                            )}
                            {canAssignDevices && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAssignDrawer(p)}
                              >
                                <Cpu className="mr-1.5 h-3.5 w-3.5" />
                                {t("Device", "ডিভাইস")}
                              </Button>
                            )}
                            {canManageFarmRecords && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setThresholdDrawer(p)}
                              >
                                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                                {t("Thresholds", "থ্রেশহোল্ড")}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {farmDrawer && (
        <FarmDrawer
          mode={farmDrawer.mode}
          initial={farmDrawer.farm}
          onClose={() => setFarmDrawer(null)}
          onSave={saveFarm}
          t={t}
        />
      )}
      {pondDrawer && (
        <PondDrawer
          mode={pondDrawer.mode}
          initial={pondDrawer.pond}
          farms={farms}
          devices={devices}
          onClose={() => setPondDrawer(null)}
          onSave={savePond}
          t={t}
        />
      )}
      {assignDrawer && (
        <AssignDeviceDrawer
          pond={assignDrawer}
          devices={devices}
          onClose={() => setAssignDrawer(null)}
          onAssign={(devId) => assignDevice(assignDrawer, devId)}
          t={t}
        />
      )}
      {thresholdDrawer && (
        <ThresholdDrawer
          pond={thresholdDrawer}
          onClose={() => setThresholdDrawer(null)}
          onSave={(preset) => {
            saveThresholdMutation.mutate({ pond: thresholdDrawer, preset });
          }}
          t={t}
        />
      )}

      <AlertDialog
        open={!!archiveConfirmFarm}
        onOpenChange={(o) => !o && setArchiveConfirmFarm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archiveConfirmFarm?.status === "active"
                ? t("Archive farm?", "ফার্মটি কি আর্কাইভ করবেন?")
                : t("Restore farm?", "ফার্মটি কি পুনরুদ্ধার করবেন?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiveConfirmFarm?.status === "active"
                ? t(
                    "Archiving this farm will suspend its operations. You can restore it later.",
                    "এই খামারটি আর্কাইভ করলে এর কার্যক্রম স্থগিত হবে। আপনি পরে এটি পুনরুদ্ধার করতে পারবেন।",
                  )
                : t(
                    "Restoring this farm will reactivate its operations.",
                    "এই খামারটি পুনরুদ্ধার করলে এর কার্যক্রম পুনরায় সক্রিয় হবে।",
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel", "বাতিল")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={archiveFarmMutation.isPending}
              onClick={() => {
                if (archiveConfirmFarm) {
                  archiveFarm(archiveConfirmFarm);
                }
              }}
            >
              {archiveConfirmFarm?.status === "active"
                ? t("Archive", "আর্কাইভ")
                : t("Restore", "পুনরুদ্ধার")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ----- Helpers -----
function timeAgo(iso: string, lang: "en" | "bn") {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return lang === "bn" ? "এইমাত্র" : "just now";
  if (mins < 60) return lang === "bn" ? `${mins} মি আগে` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return lang === "bn" ? `${hrs} ঘ আগে` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return lang === "bn" ? `${days} দিন আগে` : `${days}d ago`;
}

type T = (en: string, bn: string) => string;

// ----- Farm drawer -----
function FarmDrawer({
  mode,
  initial,
  onClose,
  onSave,
  t,
}: {
  mode: "add" | "edit";
  initial?: Farm;
  onClose: () => void;
  onSave: (data: FarmFormData) => void;
  t: T;
}) {
  const [form, setForm] = useState<FarmFormData>({
    id: initial?.id,
    name: initial?.name ?? "",
    district: initial?.district ?? "Khulna",
    location: initial?.location ?? "",
    status: initial?.status ?? "active",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t("Farm name is required", "ফার্মের নাম প্রয়োজন");
    if (!form.location.trim()) e.location = t("Location is required", "অবস্থান প্রয়োজন");
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave(form);
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {mode === "add" ? t("Add farm", "ফার্ম যোগ করুন") : t("Edit farm", "ফার্ম এডিট")}
          </SheetTitle>
          <SheetDescription>
            {t("Farms group your ponds and devices.", "ফার্ম আপনার পুকুর ও ডিভাইস গ্রুপ করে।")}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <Field label={t("Farm name", "ফার্মের নাম") + " *"} error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t("District", "জেলা")}>
            <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BD_DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label={t("Location", "অবস্থান") + " *"}
            error={errors.location}
            hint={t("Village, upazila or coordinates.", "গ্রাম, উপজেলা বা স্থানাঙ্ক।")}
          >
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>
          <Field label={t("Status", "অবস্থা")}>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as FarmStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("Active", "সক্রিয়")}</SelectItem>
                <SelectItem value="suspended">{t("Suspended", "স্থগিত")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <SheetFooter className="mt-6 gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel", "বাতিল")}
          </Button>
          <Button onClick={submit}>
            {mode === "add" ? t("Create farm", "ফার্ম তৈরি") : t("Save changes", "সংরক্ষণ")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ----- Pond drawer -----
function PondDrawer({
  mode,
  initial,
  farms,
  devices,
  onClose,
  onSave,
  t,
}: {
  mode: "add" | "edit";
  initial?: Pond;
  farms: Farm[];
  devices: Device[];
  onClose: () => void;
  onSave: (data: PondFormData) => void;
  t: T;
}) {
  const [form, setForm] = useState({
    id: initial?.id,
    name: initial?.name ?? "",
    farm_id: initial?.farm_id ?? farms[0]?.id ?? "",
    species: initial?.species ?? "Tilapia",
    pond_type: initial?.pond_type ?? ("earthen" as Pond["pond_type"]),
    water_type: initial?.water_type ?? ("fresh" as Pond["water_type"]),
    area_m2: initial?.area_m2 ?? 1000,
    depth_m: initial?.depth_m ?? 1.5,
    stocking_date: initial?.stocking_date ?? new Date().toISOString().slice(0, 10),
    stocking_density: initial?.stocking_density ?? 10,
    device_id: initial?.device_id ?? null,
    threshold_preset: initial?.threshold_preset ?? "fish_default",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const availableDevices = devices.filter((d) => !d.pond_id || d.id === initial?.device_id);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t("Pond name is required", "পুকুরের নাম প্রয়োজন");
    if (!form.farm_id) e.farm_id = t("Select a farm", "ফার্ম নির্বাচন করুন");
    if (!form.species.trim()) e.species = t("Species is required", "প্রজাতি প্রয়োজন");
    if (!form.area_m2 || form.area_m2 <= 0)
      e.area_m2 = t("Area must be > 0", "এলাকা ০ এর বেশি হতে হবে");
    if (!form.depth_m || form.depth_m <= 0)
      e.depth_m = t("Depth must be > 0", "গভীরতা ০ এর বেশি হতে হবে");
    if (!form.stocking_date)
      e.stocking_date = t("Stocking date is required", "মজুদের তারিখ প্রয়োজন");
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave(form);
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {mode === "add" ? t("Add pond", "পুকুর যোগ করুন") : t("Edit pond", "পুকুর এডিট")}
          </SheetTitle>
          <SheetDescription>
            {t(
              "Set the pond details and assign a sensor device.",
              "পুকুরের বিবরণ ও ডিভাইস নির্ধারণ করুন।",
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            className="sm:col-span-2"
            label={t("Pond name", "পুকুরের নাম") + " *"}
            error={errors.name}
          >
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Pond 7 — Tilapia"
            />
          </Field>

          <Field label={t("Farm", "ফার্ম") + " *"} error={errors.farm_id}>
            <Select value={form.farm_id} onValueChange={(v) => setForm({ ...form, farm_id: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("Species", "প্রজাতি") + " *"} error={errors.species}>
            <Input
              value={form.species}
              onChange={(e) => setForm({ ...form, species: e.target.value })}
            />
          </Field>

          <Field label={t("Pond type", "পুকুরের ধরন")}>
            <Select
              value={form.pond_type}
              onValueChange={(v) => setForm({ ...form, pond_type: v as Pond["pond_type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="earthen">{t("Earthen", "মাটির")}</SelectItem>
                <SelectItem value="lined">{t("Lined / HDPE", "লাইনড / HDPE")}</SelectItem>
                <SelectItem value="concrete">{t("Concrete", "কংক্রিট")}</SelectItem>
                <SelectItem value="cage">{t("Cage", "খাঁচা")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("Water type", "পানির ধরন")}>
            <Select
              value={form.water_type}
              onValueChange={(v) => setForm({ ...form, water_type: v as Pond["water_type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fresh">{t("Fresh", "মিঠা")}</SelectItem>
                <SelectItem value="brackish">{t("Brackish", "লোনা মিশ্র")}</SelectItem>
                <SelectItem value="marine">{t("Marine", "সামুদ্রিক")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("Area (m²)", "এলাকা (m²)") + " *"} error={errors.area_m2}>
            <Input
              type="number"
              min={0}
              value={form.area_m2}
              onChange={(e) => setForm({ ...form, area_m2: Number(e.target.value) })}
            />
          </Field>

          <Field label={t("Depth (m)", "গভীরতা (m)") + " *"} error={errors.depth_m}>
            <Input
              type="number"
              step="0.1"
              min={0}
              value={form.depth_m}
              onChange={(e) => setForm({ ...form, depth_m: Number(e.target.value) })}
            />
          </Field>

          <Field label={t("Stocking date", "মজুদের তারিখ") + " *"} error={errors.stocking_date}>
            <Input
              type="date"
              value={form.stocking_date}
              onChange={(e) => setForm({ ...form, stocking_date: e.target.value })}
            />
          </Field>

          <Field label={t("Stocking density (pcs/m²)", "মজুদের ঘনত্ব (pcs/m²)")}>
            <Input
              type="number"
              min={0}
              value={form.stocking_density}
              onChange={(e) => setForm({ ...form, stocking_density: Number(e.target.value) })}
            />
          </Field>

          <Field
            className="sm:col-span-2"
            label={t("Assigned device", "বরাদ্দকৃত ডিভাইস")}
            hint={t("Only unassigned devices are listed.", "শুধু অব্যবহৃত ডিভাইসগুলো দেখানো হবে।")}
          >
            <Select
              value={form.device_id ?? "__none"}
              onValueChange={(v) => setForm({ ...form, device_id: v === "__none" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">{t("No device", "কোনো ডিভাইস নয়")}</SelectItem>
                {availableDevices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.serial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field className="sm:col-span-2" label={t("Threshold preset", "থ্রেশহোল্ড প্রিসেট")}>
            <Select
              value={form.threshold_preset}
              onValueChange={(v) => setForm({ ...form, threshold_preset: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shrimp_default">
                  {t("Shrimp default", "চিংড়ি ডিফল্ট")}
                </SelectItem>
                <SelectItem value="fish_default">{t("Fish default", "মাছ ডিফল্ট")}</SelectItem>
                <SelectItem value="hatchery">{t("Hatchery (tight)", "হ্যাচারি")}</SelectItem>
                <SelectItem value="custom">{t("Custom", "কাস্টম")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel", "বাতিল")}
          </Button>
          <Button onClick={submit}>
            {mode === "add" ? t("Create pond", "পুকুর তৈরি") : t("Save changes", "সংরক্ষণ")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ----- Assign device drawer -----
function AssignDeviceDrawer({
  pond,
  devices,
  onClose,
  onAssign,
  t,
}: {
  pond: Pond;
  devices: Device[];
  onClose: () => void;
  onAssign: (deviceId: string | null) => void;
  t: T;
}) {
  const [selected, setSelected] = useState<string | null>(pond.device_id);
  const list = devices.filter((d) => !d.pond_id || d.pond_id === pond.id);
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("Assign device", "ডিভাইস বরাদ্দ")}</SheetTitle>
          <SheetDescription>{pond.name}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          <button
            onClick={() => setSelected(null)}
            className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm ${selected === null ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <span className="text-muted-foreground">{t("No device", "কোনো ডিভাইস নয়")}</span>
          </button>
          {list.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${selected === d.id ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <span className="font-mono text-sm">{d.serial}</span>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          {list.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {t("No unassigned devices.", "কোনো অব্যবহৃত ডিভাইস নেই।")}
            </p>
          )}
        </div>
        <SheetFooter className="mt-6 gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel", "বাতিল")}
          </Button>
          <Button onClick={() => onAssign(selected)}>{t("Save", "সংরক্ষণ")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ----- Threshold drawer -----
function ThresholdDrawer({
  pond,
  onClose,
  onSave,
  t,
}: {
  pond: Pond;
  onClose: () => void;
  onSave: (preset: string) => void;
  t: T;
}) {
  const [preset, setPreset] = useState(pond.threshold_preset);
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("Set thresholds", "থ্রেশহোল্ড সেট করুন")}</SheetTitle>
          <SheetDescription>{pond.name}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <Field label={t("Preset", "প্রিসেট")}>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shrimp_default">
                  {t("Shrimp default", "চিংড়ি ডিফল্ট")}
                </SelectItem>
                <SelectItem value="fish_default">{t("Fish default", "মাছ ডিফল্ট")}</SelectItem>
                <SelectItem value="hatchery">{t("Hatchery (tight)", "হ্যাচারি")}</SelectItem>
                <SelectItem value="custom">{t("Custom", "কাস্টম")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <p className="text-xs text-muted-foreground">
            {t(
              "Presets configure DO, pH, temperature and ammonia alert ranges.",
              "প্রিসেট DO, pH, তাপমাত্রা ও অ্যামোনিয়ার অ্যালার্ট নির্ধারণ করে।",
            )}
          </p>
        </div>
        <SheetFooter className="mt-6 gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel", "বাতিল")}
          </Button>
          <Button onClick={() => onSave(preset)}>{t("Save", "সংরক্ষণ")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ----- Small Field helper -----
function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
