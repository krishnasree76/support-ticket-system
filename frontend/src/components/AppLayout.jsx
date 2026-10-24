import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, Plus, Search, X } from 'lucide-react';
import Sidebar, { Brand } from './Sidebar';
import Button from './Button';
import { useTicketForm } from '../context/TicketFormContext';

// Global search: submitting jumps to the Tickets page with ?search=...
function GlobalSearch() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const [value, setValue] = useState('');

  // Keep the box in sync with the URL when already on the Tickets page.
  useEffect(() => {
    setValue(location.pathname === '/tickets' ? params.get('search') || '' : '');
  }, [location.pathname, params]);

  const onSubmit = (event) => {
    event.preventDefault();
    const next = new URLSearchParams(location.pathname === '/tickets' ? params : undefined);
    if (value.trim()) next.set('search', value.trim());
    else next.delete('search');
    next.delete('page');
    navigate(`/tickets?${next.toString()}`);
  };

  return (
    <form role="search" onSubmit={onSubmit} className="relative w-full max-w-md">
      <label htmlFor="global-search" className="sr-only">
        Search tickets
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        id="global-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search tickets by title or description…"
        className="input h-9 pl-9"
      />
    </form>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openCreate } = useTicketForm();
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="relative h-full w-72 max-w-[85vw] bg-white shadow-xl" aria-label="Navigation">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 rounded-md p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="-ml-1 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden flex-1 md:block">
              <GlobalSearch />
            </div>
            <div className="ml-auto">
              <Button icon={Plus} onClick={openCreate}>
                <span className="hidden sm:inline">Create ticket</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
