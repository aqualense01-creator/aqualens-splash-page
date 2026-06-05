import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  good: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  watch: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  critical: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  offline: "bg-muted text-muted-foreground border-border",
  calibration_due: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  online: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  low_battery: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  maintenance_due: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  open: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  acknowledged: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  info: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  suspended: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  in_progress: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  closed: "bg-muted text-muted-foreground border-border",
  waiting_for_farmer: "bg-amber-500/10 text-amber-700 border-amber-500/30",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cls = styles[status] ?? styles.offline;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        cls,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: number | string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-soft">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-3xl font-bold tabular-nums",
          accent ?? "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      {icon && (
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
