import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DashboardCards from '../components/DashboardCards';
import DistributionChart from '../components/DistributionChart';
import DateRangeFilter from '../components/DateRangeFilter';
import TicketTable from '../components/TicketTable';
import Button from '../components/Button';
import { EmptyState, ErrorMessage, LoadingState } from '../components/States';
import { analyticsApi, ticketsApi } from '../api/tickets';
import { useApi } from '../hooks/useApi';
import { useAppData } from '../context/AppDataContext';
import { useTicketForm } from '../context/TicketFormContext';
import { browserTimeZone } from '../utils/format';

// Status bars share one hue (they are one series). Priority is ordinal, so it
// uses a light-to-dark ramp of the same blue: darker = more severe.
const STATUS_COLORS = ['#2a78d6'];
const PRIORITY_COLORS = ['#86b6ef', '#3987e5', '#256abf', '#104281'];

export default function DashboardPage() {
  const { dataVersion } = useAppData();
  const { openCreate } = useTicketForm();
  const [range, setRange] = useState({ preset: 'all', startDate: '', endDate: '' });

  const rangeError =
    range.startDate && range.endDate && range.startDate > range.endDate ? 'Start date must be on or before the end date.' : null;

  // Analytics refetch when the range changes or after any ticket mutation.
  const analytics = useApi(
    (signal) =>
      rangeError
        ? Promise.resolve(null)
        : analyticsApi.get({ startDate: range.startDate, endDate: range.endDate, timezone: browserTimeZone() }, { signal }),
    [range.startDate, range.endDate, rangeError, dataVersion]
  );

  const recent = useApi(
    (signal) => ticketsApi.list({ limit: 5, sortBy: 'createdAt', order: 'desc' }, { signal }),
    [dataVersion]
  );

  const data = analytics.data;
  const rangeLabel = range.startDate || range.endDate ? 'in the selected range' : 'across all time';

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Ticket volume and workload ${rangeLabel}, by creation date.`}
        actions={<DateRangeFilter value={range} onChange={setRange} error={rangeError} />}
      />

      {analytics.error ? (
        <div className="card">
          <ErrorMessage title="Could not load analytics" message={analytics.error} onRetry={analytics.reload} />
        </div>
      ) : (
        <>
          <DashboardCards kpis={data?.kpis} loading={analytics.loading || !data} />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <DistributionChart
              title="Tickets by status"
              description="Where tickets are in the workflow"
              data={data?.byStatus}
              colors={STATUS_COLORS}
              loading={analytics.loading || !data}
            />
            <DistributionChart
              title="Tickets by priority"
              description="Darker bars are more severe"
              data={data?.byPriority}
              colors={PRIORITY_COLORS}
              loading={analytics.loading || !data}
            />
          </div>
        </>
      )}

      <section className="card mt-6 overflow-hidden" aria-labelledby="recent-heading">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="recent-heading" className="text-sm font-semibold text-slate-900">
              Recent tickets
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">The five most recently created tickets</p>
          </div>
          <Link to="/tickets" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {recent.loading && !recent.data ? (
          <LoadingState rows={5} />
        ) : recent.error ? (
          <ErrorMessage message={recent.error} onRetry={recent.reload} />
        ) : recent.data.data.length === 0 ? (
          <EmptyState
            title="No tickets yet"
            message="Create the first ticket to start tracking support requests."
            action={<Button icon={Plus} onClick={openCreate}>Create ticket</Button>}
          />
        ) : (
          <TicketTable tickets={recent.data.data} compact />
        )}
      </section>
    </>
  );
}
