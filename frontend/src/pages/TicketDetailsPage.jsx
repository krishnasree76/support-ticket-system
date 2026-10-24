import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileQuestion, Lock, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import ActivityTimeline from '../components/ActivityTimeline';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { EmptyState, ErrorMessage, LoadingState, Skeleton, Spinner } from '../components/States';
import { ticketsApi } from '../api/tickets';
import { getErrorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useDeleteTicket } from '../hooks/useDeleteTicket';
import { ticketsListPath } from '../hooks/useTicketQuery';
import { useAppData } from '../context/AppDataContext';
import { useTicketForm } from '../context/TicketFormContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, formatRelative } from '../utils/format';

function Property({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function Card({ title, description, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export default function TicketDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { meta, assignees, dataVersion, notifyTicketsChanged } = useAppData();
  const { openEdit } = useTicketForm();
  const { requestDelete, dialog } = useDeleteTicket(() => navigate(ticketsListPath()));
  const [pendingStatus, setPendingStatus] = useState(null);
  const [savingAssignee, setSavingAssignee] = useState(false);

  // All three refetch together after any successful mutation.
  const ticketReq = useApi((signal) => ticketsApi.get(id, { signal }), [id, dataVersion]);
  const activityReq = useApi((signal) => ticketsApi.activity(id, { signal }), [id, dataVersion]);
  const historyReq = useApi((signal) => ticketsApi.history(id, { signal }), [id, dataVersion]);

  const ticket = ticketReq.data;
  const backLink = (
    <Link to={ticketsListPath()} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ArrowLeft className="size-4" aria-hidden="true" /> Back to tickets
    </Link>
  );

  if (ticketReq.error) {
    const notFound = ticketReq.errorStatus === 404 || ticketReq.errorStatus === 400;
    return (
      <>
        <div className="mb-6">{backLink}</div>
        <div className="card">
          {notFound ? (
            <EmptyState
              icon={FileQuestion}
              title="Ticket not found"
              message="This ticket may have been deleted, or the link is incorrect."
              action={<Link to="/tickets" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all tickets</Link>}
            />
          ) : (
            <ErrorMessage title="Could not load this ticket" message={ticketReq.error} onRetry={ticketReq.reload} />
          )}
        </div>
      </>
    );
  }

  if (!ticket || String(ticket.id) !== String(id)) {
    return (
      <>
        <div className="mb-6">{backLink}</div>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/3" />
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2"><LoadingState rows={4} /></div>
          <div className="card"><LoadingState rows={4} /></div>
        </div>
      </>
    );
  }

  const nextStatuses = meta?.statusTransitions?.[ticket.status] || [];

  const changeStatus = async (status) => {
    setPendingStatus(status);
    try {
      await ticketsApi.updateStatus(ticket.id, status);
      toast.success(`Status changed to ${status}.`);
      notifyTicketsChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPendingStatus(null);
    }
  };

  const changeAssignee = async (event) => {
    const value = event.target.value;
    setSavingAssignee(true);
    try {
      const updated = await ticketsApi.update(ticket.id, { assigneeId: value ? Number(value) : null });
      toast.success(updated.assignee ? `Assigned to ${updated.assignee.name}.` : 'Ticket unassigned.');
      notifyTicketsChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingAssignee(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={backLink}
        title={ticket.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-600">#{ticket.id}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span>· Opened {formatRelative(ticket.createdAt)}</span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => openEdit(ticket)}>
              Edit
            </Button>
            <Button variant="dangerOutline" icon={Trash2} onClick={() => requestDelete(ticket)}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Description">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{ticket.description}</p>
          </Card>

          <Card title="Activity timeline" description="Every change to this ticket, newest first">
            {activityReq.error ? (
              <ErrorMessage message={activityReq.error} onRetry={activityReq.reload} />
            ) : !activityReq.data ? (
              <Spinner label="Loading activity…" />
            ) : (
              <ActivityTimeline events={activityReq.data} />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Workflow">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Current status</p>
            <div className="mt-2"><StatusBadge status={ticket.status} /></div>

            <p className="mt-5 text-xs font-medium tracking-wide text-slate-500 uppercase">Move to</p>
            {nextStatuses.length === 0 ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                <Lock className="size-4" aria-hidden="true" /> Closed tickets cannot change status.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {nextStatuses.map((status) => (
                  <Button
                    key={status}
                    variant={status === 'Resolved' || status === 'Closed' ? 'primary' : 'secondary'}
                    size="sm"
                    icon={ArrowRight}
                    loading={pendingStatus === status}
                    disabled={Boolean(pendingStatus)}
                    onClick={() => changeStatus(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            )}

            <div className="mt-5">
              <label htmlFor="assignee-select" className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Assignee
              </label>
              <select
                id="assignee-select"
                className="input mt-2"
                value={ticket.assigneeId ?? ''}
                onChange={changeAssignee}
                disabled={savingAssignee}
              >
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Card title="Details">
            <dl className="-my-3 divide-y divide-slate-100">
              <Property label="Priority"><PriorityBadge priority={ticket.priority} /></Property>
              <Property label="Category">{ticket.category}</Property>
              <Property label="Assignee">{ticket.assignee ? ticket.assignee.name : <span className="text-slate-400">Unassigned</span>}</Property>
              <Property label="Created">{formatDateTime(ticket.createdAt)}</Property>
              <Property label="Last updated">{formatDateTime(ticket.updatedAt)}</Property>
            </dl>
          </Card>

          <Card title="Status history" description="Recorded on every status change">
            {historyReq.error ? (
              <ErrorMessage message={historyReq.error} onRetry={historyReq.reload} />
            ) : !historyReq.data ? (
              <Spinner label="Loading history…" />
            ) : historyReq.data.length === 0 ? (
              <p className="text-sm text-slate-500">No status changes yet. The ticket is still in its initial status.</p>
            ) : (
              <ol className="space-y-3">
                {historyReq.data.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={entry.previousStatus} />
                      <ArrowRight className="size-3.5 text-slate-400" aria-label="to" />
                      <StatusBadge status={entry.newStatus} />
                    </div>
                    <time dateTime={entry.changedAt} className="mt-1 block text-xs text-slate-500">
                      {formatDateTime(entry.changedAt)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      {dialog}
    </>
  );
}
