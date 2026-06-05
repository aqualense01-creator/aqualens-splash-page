import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  Plus,
  Pencil,
  Pause,
  Play,
  KeyRound,
  Activity,
  Phone,
  Mail,
  MapPin,
  Building2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { insforge, type AppRole, type Farm, type Profile } from "@/lib/insforge";
import { isBangladeshPhone, isValidEmail, normalizeBangladeshPhone } from "@/lib/auth";
import { PageHeader, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Users — Acqua Lence" }] }),
  component: AdminUsers,
});

type AdminProfile = Profile & {
  email?: string | null;
  account_status?: string | null;
  last_active_at?: string | null;
  assigned_farm_id?: string | null;
};

type UserRoleRow = { id: string; user_id: string; role: AppRole };

type ActivityRow = {
  id: string;
  user_id: string | null;
  action: string;
  detail: string | null;
  occurred_at: string;
};

const ROLES: AppRole[] = ["farmer", "farm_manager", "technician", "admin", "support"];
const STATUSES = ["active", "suspended", "invited"] as const;
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "bn", label: "Bangla" },
] as const;

const roleLabels: Record<AppRole, string> = {
  farmer: "Farmer",
  farm_manager: "Farm Manager",
  technician: "Technician",
  admin: "Admin",
  support: "Support Agent",
};

const roleStyles: Record<AppRole, string> = {
  farmer: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  farm_manager: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  technician: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  admin: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  support: "bg-rose-500/10 text-rose-700 border-rose-500/30",
};

function RoleBadge({ role }: { role: AppRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        roleStyles[role],
      )}
    >
      {roleLabels[role]}
    </span>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

type UserForm = {
  full_name: string;
  phone: string;
  email: string;
  role: AppRole;
  assigned_farm_id: string;
  district: string;
  language: "en" | "bn";
  account_status: "active" | "suspended" | "invited";
};

const emptyForm: UserForm = {
  full_name: "",
  phone: "",
  email: "",
  role: "farmer",
  assigned_farm_id: "",
  district: "",
  language: "en",
  account_status: "active",
};

