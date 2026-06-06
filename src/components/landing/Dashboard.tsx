import { Activity, BellRing, Gauge, Radio, ShieldCheck } from "lucide-react";
import { lazy, Suspense } from "react";
import { useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";

const LiveDashboardMotionPlayer = lazy(() =>
  import("./LiveDashboardMotion").then((module) => ({
    default: module.LiveDashboardMotionPlayer,
  })),
);

const highlights = [
  {
    icon: Gauge,
    title: "Live pond readings",
    body: "DO, pH, temperature and device status move together in one calm timeline.",
  },
  {
    icon: BellRing,
    title: "Risk to action",
    body: "Critical alerts transform into a clear next step before the situation spreads.",
  },
  {
    icon: Radio,
    title: "Signal confidence",
    body: "Online, offline and battery health stay visible without crowding the interface.",
  },
];

function DashboardMotionFallback() {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-md bg-[#f5faff] p-4 sm:p-6">
      <div className="flex h-full flex-col rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <div className="h-3 w-28 rounded-full bg-primary/20" />
            <div className="mt-2 h-6 w-44 rounded-full bg-muted/30" />
          </div>
          <div className="h-9 w-24 rounded-full bg-emerald-500/15" />
        </div>
        <div className="grid flex-1 gap-3 py-4 sm:grid-cols-3">
          <div className="rounded-lg bg-primary/10 p-3">
            <div className="h-3 w-20 rounded-full bg-primary/25" />
            <div className="mt-5 h-9 w-28 rounded-full bg-primary/35" />
          </div>
          <div className="rounded-lg bg-amber-500/10 p-3">
            <div className="h-3 w-24 rounded-full bg-amber-500/25" />
            <div className="mt-5 h-9 w-20 rounded-full bg-amber-500/35" />
          </div>
          <div className="rounded-lg bg-rose-500/10 p-3">
            <div className="h-3 w-24 rounded-full bg-rose-500/25" />
            <div className="mt-5 h-9 w-24 rounded-full bg-rose-500/35" />
          </div>
        </div>
        <div className="h-20 rounded-lg bg-surface" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const reduced = useReducedMotion();
  const shouldReduceMotion = Boolean(reduced);

  return (
    <section
      className="relative overflow-x-clip bg-surface py-14 sm:py-20 lg:py-24"
      aria-labelledby="dashboard-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Live Dashboard
          </p>
          <h2
            id="dashboard-heading"
            className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl"
          >
            Water data that moves from signal to action.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base">
            See live readings, trend shifts, alerts and device health move through one clear farm
            command view.
          </p>
        </Reveal>

        <Reveal delay={0.12} className="mt-8 sm:mt-10">
          <figure
            className="relative mx-auto max-w-6xl overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-[0_34px_90px_-46px_rgba(15,44,68,0.48)] sm:p-3"
            aria-label="Animated Live Dashboard motion graphic"
          >
            {shouldReduceMotion ? (
              <DashboardMotionFallback />
            ) : (
              <Suspense fallback={<DashboardMotionFallback />}>
                <LiveDashboardMotionPlayer reduced={false} />
              </Suspense>
            )}
            <figcaption className="sr-only">
              Animated dashboard showing pond readings, oxygen trend, critical alert, recommended
              action and device health.
            </figcaption>
          </figure>
        </Reveal>

        <div className="mt-5 grid gap-3 sm:mt-7 sm:grid-cols-3">
          {highlights.map(({ icon: Icon, title, body }) => (
            <Reveal key={title}>
              <article className="h-full rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="leading-6">
                Designed to feel alive without becoming noisy, with each movement tied to a real
                farm signal.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <Activity className="h-4 w-4" />
              Motion-ready
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
