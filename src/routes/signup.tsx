import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/landing/Logo";
import { useI18n } from "@/lib/i18n";
import { Waves, ArrowRight, Globe } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — Acqua Lence" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setErr("Passwords do not match."); return; }
    setBusy(true);
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setBusy(false);
    if (error) { setErr(error); return; }
    navigate({ to: "/app/dashboard" });
  }

  const isBn = lang === "bn";

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-surface px-4">
      {/* Aquatic gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[30%] -left-[20%] h-[80vh] w-[80vh] rounded-full bg-[oklch(0.72_0.12_195)] opacity-[0.18] blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[60vh] w-[60vh] rounded-full bg-[oklch(0.68_0.10_210)] opacity-[0.14] blur-[100px]" />
        <div className="absolute -bottom-[20%] left-[10%] h-[70vh] w-[70vh] rounded-full bg-[oklch(0.60_0.08_200)] opacity-[0.12] blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <Logo />
            <p className="text-center text-xs text-muted-foreground">
              {isBn ? "স্মার্ট জলকৃষি মনিটরিং প্ল্যাটফর্ম" : "Smart aquaculture monitoring platform"}
            </p>
          </div>

          <h1 className="text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            {isBn ? "আপনার ফার্ম অ্যাকাউন্ট তৈরি করুন" : "Create your farm account"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {isBn ? "মিনিটের মধ্যে আপনার পুকুর মনিটরিং শুরু করুন।" : "Start monitoring your ponds in minutes."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                {isBn ? "পুরো নাম" : "Full name"}
              </Label>
              <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 text-base" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                {isBn ? "ইমেইল" : "Email"}
              </Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11 text-base" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                {isBn ? "পাসওয়ার্ড" : "Password"}
              </Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="h-11 text-base" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium">
                {isBn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm password"}
              </Label>
              <Input id="confirm" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 text-base" />
            </div>

            {err && <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{err}</p>}

            <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={busy}>
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  {isBn ? "তৈরি হচ্ছে…" : "Creating…"}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isBn ? "অ্যাকাউন্ট তৈরি করুন" : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isBn ? "ইতিমধ্যে অ্যাকাউন্ট আছে? " : "Already have an account? "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              {isBn ? "সাইন ইন করুন" : "Sign in"}
            </Link>
          </p>

          {/* Trust message */}
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[oklch(0.72_0.12_195/0.08)] px-4 py-3">
            <Waves className="h-4 w-4 text-[oklch(0.55_0.08_200)]" />
            <p className="text-xs text-[oklch(0.45_0.06_200)]">
              {isBn
                ? "আপনার পুকুর, ডিভাইস ও সতর্কতা রিয়েল টাইমে মনিটর করুন।"
                : "Monitor your ponds, devices, and alerts in real time."}
            </p>
          </div>
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
