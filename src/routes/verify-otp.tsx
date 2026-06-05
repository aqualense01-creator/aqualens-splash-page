import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Mail, RotateCcw, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/Logo";
import { AuthShell, BackHome, TrustMessage } from "@/components/auth/AuthShell";
import { isValidEmail, useAuth } from "@/lib/auth";

const searchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/verify-otp")({
  head: () => ({ meta: [{ title: "Verify email - Acqua Lence" }] }),
  validateSearch: (search) => searchSchema.parse(search),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState(search.email ?? "");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!isValidEmail(email)) {
      setErr("Enter a valid email address.");
      return;
    }
    setResendBusy(true);
    const { error } = await resendVerification(email);
    setResendBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    setSent(true);
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await verifyEmail(email, code);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    navigate({ to: "/app/settings" });
  }

  return (
    <AuthShell>
      <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo />
          <p className="text-center text-xs text-muted-foreground">Email verification</p>
        </div>

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          Verify your email
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your email and the 6-digit verification code.
        </p>

        <form onSubmit={onVerify} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="verify-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="verify-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 pl-9 text-base"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode} disabled={busy}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-11 w-10 text-lg font-semibold sm:h-12 sm:w-12"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-center text-sm text-destructive">
              {err}
            </p>
          )}

          {sent && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2.5 text-center text-sm text-emerald-800">
              A fresh verification code was sent.
            </p>
          )}

          <Button
            type="submit"
            className="h-11 w-full text-base font-semibold"
            disabled={busy || code.length < 6}
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Verifying...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Verify and continue
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        <form onSubmit={onSendCode} className="mt-3">
          <button
            type="submit"
            disabled={resendBusy}
            className="mx-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {resendBusy ? "Sending..." : "Resend verification code"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>

        <TrustMessage />
      </div>

      <BackHome />
    </AuthShell>
  );
}
