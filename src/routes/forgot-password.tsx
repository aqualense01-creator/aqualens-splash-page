import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, isValidIdentifier } from "@/lib/auth";
import { Logo } from "@/components/landing/Logo";
import { useI18n } from "@/lib/i18n";
import { Mail, ArrowLeft, Globe, KeyRound, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Acqua Lence" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { sendResetLink } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();

  const [identifier, setIdentifier] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const isBn = lang === "bn";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!identifier.trim()) {
      setErr(isBn ? "আপনার ইমেইল বা ফোন নম্বর দিন।" : "Enter your email or phone number.");
      return;
    }
    const idType = isValidIdentifier(identifier);
    if (!idType) {
      setErr(
        isBn
          ? "একটি বৈধ ইমেইল বা বাংলাদেশী ফোন নম্বর দিন।"
          : "Enter a valid email or Bangladesh phone number.",
      );
      return;
    }
    setBusy(true);
    const { error } = await sendResetLink(identifier);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    setSent(true);
  }

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
            {t("auth.resetPassword")}
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {t("auth.resetSubtitle")}
          </p>

          {sent ? (
            <div className="mt-6 space-y-4">
              <div className="flex flex-col items-center gap-3 rounded-xl bg-[oklch(0.65_0.12_145/0.10)] px-5 py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-[oklch(0.55_0.10_145)]" />
                <p className="text-sm font-medium text-[oklch(0.40_0.08_145)]">
                  {t("auth.resetSent")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full text-base font-medium"
                onClick={() => navigate({ to: "/login" })}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("auth.backToLogin")}
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
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
                    <KeyRound className="h-4 w-4" />
                    {t("auth.sendResetInstructions")}
                  </span>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="font-medium text-primary hover:underline">
                  <span className="inline-flex items-center gap-1">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("auth.backToLogin")}
                  </span>
                </Link>
              </p>
            </form>
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
