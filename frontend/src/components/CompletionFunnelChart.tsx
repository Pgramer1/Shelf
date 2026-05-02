import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Status, UserMedia } from '../types';

interface CompletionFunnelChartProps {
  allData: UserMedia[];
}

const PLAN_STATUSES = new Set([Status.PLAN_TO_WATCH, Status.PLAN_TO_READ, Status.PLAN_TO_PLAY]);
const ACTIVE_STATUSES = new Set([Status.WATCHING, Status.READING, Status.PLAYING, Status.ON_HOLD]);
type FunnelStage = 'Planned' | 'In Progress' | 'Completed';

const CompletionFunnelChart: React.FC<CompletionFunnelChartProps> = ({ allData }) => {
  const [activeStage, setActiveStage] = useState<FunnelStage>('In Progress');

  const data = useMemo(() => {
    let planned = 0;
    let active = 0;
    let completed = 0;
    let dropped = 0;

    for (const item of allData) {
      if (PLAN_STATUSES.has(item.status)) {
        planned += 1;
      } else if (ACTIVE_STATUSES.has(item.status)) {
        active += 1;
      } else if (item.status === Status.COMPLETED) {
        completed += 1;
      } else if (item.status === Status.DROPPED) {
        dropped += 1;
      }
    }

    const total = Math.max(1, allData.length);
    return {
      planned,
      active,
      completed,
      dropped,
      total,
      completionRate: (completed / total) * 100,
      activeToCompleteRate: completed > 0 ? (completed / Math.max(1, active + completed)) * 100 : 0,
    };
  }, [allData]);

  const rows = useMemo(
    () => [
      { label: 'Planned' as FunnelStage, count: data.planned, fill: 'var(--chart-text)' },
      { label: 'In Progress' as FunnelStage, count: data.active, fill: 'var(--chart-1)' },
      { label: 'Completed' as FunnelStage, count: data.completed, fill: 'var(--chart-2)' },
    ],
    [data.active, data.completed, data.planned]
  );

  const activeRow = rows.find((row) => row.label === activeStage) ?? rows[0];
  const activeShare = (activeRow.count / data.total) * 100;

  return (
    <div className="insight-card insight-card-enter h-full">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Completion Funnel</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">From backlog to finished titles</p>

      <div className="insight-detail-panel mb-4">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Selected Stage</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {activeRow.label}: {activeRow.count} title{activeRow.count === 1 ? '' : 's'} ({activeShare.toFixed(1)}% of shelf)
        </p>
      </div>

      <div className="h-56 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(18, 78, 102, 0.18)' }}
              contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', color: 'var(--chart-tooltip-text)' }}
              labelStyle={{ color: 'var(--chart-tooltip-text)' }}
              itemStyle={{ color: 'var(--chart-tooltip-text)' }}
              formatter={(value: number | string) => [`${Number(value)} title${Number(value) === 1 ? '' : 's'}`, 'Count']}
            />
            <Bar dataKey="count" radius={[10, 10, 0, 0]}>
              {rows.map((row) => (
                <Cell key={row.label} fill={row.fill} opacity={activeStage === row.label ? 1 : 0.6} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {rows.map((row) => {
          const isActive = row.label === activeStage;
          return (
            <button
              type="button"
              key={row.label}
              onMouseEnter={() => setActiveStage(row.label)}
              onFocus={() => setActiveStage(row.label)}
              onClick={() => setActiveStage(row.label)}
              className={`w-full text-left rounded-lg px-3 py-2 border transition ${isActive ? 'border-primary/70 bg-gray-100 dark:bg-primary/20 dark:border-primary/60' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-surface-hover'}`}
            >
              <div className="text-xs">
                <p className={`font-medium ${isActive ? 'text-dark dark:text-light' : 'text-gray-700 dark:text-gray-300'}`}>{row.label}</p>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">{row.count} title{row.count === 1 ? '' : 's'}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-100 dark:bg-surface-hover px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Completion Rate</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{data.completionRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-gray-100 dark:bg-surface-hover px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Dropped</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{data.dropped}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Active-to-complete conversion: <span className="font-medium text-gray-700 dark:text-gray-300">{data.activeToCompleteRate.toFixed(1)}%</span>
      </p>
    </div>
  );
};

export default CompletionFunnelChart;
