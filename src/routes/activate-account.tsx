import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/landing/Logo";
import { AuthShell, BackHome, TrustMessage } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/activate-account")({
  head: () => ({ meta: [{ title: "Create account - Acqua Lence" }] }),
  component: ActivateAccountPage,
});

function ActivateAccountPage() {
  return (
    <AuthShell>
      <div className="rounded-3xl border border-border/60 bg-white/95 p-6 text-center shadow-soft backdrop-blur-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo />
          <p className="text-xs text-muted-foreground">Account setup is simpler now</p>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Create your account with email
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Activation codes are no longer needed. Sign up with email and password, then enter the
          verification code sent to your inbox.
        </p>
        <Button asChild className="mt-6 h-11 w-full text-base font-semibold">
          <Link to="/signup">
            Continue to signup
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <TrustMessage />
      </div>
      <BackHome />
    </AuthShell>
  );
}
