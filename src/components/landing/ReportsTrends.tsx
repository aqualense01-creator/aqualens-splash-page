import { FileText, BarChart3, BellRing, FileDown, FileSpreadsheet } from "lucide-react";
import { Reveal } from "./Reveal";

function MiniLine({ data, color = "var(--primary)" }: { data: number[]; color?: string }) {
  const W = 200, H = 60;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / (max - min || 1)) * (H - 6) - 3,
  }));
  const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={color} fillOpacity={0.08} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

const cards = [
  {
    icon: FileText,
    title: "Daily Pond Summary",
    desc: "Yesterday’s DO, pH and temperature averages across every pond.",
    data: [6.4, 6.6, 6.8, 6.5, 6.2, 6.0, 5.8, 6.1, 6.4, 6.7, 6.9, 6.8],
    stat: { label: "Avg DO", value: "6.4 mg/L" },
  },
  {
    icon: BarChart3,
    title: "Weekly Farm Health",
    desc: "7-day trend of warnings, critical alerts and device uptime.",
    data: [2, 4, 3, 6, 8, 5, 3],
    stat: { label: "Alerts", value: "31 this week" },
  },
  {
    icon: BellRing,
    title: "Alert History",
    desc: "Every alert with timestamp, severity, action taken and resolution time.",
    data: [1, 0, 2, 1, 3, 2, 0, 1, 4, 2, 1, 0],
    stat: { label: "Resolved", value: "94%" },
  },
];

export function ReportsTrends() {
  return (
    <section className="relative bg-surface py-20 sm:py-24" aria-labelledby="reports-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Reports &amp; Trends</p>
          <h2 id="reports-heading" className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl">
            See what the water is telling you over time.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            Daily summaries, weekly farm health, device uptime — all exportable.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.title} delay={i * 0.07}>
                <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.stat.label}</div>
                      <div className="font-display text-base font-bold text-foreground">{c.stat.value}</div>
                    </div>
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-foreground">{c.title}</h3>
                  <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{c.desc}</p>
                  <div className="mt-4"><MiniLine data={c.data} /></div>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.2} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="text-[12px] font-medium text-muted-foreground">Export to:</span>
          {[
            { label: "PDF", icon: FileText },
            { label: "CSV", icon: FileDown },
            { label: "Excel", icon: FileSpreadsheet },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5"
            >
              <Icon className="h-3.5 w-3.5 text-primary" /> {label}
            </button>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
