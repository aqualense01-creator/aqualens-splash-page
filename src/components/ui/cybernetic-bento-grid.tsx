import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  BellRing,
  Languages,
  LayoutDashboard,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
  SunMedium,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BentoItemProps = {
  className?: string;
  children: ReactNode;
  glow?: string;
};

function BentoItem({ className, children, glow = "oklch(0.72 0.16 205 / 0.26)" }: BentoItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const item = itemRef.current;
    if (!item) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = item.getBoundingClientRect();
      item.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      item.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    };

    item.addEventListener("mousemove", handleMouseMove);
    return () => item.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={itemRef}
      className={cn(
        "group relative min-h-[190px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] p-5 text-left shadow-[0_24px_90px_rgba(1,20,36,0.28)] transition duration-300 hover:-translate-y-1 hover:border-cyan-200/30 hover:bg-white/[0.075] sm:p-6",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(260px_circle_at_var(--mouse-x)_var(--mouse-y),var(--bento-glow),transparent_58%)] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        "after:pointer-events-none after:absolute after:inset-px after:rounded-[7px] after:border after:border-white/5",
        className,
      )}
      style={
        {
          "--mouse-x": "50%",
          "--mouse-y": "50%",
          "--bento-glow": glow,
        } as CSSProperties
      }
    >
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}

function MiniChart() {
  const lines = [
    "M0 76 C34 44 64 50 91 38 S151 29 186 50 247 55 286 22",
    "M0 104 C31 83 66 89 98 78 S159 73 190 91 250 92 286 67",
    "M0 126 C36 121 60 107 98 115 S160 143 197 129 244 112 286 119",
  ];

  return (
    <div className="mt-5 rounded-lg border border-cyan-100/10 bg-slate-950/70 p-4">
      <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
        {[
          ["DO", "6.42", "mg/L"],
          ["pH", "7.35", "stable"],
          ["Temp", "28.6", "deg C"],
        ].map(([label, value, unit]) => (
          <div key={label} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-cyan-100/55">{label}</p>
            <p className="mt-1 text-xl font-bold text-white">{value}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-cyan-100/45">{unit}</p>
          </div>
        ))}
      </div>
      <svg
        viewBox="0 0 286 146"
        className="h-36 w-full"
        role="img"
        aria-label="Water quality trend"
      >
        <defs>
          <linearGradient id="chartFade" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="#22d3ee" stopOpacity="0.16" />
            <stop offset="1" stopColor="#38bdf8" stopOpacity="0.82" />
          </linearGradient>
        </defs>
        {[28, 64, 100, 136].map((y) => (
          <path
            key={y}
            d={`M0 ${y}H286`}
            stroke="rgba(191, 232, 249, 0.12)"
            strokeDasharray="4 8"
          />
        ))}
        {lines.map((d, i) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke={i === 0 ? "url(#chartFade)" : i === 1 ? "#14b8a6" : "#f59e0b"}
            strokeLinecap="round"
            strokeWidth={i === 0 ? 4 : 3}
          />
        ))}
      </svg>
    </div>
  );
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg border border-cyan-200/15 bg-cyan-100/10 text-cyan-200 shadow-[0_0_34px_rgba(34,211,238,0.14)]">
      {children}
    </div>
  );
}

