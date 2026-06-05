import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, isBangladeshPhone, isValidEmail, normalizeBangladeshPhone, type AppRole } from "@/lib/auth";
import { Logo } from "@/components/landing/Logo";
import { useI18n } from "@/lib/i18n";
import {
  Waves,
  ArrowRight,
  ArrowLeft,
  Globe,
  Check,
  User,
  Lock,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  Tractor,
} from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Activate account — Acqua Lence" }] }),
  component: SignupPage,
});

const BD_DISTRICTS = [
  "Dhaka", "Chattogram", "Khulna", "Rajshahi", "Sylhet", "Barishal", "Rangpur", "Mymensingh",
  "Cox's Bazar", "Bagerhat", "Satkhira", "Jashore", "Patuakhali", "Bhola", "Noakhali", "Feni",
  "Cumilla", "Faridpur", "Bogura", "Pabna", "Tangail", "Gazipur", "Narayanganj", "Manikganj",
];

type Step = 0 | 1 | 2;

function scorePassword(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];
  return { score: s, label: labels[s], color: colors[s] };
}

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang } = useI18n();
  const isBn = lang === "bn";

  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // profile
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [prefLang, setPrefLang] = useState<"en" | "bn">(lang);
  const [roleKind, setRoleKind] = useState<"farmer" | "manager">("farmer");

  // security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const pwScore = useMemo(() => scorePassword(password), [password]);
  const pwMatch = confirmPassword.length > 0 && password === confirmPassword;

  function validateStep0(): string | null {
    if (!fullName.trim()) return isBn ? "পুরো নাম দিন।" : "Full name is required.";
    if (!isBangladeshPhone(phone)) return isBn ? "সঠিক বাংলাদেশি ফোন নম্বর দিন (+880 বা 01)।" : "Enter a valid Bangladesh phone number (+880 or 01 format).";
    if (!isValidEmail(email)) return isBn ? "সঠিক ইমেইল দিন।" : "Enter a valid email address.";
    if (!district) return isBn ? "জেলা নির্বাচন করুন।" : "Select your district.";
    return null;
  }
  function validateStep1(): string | null {
    if (password.length < 8) return isBn ? "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।" : "Password must be at least 8 characters.";
    if (pwScore.score < 3) return isBn ? "আরও শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।" : "Please use a stronger password.";
    if (password !== confirmPassword) return isBn ? "পাসওয়ার্ড মিলছে না।" : "Passwords do not match.";
    return null;
  }

  function next() {
    setErr(null);
    if (step === 0) {
      const e = validateStep0();
      if (e) return setErr(e);
      setStep(1);
    } else if (step === 1) {
      const e = validateStep1();
      if (e) return setErr(e);
      setStep(2);
    }
  }

  function back() {
    setErr(null);
    if (step > 0) setStep((step - 1) as Step);
  }

  async function activate() {
    setErr(null);
    setBusy(true);
    const { error } = await signUp(email.trim(), password, fullName.trim(), "farmer");
    setBusy(false);
    if (error) {
      setErr(error);
      setStep(0);
      return;
    }
    setDone(true);
  }

  function goToDashboard() {
    navigate({ to: "/app/dashboard" });
  }

  const steps = [
    { key: "profile", label: isBn ? "প্রোফাইল" : "Profile", icon: User },
    { key: "security", label: isBn ? "সুরক্ষা" : "Security", icon: Lock },
    { key: "confirm", label: isBn ? "নিশ্চিত করুন" : "Confirm", icon: Sparkles },
  ];

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-surface px-4 py-8">
      {/* Aquatic gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[30%] -left-[20%] h-[80vh] w-[80vh] rounded-full bg-[oklch(0.72_0.12_195)] opacity-[0.18] blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[60vh] w-[60vh] rounded-full bg-[oklch(0.68_0.10_210)] opacity-[0.14] blur-[100px]" />
        <div className="absolute -bottom-[20%] left-[10%] h-[70vh] w-[70vh] rounded-full bg-[oklch(0.60_0.08_200)] opacity-[0.12] blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-[560px]">
        <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-3">
            <Logo />
            <p className="text-center text-xs text-muted-foreground">
              {isBn ? "আপনার খামার অ্যাকাউন্ট সক্রিয় করুন" : "Activate your farm account"}
            </p>
          </div>

          {!done && (
            <>
              {/* Stepper */}
              <Stepper steps={steps} current={step} />

              <div className="mt-6">
                {step === 0 && (
                  <div className="space-y-4">
                    <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {isBn ? "আপনার প্রোফাইল" : "Your profile"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {isBn ? "আপনার খামার চিনতে আমাদের কিছু তথ্য দিন।" : "Tell us a bit about you so we can set up your farm."}
                    </p>

                    <Field label={isBn ? "পুরো নাম" : "Full name"} helper={isBn ? "যেমন: রহিম মিয়া" : "e.g. Rahim Mia"}>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 text-base" />
                    </Field>

                    <Field label={isBn ? "ফোন নম্বর" : "Phone number"} helper={isBn ? "+880 বা 01 ফরম্যাটে" : "Use +880 or 01 format"}>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="+8801712345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={() => phone && isBangladeshPhone(phone) && setPhone(normalizeBangladeshPhone(phone))}
                        className="h-11 text-base"
                      />
                    </Field>

                    <Field label={isBn ? "ইমেইল" : "Email"} helper={isBn ? "অ্যাকাউন্ট পুনরুদ্ধারের জন্য ব্যবহৃত হবে" : "Used for account recovery"}>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-base" />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={isBn ? "জেলা" : "District"} helper={isBn ? "আপনার খামারের জেলা" : "Where your farm is located"}>
                        <Select value={district} onValueChange={setDistrict}>
                          <SelectTrigger className="h-11 text-base">
                            <SelectValue placeholder={isBn ? "জেলা নির্বাচন করুন" : "Select district"} />
                          </SelectTrigger>
                          <SelectContent>
                            {BD_DISTRICTS.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label={isBn ? "পছন্দের ভাষা" : "Preferred language"} helper={isBn ? "অ্যাপ এই ভাষায় দেখাবে" : "App will use this language"}>
                        <Select value={prefLang} onValueChange={(v) => { setPrefLang(v as "en" | "bn"); setLang(v as "en" | "bn"); }}>
                          <SelectTrigger className="h-11 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="bn">বাংলা</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field label={isBn ? "আপনার ভূমিকা" : "Your role"} helper={isBn ? "একটি নির্বাচন করুন" : "Choose what best describes you"}>
                      <div className="grid grid-cols-2 gap-3">
                        <RoleCard
                          checked={roleKind === "farmer"}
                          onSelect={() => setRoleKind("farmer")}
                          icon={<Tractor className="h-5 w-5" />}
                          title={isBn ? "কৃষক" : "Farmer"}
                          desc={isBn ? "নিজে পুকুর চালান" : "I run my own ponds"}
                        />
                        <RoleCard
                          checked={roleKind === "manager"}
                          onSelect={() => setRoleKind("manager")}
                          icon={<User className="h-5 w-5" />}
                          title={isBn ? "ফার্ম ম্যানেজার" : "Farm Manager"}
                          desc={isBn ? "অনেকের পুকুর দেখাশোনা করি" : "I manage several farms"}
                        />
                      </div>
                    </Field>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {isBn ? "একটি শক্তিশালী পাসওয়ার্ড তৈরি করুন" : "Create a strong password"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {isBn ? "আপনার পুকুরের ডেটা সুরক্ষিত রাখতে।" : "To keep your farm data safe."}
                    </p>

                    <Field label={isBn ? "পাসওয়ার্ড" : "Password"} helper={isBn ? "কমপক্ষে ৮ অক্ষর, বড়/ছোট হাতের ও সংখ্যা মিশিয়ে" : "At least 8 characters, mix of letters and numbers"}>
                      <div className="relative">
                        <Input
                          type={showPw ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          className="h-11 pr-11 text-base"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPw ? "Hide password" : "Show password"}
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {password.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex gap-1">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                  i < pwScore.score ? pwScore.color : "bg-muted"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isBn ? "শক্তি: " : "Strength: "}<span className="font-medium text-foreground">{pwScore.label}</span>
                          </p>
                        </div>
                      )}
                    </Field>

                    <Field label={isBn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm password"}>
                      <div className="relative">
                        <Input
                          type={showPw ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          className="h-11 pr-11 text-base"
                        />
                        {confirmPassword.length > 0 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            {pwMatch ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <span className="text-xs text-destructive">{isBn ? "মিলছে না" : "no match"}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </Field>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {isBn ? "তথ্য পর্যালোচনা করুন" : "Review your details"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {isBn ? "সবকিছু ঠিক থাকলে সক্রিয় করুন।" : "Make sure everything looks right before activating."}
                    </p>
                    <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/40 p-4">
                      <Row label={isBn ? "নাম" : "Name"} value={fullName} />
                      <Row label={isBn ? "ভূমিকা" : "Role"} value={roleKind === "manager" ? (isBn ? "ফার্ম ম্যানেজার" : "Farm Manager") : (isBn ? "কৃষক" : "Farmer")} />
                      <Row label={isBn ? "ফোন" : "Phone"} value={normalizeBangladeshPhone(phone)} />
                      <Row label={isBn ? "ইমেইল" : "Email"} value={email} />
                      <Row label={isBn ? "জেলা" : "District"} value={district} />
                      <Row label={isBn ? "ভাষা" : "Language"} value={prefLang === "bn" ? "বাংলা" : "English"} />
                    </div>
                    <p className="rounded-xl bg-[oklch(0.72_0.12_195/0.08)] px-4 py-3 text-xs text-[oklch(0.45_0.06_200)]">
                      {isBn
                        ? "সক্রিয় করে আপনি অ্যাকুয়া লেন্সের শর্তাবলী মেনে নিচ্ছেন।"
                        : "By activating, you agree to Acqua Lence's terms of service."}
                    </p>
                  </div>
                )}

                {err && (
                  <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{err}</p>
                )}

                <div className="mt-6 flex items-center gap-3">
                  {step > 0 && (
                    <Button type="button" variant="outline" onClick={back} className="h-11 flex-1 text-base">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {isBn ? "ফিরে যান" : "Back"}
                    </Button>
                  )}
                  {step < 2 ? (
                    <Button type="button" onClick={next} className="h-11 flex-1 text-base font-semibold">
                      {isBn ? "পরবর্তী" : "Continue"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="button" onClick={activate} disabled={busy} className="h-11 flex-1 text-base font-semibold">
                      {busy ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                          {isBn ? "সক্রিয় হচ্ছে…" : "Activating…"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {isBn ? "অ্যাকাউন্ট সক্রিয় করুন" : "Activate account"}
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                {isBn ? "ইতিমধ্যে অ্যাকাউন্ট আছে? " : "Already have an account? "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  {isBn ? "সাইন ইন করুন" : "Sign in"}
                </Link>
              </p>
            </>
          )}

          {done && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                {isBn ? "অ্যাকাউন্ট সক্রিয় হয়েছে!" : "Account activated!"}
              </h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                {isBn
                  ? `স্বাগতম, ${fullName}। আপনার পুকুর মনিটরিং ড্যাশবোর্ড প্রস্তুত।`
                  : `Welcome, ${fullName}. Your pond monitoring dashboard is ready.`}
              </p>
              <Button onClick={goToDashboard} className="mt-2 h-11 w-full text-base font-semibold sm:w-auto sm:px-8">
                {isBn ? "ড্যাশবোর্ডে যান" : "Go to dashboard"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Trust message */}
          {!done && (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[oklch(0.72_0.12_195/0.08)] px-4 py-3">
              <Waves className="h-4 w-4 text-[oklch(0.55_0.08_200)]" />
              <p className="text-xs text-[oklch(0.45_0.06_200)]">
                {isBn
                  ? "আপনার পুকুর, ডিভাইস ও সতর্কতা রিয়েল টাইমে মনিটর করুন।"
                  : "Monitor your ponds, devices, and alerts in real time."}
              </p>
            </div>
          )}
        </div>

        {/* Language toggle */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex rounded-full bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                lang === "en" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang("bn")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                lang === "bn" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground hover:underline">
            {isBn ? "← হোমপেজে ফিরে যান" : "← Back to home"}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Stepper({
  steps,
  current,
}: {
  steps: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  current: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const active = i === current;
        const completed = i < current;
        return (
          <div key={s.key} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`grid h-9 w-9 place-items-center rounded-full border-2 transition-all ${
                  completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  active || completed ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mb-5 h-0.5 flex-1 rounded-full ${i < current ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

function RoleCard({
  checked,
  onSelect,
  icon,
  title,
  desc,
}: {
  checked: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-3 text-left transition-all ${
        checked ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}
