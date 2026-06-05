import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  Building2,
  Waves,
  Cpu,
  AlertTriangle,
  Activity,
  Plus,
  Pencil,
  Pause,
  Play,
  Link2,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  insforge,
  type Alert,
  type Device,
  type Farm,
  type Pond,
  type Profile,
} from "@/lib/insforge";
import { PageHeader, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/admin/farms")({
  head: () => ({ meta: [{ title: "Admin · Farms & Customers — Acqua Lence" }] }),
  component: AdminFarmsCustomers,
});

// `Profile` doesn't strictly include email/account fields on every project,
// so widen locally for admin views.
type AdminProfile = Profile & {
  email?: string | null;
  account_status?: string | null;
  last_active_at?: string | null;
  role?: string | null;
};

type DrawerTab = "profile" | "farms" | "ponds" | "devices" | "alerts" | "activity";

type EditFarmState = { open: boolean; farm: Partial<Farm> | null; ownerId: string };
type EditPondState = { open: boolean; pond: Partial<Pond> | null; farmId: string };
type AssignDeviceState = { open: boolean; deviceId: string; farmId: string; pondId: string };

function AdminFarmsCustomers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [openCustomer, setOpenCustomer] = useState<AdminProfile | null>(null);
  const [tab, setTab] = useState<DrawerTab>("profile");
  const [confirmSuspend, setConfirmSuspend] = useState<AdminProfile | null>(null);

  const [editFarm, setEditFarm] = useState<EditFarmState>({
    open: false,
    farm: null,
    ownerId: "",
  });
  const [editPond, setEditPond] = useState<EditPondState>({
    open: false,
    pond: null,
    farmId: "",
  });
  const [assignDevice, setAssignDevice] = useState<AssignDeviceState>({
    open: false,
    deviceId: "",
    farmId: "",
    pondId: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-farms-customers"],
    queryFn: async () => {
      const [profiles, farms, ponds, devices, alerts] = await Promise.all([
        insforge.database.from("profiles").select("*").order("full_name"),
        insforge.database.from("farms").select("*").order("name"),
        insforge.database.from("ponds").select("*"),
        insforge.database.from("devices").select("*"),
        insforge.database
          .from("alerts")
          .select("*")
          .order("detected_at", { ascending: false })
          .limit(200),
      ]);
      return {
        profiles: (profiles.data ?? []) as AdminProfile[],
        farms: (farms.data ?? []) as Farm[],
        ponds: (ponds.data ?? []) as Pond[],
        devices: (devices.data ?? []) as Device[],
        alerts: (alerts.data ?? []) as Alert[],
      };
    },
  });

  const profiles = data?.profiles ?? [];
  const farms = data?.farms ?? [];
  const ponds = data?.ponds ?? [];
  const devices = data?.devices ?? [];
  const alerts = data?.alerts ?? [];

  const districts = useMemo(
    () =>
      Array.from(
        new Set([
          ...profiles.map((p) => p.district).filter(Boolean),
          ...farms.map((f) => f.district).filter(Boolean),
        ]),
      ).sort() as string[],
    [profiles, farms],
  );

  // === Enrich customers with farm/pond/device counts ===
  type Row = AdminProfile & {
    farmCount: number;
    pondCount: number;
    deviceCount: number;
    farmIds: string[];
    pondIds: string[];
  };

  const rows: Row[] = useMemo(() => {
    return profiles.map((p) => {
      const ownerFarms = farms.filter((f) => f.owner_id === p.id);
      const farmIds = ownerFarms.map((f) => f.id);
      const ownerPonds = ponds.filter((pd) => farmIds.includes(pd.farm_id));
      const pondIds = ownerPonds.map((pd) => pd.id);
      const ownerDevices = devices.filter(
        (d) =>
          (d.farm_id && farmIds.includes(d.farm_id)) ||
          (d.pond_id && pondIds.includes(d.pond_id)),
      );
      return {
        ...p,
        farmCount: ownerFarms.length,
        pondCount: ownerPonds.length,
        deviceCount: ownerDevices.length,
        farmIds,
        pondIds,
      };
    });
  }, [profiles, farms, ponds, devices]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (district !== "all" && (r.district ?? "") !== district) return false;
      const s = (r.account_status ?? "active").toLowerCase();
      if (status !== "all" && s !== status) return false;
      if (!needle) return true;
      return (
        (r.full_name ?? "").toLowerCase().includes(needle) ||
        (r.phone ?? "").toLowerCase().includes(needle) ||
        (r.email ?? "").toLowerCase().includes(needle) ||
        (r.district ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, district, status]);

  // === Mutations ===
  const setStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await insforge.database
        .from("profiles")
        .update({ account_status: status })
        .eq("id", id);
      if ((r as any).error) throw new Error((r as any).error.message);
    },
    onSuccess: (_d, v) => {
      toast.success(
        v.status === "suspended"
          ? "Account suspended"
          : "Account reactivated",
      );
      qc.invalidateQueries({ queryKey: ["admin-farms-customers"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "Could not update account status"),
  });

  const saveFarm = useMutation({
    mutationFn: async (f: Partial<Farm> & { owner_id: string }) => {
      if (f.id) {
        const r = await insforge.database
          .from("farms")
          .update({
            name: f.name,
            district: f.district ?? null,
            location: f.location ?? null,
            status: f.status ?? "active",
          })
          .eq("id", f.id);
        if ((r as any).error) throw new Error((r as any).error.message);
      } else {
        const r = await insforge.database.from("farms").insert([
          {
            owner_id: f.owner_id,
            name: f.name,
            district: f.district ?? null,
            location: f.location ?? null,
            status: f.status ?? "active",
          },
        ]);
        if ((r as any).error) throw new Error((r as any).error.message);
      }
    },
    onSuccess: () => {
      toast.success("Farm saved");
      setEditFarm({ open: false, farm: null, ownerId: "" });
      qc.invalidateQueries({ queryKey: ["admin-farms-customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePond = useMutation({
    mutationFn: async (p: Partial<Pond> & { farm_id: string }) => {
      if (p.id) {
        const r = await insforge.database
          .from("ponds")
          .update({
            name: p.name,
            pond_type: p.pond_type ?? null,
            species: p.species ?? null,
            area_m2: p.area_m2 ?? null,
            status: p.status ?? "good",
          })
          .eq("id", p.id);
        if ((r as any).error) throw new Error((r as any).error.message);
      } else {
        const r = await insforge.database.from("ponds").insert([
          {
            farm_id: p.farm_id,
            name: p.name,
            pond_type: p.pond_type ?? null,
            species: p.species ?? null,
            area_m2: p.area_m2 ?? null,
            status: p.status ?? "good",
          },
        ]);
        if ((r as any).error) throw new Error((r as any).error.message);
      }
    },
    onSuccess: () => {
      toast.success("Pond saved");
      setEditPond({ open: false, pond: null, farmId: "" });
      qc.invalidateQueries({ queryKey: ["admin-farms-customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignDeviceMut = useMutation({
    mutationFn: async ({
      deviceId,
      farmId,
      pondId,
    }: {
      deviceId: string;
      farmId: string;
      pondId: string;
    }) => {
      const r = await insforge.database
        .from("devices")
        .update({
          farm_id: farmId || null,
          pond_id: pondId || null,
        })
        .eq("id", deviceId);
      if ((r as any).error) throw new Error((r as any).error.message);
    },
    onSuccess: () => {
      toast.success("Device assignment updated");
      setAssignDevice({ open: false, deviceId: "", farmId: "", pondId: "" });
      qc.invalidateQueries({ queryKey: ["admin-farms-customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // === Drawer details for selected customer ===
  const selected = openCustomer
    ? rows.find((r) => r.id === openCustomer.id) ?? null
    : null;
  const selectedFarms = selected
    ? farms.filter((f) => f.owner_id === selected.id)
    : [];
  const selectedPonds = selected
    ? ponds.filter((p) => selectedFarms.some((f) => f.id === p.farm_id))
    : [];
  const selectedDevices = selected
    ? devices.filter(
        (d) =>
          (d.farm_id && selectedFarms.some((f) => f.id === d.farm_id)) ||
          (d.pond_id && selectedPonds.some((p) => p.id === d.pond_id)),
      )
    : [];
  const selectedAlerts = selected
    ? alerts.filter(
        (a) =>
          (a.pond_id && selectedPonds.some((p) => p.id === a.pond_id)) ||
          (a.device_id && selectedDevices.some((d) => d.id === a.device_id)),
      )
    : [];

  const activityFeed = useMemo(() => {
    if (!selected) return [] as { ts: string; label: string; kind: string }[];
    const items: { ts: string; label: string; kind: string }[] = [];
    selectedAlerts.slice(0, 20).forEach((a) =>
      items.push({
        ts: a.detected_at,
        label: a.message ?? a.alert_type,
        kind: "alert",
      }),
    );
    selectedDevices.forEach(
      (d) =>
        d.last_seen &&
        items.push({
          ts: d.last_seen,
          label: `${d.name ?? d.serial} reported in`,
          kind: "device",
        }),
    );
    return items
      .sort((a, b) => (a.ts < b.ts ? 1 : -1))
      .slice(0, 25);
  }, [selected, selectedAlerts, selectedDevices]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Farms & Customers"
        subtitle="Manage farmer accounts, farms, ponds, and device assignments"
        actions={
          <Button
            size="sm"
            onClick={() =>
              toast.info("Use a customer profile to add their first farm")
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> New farm
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, phone, email, district"
            className="pl-9"
            maxLength={120}
          />
        </div>
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger className="w-44">
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Account status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {rows.length} customers
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading customers…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No customers"
          description="No customers match your filters."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3 text-right">Farms</th>
                  <th className="px-4 py-3 text-right">Ponds</th>
                  <th className="px-4 py-3 text-right">Devices</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-t border-border/60 transition hover:bg-surface/60"
                    onClick={() => {
                      setOpenCustomer(r);
                      setTab("profile");
                    }}
                  >
                    <td className="px-4 py-3 font-medium">
                      {r.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.district ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.farmCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.pondCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.deviceCount}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.account_status ?? "active"} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.last_active_at
                        ? new Date(r.last_active_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setOpenCustomer(r);
                    setTab("profile");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 text-left shadow-soft"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.full_name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.district ?? "—"} · {r.phone ?? "no phone"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {r.farmCount} farms · {r.pondCount} ponds ·{" "}
                      {r.deviceCount} devices
                    </p>
                  </div>
                  <StatusBadge status={r.account_status ?? "active"} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* === Customer Drawer === */}
      <Sheet
        open={!!openCustomer}
        onOpenChange={(o) => !o && setOpenCustomer(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle className="font-display text-xl">
                      {selected.full_name ?? "Unnamed customer"}
                    </SheetTitle>
                    <SheetDescription>
                      {selected.role ?? "farmer"} ·{" "}
                      <StatusBadge
                        status={selected.account_status ?? "active"}
                      />
                    </SheetDescription>
                  </div>
                  <div className="flex flex-col gap-2">
                    {(selected.account_status ?? "active") === "suspended" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          setStatusMutation.mutate({
                            id: selected.id,
                            status: "active",
                          })
                        }
                      >
                        <Play className="mr-1.5 h-4 w-4" /> Reactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmSuspend(selected)}
                      >
                        <Pause className="mr-1.5 h-4 w-4" /> Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as DrawerTab)}
                className="mt-4"
              >
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="farms">
                    Farms
                    <Pill>{selected.farmCount}</Pill>
                  </TabsTrigger>
                  <TabsTrigger value="ponds">
                    Ponds
                    <Pill>{selected.pondCount}</Pill>
                  </TabsTrigger>
                  <TabsTrigger value="devices">
                    Devices
                    <Pill>{selected.deviceCount}</Pill>
                  </TabsTrigger>
                  <TabsTrigger value="alerts">
                    Alerts
                    <Pill>{selectedAlerts.length}</Pill>
                  </TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                {/* Profile */}
                <TabsContent value="profile" className="mt-4 space-y-3">
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={selected.phone ?? "—"}
                  />
                  <InfoRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={selected.email ?? "—"}
                  />
                  <InfoRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="District"
                    value={selected.district ?? "—"}
                  />
                  <InfoRow
                    icon={<Activity className="h-4 w-4" />}
                    label="Last active"
                    value={
                      selected.last_active_at
                        ? new Date(
                            selected.last_active_at,
                          ).toLocaleString()
                        : "—"
                    }
                  />
                  <InfoRow
                    icon={<Users className="h-4 w-4" />}
                    label="Language"
                    value={selected.language}
                  />
                </TabsContent>

                {/* Farms */}
                <TabsContent value="farms" className="mt-4 space-y-2">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEditFarm({
                          open: true,
                          farm: { name: "", district: selected.district ?? "" },
                          ownerId: selected.id,
                        })
                      }
                    >
                      <Plus className="mr-1.5 h-4 w-4" /> Add farm
                    </Button>
                  </div>
                  {selectedFarms.length === 0 ? (
                    <EmptyRow label="This customer has no farms yet." />
                  ) : (
                    selectedFarms.map((f) => (
                      <DrawerRow
                        key={f.id}
                        icon={<Building2 className="h-4 w-4 text-primary" />}
                        title={f.name}
                        subtitle={`${f.district ?? "—"}${f.location ? ` · ${f.location}` : ""}`}
                        badge={<StatusBadge status={f.status || "active"} />}
                        action={
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setEditFarm({
                                open: true,
                                farm: f,
                                ownerId: selected.id,
                              })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                    ))
                  )}
                </TabsContent>

                {/* Ponds */}
                <TabsContent value="ponds" className="mt-4 space-y-2">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedFarms.length === 0}
                      onClick={() =>
                        setEditPond({
                          open: true,
                          pond: { name: "", status: "good" },
                          farmId: selectedFarms[0]?.id ?? "",
                        })
                      }
                    >
                      <Plus className="mr-1.5 h-4 w-4" /> Add pond
                    </Button>
                  </div>
                  {selectedPonds.length === 0 ? (
                    <EmptyRow label="No ponds for this customer yet." />
                  ) : (
                    selectedPonds.map((p) => {
                      const farm = selectedFarms.find(
                        (f) => f.id === p.farm_id,
                      );
                      return (
                        <DrawerRow
                          key={p.id}
                          icon={<Waves className="h-4 w-4 text-primary" />}
                          title={p.name}
                          subtitle={`${farm?.name ?? "—"} · ${p.species ?? "—"}`}
                          badge={<StatusBadge status={p.status} />}
                          action={
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setEditPond({
                                  open: true,
                                  pond: p,
                                  farmId: p.farm_id,
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                      );
                    })
                  )}
                </TabsContent>

                {/* Devices */}
                <TabsContent value="devices" className="mt-4 space-y-2">
                  {selectedDevices.length === 0 ? (
                    <EmptyRow label="No devices assigned." />
                  ) : (
                    selectedDevices.map((d) => {
                      const pond = selectedPonds.find(
                        (p) => p.id === d.pond_id,
                      );
                      return (
                        <DrawerRow
                          key={d.id}
                          icon={<Cpu className="h-4 w-4 text-primary" />}
                          title={d.name ?? d.serial}
                          subtitle={`${d.serial} · ${pond?.name ?? "Unassigned pond"}`}
                          badge={<StatusBadge status={d.status} />}
                          action={
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setAssignDevice({
                                  open: true,
                                  deviceId: d.id,
                                  farmId: d.farm_id ?? "",
                                  pondId: d.pond_id ?? "",
                                })
                              }
                            >
                              <Link2 className="mr-1.5 h-4 w-4" /> Assign
                            </Button>
                          }
                        />
                      );
                    })
                  )}
                </TabsContent>

                {/* Alerts */}
                <TabsContent value="alerts" className="mt-4 space-y-2">
                  {selectedAlerts.length === 0 ? (
                    <EmptyRow label="No alerts on record." />
                  ) : (
                    selectedAlerts.slice(0, 25).map((a) => (
                      <DrawerRow
                        key={a.id}
                        icon={
                          <AlertTriangle className="h-4 w-4 text-rose-500" />
                        }
                        title={a.message ?? a.alert_type}
                        subtitle={`${a.parameter ?? "—"} · ${new Date(a.detected_at).toLocaleString()}`}
                        badge={<StatusBadge status={a.severity} />}
                      />
                    ))
                  )}
                </TabsContent>

                {/* Activity */}
                <TabsContent value="activity" className="mt-4">
                  {activityFeed.length === 0 ? (
                    <EmptyRow label="No recent activity." />
                  ) : (
                    <ol className="relative space-y-3 border-l border-border/70 pl-5">
                      {activityFeed.map((it, i) => (
                        <li key={i} className="relative">
                          <span
                            className={cn(
                              "absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                              it.kind === "alert"
                                ? "bg-rose-500"
                                : "bg-emerald-500",
                            )}
                          />
                          <p className="text-sm">{it.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(it.ts).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* === Confirm Suspend/Reactivate === */}
      <AlertDialog
        open={!!confirmSuspend}
        onOpenChange={(o) => !o && setConfirmSuspend(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend this account?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmSuspend?.full_name ?? "This customer"} will lose access
              to the Acqua Lence app and stop receiving alerts. You can
              reactivate the account at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmSuspend) {
                  setStatusMutation.mutate({
                    id: confirmSuspend.id,
                    status: "suspended",
                  });
                  setConfirmSuspend(null);
                }
              }}
            >
              Suspend account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* === Edit Farm Dialog === */}
      <FarmDialog
        state={editFarm}
        onClose={() =>
          setEditFarm({ open: false, farm: null, ownerId: "" })
        }
        onSave={(f) =>
          saveFarm.mutate({ ...f, owner_id: editFarm.ownerId })
        }
        saving={saveFarm.isPending}
      />

      {/* === Edit Pond Dialog === */}
      <PondDialog
        state={editPond}
        farms={selectedFarms}
        onClose={() => setEditPond({ open: false, pond: null, farmId: "" })}
        onSave={(p) =>
          savePond.mutate({ ...p, farm_id: editPond.farmId })
        }
        onFarmChange={(farmId) =>
          setEditPond((s) => ({ ...s, farmId }))
        }
        saving={savePond.isPending}
      />

      {/* === Assign Device Dialog === */}
      <AssignDeviceDialog
        state={assignDevice}
        farms={selectedFarms}
        ponds={selectedPonds}
        onClose={() =>
          setAssignDevice({
            open: false,
            deviceId: "",
            farmId: "",
            pondId: "",
          })
        }
        onChange={(patch) => setAssignDevice((s) => ({ ...s, ...patch }))}
        onSave={() => assignDeviceMut.mutate(assignDevice)}
        saving={assignDeviceMut.isPending}
      />
    </div>
  );
}

// =========== Sub-components ===========

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
      {children}
    </span>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface p-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function DrawerRow({
  icon,
  title,
  subtitle,
  badge,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge}
        {action}
      </div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-6 text-center text-sm text-muted-foreground">
      {label}
    </p>
  );
}

function FarmDialog({
  state,
  onClose,
  onSave,
  saving,
}: {
  state: EditFarmState;
  onClose: () => void;
  onSave: (f: Partial<Farm>) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("active");

  // Sync local form when opened
  const opened = state.open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    if (opened) {
      setName(state.farm?.name ?? "");
      setDistrict(state.farm?.district ?? "");
      setLocation(state.farm?.location ?? "");
      setStatus(state.farm?.status ?? "active");
    }
  }, [opened]);

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state.farm?.id ? "Edit farm" : "Add farm"}
          </DialogTitle>
          <DialogDescription>
            Farms are the top-level grouping that contain ponds and devices.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Farm name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Sundarban Aqua"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="District">
              <Input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field label="Location">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={120}
              />
            </Field>
          </div>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                toast.error("Farm name is required");
                return;
              }
              onSave({
                id: state.farm?.id,
                name: name.trim(),
                district: district.trim() || null,
                location: location.trim() || null,
                status,
              });
            }}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save farm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PondDialog({
  state,
  farms,
  onClose,
  onSave,
  onFarmChange,
  saving,
}: {
  state: EditPondState;
  farms: Farm[];
  onClose: () => void;
  onSave: (p: Partial<Pond>) => void;
  onFarmChange: (farmId: string) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [pondType, setPondType] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState("good");

  const opened = state.open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    if (opened) {
      setName(state.pond?.name ?? "");
      setSpecies(state.pond?.species ?? "");
      setPondType(state.pond?.pond_type ?? "");
      setArea(state.pond?.area_m2 != null ? String(state.pond.area_m2) : "");
      setStatus(state.pond?.status ?? "good");
    }
  }, [opened]);

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state.pond?.id ? "Edit pond" : "Add pond"}
          </DialogTitle>
          <DialogDescription>
            Ponds hold sensor readings, alerts, and device assignments.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Farm">
            <Select
              value={state.farmId}
              onValueChange={onFarmChange}
              disabled={!!state.pond?.id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select farm" />
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
          <Field label="Pond name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Pond A1"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Species">
              <Input
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                maxLength={80}
                placeholder="Tilapia"
              />
            </Field>
            <Field label="Pond type">
              <Input
                value={pondType}
                onChange={(e) => setPondType(e.target.value)}
                maxLength={60}
                placeholder="Earthen"
              />
            </Field>
            <Field label="Area (m²)">
              <Input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                inputMode="numeric"
                maxLength={10}
              />
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="watch">Watch</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="calibration_due">
                    Calibration due
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                toast.error("Pond name is required");
                return;
              }
              if (!state.farmId) {
                toast.error("Select a farm");
                return;
              }
              const areaNum = area ? Number(area) : null;
              if (area && Number.isNaN(areaNum)) {
                toast.error("Area must be a number");
                return;
              }
              onSave({
                id: state.pond?.id,
                name: name.trim(),
                species: species.trim() || null,
                pond_type: pondType.trim() || null,
                area_m2: areaNum,
                status: status as Pond["status"],
              });
            }}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save pond"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDeviceDialog({
  state,
  farms,
  ponds,
  onClose,
  onChange,
  onSave,
  saving,
}: {
  state: AssignDeviceState;
  farms: Farm[];
  ponds: Pond[];
  onClose: () => void;
  onChange: (patch: Partial<AssignDeviceState>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const pondsForFarm = ponds.filter((p) => p.farm_id === state.farmId);
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign device</DialogTitle>
          <DialogDescription>
            Choose where this device should report readings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Farm">
            <Select
              value={state.farmId}
              onValueChange={(v) =>
                onChange({ farmId: v, pondId: "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select farm" />
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
          <Field label="Pond">
            <Select
              value={state.pondId}
              onValueChange={(v) => onChange({ pondId: v })}
              disabled={!state.farmId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pond" />
              </SelectTrigger>
              <SelectContent>
                {pondsForFarm.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || !state.farmId}>
            {saving ? "Saving…" : "Assign device"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
