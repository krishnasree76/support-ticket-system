import { CalendarDays } from 'lucide-react';
import { toDateInputValue } from '../utils/format';

const PRESETS = [
  { id: 'all', label: 'All time', days: null },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: 'custom', label: 'Custom range', days: null },
];

// Converts a preset into concrete YYYY-MM-DD dates (inclusive of today).
function rangeForPreset(presetId) {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset?.days) return { startDate: '', endDate: '' };
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (preset.days - 1));
  return { startDate: toDateInputValue(start), endDate: toDateInputValue(end) };
}

export default function DateRangeFilter({ value, onChange, error }) {
  const { preset, startDate, endDate } = value;

  const setPreset = (presetId) => {
    if (presetId === 'custom') onChange({ ...value, preset: 'custom' });
    else onChange({ preset: presetId, ...rangeForPreset(presetId) });
  };

  const setDate = (field) => (event) => onChange({ ...value, preset: 'custom', [field]: event.target.value });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="range-preset" className="sr-only">
          Date range
        </label>
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <select id="range-preset" value={preset} onChange={(e) => setPreset(e.target.value)} className="input h-9 w-auto py-1.5 pl-9">
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="range-start" className="sr-only">
            Start date
          </label>
          <input
            id="range-start"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={setDate('startDate')}
            className={`input h-9 w-auto py-1.5 ${error ? 'input-error' : ''}`}
            aria-invalid={Boolean(error)}
          />
          <span className="text-sm text-slate-400" aria-hidden="true">to</span>
          <label htmlFor="range-end" className="sr-only">
            End date
          </label>
          <input
            id="range-end"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={setDate('endDate')}
            className={`input h-9 w-auto py-1.5 ${error ? 'input-error' : ''}`}
            aria-invalid={Boolean(error)}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
