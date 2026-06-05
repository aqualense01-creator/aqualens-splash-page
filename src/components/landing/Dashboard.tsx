import {
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  Radio,
  Anchor,
  Bell,
  FileText,
  BarChart3,
  Cpu,
  Settings,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCheck,
  ChevronDown,
} from "lucide-react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useMemo, useRef } from "react";
import { Logo } from "./Logo";
import { Reveal } from "./Reveal";
import { CountUp } from "./CountUp";

/* ---------- data ---------- */

const metrics = [
  { label: "Dissolved Oxygen", value: 6.42, unit: "mg/L", delta: +4.2, tone: "primary" as const },
  { label: "pH Level", value: 7.35, unit: "pH", delta: +1.1, tone: "neutral" as const },
  { label: "Temperature", value: 28.6, unit: "°C", delta: -0.4, tone: "warn" as const },
  { label: "Turbidity", value: 12.4, unit: "NTU", delta: -3.6, tone: "danger" as const },
  { label: "Salinity", value: 15.2, unit: "ppt", delta: +2.0, tone: "ok" as const },
];

const sidebar = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: Radio, label: "Sensors" },
  { icon: Anchor, label: "Buoys" },
  { icon: Bell, label: "Alerts" },
  { icon: FileText, label: "Reports" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Cpu, label: "Devices" },
  { icon: Settings, label: "Settings" },
];

const alerts = [
  { icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10", title: "High Turbidity", meta: "18.7 NTU", time: "12 min" },
  { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", title: "pH Fluctuation", meta: "7.9 pH", time: "25 min" },
  { icon: Info, color: "text-sky-500", bg: "bg-sky-500/10", title: "DO Level Normal", meta: "6.42 mg/L", time: "35 min" },
  { icon: Info, color: "text-sky-500", bg: "bg-sky-500/10", title: "Temperature Stable", meta: "28.6 °C", time: "47 min" },
  { icon: CheckCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", title: "System Online", meta: "All sensors", time: "1 hr" },
];

const bullets = [
  "Sub-minute telemetry, no polling delays",
  "Threshold + anomaly alerts to SMS, app, email",
  "Multi-pond, multi-site rollups",
  "Exportable CSV & API for your stack",
];

const series = [
  { name: "Temperature", color: "#f59e0b", values: [29, 28, 30, 32, 31, 30, 29, 28, 29, 30, 29, 28, 29], yScale: 0.55 },
  { name: "pH",          color: "#14b8a6", values: [14, 15, 14, 13, 16, 17, 15, 13, 12, 13, 14, 13, 14], yScale: 0.32 },
  { name: "DO",          color: "#3b82f6", values: [11, 12, 11, 12, 11, 10, 11, 12, 12, 11, 11, 12, 11], yScale: 0.28 },
  { name: "Salinity",    color: "#06b6d4", values: [15, 14, 13, 12, 11, 12, 13, 14, 15, 13, 12, 13, 14], yScale: 0.36 },
  { name: "Turbidity",   color: "#ef4444", values: [7, 8, 6, 5, 4, 5, 6, 7, 8, 7, 6, 7, 8], yScale: 0.18 },
];

const HOURS = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00"];

/* ---------- chart ---------- */

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function TrendChart() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();

  const W = 720;
  const H = 240;
  const padX = 20;
  const padY = 16;
  const maxY = 36;

  const paths = useMemo(
    () =>
      series.map((s) => {
        const pts = s.values.map((v, i) => ({
          x: padX + (i / (s.values.length - 1)) * (W - padX * 2),
          y: padY + (1 - v / maxY) * (H - padY * 2),
        }));
        return { ...s, d: smoothPath(pts), pts };
      }),
    []
  );

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chart-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.66 0.11 210)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="oklch(0.66 0.11 210)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grid */}
      {[0, 1, 2, 3, 4].map((i) => {
        const y = padY + (i / 4) * (H - padY * 2);
        return (
          <line
            key={i}
            x1={padX}
            x2={W - padX}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeDasharray="3 4"
          />
        );
      })}

      {/* lines */}
      {paths.map((p, idx) => (
        <motion.path
          key={p.name}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? false : { pathLength: 0, opacity: 0 }}
          animate={inView || reduced ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 1.6, delay: 0.15 * idx, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}

      {/* travelling pulse on the primary (DO) line */}
      {!reduced &&
        (() => {
          const p = paths.find((x) => x.name === "DO");
          if (!p) return null;
          return (
            <motion.circle
              r={4}
              fill="#3b82f6"
              stroke="white"
              strokeWidth={2}
              initial={false}
              animate={
                inView
                  ? {
                      cx: p.pts.map((pt) => pt.x),
                      cy: p.pts.map((pt) => pt.y),
                    }
                  : {}
              }
              transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 1.6 }}
            />
          );
        })()}
    </svg>
  );
}

