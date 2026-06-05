import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { insforge } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/maintenance/$deviceId")({
  head: () => ({ meta: [{ title: "Maintenance — Acqua Lence" }] }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const { deviceId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ visit_type: "routine", notes: "" });

  const { data } = useQuery({
    queryKey: ["maint-logs", deviceId],
    queryFn: async () => (await insforge.database.from("maintenance_logs").select("*").eq("device_id", deviceId).order("performed_at", { ascending: false })).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await insforge.database.from("maintenance_logs").insert([{ device_id: deviceId, technician_id: user?.id, ...form }]);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Maintenance logged"); setForm({ visit_type: "routine", notes: "" }); qc.invalidateQueries({ queryKey: ["maint-logs", deviceId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Maintenance log" subtitle={`Device ${deviceId.slice(0, 8)}…`} />
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold"><Wrench className="h-4 w-4" />New entry</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Visit type</Label><Input value={form.visit_type} onChange={(e) => setForm({ ...form, visit_type: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Cleaning, replacement, repairs…" /></div>
        </div>
        <Button className="mt-3" onClick={() => save.mutate()} disabled={save.isPending}>Add entry</Button>
      </div>

      <div className="mt-6 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <h3 className="mb-3 font-display text-sm font-semibold">History</h3>
        {(data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No entries yet.</p> : (
          <ul className="space-y-2 text-sm">
            {data!.map((m: { id: string; visit_type?: string; notes?: string; performed_at: string }) => (
              <li key={m.id} className="border-b border-border/40 pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{m.visit_type ?? "Visit"}</span>
                  <span className="text-xs text-muted-foreground">{new Date(m.performed_at).toLocaleString()}</span>
                </div>
                {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
