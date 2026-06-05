import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Waves, MapPin, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { insforge, type Farm, type Pond, type Device } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, EmptyState, StatusBadge } from "@/components/app/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/farms")({
  head: () => ({ meta: [{ title: "Farms & Ponds — Acqua Lence" }] }),
  component: FarmsPage,
});

function FarmsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openFarm, setOpenFarm] = useState<string | null>(null);
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [showAddPond, setShowAddPond] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["farms-page"],
    enabled: !!user,
    queryFn: async () => {
      const [f, p, d] = await Promise.all([
        insforge.database.from("farms").select("*").order("created_at", { ascending: false }),
        insforge.database.from("ponds").select("*"),
        insforge.database.from("devices").select("*"),
      ]);
      return {
        farms: (f.data ?? []) as Farm[],
        ponds: (p.data ?? []) as Pond[],
        devices: (d.data ?? []) as Device[],
      };
    },
  });

  const farms = data?.farms ?? [];
  const ponds = data?.ponds ?? [];
  const devices = data?.devices ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Farms & Ponds"
        subtitle="Organize your farms, ponds and assigned devices."
        actions={
          <Button onClick={() => setShowAddFarm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add farm
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : farms.length === 0 ? (
        <EmptyState
          icon={<Waves className="h-6 w-6" />}
          title="No farms yet"
          description="Add your first farm to start grouping ponds and devices."
          action={<Button onClick={() => setShowAddFarm(true)}><Plus className="mr-2 h-4 w-4" />Add farm</Button>}
        />
      ) : (
        <div className="space-y-4">
          {farms.map((farm) => {
            const farmPonds = ponds.filter((p) => p.farm_id === farm.id);
            const open = openFarm === farm.id;
            return (
              <div key={farm.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                <button
                  onClick={() => setOpenFarm(open ? null : farm.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-accent/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Waves className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold">{farm.name}</h3>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {farm.district ?? "—"} · {farmPonds.length} pond{farmPonds.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={farm.status} />
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </button>

                {open && (
                  <div className="border-t border-border/60 bg-surface p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Ponds</h4>
                      <Button size="sm" variant="outline" onClick={() => setShowAddPond(farm.id)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add pond
                      </Button>
                    </div>

                    {farmPonds.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                        No ponds yet. Add your first pond.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {farmPonds.map((pond) => {
                          const assignedDev = devices.find((d) => d.pond_id === pond.id);
                          return (
                            <a
                              key={pond.id}
                              href={`/app/ponds/${pond.id}`}
                              className="group rounded-xl border border-border/70 bg-card p-3 transition hover:border-primary/40 hover:shadow-soft"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{pond.name}</p>
                                <StatusBadge status={pond.status} />
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {pond.species ?? "—"} · {pond.area_m2 ?? "—"} m²
                              </p>
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                {assignedDev ? <>Device: <span className="font-mono">{assignedDev.serial}</span></> : "No device assigned"}
                              </p>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddFarmDialog
        open={showAddFarm}
        onClose={() => setShowAddFarm(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["farms-page"] })}
      />
      {showAddPond && (
        <AddPondDialog
          farmId={showAddPond}
          devices={devices.filter((d) => !d.pond_id)}
          onClose={() => setShowAddPond(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["farms-page"] })}
        />
      )}
    </div>
  );
}

function AddFarmDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", district: "", location: "" });
  const m = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not signed in");
      if (!form.name.trim()) throw new Error("Farm name is required");
      const { error } = await insforge.database.from("farms").insert([{ ...form, owner_id: user.id, status: "active" }]);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Farm created"); onSaved(); onClose(); setForm({ name: "", district: "", location: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add farm</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Farm name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>District</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Village, upazila or coordinates" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving…" : "Save farm"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPondDialog({ farmId, devices, onClose, onSaved }: { farmId: string; devices: Device[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", pond_type: "earthen", water_type: "brackish", species: "shrimp",
    area_m2: "", depth_m: "", stocking_date: "", stocking_density: "",
    threshold_preset: "shrimp_default", device_id: "",
  });
  const m = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Pond name is required");
      const payload = {
        farm_id: farmId,
        name: form.name,
        pond_type: form.pond_type,
        water_type: form.water_type,
        species: form.species,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        depth_m: form.depth_m ? Number(form.depth_m) : null,
        stocking_date: form.stocking_date || null,
        stocking_density: form.stocking_density ? Number(form.stocking_density) : null,
        threshold_preset: form.threshold_preset,
        status: "good",
      };
      const { data: created, error } = await insforge.database.from("ponds").insert([payload]).select("*").single();
      if (error) throw new Error(error.message);
      if (form.device_id && created) {
        await insforge.database.from("devices").update({ pond_id: (created as { id: string }).id }).eq("id", form.device_id);
      }
    },
    onSuccess: () => { toast.success("Pond created"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add pond</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Pond name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Pond type</Label>
            <Select value={form.pond_type} onValueChange={(v) => setForm({ ...form, pond_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="earthen">Earthen</SelectItem>
                <SelectItem value="lined">Lined / HDPE</SelectItem>
                <SelectItem value="concrete">Concrete</SelectItem>
                <SelectItem value="cage">Cage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Water type</Label>
            <Select value={form.water_type} onValueChange={(v) => setForm({ ...form, water_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fresh">Fresh</SelectItem>
                <SelectItem value="brackish">Brackish</SelectItem>
                <SelectItem value="marine">Marine</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Species</Label>
            <Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shrimp">Shrimp (Vannamei)</SelectItem>
                <SelectItem value="tiger_shrimp">Tiger shrimp (Bagda)</SelectItem>
                <SelectItem value="tilapia">Tilapia</SelectItem>
                <SelectItem value="carp">Carp</SelectItem>
                <SelectItem value="catfish">Catfish</SelectItem>
                <SelectItem value="pangasius">Pangasius</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Threshold preset</Label>
            <Select value={form.threshold_preset} onValueChange={(v) => setForm({ ...form, threshold_preset: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shrimp_default">Shrimp default</SelectItem>
                <SelectItem value="fish_default">Fish default</SelectItem>
                <SelectItem value="hatchery">Hatchery (tight)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Area (m²)</Label><Input type="number" value={form.area_m2} onChange={(e) => setForm({ ...form, area_m2: e.target.value })} /></div>
          <div><Label>Depth (m)</Label><Input type="number" step="0.1" value={form.depth_m} onChange={(e) => setForm({ ...form, depth_m: e.target.value })} /></div>
          <div><Label>Stocking date</Label><Input type="date" value={form.stocking_date} onChange={(e) => setForm({ ...form, stocking_date: e.target.value })} /></div>
          <div><Label>Stocking density</Label><Input type="number" value={form.stocking_density} onChange={(e) => setForm({ ...form, stocking_density: e.target.value })} placeholder="pcs / m²" /></div>
          <div className="col-span-2">
            <Label>Assign device</Label>
            <Select value={form.device_id} onValueChange={(v) => setForm({ ...form, device_id: v })}>
              <SelectTrigger><SelectValue placeholder={devices.length ? "Choose unassigned device" : "No free devices"} /></SelectTrigger>
              <SelectContent>
                {devices.map((d) => <SelectItem key={d.id} value={d.id}>{d.name ?? d.serial}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving…" : "Save pond"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
