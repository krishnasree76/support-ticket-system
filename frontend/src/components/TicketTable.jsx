import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react';
import { PriorityBadge, StatusBadge } from './Badges';
import { formatDate, formatRelative, initials } from '../utils/format';

export function AssigneeCell({ assignee }) {
  if (!assignee) return <span className="text-sm text-slate-400">Unassigned</span>;
  return (
    <span className="flex items-center gap-2">
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700"
        aria-hidden="true"
      >
        {initials(assignee.name)}
      </span>
      <span className="truncate text-sm text-slate-700">{assignee.name}</span>
    </span>
  );
}

function SortHeader({ field, label, sort, onSort, className = '' }) {
  const active = sort.sortBy === field;
  const Icon = !active ? ChevronsUpDown : sort.order === 'asc' ? ArrowUp : ArrowDown;
  const nextOrder = active && sort.order === 'desc' ? 'asc' : 'desc';
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 py-3 text-left ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort({ sortBy: field, order: nextOrder })}
        className={`inline-flex items-center gap-1 rounded text-xs font-medium tracking-wide uppercase ${
          active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

function RowActions({ ticket, onEdit, onDelete }) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(ticket)}
        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Edit ticket ${ticket.id}`}
        title="Edit"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(ticket)}
        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        aria-label={`Delete ticket ${ticket.id}`}
        title="Delete"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// Table on medium+ screens, stacked cards on phones.
export default function TicketTable({ tickets, sort, onSort, onEdit, onDelete, compact = false }) {
  const navigate = useNavigate();
  const showActions = Boolean(onEdit && onDelete);
  const sortable = Boolean(onSort);

  const header = (field, label, className) =>
    sortable ? (
      <SortHeader field={field} label={label} sort={sort} onSort={onSort} className={className} />
    ) : (
      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-500 uppercase ${className || ''}`}>
        {label}
      </th>
    );

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/80">
            <tr>
              {header('title', 'Ticket', 'w-[38%]')}
              {header('status', 'Status')}
              {header('priority', 'Priority')}
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                Assignee
              </th>
              {header('createdAt', 'Created')}
              {!compact && header('updatedAt', 'Updated', 'hidden lg:table-cell')}
              {showActions && (
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                onClick={(event) => {
                  if (!event.target.closest('a, button')) navigate(`/tickets/${ticket.id}`);
                }}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="max-w-0 px-4 py-3">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="block truncate text-sm font-medium text-slate-900 hover:text-indigo-600"
                  >
                    {ticket.title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    #{ticket.id} · {ticket.category}
                  </p>
                </td>
                <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                <td className="max-w-[11rem] px-4 py-3"><AssigneeCell assignee={ticket.assignee} /></td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-500" title={ticket.createdAt}>
                  {formatDate(ticket.createdAt)}
                </td>
                {!compact && (
                  <td className="hidden px-4 py-3 text-sm whitespace-nowrap text-slate-500 lg:table-cell">
                    {formatRelative(ticket.updatedAt)}
                  </td>
                )}
                {showActions && (
                  <td className="px-4 py-3">
                    <RowActions ticket={ticket} onEdit={onEdit} onDelete={onDelete} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="flex gap-3 p-4">
            <Link to={`/tickets/${ticket.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{ticket.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                #{ticket.id} · {ticket.category} · {formatDate(ticket.createdAt)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>
              <div className="mt-2">
                <AssigneeCell assignee={ticket.assignee} />
              </div>
            </Link>
            {showActions && <RowActions ticket={ticket} onEdit={onEdit} onDelete={onDelete} />}
          </li>
        ))}
      </ul>
    </>
  );
}
