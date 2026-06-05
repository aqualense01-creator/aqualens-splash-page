import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { insforge, type Profile } from "@/lib/insforge";
import { PageHeader, EmptyState } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Users — Acqua Lence" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const r = await insforge.database.from("profiles").select("*").order("full_name");
      return (r.data ?? []) as Profile[];
    },
  });
  const users = data ?? [];
  const filtered = useMemo(
    () => users.filter((u) => !q || (u.full_name ?? "").toLowerCase().includes(q.toLowerCase()) || (u.district ?? "").toLowerCase().includes(q.toLowerCase())),
    [users, q],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Users" subtitle="Farmers, managers, technicians, and admins" />

      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No users" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Language</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border/60 hover:bg-surface/60">
                  <td className="px-4 py-3 font-medium">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.district ?? "—"}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider">{u.language}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
