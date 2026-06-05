import { AlertCircle, AlertTriangle, WifiOff, FlaskConical, Languages } from "lucide-react";
import { Reveal } from "./Reveal";
import { statusMeta } from "@/lib/mock-pond";

type Severity = "critical" | "warning" | "offline" | "calibration";

const items: Array<{
  sev: Severity;
  icon: typeof AlertCircle;
  pond: string;
  title: string;
  body: string;
  cta: string;
  bn?: string;
}> = [
  {
    sev: "critical",
    icon: AlertCircle,
    pond: "Pond 2",
    title: "Oxygen is low",
    body: "DO 3.1 mg/L — below safe threshold.",
    cta: "Turn on aerator now",
    bn: "পুকুর ২: অক্সিজেন কমে গেছে। এখনই এয়ারেটর চালু করুন।",
  },
  {
    sev: "warning",
    icon: AlertTriangle,
    pond: "Pond 3",
    title: "pH is rising",
    body: "Trending toward 8.8 over last 2 hours.",
    cta: "Check water exchange plan",
  },
  {
    sev: "offline",
    icon: WifiOff,
    pond: "AQ-188",
    title: "Device offline",
    body: "Last signal 14 minutes ago.",
    cta: "Check power and signal",
  },
  {
    sev: "calibration",
    icon: FlaskConical,
    pond: "AQ-204",
    title: "pH sensor calibration due",
    body: "Last calibrated 28 days ago.",
    cta: "Schedule calibration",
  },
];

export function AlertsActions() {
  return (
    <section
      className="relative bg-surface py-14 sm:py-20 lg:py-24"
      aria-labelledby="alerts-heading"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Alerts &amp; Actions
          </p>
          <h2
            id="alerts-heading"
            className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl"
          >
            From risk detection to clear action.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
            Acqua Lence doesn’t only show numbers. It tells farmers what’s wrong, why it matters,
            and what to do next — in English or বাংলা.
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-[13px] text-foreground">
            <Languages className="h-4 w-4 text-primary" />
            Alerts available in English and বাংলা
          </div>
          <ul className="mt-5 space-y-2 text-[13px] text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              SMS, WhatsApp, app push and email
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Critical alerts cannot be silenced by accident
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Recommended action attached to every alert
            </li>
          </ul>
        </Reveal>

        <div className="lg:col-span-7">
          <ol className="space-y-3">
            {items.map((a, i) => {
              const m = statusMeta[a.sev];
              const Icon = a.icon;
              return (
                <Reveal key={a.pond + a.title} delay={i * 0.06}>
                  <li
                    className={`group flex items-start gap-3 rounded-lg border bg-card p-4 ring-1 ${m.ring} hover:shadow-soft sm:rounded-2xl`}
                    style={{ borderColor: `color-mix(in oklab, ${m.color} 30%, var(--border))` }}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${m.bg} ${m.text}`}
                      aria-hidden
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${m.bg} ${m.text}`}
                        >
                          {m.label}
                        </span>
                        <span className="text-[12px] font-semibold text-foreground">{a.pond}</span>
                        <span className="text-[11px] text-muted-foreground">· {a.title}</span>
                      </div>
                      <p className="mt-1 text-[13px] text-muted-foreground">{a.body}</p>
                      {a.bn && (
                        <p className="mt-1 text-[12px] leading-5 text-foreground/70">{a.bn}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] font-semibold text-foreground">
                        <span className="text-muted-foreground">Action:</span>
                        {a.cta}
                      </div>
                    </div>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
