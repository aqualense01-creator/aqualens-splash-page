import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, isValidIdentifier } from "@/lib/auth";
import { Logo } from "@/components/landing/Logo";
import { useI18n } from "@/lib/i18n";
import { Waves, Smartphone, Mail, KeyRound, ArrowRight, Globe } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Acqua Lence" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, sendOtp, user, loading, isAdmin, isTechnician } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang } = useI18n();

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* Redirect if already logged in */
  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) navigate({ to: "/admin/dashboard" });
      else if (isTechnician) navigate({ to: "/app/setup" });
      else navigate({ to: "/app/dashboard" });
    }
  }, [loading, user, isAdmin, isTechnician, navigate]);

  /* Password login */
  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!identifier.trim()) {
      setErr("Enter your email or phone number.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    const idType = isValidIdentifier(identifier);
    if (!idType) {
      setErr("Enter a valid email or Bangladesh phone number.");
      return;
    }
    setBusy(true);
    const { error } = await signIn(identifier, password);
    setBusy(false);
    if (error) setErr(error);
  }

  /* Request OTP — navigate to dedicated verify page */
  async function onRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const idType = isValidIdentifier(identifier);
    if (!idType) {
      setErr("Enter a valid email or Bangladesh phone number.");
      return;
    }
    setBusy(true);
    const { error } = await sendOtp(identifier);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    navigate({ to: "/verify-otp", search: { identifier } });
  }

  const isBn = lang === "bn";

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-surface px-4">
      {/* Aquatic gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[30%] -left-[20%] h-[80vh] w-[80vh] rounded-full bg-[oklch(0.72_0.12_195)] opacity-[0.18] blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[60vh] w-[60vh] rounded-full bg-[oklch(0.68_0.10_210)] opacity-[0.14] blur-[100px]" />
        <div className="absolute -bottom-[20%] left-[10%] h-[70vh] w-[70vh] rounded-full bg-[oklch(0.60_0.08_200)] opacity-[0.12] blur-[110px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q25 20 50 10 T100 10' fill='none' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "120px 24px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Card */}
        <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <Logo />
            <p className="text-center text-xs text-muted-foreground">
              {isBn
                ? "স্মার্ট জলকৃষি মনিটরিং প্ল্যাটফর্ম"
                : "Smart aquaculture monitoring platform"}
            </p>
          </div>

          {/* Title */}
          <h1 className="text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            {isBn ? "আপনার অ্যাকাউন্টে সাইন ইন করুন" : "Sign in to your account"}
          </h1>

          {/* Mode selector */}
          <div className="mt-5 flex rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setErr(null);
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                mode === "password"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                {isBn ? "পাসওয়ার্ড" : "Password"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("otp");
                setErr(null);
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                mode === "otp"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />
                {isBn ? "ওটিপি" : "OTP"}
              </span>
            </button>
          </div>

          {/* Password form */}
          {mode === "password" && (
            <form onSubmit={onPasswordLogin} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="identifier" className="text-sm font-medium">
                  {isBn ? "ইমেইল বা ফোন" : "Email or phone"}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="text"
                    required
                    placeholder={
                      isBn ? "example@gmail.com বা 01712345678" : "example@gmail.com or 01712345678"
                    }
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11 pl-9 text-base"
                    autoComplete="email"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isBn
                    ? "+880 বা 01 দিয়ে শুরু হওয়া বাংলাদেশী নম্বর"
                    : "Bangladesh number starting with +880 or 01"}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {isBn ? "পাসওয়ার্ড" : "Password"}
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {isBn ? "পাসওয়ার্ড ভুলে গেছেন?" : "Forgot password?"}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder={isBn ? "কমপক্ষে ৮ অক্ষর" : "At least 8 characters"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 text-base"
                  autoComplete="current-password"
                />
              </div>

              {err && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {err}
                </p>
              )}

              <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={busy}>
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    {isBn ? "সাইন ইন হচ্ছে…" : "Signing in…"}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isBn ? "সাইন ইন করুন" : "Sign in"}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* OTP request form */}
          {mode === "otp" && (
            <form onSubmit={onRequestOtp} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp-id" className="text-sm font-medium">
                  {isBn ? "ইমেইল বা ফোন" : "Email or phone"}
                </Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="otp-id"
                    type="text"
                    required
                    placeholder={
                      isBn ? "example@gmail.com বা 01712345678" : "example@gmail.com or 01712345678"
                    }
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11 pl-9 text-base"
                  />
                </div>
              </div>

              {err && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {err}
                </p>
              )}

              <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={busy}>
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    {isBn ? "পাঠানো হচ্ছে…" : "Sending…"}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    {isBn ? "ওটিপি কোড পাঠান" : "Send OTP code"}
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* Sign up link */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isBn ? "অ্যাকাউন্ট নেই? " : "No account? "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              {isBn ? "এখনই তৈরি করুন" : "Create one"}
            </Link>
          </p>

          {/* Trust message */}
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[oklch(0.72_0.12_195/0.08)] px-4 py-3">
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

        {/* Back to home */}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground hover:underline">
            {isBn ? "← হোমপেজে ফিরে যান" : "← Back to home"}
          </Link>
        </p>
      </div>
    </div>
  );
}
