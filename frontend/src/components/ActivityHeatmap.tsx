import React, { useEffect, useMemo, useRef, useState } from 'react';
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

function parseDateParts(dateStr: string) {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  return {
    year: Number.isFinite(year) ? year : 0,
    month: Number.isFinite(month) ? month : 0,
    day: Number.isFinite(day) ? day : 1,
  };
}

function cellColor(count: number): string {
  if (count === 0) return 'bg-gray-100 dark:bg-white/5';
  if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900/50';
  if (count <= 3) return 'bg-emerald-300 dark:bg-emerald-800/70';
  if (count <= 6) return 'bg-emerald-400 dark:bg-emerald-700/90';
  return 'bg-emerald-500 dark:bg-emerald-800';
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activityDays }) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: DayActivity } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const day of activityDays) {
      years.add(parseDateParts(day.date).year);
    }
    years.add(new Date().getFullYear());
    return [...years].filter((year) => year > 0).sort((a, b) => b - a);
  }, [activityDays]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear) && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const weeks = useMemo(() => {
    const endDay = new Date(selectedYear, 11, 31);
    endDay.setHours(0, 0, 0, 0);
    const dayOfWeek = endDay.getDay();
    endDay.setDate(endDay.getDate() + (7 - (dayOfWeek === 0 ? 7 : dayOfWeek)));

    const startDay = new Date(endDay);
    startDay.setDate(startDay.getDate() - 52 * 7 + 1);

    const cols: DayActivity[][] = [];
    let cursor = new Date(startDay);

    for (let weekIndex = 0; weekIndex < 52; weekIndex++) {
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
  }, [activityMap, selectedYear]);

  // Month labels: find the first column where each month appears
  const monthLabelByColumn = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    let lastLabelColumn = -99;
    const minimumGap = 5;

    weeks.forEach((col, ci) => {
      const { year, month } = parseDateParts(col[0].date);
      if (year !== selectedYear) {
        return;
      }

      if (month !== lastMonth && ci - lastLabelColumn >= minimumGap) {
        labels.push({ col: ci, label: MONTHS[month] ?? '' });
        lastMonth = month;
        lastLabelColumn = ci;
      }
    });

    return new Map<number, string>(labels.map((label) => [label.col, label.label]));
  }, [weeks, selectedYear]);

  const yearDays = useMemo(
    () => weeks.flat().filter((day) => parseDateParts(day.date).year === selectedYear),
    [weeks, selectedYear]
  );

  const totalActiveDays = useMemo(
    () => yearDays.filter((day) => day.count > 0).length,
    [yearDays]
  );

  const totalTitlesConsumed = useMemo(
    () => yearDays.reduce((sum, day) => sum + day.count, 0),
    [yearDays]
  );

  const totalUnitsConsumed = useMemo(
    () => yearDays.reduce((sum, day) => sum + day.unitsConsumed, 0),
    [yearDays]
  );

  const weekGridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }),
    [weeks.length]
  );

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>, day: DayActivity) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top - 8;
    setTooltip({ x, y, day });
  };

  const formatDate = (dateStr: string) => {
    const { year, month, day } = parseDateParts(dateStr);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openDetails = (day: DayActivity) => {
    if (day.count === 0) {
      return;
    }
    navigate(`/activity/${day.date}`);
  };

  return (
    <div
      ref={containerRef}
      className="relative insight-card insight-card-enter"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Watch History</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Based only on actual progress updates in {selectedYear}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
          <label className="inline-flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Year</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-8 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-surface-hover px-2 text-gray-700 dark:text-gray-200"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <span className="insight-chip bg-gray-100 dark:bg-surface-hover text-gray-600 dark:text-gray-200">{totalActiveDays} active days</span>
          <span className="insight-chip bg-gray-100 dark:bg-surface-hover text-gray-600 dark:text-gray-200">{totalTitlesConsumed} titles</span>
          <span className="insight-chip bg-gray-100 dark:bg-surface-hover text-gray-600 dark:text-gray-200">{totalUnitsConsumed} units</span>
        </div>
      </div>

      <div className="rounded-xl p-2 border border-gray-100 dark:border-white/10 bg-white dark:bg-surface">
        <div className="grid gap-[2px] mb-2" style={weekGridStyle}>
          {weeks.map((_, ci) => (
            <div key={ci} className="text-center text-[9px] text-gray-400 dark:text-gray-500 leading-none truncate">
              {monthLabelByColumn.get(ci) ?? ''}
            </div>
          ))}
        </div>

        <div className="grid gap-[2px]" style={weekGridStyle}>
          {weeks.map((col, ci) => (
            <div key={ci} className="grid grid-rows-7 gap-[2px]">
              {col.map((day) => (
                <button
                  type="button"
                  key={day.date}
                  className={`w-full aspect-square min-w-0 rounded-[2px] transition-all ${cellColor(day.count)} ${day.count > 0 ? 'cursor-pointer hover:scale-110 hover:ring-2 hover:ring-primary dark:hover:ring-primary/80' : 'cursor-default'}`}
                  onMouseEnter={(e) => handleMouseEnter(e, day)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => openDetails(day)}
                  aria-label={day.count === 0 ? `${day.date}: no activity` : `${day.date}: ${day.count} title updates, open details`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-2 text-[9px] text-gray-400 dark:text-gray-500">
          {DAYS.join(' · ')}
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
          className="absolute z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-gray-900 dark:bg-surface-hover text-white text-xs rounded-lg px-3 py-2 shadow-md min-w-max max-w-xs border border-white/10">
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
