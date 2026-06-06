import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/Logo";
import { AuthShell, BackHome, TrustMessage } from "@/components/auth/AuthShell";
import { isValidEmail, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in - Acqua Lence" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, loading, isAdmin, isTechnician, isSupport } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState(false);

  useEffect(() => {
    setVerifiedMessage(new URLSearchParams(window.location.search).get("verified") === "1");
  }, []);

  useEffect(() => {
    if (!loading && user) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      const safeRedirect =
        redirect &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//") &&
        (redirect.startsWith("/app") || redirect.startsWith("/admin"))
          ? redirect
          : null;

      if (safeRedirect) {
        navigate({ to: safeRedirect as never });
      } else if (isAdmin) {
        navigate({ to: "/admin/dashboard" });
      } else if (isSupport) {
        navigate({ to: "/admin/support" });
      } else if (isTechnician) {
        navigate({ to: "/app/setup" });
      } else {
        navigate({ to: "/app/dashboard" });
      }
    }
  }, [loading, user, isAdmin, isTechnician, isSupport, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setNeedsVerification(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setErr("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    const { error, needsVerification } = await signIn(cleanEmail, password);
    setBusy(false);
    if (error) {
      setNeedsVerification(Boolean(needsVerification));
      setErr(error);
    }
  }

  return (
    <AuthShell>
      <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo />
          <p className="text-center text-xs text-muted-foreground">
            Smart aquaculture monitoring platform
          </p>
        </div>

        <h1 className="text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          Sign in
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Use your email and password to access your ponds, alerts, and devices.
        </p>

        {verifiedMessage && (
          <div className="mt-5 flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Email verified. You can sign in now.
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
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
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-11 pl-9 text-base"
                autoComplete="current-password"
              />
            </div>
          </div>

          {err && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <p>{err}</p>
              {needsVerification && (
                <Link
                  to="/verify-otp"
                  search={{ email: email.trim().toLowerCase() }}
                  className="mt-2 inline-flex font-semibold text-primary hover:underline"
                >
                  Verify email code
                </Link>
              )}
            </div>
          )}

          <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={busy}>
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Sign in
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
        </p>

        <TrustMessage />
      </div>

      <BackHome />
    </AuthShell>
  );
}
