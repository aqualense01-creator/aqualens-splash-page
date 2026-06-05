import { Wifi, WifiOff, BatteryFull, Battery, Clock, FlaskConical, Wrench } from "lucide-react";
import { Reveal } from "./Reveal";
import { statusMeta } from "@/lib/mock-pond";

const devices = [
  {
    id: "AQ-204",
    pond: "Pond 1 · Mirpur",
    status: "good" as const,
    battery: 78,
    signal: 4,
    lastSeen: "4 sec ago",
    calibration: "OK · 12 days",
    maintenance: "Due in 22 days",
  },
  {
    id: "AQ-211",
    pond: "Pond 2 · Mirpur",
    status: "good" as const,
    battery: 64,
    signal: 5,
    lastSeen: "2 sec ago",
    calibration: "Due in 3 days",
    maintenance: "OK",
  },
  {
    id: "AQ-188",
    pond: "Pond 3 · Khulna",
    status: "offline" as const,
    battery: 0,
    signal: 0,
    lastSeen: "14 min ago",
    calibration: "—",
    maintenance: "Check power",
  },
];

export function DeviceHealth() {
  return (
    <section
      className="relative bg-background py-20 sm:py-24"
      aria-labelledby="device-health-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Device Health
          </p>
          <h2
            id="device-health-heading"
            className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl"
          >
            Know when your monitoring device needs attention.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            Battery, signal, calibration and maintenance — all in one view, with proactive alerts.
          </p>
        </Reveal>

        <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="grid grid-cols-12 gap-2 border-b border-border bg-surface/60 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:gap-4">
            <div className="col-span-4 sm:col-span-3">Device</div>
            <div className="col-span-3 sm:col-span-2">Status</div>
            <div className="col-span-5 sm:col-span-2">Battery</div>
            <div className="hidden sm:col-span-1 sm:block">Signal</div>
            <div className="hidden sm:col-span-2 sm:block">Last seen</div>
            <div className="hidden sm:col-span-2 sm:block">Calibration</div>
          </div>
          {devices.map((d) => {
            const m = statusMeta[d.status];
            const offline = d.status === "offline";
            return (
              <div
                key={d.id}
                className="grid grid-cols-12 items-center gap-2 border-b border-border/60 px-4 py-4 text-[13px] last:border-0 sm:gap-4 transition-colors hover:bg-surface/40 cursor-default"
              >
                <div className="col-span-4 sm:col-span-3">
                  <div className="font-semibold text-foreground">{d.id}</div>
                  <div className="text-[11px] text-muted-foreground">{d.pond}</div>
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${m.bg} ${m.text} ${m.ring}`}
                  >
                    {offline ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                    {offline ? "Offline" : "Online"}
                  </span>
                </div>
                <div className="col-span-5 flex items-center gap-2 sm:col-span-2">
                  {d.battery > 50 ? (
                    <BatteryFull className="h-4 w-4 text-status-good" />
                  ) : (
                    <Battery className="h-4 w-4 text-status-warning" />
                  )}
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${d.battery}%`,
                        background:
                          d.battery > 50
                            ? "var(--status-good)"
                            : d.battery > 20
                              ? "var(--status-warning)"
                              : "var(--status-critical)",
                      }}
                    />
                  </div>
                  <span className="tabular-nums text-[11px] text-muted-foreground">
                    {d.battery}%
                  </span>
                </div>
                <div className="hidden sm:col-span-1 sm:flex sm:items-center sm:gap-0.5">
                  {[1, 2, 3, 4, 5].map((b) => (
                    <span
                      key={b}
                      className="h-3 w-1 rounded-sm"
                      style={{
                        background:
                          b <= d.signal
                            ? "var(--primary)"
                            : "color-mix(in oklab, var(--muted-foreground) 25%, transparent)",
                      }}
                    />
                  ))}
                </div>
                <div className="hidden text-[12px] text-muted-foreground sm:col-span-2 sm:flex sm:items-center sm:gap-1">
                  <Clock className="h-3 w-3" /> {d.lastSeen}
                </div>
                <div className="hidden text-[12px] text-muted-foreground sm:col-span-2 sm:flex sm:items-center sm:gap-1">
                  <FlaskConical className="h-3 w-3" /> {d.calibration}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Wrench className="h-3 w-3 text-primary" /> Maintenance reminders sent automatically
          </span>
        </div>
      </div>
    </section>
  );
}
