import { Gauge, Clock, Sparkles, Cloud, ShieldCheck, ArrowRight } from "lucide-react";

const items = [
  { icon: Gauge, top: "5+", title: "Water Quality", sub: "Parameters" },
  { icon: Clock, top: "Real-time", title: "Continuous", sub: "Monitoring" },
  { icon: Sparkles, top: "AI Powered", title: "Smart Alerts &", sub: "Recommendations" },
  { icon: Cloud, top: "Cloud Based", title: "Secure Data", sub: "Anywhere" },
  { icon: ShieldCheck, top: "IP67", title: "Waterproof &", sub: "Built to Last" },
];

export function Stats() {
  return (
    <section className="bg-surface py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-xl font-semibold text-foreground">All-in-One Water Quality Monitoring System</h2>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {items.map(({ icon: Icon, top, title, sub }) => (
              <div key={top + title} className="rounded-xl border border-border bg-card p-5">
                <Icon className="h-5 w-5 text-primary" />
                <p className="mt-4 text-lg font-semibold text-foreground">{top}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  {title}
                  <br />
                  {sub}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-card p-2">
            <p className="text-sm leading-relaxed text-muted-foreground">
              AcquaLence combines advanced sensors, robust hardware and intelligent software to give you complete control over your aquaculture operations.
            </p>
            <a href="#" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Learn More <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
