import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Droplets, Thermometer, Waves, Gauge } from "lucide-react";
import { motion } from "framer-motion";
import heroAsset from "@/assets/hero-acqualence.png.asset.json";
import { MagneticButton } from "./MagneticButton";
import { Marquee } from "./Marquee";

const metrics = [
  { icon: Droplets, label: "Dissolved O₂", value: "7.8 mg/L", trend: "+0.3", tone: "ok" },
  { icon: Thermometer, label: "Temperature", value: "24.6 °C", trend: "stable", tone: "ok" },
  { icon: Gauge, label: "pH Level", value: "7.42", trend: "+0.02", tone: "ok" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-background">
      {/* Soft ambient wash — no big blob gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 500px at 88% 10%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 60%), radial-gradient(700px 400px at 0% 100%, color-mix(in oklab, var(--navy) 8%, transparent), transparent 60%)",
        }}
      />
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-12 lg:gap-10 lg:pt-28 lg:pb-32">
        {/* LEFT: copy */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-6"
        >
          <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-8 bg-primary/60" />
            Smart Aquaculture · Est. 2024
          </div>

          <h1 className="mt-6 font-display text-[2.1rem] font-bold leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl md:text-6xl lg:text-[4.25rem]">
            Read the water.{" "}
            <span className="italic font-normal text-primary" style={{ fontFamily: "'Instrument Serif', 'Times New Roman', serif" }}>
              Raise
            </span>{" "}
            a better harvest.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-[17px]">
            AcquaLence is a solar-powered buoy and AI insight platform built for fish farms.
            Continuous water-quality telemetry, early-warning alerts, and decisions you can act on
            from your phone.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <MagneticButton>
              <Button
                size="lg"
                className="group h-12 gap-2 rounded-full bg-primary px-6 text-[15px] text-primary-foreground shadow-glow hover:bg-primary/90"
              >
                Explore the buoy
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </MagneticButton>

            <Button
              size="lg"
              variant="ghost"
              className="h-12 gap-2 rounded-full px-4 text-[15px] text-foreground hover:bg-accent"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background">
                <Play className="h-3 w-3 translate-x-px fill-current" />
              </span>
              Watch the 90s film
            </Button>
          </div>

          {/* Proof line — editorial, not buzzwordy */}
          <div className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border/70 pt-6">
            {[
              { k: "180+", v: "farms monitored" },
              { k: "24/7", v: "live telemetry" },
              { k: "−18%", v: "feed waste avg." },
            ].map((s) => (
              <div key={s.v}>
                <div className="font-display text-2xl font-semibold text-foreground">{s.k}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT: image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="relative lg:col-span-6"
        >
          <div className="relative">
            {/* image frame */}
            <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-surface shadow-[0_40px_80px_-30px_rgba(15,44,68,0.35)]">
              <img
                src={heroAsset.url}
                alt="AcquaLence solar-powered smart buoy deployed beside aquaculture pens"
                className="aspect-[4/3] h-full w-full object-cover"
                width={1456}
                height={1092}
                loading="eager"
              />
              {/* very subtle inner highlight */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 60%, color-mix(in oklab, var(--navy) 18%, transparent))",
                }}
              />

              {/* floating tag — top left */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-background/85 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-soft backdrop-blur sm:left-6 sm:top-6"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live · Buoy LX-1 · Loch Fyne
              </motion.div>

              {/* coordinates badge */}
              <div className="absolute right-4 top-4 hidden rounded-md bg-background/80 px-2.5 py-1 font-mono text-[10px] tracking-tight text-muted-foreground backdrop-blur sm:block sm:right-6 sm:top-6">
                56.0167° N · 5.0667° W
              </div>
            </div>

            {/* floating telemetry card — bottom left, overlapping */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="absolute -bottom-6 left-4 hidden w-[280px] rounded-2xl border border-border/70 bg-background/95 p-4 shadow-[0_20px_50px_-20px_rgba(15,44,68,0.25)] backdrop-blur sm:block sm:-bottom-8 sm:left-6"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Live readings
                </p>
                <Waves className="h-3.5 w-3.5 text-primary" />
              </div>
              <ul className="mt-3 space-y-2.5">
                {metrics.map((m) => (
                  <li key={m.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <m.icon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">{m.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-sm font-semibold text-foreground tabular-nums">
                        {m.value}
                      </span>
                      <span className="text-[10px] text-emerald-600">{m.trend}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* small accent — top right offset */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="absolute -right-3 top-10 hidden rounded-xl border border-border/60 bg-background/90 px-3 py-2 shadow-soft backdrop-blur md:block"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Uptime</div>
              <div className="font-display text-base font-semibold text-foreground tabular-nums">99.94%</div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* trust marquee */}
      <div className="border-y border-border/60 bg-surface/60">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-5 sm:gap-8 sm:px-6">
          <span className="hidden shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground md:inline">
            Trusted by aquaculture leaders
          </span>
          <Marquee
            className="flex-1"
            items={[
              "BlueWave Farms",
              "OceanGrow",
              "AquaPrime",
              "FinTech Fisheries",
              "DeepCove Co.",
              "TideMark Labs",
              "Reefline Co-op",
              "Pacific Yield",
            ]}
          />
        </div>
      </div>
    </section>
  );
}
