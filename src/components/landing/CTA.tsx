import { Button } from "@/components/ui/button";
import water from "@/assets/cta-water.jpg";

export function CTA() {
  return (
    <section className="relative overflow-hidden">
      <img src={water} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" width={1920} height={720} />
      <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/70 to-navy/85" />
      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center text-navy-foreground">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Ready to Transform Your Aquaculture?</h2>
        <p className="mt-4 text-sm text-white/80">
          Join thousands of farmers who trust AcquaLence for smarter, more profitable aquaculture.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">Get Started Today</Button>
          <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
            Request Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
