import { Button } from "@/components/ui/button";
import { ArrowRight, Droplets, FlaskConical, Play, Sparkles, Thermometer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { GradientMesh } from "./GradientMesh";
import { MagneticButton } from "./MagneticButton";
import { Marquee } from "./Marquee";
import { ScrollSequence } from "./ScrollSequence";
import { cn } from "@/lib/utils";

const trust = ["Real-time readings", "Critical alerts", "Farmer-friendly", "English & Bangla"];

const liveReadings = [
  { icon: Droplets, label: "DO", value: "3.1", unit: "mg/L", tone: "text-status-critical" },
  { icon: FlaskConical, label: "pH", value: "8.4", unit: "stable", tone: "text-status-warning" },
  { icon: Thermometer, label: "Temp", value: "31.2", unit: "C", tone: "text-status-watch" },
];

const marqueeItems = [
  "Real-time Dissolved Oxygen Monitoring",
  "Continuous pH Tracking",
  "Solar Powered Hardware Buoy",
  "Instant Alerts via SMS & WhatsApp",
  "Turbidity, Salinity, Ammonia & Temperature",
  "IP67 Waterproof & UV-Resistant",
  "Offline Device Warnings",
  "Practical Farmer Recommendations",
];

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const copyY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, -34]);
  const visualY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [16, -20]);
  const visualScale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [0.98, 1.02]);

  return (
    <>
      <section
        id="hero"
        ref={heroRef}
        className="relative isolate overflow-x-clip bg-background animate-fade-in"
        style={{ height: isDesktop ? "172dvh" : undefined }}
        aria-labelledby="hero-heading"
      >
        <GradientMesh />

        <div
          className={cn(
            "mx-auto w-full max-w-7xl px-4 sm:px-6",
            isDesktop
              ? "sticky top-16 flex min-h-[calc(100dvh-4rem)] items-center py-10"
              : "pt-7 pb-9 sm:py-16",
          )}
        >
          <div className="grid w-full grid-cols-1 items-center gap-5 sm:gap-8 lg:grid-cols-12 lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ y: copyY }}
              className="lg:col-span-6"
            >
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3 shrink-0" />
                <span className="truncate">Smart Water Monitoring for Fish &amp; Shrimp Farms</span>
              </div>

              <h1
                id="hero-heading"
                className="mt-5 font-display text-4xl font-bold leading-[1.05] text-foreground text-balance sm:text-5xl lg:text-[3.65rem]"
              >
                See your pond water health{" "}
                <span
                  className="italic font-normal text-primary"
                  style={{ fontFamily: "'Instrument Serif', 'Times New Roman', serif" }}
                >
                  before
                </span>{" "}
                problems become losses.
              </h1>

              <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground sm:mt-5 sm:text-[17px]">
                Acqua Lence monitors dissolved oxygen, pH, temperature, turbidity, salinity, ammonia
                and device health in real time, with clear alerts and practical actions for fish and
                shrimp farmers.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center">
                <MagneticButton className="block w-full sm:w-auto">
                  <Button
                    asChild
                    size="lg"
                    className="group min-h-12 w-full gap-2 rounded-full bg-primary px-6 text-[15px] text-primary-foreground shadow-glow hover:bg-primary/90 sm:w-auto"
                  >
                    <a href="/app/live">
                      <Play className="h-4 w-4 fill-current" />
                      View Live Demo
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                </MagneticButton>
                <MagneticButton className="block w-full sm:w-auto">
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="min-h-12 w-full gap-2 rounded-full border-border bg-background/70 px-6 text-[15px] text-foreground backdrop-blur hover:bg-accent sm:w-auto"
                  >
                    <a href="/app/setup">Request Setup</a>
                  </Button>
                </MagneticButton>
              </div>

              <ul className="mt-7 hidden flex-wrap gap-2 sm:flex">
                {trust.map((t) => (
                  <li
                    key={t}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-foreground/80 backdrop-blur"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              style={{ y: visualY, scale: visualScale }}
              className="lg:col-span-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              <div className="relative mx-auto w-full max-w-[660px]">
                <div className="overflow-hidden rounded-lg border border-border bg-navy shadow-[0_28px_80px_-42px_rgba(15,44,68,0.55)]">
                  <ScrollSequence
                    targetRef={heroRef}
                    frameCount={74}
                    pathTemplate="/hero-frames/frame-{n}.webp"
                    scrollMode={isDesktop ? "sticky" : "through"}
                    className="aspect-video w-full"
                    alt="Acqua Lence smart monitoring buoy in pond water"
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {liveReadings.map(({ icon: Icon, label, value, unit, tone }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border bg-card/90 px-2.5 py-3 text-center shadow-soft backdrop-blur"
                    >
                      <div className="mx-auto flex items-center justify-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {label}
                      </div>
                      <div className={cn("mt-1 font-display text-xl font-bold tabular-nums", tone)}>
                        {value}
                      </div>
                      <div className="text-[10px] font-medium text-muted-foreground">{unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="border-y border-border/40 bg-card/25 py-3 backdrop-blur-sm">
        <Marquee items={marqueeItems} speed={40} />
      </div>
    </>
  );
}