/* ---------- mini sparkline for metric cards ---------- */

function Spark({ data, color }: { data: number[]; color: string }) {
  const W = 80;
  const H = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / (max - min || 1)) * H,
  }));
  const d = smoothPath(pts);
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-6 w-20" preserveAspectRatio="none">
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={inView || reduced ? { pathLength: 1 } : {}}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

/* ---------- section ---------- */

export function Dashboard() {
  return (
    <section className="relative overflow-hidden bg-surface py-20 sm:py-28">
      {/* ambient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 500px at 90% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 60%), radial-gradient(700px 500px at -10% 100%, color-mix(in oklab, var(--navy) 8%, transparent), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* header */}
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-px w-8 bg-primary/60" />
              Real-time Monitoring
            </div>
            <h2 className="mt-5 font-display text-3xl font-bold leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl md:text-[3.5rem]">
              The control room{" "}
              <span className="italic font-normal text-primary" style={{ fontFamily: "'Instrument Serif', 'Times New Roman', serif" }}>
                for your water.
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-[17px]">
              Every parameter, every pond, every minute — streamed to one calm interface.
              Spot a problem in seconds, not on the next morning round.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="lg:col-span-5">
            <ul className="grid gap-3 sm:grid-cols-2">
              {bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 rounded-xl border border-border/70 bg-background/60 p-3 text-[13px] text-foreground backdrop-blur"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="leading-snug">{b}</span>
                </li>
              ))}
            </ul>
            <a href="#" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Tour the dashboard <ArrowRight className="h-4 w-4" />
            </a>
          </Reveal>
        </div>

        {/* dashboard mock */}
        <Reveal delay={0.2} className="mt-12">
          <div className="relative">
            {/* outer glow */}
            <div
              aria-hidden
              className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[40px] bg-gradient-to-b from-primary/10 via-transparent to-transparent blur-2xl"
            />

            <div className="overflow-hidden rounded-[20px] border border-border/70 bg-background shadow-[0_60px_120px_-40px_rgba(15,44,68,0.35)]">
              {/* browser chrome */}
              <div className="flex items-center justify-between border-b border-border/60 bg-surface/70 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <div className="hidden rounded-md bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground sm:block">
                  app.acqualence.io/overview
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Live</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
                {/* sidebar */}
                <aside className="hidden border-r border-border/60 bg-surface/50 p-4 md:block">
                  <div className="px-1">
                    <Logo />
                  </div>
                  <ul className="mt-7 space-y-0.5">
                    {sidebar.map(({ icon: Icon, label, active }) => (
                      <li
                        key={label}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition-colors ${
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:bg-accent/60"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 rounded-lg border border-border/70 bg-background/80 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plan</p>
                    <p className="mt-0.5 font-display text-sm font-semibold text-foreground">Fleet · 12 buoys</p>
                  </div>
                </aside>

                {/* main */}
                <div className="p-4 sm:p-6">
                  {/* header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">Overview</h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Updated 4 seconds ago</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1.5 text-[12px] text-foreground">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                        Ω
                      </span>
                      Farm Omega
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* metric cards */}
                  <motion.div
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={{
                      hidden: {},
                      show: { transition: { staggerChildren: 0.07 } },
                    }}
                    className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
                  >
                    {metrics.map((m) => {
                      const up = m.delta >= 0;
                      const sparkColor =
                        m.tone === "primary"
                          ? "#3b82f6"
                          : m.tone === "warn"
                          ? "#f59e0b"
                          : m.tone === "danger"
                          ? "#ef4444"
                          : m.tone === "ok"
                          ? "#06b6d4"
                          : "#14b8a6";
                      const sparkData = Array.from({ length: 14 }, () => Math.random() * 10 + 4);
                      return (
                        <motion.div
                          key={m.label}
                          variants={{
                            hidden: { opacity: 0, y: 14 },
                            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
                          }}
                          className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-4 transition-shadow hover:shadow-soft"
                        >
                          <div className="flex items-start justify-between">
                            <p className="text-[11px] font-medium text-muted-foreground">{m.label}</p>
                            <button className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground/60">
                              <Info className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="mt-3 flex items-baseline gap-1.5">
                            <CountUp
                              to={m.value}
                              decimals={m.value % 1 === 0 ? 0 : 2}
                              className="font-display text-[28px] font-bold leading-none tracking-tight text-foreground tabular-nums"
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{m.unit}</p>

                          <div className="mt-3 flex items-end justify-between">
                            <span
                              className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                                up ? "text-emerald-600" : "text-rose-500"
                              }`}
                            >
                              {up ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {Math.abs(m.delta).toFixed(1)}%
                            </span>
                            <Spark data={sparkData} color={sparkColor} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  {/* chart + alerts */}
                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
                    {/* chart */}
                    <div className="rounded-xl border border-border/70 bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="font-display text-base font-semibold text-foreground">
                            Water Quality Trend
                          </h4>
                          <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                            Streaming · 6h window
                          </p>
                        </div>
                        <div className="flex items-center gap-1 rounded-full border border-border/70 bg-surface p-0.5 text-[11px]">
                          {["1H", "6H", "24H", "7D"].map((p, i) => (
                            <button
                              key={p}
                              className={`rounded-full px-2.5 py-1 ${
                                i === 1 ? "bg-foreground text-background" : "text-muted-foreground"
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* legend */}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
                        {series.map((s) => (
                          <span key={s.name} className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                            {s.name}
                          </span>
                        ))}
                      </div>

                      {/* chart canvas */}
                      <div className="relative mt-3 h-56 text-foreground">
                        <TrendChart />
                        {/* x-axis */}
                        <div className="mt-1 flex justify-between px-2 text-[10px] text-muted-foreground tabular-nums">
                          {HOURS.map((h) => (
                            <span key={h}>{h}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* alerts */}
                    <div className="rounded-xl border border-border/70 bg-card p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-display text-base font-semibold text-foreground">
                          Alerts & Activity
                        </h4>
                        <a href="#" className="text-[11px] font-medium text-primary">View all</a>
                      </div>
                      <motion.ul
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.3 }}
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
                        className="mt-3 space-y-2"
                      >
                        {alerts.map((a) => (
                          <motion.li
                            key={a.title}
                            variants={{
                              hidden: { opacity: 0, x: 12 },
                              show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                            }}
                            className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-accent/40"
                          >
                            <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${a.bg}`}>
                              <a.icon className={`h-3.5 w-3.5 ${a.color}`} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[12px] font-semibold text-foreground">{a.title}</p>
                                <span className="shrink-0 text-[10px] text-muted-foreground">{a.time}</span>
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{a.meta}</p>
                            </div>
                          </motion.li>
                        ))}
                      </motion.ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* floating tag — bottom right */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="absolute -bottom-5 right-6 hidden items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-[11px] font-medium text-foreground shadow-soft md:inline-flex"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                <CheckCheck className="h-3 w-3" />
              </span>
              All 12 buoys reporting · Latency 1.2s
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
