import { Phone, MessageCircle, AlertCircle, Languages, Smartphone, MapPin } from "lucide-react";
import { Reveal } from "./Reveal";

const bullets = [
  { icon: Smartphone, t: "Designed for mobile use in the field" },
  { icon: Languages, t: "English and বাংলা labels everywhere" },
  { icon: MapPin, t: "Works for fish ponds and shrimp farms" },
  { icon: MessageCircle, t: "Helps farm managers and technicians act faster" },
];

export function FarmersSection() {
  return (
    <section className="relative bg-background py-20 sm:py-24" aria-labelledby="farmers-heading">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            For Farmers
          </p>
          <h2
            id="farmers-heading"
            className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl"
          >
            Built for fish &amp; shrimp farmers.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            Acqua Lence is built to be used standing at the edge of a pond, in sun and rain, with
            one hand — not from an office desk.
          </p>
          <ul className="mt-6 space-y-3">
            {bullets.map(({ icon: Icon, t }) => (
              <li
                key={t}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm transition-all duration-300 hover:translate-x-1 hover:border-primary/30 hover:shadow-soft"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-[14px] font-semibold text-foreground">{t}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Phone mockup */}
        <Reveal delay={0.15} className="lg:col-span-6">
          <div className="relative mx-auto w-full max-w-[300px]">
            <div
              aria-hidden
              className="absolute -inset-8 -z-10 rounded-[60px] bg-gradient-to-br from-primary/25 via-primary/5 to-transparent blur-2xl"
            />
            <div className="overflow-hidden rounded-[44px] border-8 border-foreground/90 bg-card shadow-[0_40px_80px_-30px_rgba(15,44,68,0.45)]">
              {/* notch */}
              <div className="flex h-6 items-center justify-center bg-foreground/90">
                <span className="h-1 w-16 rounded-full bg-background/30" />
              </div>
              <div className="space-y-3 bg-surface p-4">
                <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                  <span>Mirpur Farm</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-good" /> live
                  </span>
                </div>
                {/* pond cards */}
                <div className="rounded-xl border border-status-critical/40 bg-status-critical/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">
                      Pond 2 · Shrimp
                    </span>
                    <span className="rounded-full bg-status-critical px-2 py-0.5 text-[9px] font-bold text-white">
                      Critical
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                    <div>
                      <div className="text-[9px] text-muted-foreground">DO</div>
                      <div className="text-sm font-bold text-status-critical">3.1</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground">pH</div>
                      <div className="text-sm font-bold text-status-warning">8.4</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground">Temp</div>
                      <div className="text-sm font-bold text-foreground">31.2°</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-status-critical/30 bg-card p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-status-critical" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-foreground">Low oxygen</p>
                      <p className="text-[10px] italic text-muted-foreground">
                        পুকুর ২: এয়ারেটর চালু করুন
                      </p>
                    </div>
                  </div>
                  <button className="mt-2 w-full rounded-md bg-status-critical py-1.5 text-[11px] font-bold text-white">
                    Turn on aerator
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center gap-1 rounded-md bg-primary py-1.5 text-[10px] font-semibold text-primary-foreground">
                    <Phone className="h-3 w-3" /> Call
                  </button>
                  <button className="flex items-center justify-center gap-1 rounded-md border border-border bg-background py-1.5 text-[10px] font-semibold text-foreground">
                    <MessageCircle className="h-3 w-3" /> Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
