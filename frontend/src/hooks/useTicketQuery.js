import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const DEFAULT_QUERY = {
  search: '',
  status: '',
  priority: '',
  category: '',
  assigneeId: '',
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  order: 'desc',
};

const FILTER_KEYS = ['search', 'status', 'priority', 'category', 'assigneeId'];

// Remembers the list's last query string so "Back to tickets" on the details
// page returns to the same filtered, sorted page.
let lastListSearch = '';
export const ticketsListPath = () => (lastListSearch ? `/tickets?${lastListSearch}` : '/tickets');

// Keeps the ticket list's filters, sorting and paging in the URL. This means
// filters survive navigating to a ticket and back, and links can be shared.
export function useTicketQuery() {
  const [params, setParams] = useSearchParams();
  lastListSearch = params.toString();

  const query = useMemo(() => {
    const read = (key) => params.get(key) ?? DEFAULT_QUERY[key];
    return {
      search: read('search'),
      status: read('status'),
      priority: read('priority'),
      category: read('category'),
      assigneeId: read('assigneeId'),
      page: Math.max(1, Number(read('page')) || 1),
      limit: Number(read('limit')) || DEFAULT_QUERY.limit,
      sortBy: read('sortBy'),
      order: read('order') === 'asc' ? 'asc' : 'desc',
    };
  }, [params]);

  // Merges `changes` into the URL. Any filter change resets to page 1.
  const update = useCallback(
    (changes) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          const resetsPage = Object.keys(changes).some((key) => key !== 'page');
          for (const [key, value] of Object.entries(changes)) {
            if (value === '' || value == null || String(value) === String(DEFAULT_QUERY[key])) next.delete(key);
            else next.set(key, String(value));
          }
          if (resetsPage && !('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const clearFilters = useCallback(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        FILTER_KEYS.forEach((key) => next.delete(key));
        next.delete('page');
        return next;
      },
      { replace: true }
    );
  }, [setParams]);

  const activeFilterCount = FILTER_KEYS.filter((key) => query[key] !== '').length;

  return { query, update, clearFilters, activeFilterCount };
}