export function CyberneticBentoGrid({
  className,
  headingId,
}: {
  className?: string;
  headingId?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6", className)}>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">
          Features
        </p>
        <h2
          id={headingId}
          className="mt-3 font-display text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl"
        >
          Core features for clearer pond decisions.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-cyan-50/68 sm:text-base">
          Acqua Lence brings live water readings, alerts, field actions, and private farm records
          into one calm workspace for fish and shrimp operations.
        </p>
      </div>

      <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[minmax(180px,auto)] lg:mt-12">
        <BentoItem className="md:col-span-2 md:row-span-2" glow="oklch(0.72 0.14 205 / 0.32)">
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <IconFrame>
                <Activity className="h-5 w-5" />
              </IconFrame>
              <h3 className="text-2xl font-bold tracking-tight text-white">Live pond analytics</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-cyan-50/62">
                Track dissolved oxygen, pH, temperature, turbidity, salinity, ammonia, battery, and
                signal health as the pond changes.
              </p>
            </div>
            <MiniChart />
          </div>
        </BentoItem>

        <BentoItem glow="oklch(0.68 0.15 35 / 0.28)">
          <IconFrame>
            <BellRing className="h-5 w-5" />
          </IconFrame>
          <h3 className="text-xl font-bold text-white">Critical alerts</h3>
          <p className="mt-2 text-sm leading-6 text-cyan-50/62">
            Low oxygen, high turbidity, offline devices, and calibration warnings surface before
            harvest risk builds.
          </p>
        </BentoItem>

        <BentoItem glow="oklch(0.76 0.13 150 / 0.26)">
          <IconFrame>
            <Languages className="h-5 w-5" />
          </IconFrame>
          <h3 className="text-xl font-bold text-white">Bangla + English actions</h3>
          <p className="mt-2 text-sm leading-6 text-cyan-50/62">
            Field teams get practical next steps in the language they use during daily pond work.
          </p>
        </BentoItem>

        <BentoItem className="md:row-span-2" glow="oklch(0.78 0.13 92 / 0.24)">
          <div className="flex h-full flex-col">
            <IconFrame>
              <SunMedium className="h-5 w-5" />
            </IconFrame>
            <h3 className="text-xl font-bold text-white">Solar buoy status</h3>
            <p className="mt-2 text-sm leading-6 text-cyan-50/62">
              Know which device is healthy, low battery, offline, or due for maintenance.
            </p>
            <div className="mt-auto space-y-3 pt-5">
              {[
                ["AQ-188", "Online", "96%"],
                ["AQ-204", "Watch", "61%"],
                ["AQ-311", "Offline", "0%"],
              ].map(([id, state, charge]) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-white">{id}</span>
                  <span className={state === "Offline" ? "text-rose-200" : "text-cyan-100/70"}>
                    {state}
                  </span>
                  <span className="font-semibold text-cyan-200">{charge}</span>
                </div>
              ))}
            </div>
          </div>
        </BentoItem>

        <BentoItem className="md:col-span-2" glow="oklch(0.7 0.12 230 / 0.26)">
          <div className="grid h-full gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <IconFrame>
                <LayoutDashboard className="h-5 w-5" />
              </IconFrame>
              <h3 className="text-xl font-bold text-white">Manager dashboard</h3>
              <p className="mt-2 text-sm leading-6 text-cyan-50/62">
                Compare ponds, farms, alerts, maintenance, and reports without turning field data
                into spreadsheet work.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:w-44">
              {["Ponds", "Alerts", "Reports", "Devices"].map((label) => (
                <div
                  key={label}
                  className="rounded-md border border-cyan-100/10 bg-cyan-100/[0.06] px-3 py-3 text-center text-xs font-semibold text-cyan-50/75"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </BentoItem>

        <BentoItem glow="oklch(0.72 0.11 205 / 0.24)">
          <IconFrame>
            <RadioTower className="h-5 w-5" />
          </IconFrame>
          <h3 className="text-xl font-bold text-white">Sensor-ready setup</h3>
          <p className="mt-2 text-sm leading-6 text-cyan-50/62">
            Add DO, pH, temperature, turbidity, salinity, ammonia, and water-level modules as farms
            grow.
          </p>
        </BentoItem>

        <BentoItem glow="oklch(0.72 0.10 260 / 0.24)">
          <div className="flex items-start justify-between gap-3">
            <IconFrame>
              <LockKeyhole className="h-5 w-5" />
            </IconFrame>
            <ShieldCheck className="h-5 w-5 text-emerald-200/80" />
          </div>
          <h3 className="text-xl font-bold text-white">Private farm records</h3>
          <p className="mt-2 text-sm leading-6 text-cyan-50/62">
            User-owned records keep each team focused on only the farms, files, and actions they are
            allowed to see.
          </p>
        </BentoItem>
      </div>
    </div>
  );
}
