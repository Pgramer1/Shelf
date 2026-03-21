import React, { useMemo, useState } from 'react';
import { UserMedia, Status } from '../types';

interface ActivityHeatmapProps {
  allData: UserMedia[];
}

interface DayActivity {
  date: string;       // YYYY-MM-DD
  count: number;
  items: string[];    // media titles consumed that day
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function cellColor(count: number): string {
  if (count === 0) return 'bg-slate-100 dark:bg-slate-700/50';
  if (count === 1) return 'bg-blue-200 dark:bg-blue-900';
  if (count <= 3) return 'bg-blue-400 dark:bg-blue-700';
  if (count <= 6) return 'bg-blue-600 dark:bg-blue-500';
  return 'bg-blue-800 dark:bg-blue-400';
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ allData }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: DayActivity } | null>(null);

  // Build a map: YYYY-MM-DD → { count, items }
  // Only count active consumption: items being WATCHING/READING/PLAYING (updatedAt)
  // or items the user completed (completedAt) or started (startedAt)
  const ACTIVE_STATUSES = new Set([
    Status.WATCHING, Status.READING, Status.PLAYING, Status.COMPLETED,
  ]);

  const activityMap = useMemo(() => {
    const map = new Map<string, { count: number; items: string[] }>();
    const addEntry = (dateStr: string, title: string) => {
      const existing = map.get(dateStr);
      if (existing) {
        if (!existing.items.includes(title)) {
          existing.count += 1;
          existing.items.push(title);
        }
      } else {
        map.set(dateStr, { count: 1, items: [title] });
      }
    };
    for (const item of allData) {
      const title = item.media.title;
      // Track the day it was completed
      if (item.completedAt) addEntry(toLocalDateStr(item.completedAt), title);
      // Track the day it was started
      if (item.startedAt) addEntry(toLocalDateStr(item.startedAt), title);
      // Track updatedAt only if it's an actively consumed item
      // (excludes Plan to Watch / On Hold / Dropped edits where user just changed rating/notes)
      if (item.updatedAt && ACTIVE_STATUSES.has(item.status as Status)) {
        addEntry(toLocalDateStr(item.updatedAt), title);
      }
    }
    return map;
  }, [allData]);

  // Build 53-week grid (364 + up to 7 days) ending today
  const weeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find most recent Sunday to anchor the last column
    const endDay = new Date(today);
    const dayOfWeek = endDay.getDay(); // 0=Sun
    // Advance to end of this week (Sun)
    endDay.setDate(endDay.getDate() + (7 - (dayOfWeek === 0 ? 7 : dayOfWeek)));

    // Go back 52 full weeks from endDay
    const startDay = new Date(endDay);
    startDay.setDate(startDay.getDate() - 52 * 7 + 1);

    const cols: DayActivity[][] = [];
    let cursor = new Date(startDay);

    while (cursor <= endDay) {
      const col: DayActivity[] = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const act = activityMap.get(dateStr);
        col.push({ date: dateStr, count: act?.count ?? 0, items: act?.items ?? [] });
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(col);
    }
    return cols;
  }, [activityMap]);

  // Month labels: find the first column where each month appears
  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((col, ci) => {
      const month = new Date(col[0].date).getMonth();
      if (month !== lastMonth) {
        labels.push({ col: ci, label: MONTHS[month] });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  const totalActive = useMemo(() => activityMap.size, [activityMap]);
  const totalUpdates = useMemo(() =>
    [...activityMap.values()].reduce((s, v) => s + v.count, 0), [activityMap]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, day: DayActivity) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, day });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-3">
        <h3 className="text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">
          Watch Activity
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {totalUpdates} title{totalUpdates !== 1 ? 's' : ''} consumed across {totalActive} days in the last year
        </span>
      </div>

      {/* Month labels */}
      <div className="overflow-x-auto pb-1">
        <div className="w-max min-w-full">
          <div className="flex gap-[2px] mb-1 ml-7 font-mono">
            {weeks.map((_, ci) => {
              const label = monthLabels.find((l) => l.col === ci);
              return (
                <div key={ci} className="w-[10px] flex-shrink-0 text-[9px] text-slate-400 dark:text-slate-500 leading-none">
                  {label ? label.label : ''}
                </div>
              );
            })}
          </div>

          {/* Grid: days on left, week columns */}
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] mr-1 font-mono">
              {DAYS.map((d, i) => (
                <div key={d} className={`h-[10px] text-[9px] text-slate-400 dark:text-slate-500 leading-none flex items-center ${i % 2 === 1 ? '' : 'invisible'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Week columns */}
            <div className="flex gap-[2px]">
              {weeks.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[2px]">
                  {col.map((day) => (
                    <div
                      key={day.date}
                      className={`w-[10px] h-[10px] rounded-[2px] cursor-default transition-opacity hover:opacity-80 ${cellColor(day.count)}`}
                      onMouseEnter={(e) => handleMouseEnter(e, day)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-slate-400 dark:text-slate-500">Less</span>
        {[0, 1, 2, 4, 7].map((n) => (
          <div key={n} className={`w-[10px] h-[10px] rounded-[2px] ${cellColor(n)}`} />
        ))}
        <span className="text-[10px] text-slate-400 dark:text-slate-500">More</span>
      </div>

      {/* Tooltip — rendered fixed via portal-style absolute positioning */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-xl min-w-max max-w-xs">
            <p className="font-semibold mb-1">{formatDate(tooltip.day.date)}</p>
            {tooltip.day.count === 0 ? (
              <p className="text-gray-400">No activity</p>
            ) : (
              <>
                <p className="text-gray-300 mb-1">{tooltip.day.count} title{tooltip.day.count > 1 ? 's' : ''} watched</p>
                <ul className="space-y-0.5">
                  {tooltip.day.items.slice(0, 5).map((title) => (
                    <li key={title} className="text-gray-200 truncate">· {title}</li>
                  ))}
                  {tooltip.day.items.length > 5 && (
                    <li className="text-gray-400">+{tooltip.day.items.length - 5} more</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityHeatmap;
