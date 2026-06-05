import { Button } from "@/components/ui/button";
import water from "@/assets/cta-water.jpg";
import { Reveal } from "./Reveal";
import { ArrowRight } from "lucide-react";
import { AuroraBackground } from "./AuroraBackground";
import { MagneticButton } from "./MagneticButton";

export function CTA() {
  return (
    <section className="relative overflow-hidden">
      <img
        src={water}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        width={1920}
        height={720}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy/85 via-navy/75 to-navy/90" />
      <AuroraBackground />
      <div className="absolute inset-0 bg-navy-grid opacity-30" />
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center text-navy-foreground sm:px-6 sm:py-24 md:py-28">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            Start in minutes · no card required
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold text-balance sm:text-4xl md:text-5xl">
            Ready to Transform Your Aquaculture?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/80 sm:text-base">
            Join thousands of farmers who trust AcquaLence for smarter, more profitable, and more sustainable aquaculture.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-10">
            <MagneticButton>
              <Button size="lg" className="group gap-1 bg-primary text-primary-foreground shadow-glow hover:bg-primary/90">
                Get Started Today
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </MagneticButton>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/5 text-white backdrop-blur hover:bg-white/15 hover:text-white"
            >
              Request Demo
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
