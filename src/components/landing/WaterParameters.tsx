import { Droplets, FlaskConical, Thermometer, Waves, Anchor, Wind, Cpu } from "lucide-react";
import { Reveal } from "./Reveal";
import { SpotlightCard } from "./SpotlightCard";
import type { Status } from "@/lib/mock-pond";
import { statusMeta } from "@/lib/mock-pond";

type Param = {
  icon: typeof Droplets;
  name: string;
  copy: string;
  value: string;
  unit: string;
  status: Status;
  spark: number[];
  span?: string;
};

const params: Param[] = [
  {
    icon: Droplets,
    name: "Dissolved Oxygen",
    copy: "Catch oxygen drops early and protect fish health.",
    value: "3.1",
    unit: "mg/L",
    status: "critical",
    spark: [6.8, 6.2, 5.5, 4.8, 4.1, 3.6, 3.3, 3.1],
    span: "lg:col-span-6",
  },
  {
    icon: FlaskConical,
    name: "pH",
    copy: "Track acidity and alkalinity before stress starts.",
    value: "8.4",
    unit: "",
    status: "warning",
    spark: [7.4, 7.6, 7.8, 8.0, 8.2, 8.3, 8.4, 8.4],
    span: "lg:col-span-3",
  },
  {
    icon: Thermometer,
    name: "Temperature",
    copy: "Understand heat stress and feeding conditions.",
    value: "29.5",
    unit: "°C",
    status: "watch",
    spark: [27, 27.5, 28, 28.4, 28.9, 29.2, 29.4, 29.5],
    span: "lg:col-span-3",
  },
  {
    icon: Waves,
    name: "Turbidity",
    copy: "See water clarity changes quickly.",
    value: "8.4",
    unit: "NTU",
    status: "good",
    spark: [10, 9, 8.6, 8.5, 8.4, 8.4, 8.3, 8.4],
    span: "lg:col-span-3",
  },
  {
    icon: Anchor,
    name: "Salinity",
    copy: "Useful for shrimp and brackish water farms.",
    value: "15.2",
    unit: "ppt",
    status: "good",
    spark: [14, 14.5, 14.8, 15, 15.1, 15.2, 15.2, 15.2],
    span: "lg:col-span-3",
  },
  {
    icon: Wind,
    name: "Ammonia",
    copy: "Detect toxic buildup before it becomes dangerous.",
    value: "0.18",
    unit: "mg/L",
    status: "watch",
    spark: [0.1, 0.12, 0.13, 0.14, 0.16, 0.17, 0.18, 0.18],
    span: "lg:col-span-3",
  },
  {
    icon: Cpu,
    name: "Device Health",
    copy: "Know when sensors, battery, or signal need attention.",
    value: "78",
    unit: "% battery",
    status: "good",
    spark: [95, 92, 88, 85, 82, 80, 79, 78],
    span: "lg:col-span-3",
  },
];

function Spark({ data, color }: { data: number[]; color: string }) {
  const W = 120,
    H = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / (max - min || 1)) * (H - 4) - 2,
  }));
  const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function WaterParameters() {
  return (
    <section className="relative bg-background py-20 sm:py-24" aria-labelledby="params-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Water Parameters
          </p>
          <h2
            id="params-heading"
            className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl"
          >
            Monitor the parameters that matter most.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            Seven sensor streams, one calm dashboard — purpose-built for fish and shrimp farms.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {params.map((p, i) => {
            const m = statusMeta[p.status];
            const Icon = p.icon;
            return (
              <Reveal key={p.name} delay={i * 0.04} className={p.span ?? "lg:col-span-3"}>
                <SpotlightCard
                  color={m.color ? `color-mix(in oklab, ${m.color} 15%, transparent)` : undefined}
                  className="h-full rounded-2xl border border-border/70 bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <article className="group flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${m.bg} ${m.text} ${m.ring}`}
                      >
                        <span className="h-1 w-1 rounded-full" style={{ background: m.color }} />
                        {m.label}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold text-foreground">{p.name}</h3>
                    <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{p.copy}</p>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <div className="font-display text-3xl font-bold leading-none text-foreground tabular-nums">
                          {p.value}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{p.unit}</div>
                      </div>
                      <div className="w-24 shrink-0">
                        <Spark data={p.spark} color={m.color} />
                      </div>
                    </div>
                  </article>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
