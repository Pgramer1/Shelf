import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeatmapDayActivity } from '../types';

interface ActivityHeatmapProps {
  activityDays: HeatmapDayActivity[];
}

interface DayActivity {
  date: string;
  count: number;
  unitsConsumed: number;
  items: string[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function cellColor(count: number): string {
  if (count === 0) return 'bg-slate-100 dark:bg-slate-800';
  if (count === 1) return 'bg-sky-200 dark:bg-indigo-500/70';
  if (count <= 3) return 'bg-sky-400 dark:bg-violet-500/80';
  if (count <= 6) return 'bg-cyan-500 dark:bg-fuchsia-500/85';
  return 'bg-teal-700 dark:bg-rose-400';
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activityDays }) => {
  const navigate = useNavigate();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: DayActivity } | null>(null);

  const activityMap = useMemo(() => {
    const map = new Map<string, { count: number; unitsConsumed: number; items: string[] }>();
    for (const day of activityDays) {
      map.set(day.date, {
        count: day.titleCount,
        unitsConsumed: day.unitsConsumed,
        items: day.titles,
      });
    }
    return map;
  }, [activityDays]);

  const weeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDay = new Date(today);
    const dayOfWeek = endDay.getDay();
    endDay.setDate(endDay.getDate() + (7 - (dayOfWeek === 0 ? 7 : dayOfWeek)));

    const startDay = new Date(endDay);
    startDay.setDate(startDay.getDate() - 52 * 7 + 1);

    const cols: DayActivity[][] = [];
    let cursor = new Date(startDay);

    while (cursor <= endDay) {
      const col: DayActivity[] = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const act = activityMap.get(dateStr);
        col.push({
          date: dateStr,
          count: act?.count ?? 0,
          unitsConsumed: act?.unitsConsumed ?? 0,
          items: act?.items ?? [],
        });
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

  const totalActiveDays = useMemo(() => activityMap.size, [activityMap]);
  const totalTitlesConsumed = useMemo(
    () => [...activityMap.values()].reduce((sum, entry) => sum + entry.count, 0),
    [activityMap]
  );
  const totalUnitsConsumed = useMemo(
    () => [...activityMap.values()].reduce((sum, entry) => sum + entry.unitsConsumed, 0),
    [activityMap]
  );

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>, day: DayActivity) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, day });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openDetails = (day: DayActivity) => {
    if (day.count === 0) {
      return;
    }
    navigate(`/activity/${day.date}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Watch History</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Based only on actual progress updates</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
          <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">{totalActiveDays} active days</span>
          <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">{totalTitlesConsumed} titles</span>
          <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">{totalUnitsConsumed} units</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="w-max min-w-full rounded-xl p-2 border border-gray-100 dark:border-slate-600 bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900">
          <div className="flex gap-[3px] mb-2 ml-8">
            {weeks.map((_, ci) => {
              const label = monthLabels.find((l) => l.col === ci);
              return (
                <div key={ci} className="w-[12px] flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500 leading-none">
                  {label ? label.label : ''}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            <div className="flex flex-col gap-[3px] mr-1">
              {DAYS.map((d, i) => (
                <div key={d} className={`h-[12px] text-[10px] text-gray-400 dark:text-gray-500 leading-none flex items-center ${i % 2 === 1 ? '' : 'invisible'}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {col.map((day) => (
                    <button
                      type="button"
                      key={day.date}
                      className={`w-[12px] h-[12px] rounded-[3px] transition-all ${cellColor(day.count)} ${day.count > 0 ? 'cursor-pointer hover:scale-110 hover:ring-2 hover:ring-cyan-300 dark:hover:ring-fuchsia-300' : 'cursor-default'}`}
                      onMouseEnter={(e) => handleMouseEnter(e, day)}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => openDetails(day)}
                      aria-label={day.count === 0 ? `${day.date}: no activity` : `${day.date}: ${day.count} title updates, open details`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">Less</span>
        {[0, 1, 2, 4, 7].map((n) => (
          <div key={n} className={`w-[12px] h-[12px] rounded-[3px] ${cellColor(n)}`} />
        ))}
        <span className="text-[10px] text-gray-400 dark:text-gray-500">More</span>
      </div>

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
                <p className="text-gray-300 mb-1">
                  {tooltip.day.count} title{tooltip.day.count > 1 ? 's' : ''} updated, {tooltip.day.unitsConsumed} unit{tooltip.day.unitsConsumed > 1 ? 's' : ''}
                </p>
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
