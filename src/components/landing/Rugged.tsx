import { useRef } from "react";
import { Sun, Gauge, ShieldCheck, Wrench, Waves, Anchor, BatteryFull, Zap, ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import buoy from "@/assets/buoy-product.png";
import { Reveal } from "./Reveal";

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
    <section ref={sectionRef} className="relative overflow-hidden py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_360px_1fr] lg:items-center">
        <div className="space-y-3">
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
        <div className="relative flex justify-center">
          <div className="absolute inset-0 -z-10 m-auto h-80 w-80 rounded-full bg-gradient-to-br from-primary/25 to-transparent blur-3xl" />
          <motion.img
            style={{ y: buoyY, scale: buoyScale }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ opacity: { duration: 0.8 } }}
            src={buoy}
            alt="AcquaLence smart monitoring buoy"
            className="h-[460px] w-auto object-contain drop-shadow-2xl"
            loading="lazy"
            width={520}
            height={520}
          />
        </div>

        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Built for Aquaculture</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-foreground text-balance md:text-5xl">
            Rugged. Reliable.
            <br /> Ready for Any Environment.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Engineered for harsh aquaculture environments, AcquaLence buoy is durable, low-maintenance and built to deliver accurate data day in and day out.
          </p>
          <a href="#" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Learn More <ArrowRight className="h-4 w-4" />
          </a>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {right.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="text-center">
                <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <p className="mt-2 text-xs font-semibold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
