import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/Logo";
import { AuthShell, BackHome, TrustMessage } from "@/components/auth/AuthShell";
import { isValidEmail, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password - Acqua Lence" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { sendResetLink } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setErr("Enter a valid email address.");
      return;
    }

    setBusy(true);
    const { error } = await sendResetLink(cleanEmail);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell>
      <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo />
          <p className="text-center text-xs text-muted-foreground">Password recovery</p>
        </div>

        <h1 className="text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          Reset password
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your account email and we will send reset instructions.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-emerald-500/10 px-5 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">
                Reset instructions were sent to your email.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full text-base font-medium"
              onClick={() => navigate({ to: "/login" })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-email"
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

            {err && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {err}
              </p>
            )}

            <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={busy}>
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Send reset instructions
                </span>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}

        <TrustMessage />
      </div>

      <BackHome />
    </AuthShell>
  );
}
