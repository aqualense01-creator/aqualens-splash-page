import { Gauge, Clock, Sparkles, Cloud, ShieldCheck, ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { CountUp } from "./CountUp";

type Item = {
  icon: typeof Gauge;
  num?: number;
  prefix?: string;
  suffix?: string;
  topText?: string;
  title: string;
  sub: string;
};

const items: Item[] = [
  { icon: Gauge, num: 5, suffix: "+", title: "Water Quality", sub: "Parameters" },
  { icon: Clock, num: 24, suffix: "/7", title: "Continuous", sub: "Monitoring" },
  { icon: Sparkles, num: 99.9, suffix: "%", title: "Smart Alerts", sub: "Uptime SLA" },
  { icon: Cloud, num: 365, suffix: " days", title: "Secure Data", sub: "Anywhere" },
  { icon: ShieldCheck, topText: "IP67", title: "Waterproof &", sub: "Built to Last" },
];

export function Stats() {
  return (
    <section className="bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              All-in-One Water Quality Monitoring System
            </h2>
            <a href="#" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Learn More <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {items.map(({ icon: Icon, num, prefix, suffix, topText, title, sub }, i) => (
              <Reveal key={title + sub} delay={i * 0.06}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft">
                  <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5 transition-transform group-hover:scale-110" />
                  <Icon className="relative h-5 w-5 text-primary" />
                  <p className="relative mt-4 text-lg font-bold text-foreground">
                    {num !== undefined ? (
                      <CountUp
                        to={num}
                        prefix={prefix}
                        suffix={suffix}
                        decimals={Number.isInteger(num) ? 0 : 1}
                      />
                    ) : (
                      topText
                    )}
                  </p>
                  <p className="relative mt-1 text-xs leading-snug text-muted-foreground">
                    {title}
                    <br />
                    {sub}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-primary/10 to-transparent p-6 ring-1 ring-primary/15">
              <p className="text-sm leading-relaxed text-foreground/80">
                AcquaLence combines advanced sensors, robust hardware and intelligent software to
                give you complete control over your aquaculture operations.
              </p>
              <a
                href="#"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                Explore the platform <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
