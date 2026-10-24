import { AlertCircle, Inbox, Loader2, RotateCw } from 'lucide-react';
import Button from './Button';

// Loading, empty and error states shared by every page.

export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 py-10 text-sm text-slate-500 ${className}`}>
      <Loader2 className="size-5 animate-spin text-indigo-500" aria-hidden="true" />
      {label}
    </div>
  );
}

export function Skeleton({ className = '', ...props }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} aria-hidden="true" {...props} />;
}

export function LoadingState({ rows = 5 }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="size-6 text-slate-400" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorMessage({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-50">
        <AlertCircle className="size-6 text-red-500" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RotateCw} onClick={onRetry} className="mt-5">
          Try again
        </Button>
      )}
    </div>
  );
}
