import { Sun, Gauge, ShieldCheck, Wrench, Waves, Anchor, BatteryFull, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
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
  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_360px_1fr] lg:items-center">
        <div className="space-y-3">
          {left.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="relative flex justify-center">
          <div className="absolute inset-0 -z-10 m-auto h-72 w-72 rounded-full bg-primary/10 blur-2xl" />
          <img src={buoy} alt="AcquaLence smart monitoring buoy" className="h-[420px] w-auto object-contain drop-shadow-2xl" loading="lazy" width={520} height={520} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Built for Aquaculture</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Rugged. Reliable. Ready
            <br /> for Any Environment.
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
        </div>
      </div>
    </section>
  );
}