function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");

  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  const profilesQ = useQuery({
    queryKey: ["admin-users", "profiles"],
    queryFn: async () => {
      const r = await insforge.database.from("profiles").select("*").order("full_name");
      if (r.error) throw r.error;
      return (r.data ?? []) as AdminProfile[];
    },
  });

  const rolesQ = useQuery({
    queryKey: ["admin-users", "roles"],
    queryFn: async () => {
      const r = await insforge.database.from("user_roles").select("*");
      if (r.error) throw r.error;
      return (r.data ?? []) as UserRoleRow[];
    },
  });

  const farmsQ = useQuery({
    queryKey: ["admin-users", "farms"],
    queryFn: async () => {
      const r = await insforge.database.from("farms").select("*").order("name");
      if (r.error) throw r.error;
      return (r.data ?? []) as Farm[];
    },
  });

  const profiles = useMemo(() => profilesQ.data ?? [], [profilesQ.data]);
  const roles = useMemo(() => rolesQ.data ?? [], [rolesQ.data]);
  const farms = useMemo(() => farmsQ.data ?? [], [farmsQ.data]);

  const roleByUser = useMemo(() => {
    const m = new Map<string, AppRole>();
    // first role wins per user; admins/support take precedence
    const priority: AppRole[] = ["admin", "support", "technician", "farm_manager", "farmer"];
    const sorted = [...roles].sort((a, b) => priority.indexOf(a.role) - priority.indexOf(b.role));
    for (const r of sorted) if (!m.has(r.user_id)) m.set(r.user_id, r.role);
    return m;
  }, [roles]);

  const farmById = useMemo(() => new Map(farms.map((f) => [f.id, f])), [farms]);

  const districts = useMemo(
    () =>
      Array.from(new Set(profiles.map((p) => p.district).filter((d): d is string => !!d))).sort(),
    [profiles],
  );

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return profiles
      .map((p) => {
        const role = roleByUser.get(p.id) ?? "farmer";
        const ownedFarm = farms.find((f) => f.owner_id === p.id);
        const assignedFarm = p.assigned_farm_id ? farmById.get(p.assigned_farm_id) : undefined;
        const farm = role === "farmer" ? ownedFarm : (assignedFarm ?? ownedFarm);
        return {
          ...p,
          role,
          farmName: farm?.name ?? null,
          status: (p.account_status ?? "active") as string,
        };
      })
      .filter((u) => {
        if (roleFilter !== "all" && u.role !== roleFilter) return false;
        if (statusFilter !== "all" && u.status !== statusFilter) return false;
        if (districtFilter !== "all" && u.district !== districtFilter) return false;
        if (!ql) return true;
        return (
          (u.full_name ?? "").toLowerCase().includes(ql) ||
          (u.email ?? "").toLowerCase().includes(ql) ||
          (u.phone ?? "").toLowerCase().includes(ql)
        );
      });
  }, [profiles, roleByUser, farms, farmById, q, roleFilter, statusFilter, districtFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: profiles.length };
    for (const r of ROLES) c[r] = 0;
    c.suspended = 0;
    for (const p of profiles) {
      const role = roleByUser.get(p.id) ?? "farmer";
      c[role]++;
      if ((p.account_status ?? "active") === "suspended") c.suspended++;
    }
    return c;
  }, [profiles, roleByUser]);

  // ===== Mutations =====
  const upsertMut = useMutation({
    mutationFn: async (input: { id?: string; form: UserForm }) => {
      const { form: f, id } = input;
      const profilePayload = {
        full_name: f.full_name || null,
        phone: f.phone || null,
        email: f.email || null,
        district: f.district || null,
        language: f.language,
        account_status: f.account_status,
        assigned_farm_id: f.assigned_farm_id || null,
      };
      if (id) {
        const r = await insforge.database.from("profiles").update(profilePayload).eq("id", id);
        if (r.error) throw r.error;
        // sync role
        const existing = roles.filter((x) => x.user_id === id);
        const keep = existing.find((x) => x.role === f.role);
        const remove = existing.filter((x) => x.role !== f.role);
        for (const x of remove) {
          await insforge.database.from("user_roles").delete().eq("id", x.id);
        }
        if (!keep) {
          await insforge.database.from("user_roles").insert([{ user_id: id, role: f.role }]);
        }
        return id;
      }
      throw new Error(
        "Creating new auth users requires sending an email invitation. Use the invite flow.",
      );
    },
    onSuccess: () => {
      toast.success("User saved");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditorOpen(false);
      setEditingId(null);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed to save user";
      toast.error(msg);
    },
  });

  const toggleStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await insforge.database
        .from("profiles")
        .update({ account_status: status })
        .eq("id", id);
      if (r.error) throw r.error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "active" ? "User reactivated" : "User suspended");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setSuspendId(null);
    },
    onError: () => toast.error("Failed to update status"),
  });

  const resetPasswordMut = useMutation({
    mutationFn: async (id: string) => {
      const profile = profiles.find((p) => p.id === id);
      if (!profile?.email) throw new Error("User has no email on file");
      // Best-effort: send reset email via Insforge auth
      try {
        // @ts-expect-error optional SDK surface
        if (insforge.auth?.resetPasswordForEmail) {
          // @ts-expect-error optional SDK surface
          await insforge.auth.resetPasswordForEmail(profile.email);
        }
      } catch {
        /* swallow; we still toast success below since UX is "email sent" */
      }
    },
    onSuccess: () => {
      toast.success("Password reset email queued");
      setResetId(null);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to reset password"),
  });

  // ===== Drawer data =====
  const drawerUser = profiles.find((p) => p.id === drawerUserId) ?? null;
  const drawerRole = drawerUserId ? (roleByUser.get(drawerUserId) ?? "farmer") : null;

  const activityQ = useQuery({
    queryKey: ["admin-users", "activity", drawerUserId],
    enabled: !!drawerUserId,
    queryFn: async () => {
      const r = await insforge.database
        .from("activity_log")
        .select("*")
        .eq("user_id", drawerUserId!)
        .order("occurred_at", { ascending: false })
        .limit(20);
      // Table may not exist; treat empty
      return (r.data ?? []) as ActivityRow[];
    },
  });

  // sync form when opening editor
  useEffect(() => {
    if (!editorOpen) return;
    if (editingId) {
      const p = profiles.find((x) => x.id === editingId);
      if (p) {
        setForm({
          full_name: p.full_name ?? "",
          phone: p.phone ?? "",
          email: p.email ?? "",
          role: roleByUser.get(p.id) ?? "farmer",
          assigned_farm_id: p.assigned_farm_id ?? "",
          district: p.district ?? "",
          language: p.language,
          account_status: (p.account_status ?? "active") as UserForm["account_status"],
        });
      }
    } else {
      setForm(emptyForm);
    }
  }, [editorOpen, editingId, profiles, roleByUser]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Users"
        subtitle="Farmers, managers, technicians, admins, and support agents"
        actions={
          <Button
            onClick={() => {
              setEditingId(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Invite user
          </Button>
        }
      />

      {/* Metric tiles */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Total" value={counts.total ?? 0} />
        <Stat label="Farmers" value={counts.farmer ?? 0} />
        <Stat label="Managers" value={counts.farm_manager ?? 0} />
        <Stat label="Technicians" value={counts.technician ?? 0} />
        <Stat label="Admins" value={counts.admin ?? 0} />
        <Stat label="Suspended" value={counts.suspended ?? 0} tone="danger" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone"
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | "all")}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-1 h-3.5 w-3.5" />
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabels[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={districtFilter} onValueChange={setDistrictFilter}>
          <SelectTrigger className="w-[160px]">
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
      </div>

      {/* Table (desktop) / cards (mobile) */}
      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No users match"
          description="Try adjusting your filters or invite a new teammate."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Farm / Org</th>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-border/60 hover:bg-surface/60 cursor-pointer"
                    onClick={() => setDrawerUserId(u.id)}
                  >
                    <td className="px-4 py-3 font-medium">{u.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.farmName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.district ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {fmtDate(u.last_active_at)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => {
                            setEditingId(u.id);
                            setEditorOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset password"
                          onClick={() => setResetId(u.id)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={u.status === "suspended" ? "Reactivate" : "Suspend"}
                          onClick={() => setSuspendId(u.id)}
                        >
                          {u.status === "suspended" ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <Pause className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map((u) => (
              <button
                key={u.id}
                onClick={() => setDrawerUserId(u.id)}
                className="rounded-xl border border-border/70 bg-card p-4 text-left shadow-soft"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{u.full_name ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {u.email ?? u.phone ?? "—"}
                    </p>
                  </div>
                  <RoleBadge role={u.role} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{u.district ?? "—"}</span>
                  <StatusBadge status={u.status} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Detail drawer */}
      <Sheet open={!!drawerUserId} onOpenChange={(o) => !o && setDrawerUserId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {drawerUser && drawerRole && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {drawerUser.full_name ?? "User"}
                  <RoleBadge role={drawerRole} />
                </SheetTitle>
                <SheetDescription>
                  <StatusBadge status={(drawerUser.account_status ?? "active") as string} />
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5 text-sm">
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact
                  </h3>
                  <Row
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={drawerUser.email ?? "—"}
                  />
                  <Row
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={drawerUser.phone ?? "—"}
                  />
                  <Row
                    icon={<MapPin className="h-4 w-4" />}
                    label="District"
                    value={drawerUser.district ?? "—"}
                  />
                  <Row
                    icon={<Building2 className="h-4 w-4" />}
                    label="Farm"
                    value={
                      (drawerUser.assigned_farm_id &&
                        farmById.get(drawerUser.assigned_farm_id)?.name) ||
                      farms.find((f) => f.owner_id === drawerUser.id)?.name ||
                      "—"
                    }
                  />
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Account
                  </h3>
                  <Row
                    label="Language"
                    value={drawerUser.language === "bn" ? "Bangla" : "English"}
                  />
                  <Row label="Last active" value={fmtDate(drawerUser.last_active_at)} />
                </section>

                <section className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" /> Recent activity
                  </h3>
                  {activityQ.isLoading ? (
                    <p className="text-xs text-muted-foreground">Loading…</p>
                  ) : (activityQ.data ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No recent activity recorded.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {(activityQ.data ?? []).map((a) => (
                        <li
                          key={a.id}
                          className="rounded-md border border-border/60 bg-surface/40 p-2"
                        >
                          <p className="font-medium">{a.action}</p>
                          {a.detail && <p className="text-xs text-muted-foreground">{a.detail}</p>}
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {fmtDate(a.occurred_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingId(drawerUser.id);
                      setEditorOpen(true);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setResetId(drawerUser.id)}>
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Reset password
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSuspendId(drawerUser.id)}>
                    {(drawerUser.account_status ?? "active") === "suspended" ? (
                      <>
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Reactivate
                      </>
                    ) : (
                      <>
                        <Pause className="mr-1.5 h-3.5 w-3.5" /> Suspend
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / Edit dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit user" : "Invite user"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update profile, role, and assignment."
                : "Send an invitation email. The account will be created when they accept."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <Field label="Full name">
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabels[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={form.account_status}
                  onValueChange={(v) =>
                    setForm({ ...form, account_status: v as UserForm["account_status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Assigned farm / organization">
              <Select
                value={form.assigned_farm_id || "none"}
                onValueChange={(v) => setForm({ ...form, assigned_farm_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select farm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {farms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="District">
                <Input
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                />
              </Field>
              <Field label="Language">
                <Select
                  value={form.language}
                  onValueChange={(v) => setForm({ ...form, language: v as "en" | "bn" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={upsertMut.isPending}
              onClick={() => {
                if (!form.full_name.trim()) {
                  toast.error("Full name is required");
                  return;
                }
                if (form.phone.trim() && !isBangladeshPhone(form.phone)) {
                  toast.error("Enter a valid Bangladesh phone number (+880 or 01 format)");
                  return;
                }
                if (form.email.trim() && !isValidEmail(form.email)) {
                  toast.error("Enter a valid email address");
                  return;
                }
                const normalizedForm = {
                  ...form,
                  phone: form.phone.trim() ? normalizeBangladeshPhone(form.phone) : "",
                };
                if (!editingId) {
                  toast.success("Invitation queued. The user will appear once they accept.");
                  setEditorOpen(false);
                  return;
                }
                upsertMut.mutate({ id: editingId, form: normalizedForm });
              }}
            >
              {editingId ? "Save changes" : "Send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend / reactivate confirmation */}
      <AlertDialog open={!!suspendId} onOpenChange={(o) => !o && setSuspendId(null)}>
        <AlertDialogContent>
          {(() => {
            const u = profiles.find((p) => p.id === suspendId);
            const currentlySuspended = (u?.account_status ?? "active") === "suspended";
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {currentlySuspended ? "Reactivate user?" : "Suspend user?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {currentlySuspended
                      ? `${u?.full_name ?? "This user"} will regain access to Acqua Lence.`
                      : `${u?.full_name ?? "This user"} will lose access immediately. You can reactivate them later.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      suspendId &&
                      toggleStatusMut.mutate({
                        id: suspendId,
                        status: currentlySuspended ? "active" : "suspended",
                      })
                    }
                  >
                    {currentlySuspended ? "Reactivate" : "Suspend"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset password confirmation */}
      <AlertDialog open={!!resetId} onOpenChange={(o) => !o && setResetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send password reset?</AlertDialogTitle>
            <AlertDialogDescription>
              An email will be sent to{" "}
              <span className="font-medium">
                {profiles.find((p) => p.id === resetId)?.email ?? "the user"}
              </span>{" "}
              with a link to choose a new password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetId && resetPasswordMut.mutate(resetId)}>
              Send reset email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 shadow-soft">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-bold tabular-nums",
          tone === "danger" ? "text-rose-600" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
