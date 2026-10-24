import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import Button from './Button';
import { useAppData } from '../context/AppDataContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

function FilterSelect({ id, label, value, onChange, children }) {
  return (
    <div className="min-w-0 xl:min-w-[9.5rem] xl:flex-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input h-9 py-1.5">
        {children}
      </select>
    </div>
  );
}

// Search box + dropdown filters. All filtering happens on the server; this
// component only edits the query stored in the URL.
export default function TicketFilters({ query, onChange, onClear, activeFilterCount }) {
  const { meta, assignees } = useAppData();
  const [search, setSearch] = useState(query.search);
  const debouncedSearch = useDebouncedValue(search);

  // URL changed elsewhere (e.g. global search, Clear filters): sync the input.
  useEffect(() => setSearch(query.search), [query.search]);

  useEffect(() => {
    if (debouncedSearch.trim() !== query.search) onChange({ search: debouncedSearch.trim() });
    // Only react to the debounced text, not to every query change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center">
      <div className="relative flex-1 xl:max-w-sm">
        <label htmlFor="ticket-search" className="sr-only">
          Search tickets
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="ticket-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or description…"
          className="input h-9 pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:flex xl:flex-1">
        <FilterSelect id="filter-status" label="Filter by status" value={query.status} onChange={(status) => onChange({ status })}>
          <option value="">All statuses</option>
          {(meta?.statuses || []).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </FilterSelect>
        <FilterSelect id="filter-priority" label="Filter by priority" value={query.priority} onChange={(priority) => onChange({ priority })}>
          <option value="">All priorities</option>
          {(meta?.priorities || []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </FilterSelect>
        <FilterSelect id="filter-category" label="Filter by category" value={query.category} onChange={(category) => onChange({ category })}>
          <option value="">All categories</option>
          {(meta?.categories || []).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FilterSelect>
        <FilterSelect id="filter-assignee" label="Filter by assignee" value={query.assigneeId} onChange={(assigneeId) => onChange({ assigneeId })}>
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </FilterSelect>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="md" icon={X} onClick={onClear} className="self-start xl:self-auto">
          Clear filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
