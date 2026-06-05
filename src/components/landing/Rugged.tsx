import { useRef } from "react";
import {
  Sun, Gauge, ShieldCheck, Wrench, Waves, Anchor, BatteryFull, Zap, ArrowRight,
} from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";
import { ScrollSequence } from "./ScrollSequence";

const left = [
  { icon: Sun, title: "Solar Powered", body: "Long lasting & energy efficient" },
  { icon: Gauge, title: "5+ Parameters", body: "DO, pH, Temp, Turbidity, Salinity & more" },
  { icon: ShieldCheck, title: "Rugged Design", body: "IP67 Waterproof & UV Resistant" },
  { icon: Wrench, title: "Easy Maintenance", body: "Modular sensors & easy replacement" },
];

const right = [
  { icon: Waves, title: "Floating Design", sub: "High Buoyancy" },
  { icon: Anchor, title: "Anti-Corrosion", sub: "Marine Grade" },
  { icon: BatteryFull, title: "Long Battery Life", sub: "Up to 30 Days" },
  { icon: Zap, title: "Easy Deployment", sub: "Plug & Play" },
];

export function Rugged() {
  // Outer tall section — drives scroll mapping
  const outerRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  // Subtle parallax on side columns, mapped to the same scroll window
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });
  const leftY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [40, -40]);
  const rightY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-30, 30]);

  return (
    <section
      id="device"
      ref={outerRef}
      className="relative bg-background"
      // Tall outer drives the sticky stage. ~220vh desktop, 180vh mobile via clamp.
      style={{ height: "clamp(180vh, 220vh, 240vh)" }}
    >
      {/* Pinned stage */}
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        {/* Ambient backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(700px 460px at 50% 55%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 65%)",
          }}
        />

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_minmax(360px,520px)_1fr] lg:gap-10">
            {/* LEFT: features (desktop), hidden on mobile to keep stage clean */}
            <motion.div style={{ y: leftY }} className="hidden space-y-3 lg:order-1 lg:block">
              {left.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="group flex items-start gap-3 rounded-xl border border-border bg-card/80 p-4 shadow-soft backdrop-blur transition-all hover:-translate-x-1 hover:border-primary/30"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* CENTER: canvas */}
            <div className="relative order-1 mx-auto flex w-full max-w-[520px] justify-center lg:order-2">
              <div className="absolute inset-0 -z-10 m-auto h-64 w-64 rounded-full bg-gradient-to-br from-primary/25 to-transparent blur-3xl sm:h-80 sm:w-80" />
              <ScrollSequence
                targetRef={outerRef}
                frameCount={65}
                className="h-[55vh] w-full sm:h-[60vh] lg:h-[68vh]"
                alt="AcquaLence smart monitoring buoy rotating"
              />
            </div>

            {/* RIGHT: copy + chips */}
            <motion.div style={{ y: rightY }} className="order-2 lg:order-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Built for Aquaculture
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl md:text-5xl lg:text-[2.75rem]">
                Rugged. Reliable.
                <br /> Built for any water.
              </h2>
              <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-[15px]">
                Engineered for harsh aquaculture environments — durable,
                low-maintenance, and built to deliver accurate data day in and
                day out.
              </p>
              <a
                href="#platform"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Learn more <ArrowRight className="h-4 w-4" />
              </a>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2">
                {right.map(({ icon: Icon, title, sub }) => (
                  <div key={title} className="text-left">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <p className="mt-2 text-xs font-semibold text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Mobile feature list (since left column is hidden) */}
              <div className="mt-6 grid gap-2 lg:hidden">
                {left.map(({ icon: Icon, title }) => (
                  <div
                    key={title}
                    className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-xs text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {title}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Scroll hint */}
          <Reveal className="mt-8 hidden justify-center lg:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
              Scroll to rotate
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
