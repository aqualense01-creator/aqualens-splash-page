import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound, Mail, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/Logo";
import { AuthShell, BackHome, TrustMessage } from "@/components/auth/AuthShell";
import { isValidEmail, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account - Acqua Lence" }] }),
  component: SignupPage,
});

type Phase = "credentials" | "verify" | "done";

function SignupPage() {
  const { signUp, verifyEmail, resendVerification, user, loading } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && phase !== "done") {
      navigate({ to: "/app/settings" });
    }
  }, [loading, user, phase, navigate]);

  async function onCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setErr("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error, needsVerification } = await signUp({ email: cleanEmail, password });
    setBusy(false);

    if (error) {
      setErr(error);
      return;
    }

    if (needsVerification) {
      setEmail(cleanEmail);
      setPhase("verify");
      return;
    }

    setPhase("done");
    navigate({ to: "/app/settings" });
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

    setPhase("done");
    navigate({ to: "/app/settings" });
  }

  async function onResend() {
    setErr(null);
    setResendBusy(true);
    const { error } = await resendVerification(email);
    setResendBusy(false);
    if (error) setErr(error);
  }

  return (
    <AuthShell>
      <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo />
          <p className="text-center text-xs text-muted-foreground">
            Simple account setup for Acqua Lence
          </p>
        </div>

        {phase === "credentials" && (
          <>
            <h1 className="text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
              Create account
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Start with email and password only. Add your profile details later in Settings.
            </p>

            <form onSubmit={onCreateAccount} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signup-email"
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

              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="h-11 pl-9 text-base"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-confirm">Confirm password</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="h-11 text-base"
                  autoComplete="new-password"
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
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </>
        )}

        {phase === "verify" && (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
              Verify your email
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </p>

            <form onSubmit={onVerify} className="mt-6 space-y-5">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode} disabled={busy} autoFocus>
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

              <button
                type="button"
                onClick={onResend}
                disabled={resendBusy}
                className="mx-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {resendBusy ? "Sending..." : "Resend code"}
              </button>
            </form>
          </>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Account ready
            </h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Continue to Settings to complete your name, phone, district, and language.
            </p>
            <Button onClick={() => navigate({ to: "/app/settings" })}>Go to Settings</Button>
          </div>
        )}

        {phase !== "done" && (
          <>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
            <TrustMessage />
          </>
        )}
      </div>

      <BackHome />
    </AuthShell>
  );
}
