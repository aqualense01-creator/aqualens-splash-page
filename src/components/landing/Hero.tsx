import { Button } from "@/components/ui/button";
import { Activity, Brain, Headphones, ShieldCheck, Play, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-buoy.jpg";
import { GradientMesh } from "./GradientMesh";
import { MagneticButton } from "./MagneticButton";
import { Marquee } from "./Marquee";

const chips = [
  { icon: Activity, label: "Real-time", sub: "Monitoring" },
  { icon: Brain, label: "AI Powered", sub: "Insights" },
  { icon: Headphones, label: "24/7 Expert", sub: "Support" },
  { icon: ShieldCheck, label: "Reliable &", sub: "Rugged" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img
          src={heroImg}
          alt="AcquaLence smart buoy floating beside a fish farm pen"
          className="h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/10 md:to-transparent" />
        <div className="absolute inset-0 bg-hero-wash" />
      </div>
      <GradientMesh />


      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-28 md:grid-cols-12 md:pt-28 md:pb-40">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="md:col-span-7"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> New · AI Insight Engine v2
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] text-foreground text-balance sm:text-5xl md:text-6xl lg:text-7xl">
            Smarter Water.{" "}
            <span className="text-shimmer">Stronger Harvests.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm text-muted-foreground sm:text-base md:mt-6 md:text-lg">

            AcquaLence is an all-in-one smart aquaculture solution that monitors water quality in real
            time, helps you make better decisions, and maximizes your yield.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <MagneticButton>
              <Button size="lg" className="group gap-1 bg-primary text-primary-foreground shadow-glow hover:bg-primary/90">
                Explore Product
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </MagneticButton>

            <Button size="lg" variant="ghost" className="gap-2 text-foreground">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                <Play className="h-3.5 w-3.5 fill-primary text-primary" />
              </span>
              Watch Video
            </Button>
          </div>

          <dl className="mt-12 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {chips.map(({ icon: Icon, label, sub }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
                className="flex items-center gap-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </span>
                <p className="text-[11px] font-medium leading-tight text-foreground">
                  {label}
                  <br />
                  {sub}
                </p>
              </motion.div>
            ))}
          </dl>
        </motion.div>

        {/* spacer for image */}
        <div className="hidden md:col-span-5 md:block" />
      </div>

      {/* trust strip */}
      <div className="border-y border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4 sm:gap-8 sm:px-6 sm:py-5">

          <span className="hidden shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground md:inline">
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
