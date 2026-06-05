import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";
import { ArrowRight, Play } from "lucide-react";
import { AuroraBackground } from "./AuroraBackground";

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-navy" aria-labelledby="cta-heading">
      <div className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy to-navy/95" />
      <AuroraBackground />
      <div className="absolute inset-0 bg-navy-grid opacity-30" />
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center text-navy-foreground sm:px-6 sm:py-24">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            For fish &amp; shrimp farms
          </span>
          <h2
            id="cta-heading"
            className="mt-5 font-display text-3xl font-bold text-balance sm:text-4xl md:text-5xl"
          >
            Start monitoring your pond water with clarity.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/80 sm:text-base">
            Get real-time water-quality insights, critical alerts and practical recommendations for
            healthier fish and shrimp farming.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <a href="/app/live">
              <Button
                size="lg"
                className="group h-12 w-full gap-2 bg-primary px-6 text-primary-foreground shadow-glow hover:bg-primary/90 sm:w-auto"
              >
                <Play className="h-4 w-4 fill-current" />
                View Live Demo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </a>
            <a href="/app/setup">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full gap-2 border-white/30 bg-white/5 px-6 text-white backdrop-blur hover:bg-white/15 hover:text-white sm:w-auto"
              >
                Request Setup
              </Button>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[12px] text-white/70">
            <a href="/login" className="hover:text-white">
              Login
            </a>
            <span className="text-white/30">·</span>
            <a href="/app/dashboard" className="hover:text-white">
              Dashboard
            </a>
            <span className="text-white/30">·</span>
            <a href="/app/support" className="hover:text-white">
              Support
            </a>
            <span className="text-white/30">·</span>
            <span className="hover:text-white cursor-pointer">English / বাংলা</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
