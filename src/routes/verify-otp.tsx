import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/landing/Logo";
import { useI18n } from "@/lib/i18n";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Waves, ArrowLeft, Globe, RotateCcw, ShieldCheck } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  identifier: z.string().optional(),
});

export const Route = createFileRoute("/verify-otp")({
  head: () => ({ meta: [{ title: "Verify OTP — Acqua Lence" }] }),
  validateSearch: (search) => searchSchema.parse(search),
  component: VerifyOtpPage,
});

const RESEND_COOLDOWN = 60; // seconds

function maskIdentifier(raw: string): string {
  const s = raw.trim();
  if (s.includes("@")) {
    const [user, domain] = s.split("@");
    const maskedUser = user.length > 3 ? user.slice(0, 2) + "***" + user.slice(-1) : "***";
    return `${maskedUser}@${domain}`;
  }
  // Phone
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(0, 3) + "****" + digits.slice(-2);
  }
  return "****" + s.slice(-2);
}

function VerifyOtpPage() {
  const { sendOtp, signInWithOtp, user, loading: authLoading, isAdmin, isTechnician } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang } = useI18n();
  const search = Route.useSearch();

  const [identifier, setIdentifier] = useState(search.identifier ?? "");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBn = lang === "bn";

  /* Redirect if already logged in */
  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) navigate({ to: "/admin/dashboard" });
      else if (isTechnician) navigate({ to: "/app/setup" });
      else navigate({ to: "/app/dashboard" });
    }
  }, [authLoading, user, isAdmin, isTechnician, navigate]);

  /* Start countdown */
  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* Auto-start countdown on mount if identifier is present */
  useEffect(() => {
    if (identifier) startCountdown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Verify OTP */
  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (otp.length !== 6) { setErr(isBn ? "৬-সংখ্যার কোড দিন।" : "Enter the 6-digit code."); return; }
    setBusy(true);
    const { error } = await signInWithOtp(identifier, otp);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    toast.success(isBn ? "সফলভাবে যাচাই হয়েছে" : "Verified successfully");
    // Navigation handled by the auth effect above
  }

  /* Resend OTP */
  async function onResend() {
    if (countdown > 0) return;
    setErr(null);
    setBusy(true);
    const { error } = await sendOtp(identifier);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    startCountdown();
    toast.success(isBn ? "নতুন কোড পাঠানো হয়েছে" : "New code sent");
  }

  /* If no identifier, show a form to enter it first */
  if (!identifier) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-surface px-4">
        <AquaticBg />
        <div className="relative z-10 w-full max-w-[420px]">
          <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
            <div className="mb-6 flex flex-col items-center gap-3"><Logo /></div>
            <h1 className="text-center font-display text-2xl font-bold tracking-tight text-foreground">
              {isBn ? "ওটিপি যাচাই করুন" : "Verify OTP"}
            </h1>
            <form
              onSubmit={(e) => { e.preventDefault(); if (identifier.trim()) startCountdown(); }}
              className="mt-5 space-y-4"
            >
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">{isBn ? "ইমেইল বা ফোন" : "Email or phone"}</span>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none ring-ring focus:ring-1"
                  placeholder={isBn ? "example@gmail.com বা 01712345678" : "example@gmail.com or 01712345678"}
                />
              </label>
              <Button type="submit" className="h-11 w-full text-base font-semibold">
                {isBn ? "কোড পাঠান" : "Send code"}
              </Button>
            </form>
            <BackToLogin />
          </div>
          <LangToggle />
        </div>
      </div>
    );
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-surface px-4">
      <AquaticBg />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <Logo />
          </div>

          {/* Title */}
          <h1 className="text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            {isBn ? "ওটিপি যাচাই করুন" : "Verify OTP"}
          </h1>

          {/* Masked identifier */}
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {isBn
              ? `আমরা একটি কোড পাঠিয়েছি ${maskIdentifier(identifier)}-এ।`
              : `We sent a code to ${maskIdentifier(identifier)}.`}
          </p>

          {/* Form */}
          <form onSubmit={onVerify} className="mt-6 space-y-5">
            {/* OTP input */}
            <div className="flex flex-col items-center gap-2">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value: string) => { setOtp(value); setErr(null); }}
                disabled={busy}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-12 w-12 text-lg font-semibold sm:h-14 sm:w-14" />
                  <InputOTPSlot index={1} className="h-12 w-12 text-lg font-semibold sm:h-14 sm:w-14" />
                  <InputOTPSlot index={2} className="h-12 w-12 text-lg font-semibold sm:h-14 sm:w-14" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="h-12 w-12 text-lg font-semibold sm:h-14 sm:w-14" />
                  <InputOTPSlot index={4} className="h-12 w-12 text-lg font-semibold sm:h-14 sm:w-14" />
                  <InputOTPSlot index={5} className="h-12 w-12 text-lg font-semibold sm:h-14 sm:w-14" />
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-muted-foreground">
                {isBn ? "৬-সংখ্যার কোডটি লিখুন" : "Type the 6-digit code"}
              </p>
            </div>

            {/* Error */}
            {err && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-center text-sm text-destructive">{err}</p>
            )}

            {/* Verify button */}
            <Button
              type="submit"
              className="h-11 w-full text-base font-semibold"
              disabled={busy || otp.length < 6}
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  {isBn ? "যাচাই হচ্ছে…" : "Verifying…"}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  {isBn ? "যাচাই করুন ও সাইন ইন করুন" : "Verify & sign in"}
                </span>
              )}
            </Button>

            {/* Resend */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onResend}
                disabled={countdown > 0 || busy}
                className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  countdown > 0 || busy
                    ? "cursor-not-allowed text-muted-foreground"
                    : "text-primary hover:underline"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {countdown > 0
                  ? (isBn ? `${countdown} সেকেন্ড পর পুনরায় পাঠান` : `Resend in ${countdown}s`)
                  : (isBn ? "কোড পুনরায় পাঠান" : "Resend code")}
              </button>
            </div>
          </form>

          {/* Back to login */}
          <BackToLogin />

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

        <LangToggle />
      </div>
    </div>
  );
}

/* ─── shared sub-components ─── */

function AquaticBg() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-[30%] -left-[20%] h-[80vh] w-[80vh] rounded-full bg-[oklch(0.72_0.12_195)] opacity-[0.18] blur-[120px]" />
      <div className="absolute top-[20%] -right-[10%] h-[60vh] w-[60vh] rounded-full bg-[oklch(0.68_0.10_210)] opacity-[0.14] blur-[100px]" />
      <div className="absolute -bottom-[20%] left-[10%] h-[70vh] w-[70vh] rounded-full bg-[oklch(0.60_0.08_200)] opacity-[0.12] blur-[110px]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q25 20 50 10 T100 10' fill='none' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "120px 24px",
        }}
      />
    </div>
  );
}

function BackToLogin() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const isBn = lang === "bn";
  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/login" })}
      className="mt-5 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {isBn ? "লগইনে ফিরে যান" : "Back to login"}
    </button>
  );
}

function LangToggle() {
  const { lang, setLang } = useI18n();
  const isBn = lang === "bn";
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex rounded-full bg-muted p-0.5">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
            !isBn ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLang("bn")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
            isBn ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          বাংলা
        </button>
      </div>
    </div>
  );
}
