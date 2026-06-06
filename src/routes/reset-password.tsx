import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/Logo";
import { AuthShell, BackHome, TrustMessage } from "@/components/auth/AuthShell";
import { isValidEmail } from "@/lib/auth";
import { insforge } from "@/lib/insforge";

const searchSchema = z.object({
  token: z.string().optional(),
  email: z.string().optional(),
  insforge_status: z.string().optional(),
  insforge_type: z.string().optional(),
  insforge_error: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password - Acqua Lence" }] }),
  validateSearch: (search) => searchSchema.parse(search),
  component: ResetPasswordPage,
});

function errorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybe = error as { message?: string };
    if (typeof maybe.message === "string" && maybe.message) return maybe.message;
  }
  return fallback;
}

function ResetPasswordPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const tokenFromLink = search.token?.trim() ?? "";
  const linkError = search.insforge_status === "error" ? search.insforge_error : null;

  const [email, setEmail] = useState(search.email ?? "");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(linkError ? decodeURIComponent(linkError) : null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const hasLinkToken = Boolean(tokenFromLink);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (next.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      let otp = tokenFromLink;
      if (!otp) {
        const cleanEmail = email.trim().toLowerCase();
        if (!isValidEmail(cleanEmail)) throw new Error("Enter a valid email address.");
        if (code.trim().length < 6) throw new Error("Enter the reset code from your email.");
        const exchanged = await insforge.auth.exchangeResetPasswordToken({
          email: cleanEmail,
          code: code.trim(),
        });
        if (exchanged.error) {
          throw new Error(errorMessage(exchanged.error, "Reset code could not be verified."));
        }
        otp = exchanged.data?.token ?? "";
        if (!otp) throw new Error("Reset code could not be verified.");
      }

      const reset = await insforge.auth.resetPassword({ newPassword: next, otp });
      if (reset.error) throw new Error(errorMessage(reset.error, "Password reset failed."));
      setDone(true);
    } catch (error) {
      setErr(errorMessage(error, "Password reset failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div className="rounded-3xl border border-border/60 bg-white/95 p-6 shadow-soft backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo />
          <p className="text-center text-xs text-muted-foreground">Password recovery</p>
        </div>

        {done ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
                Password updated
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                You can now sign in with your new password.
              </p>
            </div>
            <Button
              className="h-11 w-full text-base font-semibold"
              onClick={() => navigate({ to: "/login" })}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
              Set a new password
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {hasLinkToken
                ? "Enter a new password for your account."
                : "Enter your email, reset code, and a new password."}
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {!hasLinkToken && (
                <>
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
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-code">Reset code</Label>
                    <Input
                      id="reset-code"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="6-digit code"
                      className="h-11 text-base"
                      maxLength={12}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    required
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    className="h-11 pl-9 text-base"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11 text-base"
                  autoComplete="new-password"
                />
              </div>

              {err && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-center text-sm text-destructive">
                  {err}
                </p>
              )}

              <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={busy}>
                {busy ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Updating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Update password
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Need a new code?{" "}
              <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
                Request another email
              </Link>
            </p>
          </>
        )}

        <TrustMessage />
      </div>

      <BackHome />
    </AuthShell>
  );
}
