import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/landing/Logo";
import { MailCheck } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — Acqua Lence" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp, verifyEmail, resendVerification, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setBusy(true);
    const { error, needsVerification } = await signUp(email.trim(), password, fullName.trim());
    setBusy(false);
    if (error) { setErr(error); return; }
    if (needsVerification) {
      setStep("verify");
      setInfo(`We sent a verification code to ${email.trim()}.`);
    } else {
      navigate({ to: "/app/dashboard" as never });
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    const { error } = await verifyEmail(email.trim(), otp.trim());
    if (error) { setBusy(false); setErr(error); return; }
    // After verifying, sign in with the password the user just chose.
    const { error: signInErr } = await signIn(email.trim(), password);
    setBusy(false);
    if (signInErr) {
      setInfo("Email verified — please sign in.");
      navigate({ to: "/login" as never });
    } else {
      navigate({ to: "/app/dashboard" as never });
    }
  }

  async function onResend() {
    setErr(null); setInfo(null); setBusy(true);
    const { error } = await resendVerification(email.trim());
    setBusy(false);
    if (error) setErr(error);
    else setInfo("New code sent. Check your inbox.");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-background p-6 shadow-soft">
        <div className="mb-6 flex flex-col items-center gap-2"><Logo /></div>

        {step === "form" ? (
          <>
            <h1 className="font-display text-2xl font-semibold">Create your farm account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Start monitoring your ponds in minutes.</p>
            <form onSubmit={onSignUp} className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-primary">
              <MailCheck className="h-5 w-5" />
              <h1 className="font-display text-2xl font-semibold">Verify your email</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>.
            </p>
            <form onSubmit={onVerify} className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-[0.4em]"
                />
              </div>
              {info && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{info}</p>}
              {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" disabled={busy || otp.length < 4}>
                {busy ? "Verifying…" : "Verify & sign in"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={onResend} disabled={busy}>
                Resend code
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("form")} disabled={busy}>
                ← Change email
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
