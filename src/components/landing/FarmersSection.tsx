import { Languages, MapPin, MessageCircle, Smartphone } from "lucide-react";
import farmerPondApp from "@/assets/farmer-pond-app.webp";
import { Reveal } from "./Reveal";

const bullets = [
  { icon: Smartphone, t: "Designed for mobile use at the pond edge" },
  { icon: Languages, t: "English and Bangla alerts for daily operations" },
  { icon: MapPin, t: "Works for fish ponds and shrimp farms" },
  { icon: MessageCircle, t: "Helps managers and technicians act faster" },
];

const highlights = ["Critical alerts", "One-tap action", "Field-ready guidance"];

export function FarmersSection() {
  return (
    <section
      id="farmers"
      className="relative bg-background py-12 sm:py-16 lg:py-20"
      aria-labelledby="farmers-heading"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            For Farmers
          </p>
          <h2
            id="farmers-heading"
            className="mt-3 max-w-xl font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl"
          >
            Built for fish &amp; shrimp farmers.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
            Acqua Lence is built to be used standing at the edge of a pond, in sun and rain, with
            one hand - not from an office desk.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {bullets.map(({ icon: Icon, t }) => (
              <li
                key={t}
                className="flex min-h-16 items-center gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-[14px] font-semibold leading-6 text-foreground">{t}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.15} className="lg:col-span-7">
          <figure className="relative mx-auto w-full max-w-[520px] lg:mr-0">
            <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-[0_32px_80px_-44px_rgba(15,44,68,0.55)]">
              <img
                src={farmerPondApp}
                alt="Fish farmer beside a pond holding the Acqua Lence mobile alert screen"
                width={1122}
                height={1402}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-cover object-center"
              />
              <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-navy/58 via-navy/5 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full border border-white/25 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
                Field-ready app
              </div>
              <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
                {highlights.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/25 bg-white/92 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
