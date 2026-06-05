import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  User,
  Shield,
  Bell,
  Languages,
  KeyRound,
  ShieldCheck,
  LogOut,
  Smartphone,
  MessageCircle,
  Mail,
  Monitor,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { insforge } from "@/lib/insforge";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
import { PageHeader } from "@/components/app/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Acqua Lence" }] }),
  component: SettingsPage,
});

type Lang = "en" | "bn";
type ChannelKey = "sms" | "whatsapp" | "email" | "app";

const tx = (lang: Lang, en: string, bn: string) => (lang === "bn" ? bn : en);

const DISTRICTS = [
  "Khulna",
  "Satkhira",
  "Bagerhat",
  "Cox's Bazar",
  "Chattogram",
  "Barishal",
  "Dhaka",
  "Mymensingh",
];

const CHANNELS: {
  key: ChannelKey;
  en: string;
  bn: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "sms", en: "SMS", bn: "এসএমএস", icon: Smartphone },
  { key: "whatsapp", en: "WhatsApp", bn: "হোয়াটসঅ্যাপ", icon: MessageCircle },
  { key: "email", en: "Email", bn: "ইমেইল", icon: Mail },
  { key: "app", en: "App", bn: "অ্যাপ", icon: Monitor },
];

type NotifType = {
  key: string;
  en: string;
  bn: string;
  required?: boolean;
  severity?: "critical" | "warning" | "info";
};
const NOTIF_TYPES: NotifType[] = [
  {
    key: "critical",
    en: "Critical alerts",
    bn: "জরুরি সতর্কতা",
    required: true,
    severity: "critical",
  },
  { key: "warning", en: "Warning alerts", bn: "সতর্কতা", severity: "warning" },
  { key: "offline", en: "Device offline", bn: "ডিভাইস অফলাইন", severity: "warning" },
  { key: "battery", en: "Low battery", bn: "ব্যাটারি কম", severity: "warning" },
  { key: "calibration", en: "Calibration due", bn: "ক্যালিব্রেশন প্রয়োজন", severity: "info" },
  { key: "daily", en: "Daily summary", bn: "দৈনিক সারাংশ", severity: "info" },
  { key: "weekly", en: "Weekly report", bn: "সাপ্তাহিক রিপোর্ট", severity: "info" },
];

