import { LineChart, Bell, FileText, Users, Plug } from "lucide-react";
import { LineChart as RLineChart, Line, ResponsiveContainer } from "recharts";

const features = [
  { icon: LineChart, title: "Advanced Analytics", sub: "AI powered insights & predictions" },
  { icon: Bell, title: "Smart Alerts", sub: "Instant notifications on critical changes" },
  { icon: FileText, title: "Reports", sub: "Downloadable reports & data exports" },
  { icon: Users, title: "Team Access", sub: "Multi-user access & role management" },
  { icon: Plug, title: "API Integration", sub: "Seamless integration with your systems" },
];

const miniData = Array.from({ length: 14 }, (_, i) => ({
  x: i,
  y: 50 + Math.sin(i / 1.6) * 18 + Math.random() * 4,
}));

export function Platform() {
  return (
    <section className="relative overflow-hidden bg-navy py-20 text-navy-foreground sm:py-24">
      <div className="absolute inset-0 bg-navy-grid opacity-50" />
      <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary backdrop-blur">
            Powerful Software Platform
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-balance sm:text-4xl md:text-5xl">
            Data That Drives Growth
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/70">
            Our cloud platform helps you visualize data, set alerts, analyze trends and make smarter
            decisions to improve productivity.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 md:mt-10 lg:grid-cols-5">
            {features.map(({ icon: Icon, title, sub }) => (
              <div key={title}>
                <Icon className="h-5 w-5 text-primary" />
                <p className="mt-3 text-xs font-semibold">{title}</p>
                <p className="mt-1 text-[10px] leading-snug text-white/60">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-end justify-end gap-4">
          {/* Laptop */}
          <div className="relative w-full max-w-[480px]">
            <div className="rounded-t-xl border-x-4 border-t-4 border-white/10 bg-white p-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                </div>
                <span className="text-[10px] text-muted-foreground">acqualence.app</span>
                <span />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-foreground">
                <div className="aspect-video rounded-md bg-primary/10 p-2">
                  <p className="text-[9px] text-primary">Map</p>
                  <div className="mt-1 h-12 rounded bg-[radial-gradient(circle_at_30%_40%,oklch(0.66_0.11_210)/30%,transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.66_0.11_210)/20%,transparent_50%)] bg-surface" />
                </div>
                <div className="col-span-2 rounded-md bg-surface p-2">
                  <p className="text-[9px] text-muted-foreground">DO Trend</p>
                  <div className="h-14">
                    <ResponsiveContainer width="100%" height="100%">
                      <RLineChart data={miniData}>
                        <Line
                          type="monotone"
                          dataKey="y"
                          stroke="oklch(0.66 0.11 210)"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </RLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="col-span-3 rounded-md bg-surface p-2">
                  <div className="space-y-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between text-[9px]">
                        <span>Pond {i}</span>
                        <span className="text-primary">Healthy</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="h-2 rounded-b-xl bg-white/20" />
          </div>
          {/* Phone */}
          <div className="absolute -bottom-2 right-0 hidden w-32 rounded-2xl border-4 border-white/10 bg-white p-2 shadow-2xl md:block">
            <div className="rounded-lg bg-surface p-2">
              <p className="text-[8px] font-semibold text-foreground">Live</p>
              <div className="mt-1 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={miniData}>
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke="oklch(0.66 0.11 210)"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </RLineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 space-y-0.5">
                {["DO 6.4", "pH 7.3", "T 28.6"].map((t) => (
                  <p key={t} className="text-[8px] text-muted-foreground">
                    {t}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
