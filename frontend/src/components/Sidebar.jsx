import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LifeBuoy, Ticket, Info } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
];

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
        <LifeBuoy className="size-4.5 text-white" aria-hidden="true" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-slate-900">Supportdesk</p>
        <p className="text-xs text-slate-500">Ticket management</p>
      </div>
    </div>
  );
}

// Used by both the fixed desktop sidebar and the mobile drawer.
export default function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-slate-200 px-5">
        <Brand />
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
        <p className="px-2 pb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">Workspace</p>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`size-4.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} aria-hidden="true" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-slate-500">
            Demo workspace. Authentication is not enabled, so all visitors share the same data.
          </p>
        </div>
      </div>
    </div>
  );
}
