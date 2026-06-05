import { Wrench, Radio, LayoutDashboard, BellRing, ChevronRight } from "lucide-react";
import { Reveal } from "./Reveal";

const steps = [
  { icon: Wrench,          title: "Install the device",       body: "Place the solar-powered Acqua Lence buoy in your pond. Plug and play." },
  { icon: Radio,           title: "Sensors collect live data", body: "DO, pH, temperature, turbidity, salinity and ammonia — every minute." },
  { icon: LayoutDashboard, title: "See pond health",            body: "Live readings stream to a calm dashboard you can open from any phone." },
  { icon: BellRing,        title: "Get alerts &amp; actions",   body: "Critical drop? You’ll know — and what to do — in seconds." },
];

export function HowItWorks() {
  return (
    <section className="relative bg-background py-20 sm:py-24" aria-labelledby="how-heading">
      <div className="absolute inset-0 -z-10 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">How It Works</p>
          <h2 id="how-heading" className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl">
            Four steps from install to action.
          </h2>
        </Reveal>

        <div className="relative mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          <div className="absolute left-[8%] right-[8%] top-8 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block" />
          {steps.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.08} className="relative flex flex-col items-center text-center">
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-card ring-1 ring-border shadow-soft">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent" />
                <Icon className="relative h-6 w-6 text-primary" strokeWidth={1.75} />
                <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-soft">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{title.replace("&amp;","&")}</h3>
              <p className="mt-2 max-w-[220px] text-xs leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: body }} />
              {i < steps.length - 1 && (
                <ChevronRight className="absolute right-[-14px] top-5 hidden h-5 w-5 text-primary/40 md:block" />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
