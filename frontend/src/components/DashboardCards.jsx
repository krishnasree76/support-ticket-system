import { AlertOctagon, CheckCircle2, CircleDot, Ticket } from 'lucide-react';
import { Skeleton } from './States';

function KpiCard({ label, value, icon: Icon, iconClass, footnote, loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex size-9 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="size-4.5" aria-hidden="true" />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-8 w-20" />
          <Skeleton className="mt-2 h-4 w-32" />
        </>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{footnote}</p>
        </>
      )}
    </div>
  );
}

const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

// The four headline KPIs. All numbers come straight from GET /api/analytics.
export default function DashboardCards({ kpis, loading }) {
  const k = kpis || {};
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total Tickets"
        value={k.totalTickets}
        icon={Ticket}
        iconClass="bg-indigo-50 text-indigo-600"
        footnote={`${k.unassignedTickets ?? 0} unassigned`}
        loading={loading}
      />
      <KpiCard
        label="Open Tickets"
        value={k.openTickets}
        icon={CircleDot}
        iconClass="bg-blue-50 text-blue-600"
        footnote={`${k.inProgressTickets ?? 0} more in progress`}
        loading={loading}
      />
      <KpiCard
        label="Resolved Tickets"
        value={k.resolvedTickets}
        icon={CheckCircle2}
        iconClass="bg-emerald-50 text-emerald-600"
        footnote={`${k.closedTickets ?? 0} closed after resolution`}
        loading={loading}
      />
      <KpiCard
        label="Critical Tickets"
        value={k.criticalTickets}
        icon={AlertOctagon}
        iconClass="bg-red-50 text-red-600"
        footnote={`${percent(k.criticalTickets, k.totalTickets)}% of all tickets`}
        loading={loading}
      />
    </div>
  );
}
