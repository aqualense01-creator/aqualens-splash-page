import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { PageHeader, MetricTile, EmptyState } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Admin · Support — Acqua Lence" }] }),
  component: AdminSupport,
});

function AdminSupport() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Support" subtitle="Tickets raised by farmers and technicians" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricTile label="Open" value={0} />
        <MetricTile label="Waiting on farmer" value={0} accent="text-amber-600" />
        <MetricTile label="In progress" value={0} accent="text-sky-600" />
        <MetricTile label="Resolved (30d)" value={0} accent="text-emerald-600" />
      </div>

      <EmptyState
        icon={<LifeBuoy className="h-6 w-6" />}
        title="No tickets yet"
        description="When farmers or technicians submit support requests, they will appear here for triage and assignment."
      />
    </div>
  );
}
