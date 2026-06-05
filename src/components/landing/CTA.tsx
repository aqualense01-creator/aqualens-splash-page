import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";
import { Activity, ArrowRight, BellRing, MapPin, Play } from "lucide-react";
import { AuroraBackground } from "./AuroraBackground";
import { MagneticButton } from "./MagneticButton";
import farmNetwork from "@/assets/farm-network.webp";

const metrics = [
  { icon: MapPin, label: "Farm clusters", value: "Live map" },
  { icon: Activity, label: "Water insights", value: "24/7" },
  { icon: BellRing, label: "Critical alerts", value: "Instant" },
];

function NetworkVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute -inset-3 rounded-lg border border-primary/20 opacity-50" />
      <div className="relative overflow-hidden rounded-lg border border-white/15 bg-white/[0.04] p-2 shadow-[0_36px_90px_-48px_rgba(18,198,222,0.85)] backdrop-blur">
        <img
          src={farmNetwork}
          alt="Connected aquaculture farms monitored across a live regional network"
          width={1280}
          height={960}
          loading="lazy"
          decoding="async"
          className="aspect-[16/11] w-full rounded-md object-cover"
        />
        <div className="pointer-events-none absolute inset-2 rounded-md bg-gradient-to-t from-navy/75 via-transparent to-white/5" />
        <div className="absolute inset-x-5 bottom-5 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-navy/70 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_18px_rgba(18,198,222,0.95)]" />
            Live farm network
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur">
            Multi-site visibility
          </span>
        </div>
      </div>
    </div>
  );
}

export function CTA() {
  return (
    <section id="cta" className="relative overflow-hidden bg-navy" aria-labelledby="cta-heading">
      <div className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy to-navy/95" />
      <AuroraBackground />
      <div className="absolute inset-0 bg-navy-grid opacity-30" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 text-navy-foreground sm:px-6 sm:py-20 lg:py-24">
        <Reveal className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              For fish &amp; shrimp farms
            </span>
            <h2
              id="cta-heading"
              className="mx-auto mt-5 max-w-3xl font-display text-3xl font-bold text-balance sm:text-4xl md:text-5xl lg:mx-0"
            >
              Start monitoring your pond water with clarity.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base lg:mx-0">
              Get real-time water-quality insights, critical alerts and practical recommendations
              for healthier fish and shrimp farming.
            </p>

            <NetworkVisual className="mt-7 lg:hidden" />

            <div className="mt-7 grid gap-2 sm:grid-cols-3 lg:max-w-xl">
              {metrics.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-3 text-left backdrop-blur"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">
                      {label}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
              <MagneticButton className="block w-full sm:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="group h-12 w-full gap-2 bg-primary px-6 text-primary-foreground shadow-glow hover:bg-primary/90 sm:w-auto"
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
                  className="h-12 w-full gap-2 border-white/30 bg-white/5 px-6 text-white backdrop-blur hover:bg-white/15 hover:text-white sm:w-auto"
                >
                  <a href="/app/setup">Request Setup</a>
                </Button>
              </MagneticButton>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[12px] text-white/70 lg:justify-start">
              <a href="/login" className="hover:text-white">
                Login
              </a>
              <a href="/app/dashboard" className="hover:text-white">
                Dashboard
              </a>
              <a href="/app/support" className="hover:text-white">
                Support
              </a>
              <span className="cursor-pointer hover:text-white">English / বাংলা</span>
            </div>
          </div>

          <NetworkVisual className="hidden lg:block" />
        </Reveal>
      </div>
    </section>
  );
}
