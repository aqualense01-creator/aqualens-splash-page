import { CheckCircle2, ArrowRight, LayoutDashboard, Waves, Cpu, Bell, FileText, BarChart, Settings, AlertTriangle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Logo } from "./Logo";

const data = Array.from({ length: 12 }, (_, i) => ({
  t: `${i * 2}:00`,
  do: 6 + Math.sin(i / 2) * 1.5 + Math.random() * 0.5,
  ph: 7.2 + Math.cos(i / 3) * 0.4,
  temp: 28 + Math.sin(i / 4) * 1.2,
  turb: 12 + Math.cos(i / 2) * 2,
}));

const bullets = [
  "Live data & historical trends",
  "Customizable alerts",
  "Multi-pond management",
  "Mobile & desktop access",
];

const metrics = [
  { label: "Dissolved Oxygen", value: "6.42", unit: "mg/L" },
  { label: "pH Level", value: "7.35", unit: "pH" },
  { label: "Temperature", value: "28.6", unit: "°C" },
  { label: "Turbidity", value: "12.4", unit: "NTU" },
  { label: "Salinity", value: "15.2", unit: "ppt" },
];

const sidebar = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Waves, label: "Ponds" },
  { icon: Cpu, label: "Devices" },
  { icon: Bell, label: "Alerts" },
  { icon: FileText, label: "Reports" },
  { icon: BarChart, label: "Analytics" },
  { icon: Settings, label: "Settings" },
];

const alerts = [
  { tone: "text-red-500", label: "Low DO Level", sub: "Pond 3 · 10 min ago" },
  { tone: "text-amber-500", label: "High Temperature", sub: "Pond 1 · 38 min ago" },
  { tone: "text-amber-500", label: "pH Level Fluctuation", sub: "Pond 2 · 1 hr ago" },
];

export function Dashboard() {
  return (
    <section className="bg-surface py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[340px_1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Real-time Monitoring</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Every Parameter.
            <br />
            Every Moment.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Monitor all critical water quality parameters in real time from a single, easy-to-use dashboard.
          </p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" /> {b}
              </li>
            ))}
          </ul>
          <a href="#" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Learn More <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_rgba(15,44,68,0.25)]">
          <div className="grid grid-cols-[180px_1fr]">
            <aside className="border-r border-border bg-surface p-4">
              <Logo />
              <ul className="mt-6 space-y-1">
                {sidebar.map(({ icon: Icon, label, active }) => (
                  <li
                    key={label}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </li>
                ))}
              </ul>
            </aside>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Dashboard</h3>
                <span className="text-xs text-muted-foreground">Pond Group A</span>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {metrics.map((m) => (
                  <div key={m.label} className="rounded-md border border-border/70 p-2">
                    <p className="truncate text-[10px] text-muted-foreground">{m.label}</p>
                    <p className="mt-1 text-base font-bold text-foreground">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.unit}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-[1fr_180px] gap-3">
                <div className="rounded-md border border-border/70 p-3">
                  <p className="text-xs font-medium">Water Quality Trend</p>
                  <div className="mt-2 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                        <XAxis dataKey="t" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="do" stroke="oklch(0.66 0.11 210)" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="ph" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="turb" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-md border border-border/70 p-3">
                  <p className="text-xs font-medium">Active Alerts</p>
                  <ul className="mt-2 space-y-2">
                    {alerts.map((a) => (
                      <li key={a.label} className="flex items-start gap-2">
                        <AlertTriangle className={`mt-0.5 h-3 w-3 ${a.tone}`} />
                        <div>
                          <p className="text-[10px] font-semibold text-foreground">{a.label}</p>
                          <p className="text-[9px] text-muted-foreground">{a.sub}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
