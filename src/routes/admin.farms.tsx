import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search, Waves } from "lucide-react";
import { insforge, type Farm, type Pond } from "@/lib/insforge";
import { PageHeader, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/farms")({
  head: () => ({ meta: [{ title: "Admin · Farms — Acqua Lence" }] }),
  component: AdminFarms,
});

function AdminFarms() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-farms"],
    queryFn: async () => {
      const [f, p] = await Promise.all([
        insforge.database.from("farms").select("*").order("name"),
        insforge.database.from("ponds").select("*"),
      ]);
      return { farms: (f.data ?? []) as Farm[], ponds: (p.data ?? []) as Pond[] };
    },
  });

  const farms = data?.farms ?? [];
  const ponds = data?.ponds ?? [];
  const filtered = useMemo(
    () => farms.filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()) || (f.district ?? "").toLowerCase().includes(q.toLowerCase())),
    [farms, q],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Farms" subtitle="All registered farms across Bangladesh" />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search farms or districts" className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Waves className="h-6 w-6" />} title="No farms" description="No farms match your search." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Farm</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Ponds</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const count = ponds.filter((p) => p.farm_id === f.id).length;
                return (
                  <tr key={f.id} className="border-t border-border/60 hover:bg-surface/60">
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.district ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{count}</td>
                    <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
