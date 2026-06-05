import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, isBangladeshPhone, normalizeBangladeshPhone } from "@/lib/auth";
import { Logo } from "@/components/landing/Logo";
import { useI18n } from "@/lib/i18n";
import { User, Mail, Shield, CheckCircle2, Lock, Phone, Globe } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/activate-account")({
  head: () => ({ meta: [{ title: "Activate account — Acqua Lence" }] }),
  component: ActivateAccountPage,
});

function ActivateAccountPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();

  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"farmer" | "technician">("farmer");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const isBn = lang === "bn";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!code.trim() || !email.trim() || !fullName.trim() || !password.trim()) {
      setErr(isBn ? "অনুগ্রহ করে সবগুলি ঘর পূরণ করুন।" : "Please fill in all required fields.");
      return;
    }

    if (phone && !isBangladeshPhone(phone)) {
      setErr(isBn ? "একটি বৈধ বাংলাদেশী ফোন নম্বর দিন।" : "Enter a valid Bangladesh phone number.");
      return;
    }

    if (password.length < 8) {
      setErr(
        isBn ? "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।" : "Password must be at least 8 characters.",
      );
      return;
    }

    setBusy(true);
    // Use the mock signUp functionality to register user with the selected role
    const { error } = await signUp(email, password, fullName, role);
    setBusy(false);

    if (error) {
      setErr(error);
      return;
    }

    setSuccess(true);
    toast.success(isBn ? "অ্যাক্টিভেশন সফল হয়েছে!" : "Account activated successfully!");
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-surface px-4 py-8">
      {/* Aquatic background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[30%] -left-[20%] h-[80vh] w-[80vh] rounded-full bg-[oklch(0.72_0.12_195)] opacity-[0.18] blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[60vh] w-[60vh] rounded-full bg-[oklch(0.68_0.10_210)] opacity-[0.14] blur-[100px]" />
        <div className="absolute -bottom-[20%] left-[10%] h-[70vh] w-[70vh] rounded-full bg-[oklch(0.60_0.08_200)] opacity-[0.12] blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <Logo />
            <p className="text-center text-xs text-muted-foreground">
              {isBn ? "অ্যাক্টিভেশন এবং অ্যাকাউন্ট সেটআপ" : "Activation & Account Setup"}
            </p>
          </div>

          <h1 className="text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">
            {isBn ? "অ্যাকাউন্ট অ্যাক্টিভেট করুন" : "Activate Your Account"}
          </h1>

          <p className="mt-2 text-center text-sm text-muted-foreground">
            {isBn
              ? "আপনার ইনভাইটেশন কোডটি দিয়ে আপনার প্রোফাইল তৈরি করুন"
              : "Enter your invitation details to complete your profile setup"}
          </p>

          {success ? (
            <div className="mt-6 space-y-4">
              <div className="flex flex-col items-center gap-3 rounded-xl bg-[oklch(0.65_0.12_145/0.10)] px-5 py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-[oklch(0.55_0.10_145)]" />
                <p className="text-sm font-semibold text-[oklch(0.40_0.08_145)]">
                  {isBn
                    ? "অ্যাকাউন্ট সফলভাবে অ্যাক্টিভেট হয়েছে! ড্যাশবোর্ডে স্বাগতম।"
                    : "Account successfully activated! Welcome to the dashboard."}
                </p>
              </div>
              <Button
                type="button"
                className="h-11 w-full text-base font-semibold"
                onClick={() => navigate({ to: "/app/dashboard" })}
              >
                {isBn ? "ড্যাশবোর্ডে প্রবেশ করুন" : "Go to Dashboard"}
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              {/* Code */}
              <div className="space-y-1">
                <Label
                  htmlFor="code"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {isBn ? "অ্যাক্টিভেশন কোড *" : "Activation Code *"}
                </Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="code"
                    type="text"
                    required
                    placeholder={isBn ? "যেমন: ACQUA-12345" : "e.g., ACQUA-12345"}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-10 pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {isBn ? "ইমেইল ঠিকানা *" : "Email Address *"}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="example@acqualence.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <Label
                  htmlFor="fullName"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {isBn ? "পূর্ণ নাম *" : "Full Name *"}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    required
                    placeholder={isBn ? "রহিম মিয়া" : "Rahim Mia"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <Label
                  htmlFor="phone"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {isBn ? "বাংলাদেশী ফোন নম্বর (ঐচ্ছিক)" : "Bangladesh Phone (Optional)"}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="01712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {isBn ? "নতুন পাসওয়ার্ড *" : "New Password *"}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isBn ? "প্রোফাইল রোল নির্বাচন করুন *" : "Select Profile Role *"}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("farmer")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-semibold transition-all cursor-pointer ${
                      role === "farmer"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {isBn ? "খামারী (Farmer)" : "Farmer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("technician")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-semibold transition-all cursor-pointer ${
                      role === "technician"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {isBn ? "টেকনিশিয়ান (Technician)" : "Technician"}
                  </button>
                </div>
              </div>

              {err && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {err}
                </p>
              )}

              <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={busy}>
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    {isBn ? "অ্যাক্টিভেট করা হচ্ছে…" : "Activating…"}
                  </span>
                ) : (
                  <span>{isBn ? "অ্যাকাউন্ট অ্যাক্টিভেট করুন" : "Activate Account"}</span>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Language switcher */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex rounded-full bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                lang === "en"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang("bn")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                lang === "bn"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>

        {/* Links */}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link to="/login" className="hover:text-foreground hover:underline">
            {isBn ? "← লগইন পেজে ফিরে যান" : "← Back to Login"}
          </Link>
        </p>
      </div>
    </div>
  );
}