function SettingsPage() {
  const { user, profile, roles, signOut, refresh } = useAuth();
  const { lang, setLang } = useI18n();
  const T = (en: string, bn: string) => tx(lang, en, bn);

  // ----- Profile form -----
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    district: profile?.district ?? "",
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await insforge.database
        .from("profiles")
        .update({ ...form, language: lang })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(T("Profile saved", "প্রোফাইল সংরক্ষিত হয়েছে"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ----- Security -----
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [otpEnabled, setOtpEnabled] = useState(true);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const changePassword = () => {
    if (pwd.next.length < 8) {
      toast.error(
        T("Password must be at least 8 characters", "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে"),
      );
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast.error(T("Passwords do not match", "পাসওয়ার্ড মিলছে না"));
      return;
    }
    toast.success(T("Password updated", "পাসওয়ার্ড পরিবর্তিত হয়েছে"));
    setPwd({ current: "", next: "", confirm: "" });
  };

  // ----- Notifications matrix -----
  const [matrix, setMatrix] = useState<Record<string, Record<ChannelKey, boolean>>>(() => {
    const m: Record<string, Record<ChannelKey, boolean>> = {};
    NOTIF_TYPES.forEach((t) => {
      m[t.key] = {
        sms: t.key === "critical" || t.key === "offline",
        whatsapp: t.key === "critical",
        email: t.key !== "daily",
        app: true,
      };
    });
    return m;
  });

  const toggle = (typeKey: string, ch: ChannelKey, v: boolean, required?: boolean) => {
    if (required) {
      const enabledCount = (Object.values(matrix[typeKey]) as boolean[]).filter(Boolean).length;
      if (!v && enabledCount <= 1) {
        toast.error(
          T(
            "Critical alerts must use at least one channel",
            "জরুরি সতর্কতার জন্য অন্তত একটি চ্যানেল প্রয়োজন",
          ),
        );
        return;
      }
    }
    setMatrix({ ...matrix, [typeKey]: { ...matrix[typeKey], [ch]: v } });
  };

  const role = roles[0] ?? "farmer";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={T("Settings", "সেটিংস")}
        subtitle={T(
          "Profile, security, notifications and language.",
          "প্রোফাইল, নিরাপত্তা, নোটিফিকেশন এবং ভাষা।",
        )}
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            {T("Profile", "প্রোফাইল")}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            {T("Security", "নিরাপত্তা")}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            {T("Notifications", "নোটিফিকেশন")}
          </TabsTrigger>
          <TabsTrigger value="language" className="gap-1.5">
            <Languages className="h-3.5 w-3.5" />
            {T("Language", "ভাষা")}
          </TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-4">
          <Card
            title={T("Personal information", "ব্যক্তিগত তথ্য")}
            description={T(
              "How you appear across Acqua Lence.",
              "আপনি Acqua Lence-এ কীভাবে দেখা যাবেন।",
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={T("Full name", "পুরো নাম")} className="sm:col-span-2">
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder={T("e.g. Rahim Mia", "যেমন রহিম মিয়া")}
                />
              </Field>
              <Field label={T("Email", "ইমেইল")}>
                <Input value={user?.email ?? ""} disabled />
              </Field>
              <Field label={T("Phone", "ফোন")}>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+8801…"
                />
              </Field>
              <Field label={T("District", "জেলা")}>
                <Select
                  value={form.district}
                  onValueChange={(v) => setForm({ ...form, district: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={T("Select district", "জেলা নির্বাচন করুন")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={T("Role", "ভূমিকা")}>
                <Input value={role} disabled className="capitalize" />
              </Field>
              <Field label={T("Preferred language", "পছন্দের ভাষা")}>
                <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="bn">বাংলা (Bangla)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
                {saveProfile.isPending
                  ? T("Saving…", "সংরক্ষণ হচ্ছে…")
                  : T("Save profile", "প্রোফাইল সংরক্ষণ করুন")}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="mt-4 space-y-4">
          <Card
            title={T("Change password", "পাসওয়ার্ড পরিবর্তন")}
            icon={<KeyRound className="h-4 w-4 text-primary" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={T("Current password", "বর্তমান পাসওয়ার্ড")} className="sm:col-span-2">
                <Input
                  type="password"
                  value={pwd.current}
                  onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                />
              </Field>
              <Field label={T("New password", "নতুন পাসওয়ার্ড")}>
                <Input
                  type="password"
                  value={pwd.next}
                  onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                />
              </Field>
              <Field label={T("Confirm new password", "নতুন পাসওয়ার্ড নিশ্চিত করুন")}>
                <Input
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={changePassword}>
                <Lock className="mr-2 h-4 w-4" />
                {T("Update password", "পাসওয়ার্ড আপডেট করুন")}
              </Button>
            </div>
          </Card>

          <Card
            title={T("Two-factor authentication", "টু-ফ্যাক্টর প্রমাণীকরণ")}
            icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{T("OTP verification", "ওটিপি যাচাই")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {T(
                    "Receive a 6-digit code on your phone or email at sign-in.",
                    "সাইন-ইন করার সময় আপনার ফোন বা ইমেইলে ৬-সংখ্যার কোড পাবেন।",
                  )}
                </p>
              </div>
              <Switch
                checked={otpEnabled}
                onCheckedChange={(v) => {
                  setOtpEnabled(v);
                  toast.success(
                    v
                      ? T("OTP enabled", "ওটিপি চালু করা হয়েছে")
                      : T("OTP disabled", "ওটিপি বন্ধ করা হয়েছে"),
                  );
                }}
              />
            </div>
          </Card>

          <Card
            title={T("Active sessions", "সক্রিয় সেশন")}
            icon={<LogOut className="h-4 w-4 text-rose-600" />}
            description={T(
              "Sign out from all other devices currently logged into your account.",
              "আপনার অ্যাকাউন্টে লগ-ইন থাকা অন্য সব ডিভাইস থেকে সাইন আউট করুন।",
            )}
          >
            <Button
              variant="outline"
              className="border-rose-500/30 text-rose-700 hover:bg-rose-500/10"
              onClick={() => setSignOutOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {T("Sign out all sessions", "সব সেশন থেকে সাইন আউট")}
            </Button>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card
            title={T("Notification preferences", "নোটিফিকেশন পছন্দ")}
            description={T(
              "Choose which channels to use for each alert type.",
              "প্রতিটি সতর্কতার জন্য কোন চ্যানেল ব্যবহার করবেন তা নির্বাচন করুন।",
            )}
          >
            {/* Desktop: matrix */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">
                      {T("Alert type", "সতর্কতার ধরন")}
                    </th>
                    {CHANNELS.map((c) => (
                      <th key={c.key} className="px-3 py-2 font-medium">
                        <div className="flex flex-col items-center gap-1">
                          <c.icon className="h-3.5 w-3.5" />
                          {tx(lang, c.en, c.bn)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NOTIF_TYPES.map((t) => (
                    <tr key={t.key} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {t.severity === "critical" && (
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                          )}
                          <span className="font-medium">{tx(lang, t.en, t.bn)}</span>
                          {t.required && (
                            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rose-700">
                              {T("Required", "প্রয়োজনীয়")}
                            </span>
                          )}
                        </div>
                      </td>
                      {CHANNELS.map((c) => (
                        <td key={c.key} className="px-3 py-3 text-center">
                          <Switch
                            checked={matrix[t.key]?.[c.key] ?? false}
                            onCheckedChange={(v) => toggle(t.key, c.key, v, t.required)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: per-type cards */}
            <div className="space-y-3 sm:hidden">
              {NOTIF_TYPES.map((t) => (
                <div
                  key={t.key}
                  className={cn(
                    "rounded-xl border bg-card p-3",
                    t.required ? "border-rose-500/30" : "border-border/70",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {t.severity === "critical" && (
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                      )}
                      <span className="text-sm font-medium">{tx(lang, t.en, t.bn)}</span>
                    </div>
                    {t.required && (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rose-700">
                        {T("Required", "প্রয়োজনীয়")}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CHANNELS.map((c) => (
                      <label
                        key={c.key}
                        className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2"
                      >
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <c.icon className="h-3.5 w-3.5" />
                          {tx(lang, c.en, c.bn)}
                        </span>
                        <Switch
                          checked={matrix[t.key]?.[c.key] ?? false}
                          onCheckedChange={(v) => toggle(t.key, c.key, v, t.required)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-lg bg-rose-500/[0.06] p-3 text-xs text-rose-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {T(
                "Critical alerts must use at least one channel and cannot be fully disabled.",
                "জরুরি সতর্কতার জন্য অন্তত একটি চ্যানেল ব্যবহার করতে হবে এবং সম্পূর্ণ বন্ধ করা যাবে না।",
              )}
            </p>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={() =>
                  toast.success(
                    T("Notification preferences saved", "নোটিফিকেশন পছন্দ সংরক্ষিত হয়েছে"),
                  )
                }
              >
                {T("Save preferences", "পছন্দ সংরক্ষণ করুন")}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* LANGUAGE */}
        <TabsContent value="language" className="mt-4">
          <Card
            title={T("Interface language", "ইন্টারফেস ভাষা")}
            description={T(
              "Applies across the app, alerts and reports.",
              "অ্যাপ, সতর্কতা এবং রিপোর্ট জুড়ে প্রযোজ্য।",
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { v: "en", label: "English", sub: "Default for technicians and admins" },
                  { v: "bn", label: "বাংলা", sub: "কৃষকদের জন্য ডিফল্ট" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => {
                    setLang(opt.v as Lang);
                    toast.success(
                      opt.v === "bn"
                        ? "ভাষা বাংলায় পরিবর্তিত হয়েছে"
                        : "Language switched to English",
                    );
                  }}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    lang === opt.v
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/70 hover:bg-accent/30",
                  )}
                >
                  <p className="font-display text-lg font-semibold">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.sub}</p>
                  {lang === opt.v && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                      {T("Active", "সক্রিয়")}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sign out all sessions confirm */}
      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-rose-600" />
              {T("Sign out all sessions?", "সব সেশন থেকে সাইন আউট করবেন?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {T(
                "You'll be signed out everywhere, including this device. You will need to sign in again.",
                "এই ডিভাইস সহ সব জায়গা থেকে আপনি সাইন আউট হবেন। আবার সাইন ইন করতে হবে।",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T("Cancel", "বাতিল")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                setSignOutOpen(false);
                await signOut();
                toast.success(T("Signed out everywhere", "সব জায়গা থেকে সাইন আউট হয়েছে"));
              }}
            >
              {T("Yes, sign out", "হ্যাঁ, সাইন আউট করুন")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Card({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          {icon}
          {title}
        </h3>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
