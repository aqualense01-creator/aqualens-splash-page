import { ArrowRight, Building2, CheckCircle2, DollarSign, MapPin, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";

const targetMarkets = [
  "Primary focus: intensive shrimp farming in Khulna and Bagerhat regions.",
  "Secondary expansion: general aquaculture systems and commercial fish hatcheries nationwide.",
  "Goal: support export-quality production that can meet international standards.",
];

const plans = [
  {
    name: "Basic Plan",
    price: "$10",
    cadence: "/month",
    description: "Standard monitoring and alerts for daily pond operations.",
    items: ["Live water-quality readings", "Critical mobile alerts", "Device health overview"],
  },
  {
    name: "Premium Plan",
    price: "$50",
    cadence: "/month",
    description: "Advanced analytics, purification control, and priority support.",
    items: ["Trend analytics and reports", "Purification control workflows", "Priority support"],
    featured: true,
  },
];

export function PricingMarket() {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-surface py-14 sm:py-20 lg:py-24"
      aria-labelledby="pricing-heading"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(18,198,222,0.12),transparent_32%),radial-gradient(circle_at_82%_16%,rgba(15,44,68,0.08),transparent_32%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:gap-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Pricing
            </p>
            <h2
              id="pricing-heading"
              className="mt-3 max-w-2xl font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl"
            >
              Market &amp; business model for export-ready aquaculture.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
              Acqua Lence is designed for a multi-billion dollar export market, starting with
              intensive shrimp farms and expanding into wider commercial aquaculture systems.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Target, value: "Primary", label: "Khulna + Bagerhat shrimp farms" },
              { icon: Building2, value: "Nationwide", label: "Aquaculture and hatcheries" },
              { icon: DollarSign, value: "$50", label: "One-time hardware unit" },
            ].map(({ icon: Icon, value, label }) => (
              <div
                key={value}
                className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
              >
                <Icon className="h-5 w-5 text-primary" />
                <p className="mt-4 font-display text-xl font-bold text-foreground">{value}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6">
          <Reveal delay={0.08}>
            <div className="h-full rounded-lg border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                    Target Market
                  </p>
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    Built around real pond regions.
                  </h3>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {targetMarkets.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2">
            {plans.map((plan, index) => (
              <Reveal key={plan.name} delay={0.12 + index * 0.08}>
                <article
                  className={`relative h-full overflow-hidden rounded-lg border p-5 shadow-soft sm:p-6 ${
                    plan.featured
                      ? "border-primary/45 bg-navy text-white"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute inset-0 bg-navy-grid opacity-20" aria-hidden="true" />
                  )}
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            plan.featured ? "text-cyan-100/75" : "text-muted-foreground"
                          }`}
                        >
                          {plan.name}
                        </p>
                        <div className="mt-3 flex items-end gap-1">
                          <span className="font-display text-4xl font-bold">{plan.price}</span>
                          <span
                            className={`pb-1 text-sm ${
                              plan.featured ? "text-cyan-100/65" : "text-muted-foreground"
                            }`}
                          >
                            {plan.cadence}
                          </span>
                        </div>
                      </div>
                      {plan.featured && (
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-50">
                          Advanced
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-4 text-sm leading-6 ${
                        plan.featured ? "text-cyan-50/72" : "text-muted-foreground"
                      }`}
                    >
                      {plan.description}
                    </p>
                    <ul className="mt-5 space-y-3">
                      {plan.items.map((item) => (
                        <li
                          key={item}
                          className={`flex gap-3 text-sm ${
                            plan.featured ? "text-cyan-50/80" : "text-foreground/75"
                          }`}
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      className={`mt-6 w-full gap-2 ${
                        plan.featured
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-foreground text-background hover:bg-foreground/90"
                      }`}
                    >
                      <a href="/signup">
                        Choose {plan.name.replace(" Plan", "")}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
