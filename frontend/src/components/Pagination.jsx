import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [10, 20, 50, 100];

// Page numbers with ellipses, e.g. 1 … 4 5 6 … 12
function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push(`gap-${page}`);
    result.push(page);
  });
  return result;
}

export default function Pagination({ pagination, onPageChange, onLimitChange }) {
  const { page, limit, total, totalPages } = pagination;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const navButton = 'inline-flex size-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>
          Showing <span className="font-medium text-slate-700">{from}</span>–
          <span className="font-medium text-slate-700">{to}</span> of{' '}
          <span className="font-medium text-slate-700">{total}</span>
        </span>
        <label htmlFor="page-size" className="sr-only">
          Rows per page
        </label>
        <select
          id="page-size"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="input h-8 w-auto py-1 pr-8 text-sm"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button type="button" className={navButton} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        {pageList(page, Math.max(totalPages, 1)).map((item) =>
          typeof item === 'string' ? (
            <span key={item} className="px-1 text-sm text-slate-400" aria-hidden="true">…</span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium ${
                item === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          className={navButton}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </nav>
    </div>
  );
}
