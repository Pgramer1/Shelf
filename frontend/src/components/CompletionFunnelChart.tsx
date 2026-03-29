import React, { useMemo, useState } from 'react';
import { Status, UserMedia } from '../types';

interface CompletionFunnelChartProps {
  allData: UserMedia[];
}

const PLAN_STATUSES = new Set([Status.PLAN_TO_WATCH, Status.PLAN_TO_READ, Status.PLAN_TO_PLAY]);
const ACTIVE_STATUSES = new Set([Status.WATCHING, Status.READING, Status.PLAYING, Status.ON_HOLD]);

const CompletionFunnelChart: React.FC<CompletionFunnelChartProps> = ({ allData }) => {
  const [activeStage, setActiveStage] = useState<'Planned' | 'In Progress' | 'Completed'>('In Progress');

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

  const rows = [
    { label: 'Planned', count: data.planned, color: 'from-slate-400 to-slate-500' },
    { label: 'In Progress', count: data.active, color: 'from-cyan-400 to-cyan-600' },
    { label: 'Completed', count: data.completed, color: 'from-emerald-400 to-emerald-600' },
  ];

  const maxCount = Math.max(1, ...rows.map((row) => row.count));
  const activeRow = rows.find((row) => row.label === activeStage) ?? rows[0];
  const activeShare = (activeRow.count / data.total) * 100;

  return (
    <div className="insight-card-enter h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Completion Funnel</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">From backlog to finished titles</p>

      <div className="insight-detail-panel mb-4">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Selected Stage</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {activeRow.label}: {activeRow.count} title{activeRow.count === 1 ? '' : 's'} ({activeShare.toFixed(1)}% of shelf)
        </p>
      </div>

      <div className="space-y-3 mb-4">
        {rows.map((row) => {
          const isActive = row.label === activeStage;
          const width = Math.max(8, (row.count / maxCount) * 100);
          return (
            <button
              type="button"
              key={row.label}
              onMouseEnter={() => setActiveStage(row.label as 'Planned' | 'In Progress' | 'Completed')}
              onFocus={() => setActiveStage(row.label as 'Planned' | 'In Progress' | 'Completed')}
              onClick={() => setActiveStage(row.label as 'Planned' | 'In Progress' | 'Completed')}
              className={`w-full text-left space-y-1 rounded-lg px-2 py-1.5 border transition ${isActive ? 'border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${isActive ? 'text-cyan-700 dark:text-cyan-300' : 'text-gray-700 dark:text-gray-300'}`}>{row.label}</span>
                <span className="text-gray-500 dark:text-gray-400">{row.count}</span>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <div
                  className={`h-full rounded-lg bg-gradient-to-r ${row.color} text-white text-xs font-medium flex items-center justify-center`}
                  style={{ width: `${width}%` }}
                >
                  {row.count}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Completion Rate</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{data.completionRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2">
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
