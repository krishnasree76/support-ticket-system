import { AlertOctagon, ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

// Text colours are the -700 shades on -50 backgrounds: all pass WCAG AA contrast.
const STATUS_STYLES = {
  Open: { className: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-blue-500' },
  'In Progress': { className: 'bg-amber-50 text-amber-800 ring-amber-600/25', dot: 'bg-amber-500' },
  Resolved: { className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  Closed: { className: 'bg-slate-100 text-slate-700 ring-slate-500/20', dot: 'bg-slate-400' },
};

const PRIORITY_STYLES = {
  Low: { className: 'bg-slate-50 text-slate-700 ring-slate-500/20', icon: ArrowDown },
  Medium: { className: 'bg-sky-50 text-sky-700 ring-sky-600/20', icon: ArrowRight },
  High: { className: 'bg-orange-50 text-orange-700 ring-orange-600/20', icon: ArrowUp },
  Critical: { className: 'bg-red-50 text-red-700 ring-red-600/20', icon: AlertOctagon },
};

const base = 'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset';

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Closed;
  return (
    <span className={`${base} ${style.className}`}>
      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.Low;
  const Icon = style.icon;
  return (
    <span className={`${base} ${style.className}`}>
      <Icon className="size-3" aria-hidden="true" />
      {priority}
    </span>
  );
}
