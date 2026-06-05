import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, Quote, ArrowRight } from "lucide-react";
import expert from "@/assets/support-expert.jpg";
import { Reveal } from "./Reveal";

const items = ["24/7 Live Support", "Expert Consultation", "On-site Support", "Training & Resources"];

export function Support() {
  return (
    <section className="bg-surface py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:items-center">
        <div className="grid gap-6 sm:grid-cols-[1fr_240px] sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">24/7 Expert Support</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground">We're Here for You, Always</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Our team of aquaculture experts is available 24/7 to support you at every step.
            </p>
            <ul className="mt-5 space-y-2">
              {items.map((i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary" /> {i}
                </li>
              ))}
            </ul>
            <Button className="mt-6 gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
              Contact Support <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl">
            <img src={expert} alt="AcquaLence support specialist" className="h-72 w-full object-cover" loading="lazy" width={400} height={500} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Trusted by Aquaculture Farmers</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground">What Our Customers Say</h2>
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <Quote className="h-6 w-6 text-primary/40" />
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              AcquaLence has completely transformed the way we manage our ponds. Real-time data and smart alerts help us take action early and increase our productivity.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">RY</div>
              <div>
                <p className="text-sm font-semibold text-foreground">Ramesh Yadav</p>
                <p className="text-xs text-muted-foreground">Shrimp Farmer, India</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <button className="grid h-8 w-8 place-items-center rounded-full border border-border text-foreground/70 hover:bg-accent">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="grid h-8 w-8 place-items-center rounded-full border border-border text-foreground/70 hover:bg-accent">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
