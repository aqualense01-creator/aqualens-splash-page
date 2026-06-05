import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Admin · System Settings — Acqua Lence" }] }),
  component: AdminSettings,
});

const defaults = [
  { param: "Dissolved oxygen", warn: "< 4.0 mg/L", critical: "< 3.0 mg/L", unit: "mg/L" },
  { param: "pH", warn: "< 6.5 or > 8.5", critical: "< 6.0 or > 9.0", unit: "pH" },
  { param: "Temperature", warn: "< 24 or > 32 °C", critical: "< 20 or > 35 °C", unit: "°C" },
  { param: "Ammonia", warn: "> 0.5 mg/L", critical: "> 1.0 mg/L", unit: "mg/L" },
  { param: "Salinity (shrimp)", warn: "< 10 or > 25 ppt", critical: "< 5 or > 30 ppt", unit: "ppt" },
  { param: "Turbidity", warn: "> 80 NTU", critical: "> 150 NTU", unit: "NTU" },
];

function AdminSettings() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="System settings" subtitle="Default thresholds and platform configuration" />

      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Default sensor thresholds</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Parameter</th>
                <th className="px-4 py-3">Warning</th>
                <th className="px-4 py-3">Critical</th>
                <th className="px-4 py-3">Unit</th>
              </tr>
            </thead>
            <tbody>
              {defaults.map((d) => (
                <tr key={d.param} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{d.param}</td>
                  <td className="px-4 py-3 text-amber-700">{d.warn}</td>
                  <td className="px-4 py-3 text-rose-700">{d.critical}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Per-pond thresholds override these defaults. Edit at <span className="font-mono">/app/ponds/:pondId</span>.
        </p>
      </div>
    </div>
  );
}
