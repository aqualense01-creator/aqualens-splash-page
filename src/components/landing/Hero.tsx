import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { HeroDashboardCard } from "./HeroDashboardCard";

const trust = [
  "Real-time readings",
  "Critical alerts",
  "Farmer-friendly",
  "English & বাংলা",
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-background" aria-labelledby="hero-heading">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 500px at 88% 10%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 60%), radial-gradient(700px 400px at 0% 100%, color-mix(in oklab, var(--status-good) 8%, transparent), transparent 60%)",
        }}
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:grid-cols-12 lg:gap-10 lg:pt-24 lg:pb-28">
        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            Smart Water Monitoring for Fish &amp; Shrimp Farms
          </div>

          <h1
            id="hero-heading"
            className="mt-5 font-display text-[2.1rem] font-bold leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl lg:text-[3.75rem]"
          >
            See your pond water health
            {" "}
            <span className="italic font-normal text-primary" style={{ fontFamily: "'Instrument Serif', 'Times New Roman', serif" }}>
              before
            </span>
            {" "}problems become losses.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[17px]">
            Acqua Lence monitors dissolved oxygen, pH, temperature, turbidity, salinity, ammonia
            and device health in real time — with clear alerts and practical actions for fish and
            shrimp farmers.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a href="/app/live" className="block w-full sm:w-auto">
              <Button
                size="lg"
                className="group h-12 w-full gap-2 rounded-full bg-primary px-6 text-[15px] text-primary-foreground shadow-glow hover:bg-primary/90 sm:w-auto"
              >
                <Play className="h-4 w-4 fill-current" />
                View Live Demo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </a>
            <a href="/app/setup" className="block w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full gap-2 rounded-full border-border bg-background/60 px-6 text-[15px] text-foreground backdrop-blur hover:bg-accent sm:w-auto"
              >
                Request Setup
              </Button>
            </a>
          </div>

          {/* trust chips */}
          <ul className="mt-8 flex flex-wrap gap-2">
            {trust.map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-foreground/80 backdrop-blur"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* RIGHT */}
        <div className="lg:col-span-6">
          <HeroDashboardCard />
        </div>
      </div>
    </section>
  );
}
