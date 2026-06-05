import { useRef } from "react";
import { Sun, Gauge, ShieldCheck, Wrench, Waves, Anchor, BatteryFull, Zap, ArrowRight } from "lucide-react";
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
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const buoyY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [80, -80]);
  const buoyScale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [0.95, 1.05]);
  const chipsY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-30, 30]);

  return (
    <section id="device" ref={sectionRef} className="relative overflow-hidden py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_460px_1fr] lg:items-center">
          {/* Heading — first on mobile, right on desktop */}
          <Reveal className="order-1 lg:order-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Built for Aquaculture</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl md:text-5xl">
              Rugged. Reliable.
              <br /> Ready for Any Environment.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground sm:text-[15px]">
              Engineered for harsh aquaculture environments, AcquaLence buoy is durable, low-maintenance and built to deliver accurate data day in and day out.
            </p>
            <a href="#" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Learn More <ArrowRight className="h-4 w-4" />
            </a>
            <motion.div style={{ y: chipsY }} className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2">
              {right.map(({ icon: Icon, title, sub }) => (
                <div key={title} className="text-center lg:text-left">
                  <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-primary/10 lg:mx-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <p className="mt-2 text-xs font-semibold text-foreground">{title}</p>
                  <p className="text-[11px] text-muted-foreground">{sub}</p>
                </div>
              ))}
            </motion.div>
          </Reveal>

          {/* Scroll-triggered device animation — center on desktop */}
          <motion.div
            style={{ y: buoyY, scale: buoyScale }}
            className="order-2 relative flex justify-center lg:order-2"
          >
            <div className="absolute inset-0 -z-10 m-auto h-64 w-64 rounded-full bg-gradient-to-br from-primary/25 to-transparent blur-3xl sm:h-80 sm:w-80" />
            <ScrollSequence
              frameCount={65}
              className="relative h-72 w-full sm:h-96 lg:h-[460px]"
              alt="AcquaLence smart monitoring buoy rotating"
            />
          </motion.div>


          {/* Feature list — last on mobile, left on desktop */}
          <div className="order-3 space-y-3 lg:order-1">
            {left.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <div className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-x-1 hover:border-primary/30 hover:shadow-soft">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
