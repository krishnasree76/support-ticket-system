import { ArrowRight, History, Pencil, PlusCircle, RefreshCw, UserCheck } from 'lucide-react';
import { PriorityBadge, StatusBadge } from './Badges';
import { EmptyState } from './States';
import { formatDateTime, formatRelative } from '../utils/format';

const FIELD_LABELS = { title: 'Title', description: 'Description', priority: 'Priority', category: 'Category' };

const EVENT_STYLES = {
  created: { icon: PlusCircle, className: 'bg-indigo-50 text-indigo-600' },
  status_changed: { icon: RefreshCw, className: 'bg-blue-50 text-blue-600' },
  assigned: { icon: UserCheck, className: 'bg-emerald-50 text-emerald-600' },
  updated: { icon: Pencil, className: 'bg-slate-100 text-slate-600' },
};

function FieldChange({ field, from, to }) {
  if (field === 'description') {
    return <li>Description was edited</li>;
  }
  if (field === 'priority') {
    return (
      <li className="flex flex-wrap items-center gap-1.5">
        Priority <PriorityBadge priority={from} /> <ArrowRight className="size-3 text-slate-400" aria-label="to" />
        <PriorityBadge priority={to} />
      </li>
    );
  }
  return (
    <li>
      {FIELD_LABELS[field] || field}: <span className="text-slate-400 line-through">{from}</span>{' '}
      <ArrowRight className="inline size-3 text-slate-400" aria-label="to" /> <span className="text-slate-800">{to}</span>
    </li>
  );
}

function describe(event) {
  const { type, details } = event;
  switch (type) {
    case 'created':
      return {
        title: 'Ticket created',
        body: (
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={details.status || 'Open'} />
            {details.priority && <PriorityBadge priority={details.priority} />}
            <span>{details.assignee ? `assigned to ${details.assignee.name}` : 'unassigned'}</span>
          </div>
        ),
      };
    case 'status_changed':
      return {
        title: 'Status changed',
        body: (
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={details.from} />
            <ArrowRight className="size-3.5 text-slate-400" aria-label="to" />
            <StatusBadge status={details.to} />
          </div>
        ),
      };
    case 'assigned': {
      let title;
      if (!details.from && details.to) title = `Assigned to ${details.to.name}`;
      else if (details.from && !details.to) title = `Unassigned from ${details.from.name}`;
      else title = `Reassigned from ${details.from?.name} to ${details.to?.name}`;
      return { title, body: null };
    }
    case 'updated':
      return {
        title: 'Details updated',
        body: (
          <ul className="space-y-1">
            {Object.entries(details.changes || {}).map(([field, change]) => (
              <FieldChange key={field} field={field} from={change.from} to={change.to} />
            ))}
          </ul>
        ),
      };
    default:
      return { title: type, body: null };
  }
}

// Vertical timeline, newest event first (matches the API order).
export default function ActivityTimeline({ events }) {
  if (!events || events.length === 0) {
    return <EmptyState icon={History} title="No activity yet" message="Changes to this ticket will appear here." />;
  }

  return (
    <ol className="relative">
      {events.map((event, index) => {
        const style = EVENT_STYLES[event.type] || EVENT_STYLES.updated;
        const Icon = style.icon;
        const { title, body } = describe(event);
        const isLast = index === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && <span className="absolute top-8 bottom-0 left-4 w-px bg-slate-200" aria-hidden="true" />}
            <div className={`relative flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${style.className}`}>
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-medium text-slate-900">{title}</p>
                <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)} className="text-xs text-slate-500">
                  {formatDateTime(event.createdAt)} · {formatRelative(event.createdAt)}
                </time>
              </div>
              {body && <div className="mt-1.5 text-sm text-slate-600">{body}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
