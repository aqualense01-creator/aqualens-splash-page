import { useRef, useState, useEffect } from "react";
import {
  Sun,
  Gauge,
  ShieldCheck,
  Wrench,
  Waves,
  Anchor,
  BatteryFull,
  Zap,
  ArrowRight,
} from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";
import { ScrollSequence } from "./ScrollSequence";
import { cn } from "@/lib/utils";

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
  const outerRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
      style={{ height: isDesktop ? "150vh" : "auto" }}
    >
      <div
        className={cn(
          "flex items-center overflow-hidden w-full",
          isDesktop ? "sticky top-0 h-screen" : "relative min-h-[70vh] py-12",
        )}
      >
        {/* Ambient backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(800px 520px at 50% 55%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 65%)",
          }}
        />

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* LEFT: copy + features */}
            <motion.div style={{ y: leftY }} className="order-2 lg:order-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Built for Aquaculture
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl">
                Rugged. Reliable.
                <br /> Built for any water.
              </h2>
              <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-[15px]">
                Engineered for harsh aquaculture environments — durable, low-maintenance, and built
                to deliver accurate data day in and day out.
              </p>

              <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
                {left.map(({ icon: Icon, title, body }) => (
                  <div
                    key={title}
                    className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-card/80 p-3 backdrop-blur transition-colors hover:border-primary/30"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">{title}</p>
                      <p className="text-[11px] leading-snug text-muted-foreground">{body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="#platform"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Learn more <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>

            {/* RIGHT: canvas */}
            <motion.div
              style={{ y: rightY }}
              className="order-1 relative mx-auto flex w-full max-w-[560px] justify-center lg:order-2"
            >
              <div className="absolute inset-0 -z-10 m-auto h-64 w-64 rounded-full bg-gradient-to-br from-primary/25 to-transparent blur-3xl sm:h-80 sm:w-80" />
              <ScrollSequence
                targetRef={outerRef}
                frameCount={65}
                className="h-[44vh] w-full sm:h-[55vh] lg:h-[68vh]"
                alt="AcquaLence smart monitoring buoy rotating"
              />

              {/* Floating chips around canvas — visible on desktop */}
              <div className="pointer-events-none absolute inset-0 hidden lg:block">
                <div className="absolute left-0 top-[18%] rounded-full border border-border/70 bg-card/85 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-soft backdrop-blur">
                  <Waves className="mr-1.5 inline h-3 w-3 text-primary" />
                  High Buoyancy
                </div>
                <div className="absolute right-0 top-[32%] rounded-full border border-border/70 bg-card/85 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-soft backdrop-blur">
                  <Anchor className="mr-1.5 inline h-3 w-3 text-primary" />
                  Marine Grade
                </div>
                <div className="absolute left-2 bottom-[22%] rounded-full border border-border/70 bg-card/85 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-soft backdrop-blur">
                  <BatteryFull className="mr-1.5 inline h-3 w-3 text-primary" />
                  30 Day Battery
                </div>
                <div className="absolute right-2 bottom-[10%] rounded-full border border-border/70 bg-card/85 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-soft backdrop-blur">
                  <Zap className="mr-1.5 inline h-3 w-3 text-primary" />
                  Plug & Play
                </div>
              </div>
            </motion.div>
          </div>

          {/* Scroll hint */}
          <div className="mt-6 hidden justify-center lg:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
              <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
              Scroll to rotate
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
