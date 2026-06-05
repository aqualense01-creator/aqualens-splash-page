import {
  Activity,
  Droplets,
  FlaskConical,
  Thermometer,
  Wifi,
  BatteryFull,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { trend12h } from "@/lib/mock-pond";

function Sparkline({ data, color = "var(--status-critical)" }: { data: number[]; color?: string }) {
  const W = 240,
    H = 56;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / (max - min || 1)) * (H - 8) - 4,
  }));
  const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spark-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill="url(#spark-fade)" />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function HeroDashboardCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="relative mx-auto w-full max-w-[520px]"
    >
      {/* glow */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl"
      />

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_40px_80px_-30px_rgba(15,44,68,0.35)]">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border/70 bg-surface/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-status-critical/10 text-status-critical">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Pond 2 · Shrimp</p>
              <p className="text-[11px] text-muted-foreground">Mirpur Farm · live</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-status-critical/10 px-2.5 py-1 text-[11px] font-semibold text-status-critical ring-1 ring-status-critical/30">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-critical" />
            Critical
          </span>
        </div>

        {/* big readings */}
        <div className="grid grid-cols-3 divide-x divide-border/70">
          {[
            { icon: Droplets, label: "DO", val: "3.1", unit: "mg/L", tone: "text-status-critical" },
            { icon: FlaskConical, label: "pH", val: "8.4", unit: "", tone: "text-status-warning" },
            {
              icon: Thermometer,
              label: "Temp",
              val: "31.2",
              unit: "°C",
              tone: "text-status-watch",
            },
          ].map(({ icon: Icon, label, val, unit, tone }) => (
            <div key={label} className="px-3 py-4 text-center">
              <div className="mx-auto flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3 w-3" /> {label}
              </div>
              <div
                className={`mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl ${tone}`}
              >
                {val}
              </div>
              <div className="text-[10px] text-muted-foreground">{unit || "—"}</div>
            </div>
          ))}
        </div>

        {/* alert strip */}
        <div className="border-y border-status-critical/20 bg-status-critical/5 px-5 py-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-critical" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-foreground">Low oxygen detected</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Recommended:{" "}
                <span className="font-medium text-foreground">Turn on aerator now</span>
              </p>
            </div>
            <button className="shrink-0 rounded-md bg-status-critical px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90">
              Act
            </button>
          </div>
        </div>

        {/* trend */}
        <div className="px-5 pt-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>DO · last 12 h</span>
            <span>mg/L</span>
          </div>
          <Sparkline data={trend12h} />
        </div>

        {/* device row */}
        <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-surface/40 px-5 py-3 text-[11px]">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
            AQ-204 online
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BatteryFull className="h-3 w-3 text-status-good" /> 78%
            </span>
            <span className="inline-flex items-center gap-1">
              <Wifi className="h-3 w-3 text-primary" /> 4/5
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
