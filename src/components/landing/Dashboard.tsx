import { ChevronDown, Activity, AlertCircle, Wifi, BatteryFull, ListChecks } from "lucide-react";
import { motion } from "framer-motion";
import { Reveal } from "./Reveal";
import { farms, ponds, statusMeta, trend12h } from "@/lib/mock-pond";

function TrendChart({ data }: { data: number[] }) {
  const W = 480,
    H = 140;
  const padX = 8,
    padY = 12;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * (W - padX * 2),
    y: padY + (1 - (v - min) / (max - min || 1)) * (H - padY * 2),
  }));
  const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  // threshold line at safe-DO=4.0
  const safeY = padY + (1 - (4.0 - min) / (max - min || 1)) * (H - padY * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="dash-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={padX}
        x2={W - padX}
        y1={safeY}
        y2={safeY}
        stroke="var(--status-critical)"
        strokeOpacity={0.5}
        strokeDasharray="4 4"
        strokeWidth={1}
      />
      <path d={`${d} L ${W - padX} ${H} L ${padX} ${H} Z`} fill="url(#dash-fade)" />
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === pts.length - 1 ? 3.5 : 0}
          fill="var(--status-critical)"
        />
      ))}
    </svg>
  );
}

export function Dashboard() {
  return (
    <section className="relative bg-surface py-20 sm:py-24" aria-labelledby="dashboard-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Live Dashboard
          </p>
          <h2
            id="dashboard-heading"
            className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl"
          >
            One calm view of every pond, every parameter.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            The same dashboard farmers use every day — readings, alerts and recommended actions
            without the noise.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mt-10">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_60px_120px_-40px_rgba(15,44,68,0.30)]">
            {/* chrome */}
            <div className="flex items-center justify-between border-b border-border/70 bg-surface/60 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <div className="hidden rounded-md bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground sm:block">
                app.acqualence.io/overview
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-good" /> Live
              </span>
            </div>

            <div className="p-4 sm:p-6">
              {/* farm selector */}
              <div className="flex flex-wrap items-center gap-2">
                {farms.map((f, i) => (
                  <button
                    key={f}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      i === 0
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-accent"
                    }`}
                  >
                    {f}
                    {i === 0 && <ChevronDown className="h-3 w-3" />}
                  </button>
                ))}
                <div className="ml-auto text-[11px] text-muted-foreground">
                  Updated 4 seconds ago
                </div>
              </div>

              {/* layout */}
              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* pond cards */}
                <div className="lg:col-span-7">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {ponds.map((p) => {
                      const m = statusMeta[p.status];
                      return (
                        <motion.article
                          key={p.id}
                          whileHover={{ y: -2 }}
                          className={`rounded-xl border bg-card p-4 ring-1 ${m.ring}`}
                          style={{
                            borderColor: `color-mix(in oklab, ${m.color} 30%, var(--border))`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-[12px] font-semibold text-foreground">{p.name}</h4>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${m.bg} ${m.text}`}
                            >
                              {m.label}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                                DO
                              </div>
                              <div
                                className={`font-display text-base font-bold tabular-nums ${p.status === "critical" ? "text-status-critical" : "text-foreground"}`}
                              >
                                {p.do}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                                pH
                              </div>
                              <div
                                className={`font-display text-base font-bold tabular-nums ${p.status === "warning" ? "text-status-warning" : "text-foreground"}`}
                              >
                                {p.ph}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                                °C
                              </div>
                              <div className="font-display text-base font-bold tabular-nums text-foreground">
                                {p.temp}
                              </div>
                            </div>
                          </div>
                          {p.alert && (
                            <p className="mt-3 line-clamp-2 text-[10.5px] text-muted-foreground">
                              <AlertCircle className={`mr-1 inline h-3 w-3 ${m.text}`} />
                              {p.alert}
                            </p>
                          )}
                        </motion.article>
                      );
                    })}
                  </div>

                  {/* trend */}
                  <div className="mt-4 rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[13px] font-semibold text-foreground">
                          Pond 2 · DO (12h)
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Dashed line = safe threshold 4.0 mg/L
                        </p>
                      </div>
                      <span className="rounded-full bg-status-critical/10 px-2 py-0.5 text-[10px] font-semibold text-status-critical">
                        Below safe
                      </span>
                    </div>
                    <div className="mt-3">
                      <TrendChart data={trend12h} />
                    </div>
                  </div>
                </div>

                {/* right rail */}
                <div className="space-y-3 lg:col-span-5">
                  <div className="rounded-xl border border-status-critical/30 bg-status-critical/5 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-critical" />
                      <div>
                        <p className="text-[12px] font-bold text-foreground">Critical · Pond 2</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          DO 3.1 mg/L — below safe threshold for shrimp.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-primary/5 p-4">
                    <div className="flex items-start gap-2">
                      <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-[12px] font-bold text-foreground">Recommended action</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          Turn on Pond 2 aerator and recheck in 15 minutes.
                        </p>
                        <button className="mt-2 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                          Mark as done
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <p className="text-[12px] font-bold text-foreground">Device health</p>
                    </div>
                    <ul className="mt-2 space-y-1.5 text-[12px]">
                      <li className="flex items-center justify-between">
                        <span className="text-foreground">AQ-204</span>
                        <span className="inline-flex items-center gap-1 text-status-good">
                          <Wifi className="h-3 w-3" /> online · <BatteryFull className="h-3 w-3" />{" "}
                          78%
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-foreground">AQ-211</span>
                        <span className="inline-flex items-center gap-1 text-status-good">
                          <Wifi className="h-3 w-3" /> online · <BatteryFull className="h-3 w-3" />{" "}
                          64%
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-foreground">AQ-188</span>
                        <span className="inline-flex items-center gap-1 text-status-offline">
                          offline · 14m
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
