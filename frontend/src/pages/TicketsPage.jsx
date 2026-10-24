import { useEffect } from 'react';
import { Plus, SearchX } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import TicketFilters from '../components/TicketFilters';
import TicketTable from '../components/TicketTable';
import Pagination from '../components/Pagination';
import Button from '../components/Button';
import { EmptyState, ErrorMessage, LoadingState } from '../components/States';
import { ticketsApi } from '../api/tickets';
import { useApi } from '../hooks/useApi';
import { useTicketQuery } from '../hooks/useTicketQuery';
import { useDeleteTicket } from '../hooks/useDeleteTicket';
import { useAppData } from '../context/AppDataContext';
import { useTicketForm } from '../context/TicketFormContext';

export default function TicketsPage() {
  const { query, update, clearFilters, activeFilterCount } = useTicketQuery();
  const { dataVersion } = useAppData();
  const { openCreate, openEdit } = useTicketForm();
  const { requestDelete, dialog } = useDeleteTicket();

  // One request per distinct query (or after a mutation). Filtering, sorting
  // and paging all happen in PostgreSQL.
  const queryKey = JSON.stringify(query);
  const list = useApi((signal) => ticketsApi.list(query, { signal }), [queryKey, dataVersion]);

  const result = list.data;
  const tickets = result?.data || [];
  const pagination = result?.pagination;

  // If a delete empties the last page (or the URL has a page that is too high), go to the last page.
  const pageTooHigh = Boolean(pagination && pagination.total > 0 && query.page > pagination.totalPages);
  useEffect(() => {
    if (pageTooHigh) update({ page: pagination.totalPages });
  }, [pageTooHigh, pagination, update]);

  let body;
  if (list.error) {
    body = <ErrorMessage title="Could not load tickets" message={list.error} onRetry={list.reload} />;
  } else if (!result) {
    body = <LoadingState rows={8} />;
  } else if (tickets.length === 0) {
    body =
      activeFilterCount > 0 ? (
        <EmptyState
          icon={SearchX}
          title="No tickets match your filters"
          message="Try a different search term or clear the filters to see all tickets."
          action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <EmptyState
          title="No tickets yet"
          message="When customers report issues, create tickets here to track them."
          action={<Button icon={Plus} onClick={openCreate}>Create ticket</Button>}
        />
      );
  } else {
    body = (
      <div className={list.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={list.loading}>
        <TicketTable tickets={tickets} sort={query} onSort={update} onEdit={openEdit} onDelete={requestDelete} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Tickets"
        description={
          pagination
            ? activeFilterCount
              ? `${pagination.total} ${pagination.total === 1 ? 'ticket matches' : 'tickets match'} your filters`
              : `${pagination.total} ${pagination.total === 1 ? 'ticket' : 'tickets'} in total`
            : 'Loading tickets…'
        }
        actions={<Button icon={Plus} onClick={openCreate}>Create ticket</Button>}
      />

      <div className="card overflow-hidden">
        <TicketFilters query={query} onChange={update} onClear={clearFilters} activeFilterCount={activeFilterCount} />
        {body}
        {pagination && pagination.total > 0 && (
          <Pagination
            pagination={pagination}
            onPageChange={(page) => update({ page })}
            onLimitChange={(limit) => update({ limit })}
          />
        )}
      </div>

      {dialog}
    </>
  );
}
