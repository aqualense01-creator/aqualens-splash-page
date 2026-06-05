import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { insforge } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Acqua Lence" }] }),
  component: SettingsPage,
});

const channels = ["sms", "whatsapp", "email", "app"] as const;
const notifTypes = [
  { key: "critical", label: "Critical alerts", required: true },
  { key: "warning", label: "Warning alerts" },
  { key: "offline", label: "Device offline" },
  { key: "battery", label: "Low battery" },
  { key: "calibration", label: "Calibration due" },
  { key: "daily", label: "Daily summary" },
  { key: "weekly", label: "Weekly report" },
];

function SettingsPage() {
  const { user, profile, refresh } = useAuth();
  const { lang, setLang } = useI18n();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    district: profile?.district ?? "",
  });
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(() => {
    const m: Record<string, Record<string, boolean>> = {};
    notifTypes.forEach((t) => { m[t.key] = { sms: t.key === "critical", whatsapp: false, email: true, app: true }; });
    return m;
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not signed in");
      const { error } = await insforge.database.from("profiles").update({ ...form, language: lang }).eq("id", user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Profile saved"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Profile, security, language and notifications." />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="language">Language</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+8801…" /></div>
              <div><Label>District</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
            </div>
            <Button className="mt-4" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft space-y-4">
            <div>
              <Label>Current password</Label><Input type="password" />
              <Label className="mt-3 block">New password</Label><Input type="password" />
              <Label className="mt-3 block">Confirm new password</Label><Input type="password" />
              <Button className="mt-4" onClick={() => toast.success("Password update requested")}>Change password</Button>
            </div>
            <div className="border-t border-border/60 pt-4">
              <h4 className="text-sm font-semibold">Active sessions</h4>
              <p className="mt-1 text-xs text-muted-foreground">Sign out of all other devices.</p>
              <Button variant="outline" className="mt-3">Sign out other sessions</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-3 text-left">Type</th>{channels.map((c) => <th key={c} className="px-4 py-3 capitalize">{c}</th>)}</tr>
              </thead>
              <tbody>
                {notifTypes.map((t) => (
                  <tr key={t.key} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {t.label}{t.required && <span className="ml-1 text-[10px] text-rose-600">required</span>}
                    </td>
                    {channels.map((c) => (
                      <td key={c} className="px-4 py-3 text-center">
                        <Switch
                          checked={matrix[t.key]?.[c] ?? false}
                          disabled={t.required && c === "app"}
                          onCheckedChange={(v) => setMatrix({ ...matrix, [t.key]: { ...matrix[t.key], [c]: v } })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button className="mt-4" onClick={() => toast.success("Notification preferences saved")}>Save preferences</Button>
        </TabsContent>

        <TabsContent value="language" className="mt-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <Label>Preferred language</Label>
            <Select value={lang} onValueChange={(v) => setLang(v as "en" | "bn")}>
              <SelectTrigger className="mt-1 w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="bn">বাংলা (Bangla)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
