import { useId, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Table2 } from 'lucide-react';
import { EmptyState, Skeleton } from './States';

const AXIS_TEXT = '#64748b'; // slate-500
const GRID = '#e2e8f0'; // slate-200

function ChartTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const { name, count } = payload[0].payload;
  const share = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-slate-900">{name}</p>
      <p className="text-slate-500">
        <span className="font-semibold text-slate-900 tabular-nums">{count}</span> tickets · {share}%
      </p>
    </div>
  );
}

// Horizontal bar chart of ticket counts per category (status or priority),
// with direct value labels, a hover tooltip, and an accessible table view.
// `colors` is one colour per bar, in the same order as `data`.
export default function DistributionChart({ title, description, data, colors, loading }) {
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();
  const rows = data || [];
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="card flex flex-col" aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 id={headingId} className="text-sm font-semibold text-slate-900">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          disabled={loading || total === 0}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          aria-pressed={showTable}
        >
          {showTable ? <BarChart3 className="size-3.5" aria-hidden="true" /> : <Table2 className="size-3.5" aria-hidden="true" />}
          {showTable ? 'Chart' : 'Table'}
        </button>
      </div>

      <div className="flex-1 px-5 py-4">
        {loading ? (
          <div className="space-y-4 py-2">
            {[80, 55, 65, 35].map((w) => (
              <Skeleton key={w} className="h-6" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState title="No tickets in this period" message="Try widening the date range." />
        ) : showTable ? (
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                <th scope="col" className="py-2 font-medium">Name</th>
                <th scope="col" className="py-2 text-right font-medium">Tickets</th>
                <th scope="col" className="py-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row" className="py-2 text-left font-normal text-slate-700">{row.name}</th>
                  <td className="py-2 text-right font-medium text-slate-900 tabular-nums">{row.count}</td>
                  <td className="py-2 text-right text-slate-500 tabular-nums">{Math.round((row.count / total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="h-56" role="img" aria-label={`${title}: ${rows.map((r) => `${r.name} ${r.count}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap="28%">
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fill: '#334155', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: '#f1f5f9' }} content={<ChartTooltip total={total} />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28} isAnimationActive={false}>
                  {rows.map((row, index) => (
                    <Cell key={row.name} fill={colors[index % colors.length]} />
                  ))}
                  <LabelList dataKey="count" position="right" fill="#0f172a" fontSize={12} fontWeight={600} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
