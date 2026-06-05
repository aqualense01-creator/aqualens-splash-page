import { Link } from "@tanstack/react-router";
import { ArrowLeft, Waves } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-surface px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[20%] -top-[30%] h-[80vh] w-[80vh] rounded-full bg-[oklch(0.72_0.12_195)] opacity-[0.18] blur-[120px]" />
        <div className="absolute -right-[10%] top-[20%] h-[60vh] w-[60vh] rounded-full bg-[oklch(0.68_0.10_210)] opacity-[0.14] blur-[100px]" />
        <div className="absolute -bottom-[20%] left-[10%] h-[70vh] w-[70vh] rounded-full bg-[oklch(0.60_0.08_200)] opacity-[0.12] blur-[110px]" />
      </div>
      <div className="relative z-10 w-full max-w-[420px]">{children}</div>
    </div>
  );
}

export function TrustMessage() {
  return (
    <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[oklch(0.72_0.12_195/0.08)] px-4 py-3">
      <Waves className="h-4 w-4 text-[oklch(0.55_0.08_200)]" />
      <p className="text-xs text-[oklch(0.45_0.06_200)]">
        Profile details are completed inside Settings after sign in.
      </p>
    </div>
  );
}

export function BackHome() {
  return (
    <p className="mt-4 text-center text-xs text-muted-foreground">
      <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>
    </p>
  );
}
