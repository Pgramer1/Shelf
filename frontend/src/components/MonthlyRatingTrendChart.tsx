import React, { useEffect, useMemo, useState } from 'react';
import { UserMedia } from '../types';

interface MonthlyRatingTrendChartProps {
  allData: UserMedia[];
}

interface MonthlyPoint {
  month: number;
  average: number | null;
  count: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MonthlyRatingTrendChart: React.FC<MonthlyRatingTrendChartProps> = ({ allData }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth());

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const item of allData) {
      if (typeof item.rating !== 'number') {
        continue;
      }
      const date = new Date(item.updatedAt);
      if (!Number.isNaN(date.getTime())) {
        set.add(date.getFullYear());
      }
    }
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [allData]);

  useEffect(() => {
    if (!years.includes(selectedYear) && years.length > 0) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  useEffect(() => {
    if (selectedYear !== new Date().getFullYear()) {
      setActiveMonth(0);
    }
  }, [selectedYear]);

  const monthlyData = useMemo<MonthlyPoint[]>(() => {
    const sums = Array.from({ length: 12 }, () => 0);
    const counts = Array.from({ length: 12 }, () => 0);

    for (const item of allData) {
      if (typeof item.rating !== 'number') {
        continue;
      }

      const date = new Date(item.updatedAt);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== selectedYear) {
        continue;
      }

      const month = date.getMonth();
      sums[month] += item.rating;
      counts[month] += 1;
    }

    return sums.map((sum, month) => {
      const count = counts[month];
      return {
        month,
        average: count > 0 ? sum / count : null,
        count,
      };
    });
  }, [allData, selectedYear]);

  const chartWidth = 620;
  const chartHeight = 220;
  const padding = { top: 16, right: 20, bottom: 32, left: 20 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const points = monthlyData.map((point) => {
    const x = padding.left + (point.month / 11) * innerWidth;
    if (point.average === null) {
      return { ...point, x, y: null as number | null };
    }

    const normalized = (point.average - 1) / 9;
    const y = padding.top + innerHeight - normalized * innerHeight;
    return { ...point, x, y };
  });

  const activePoint = points.find((point) => point.month === activeMonth) ?? points[0];

  const linePath = useMemo(() => {
    let d = '';
    let started = false;

    for (const point of points) {
      if (point.y === null) {
        started = false;
        continue;
      }

      if (!started) {
        d += `M ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
        started = true;
      } else {
        d += `L ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
      }
    }

    return d.trim();
  }, [points]);

  const yearlyAverage = useMemo(() => {
    let sum = 0;
    let count = 0;

    for (const point of monthlyData) {
      if (point.average === null) {
        continue;
      }
      sum += point.average * point.count;
      count += point.count;
    }

    return count > 0 ? sum / count : 0;
  }, [monthlyData]);

  const ratedUpdates = monthlyData.reduce((sum, point) => sum + point.count, 0);

  return (
    <div className="insight-card-enter h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Monthly Rating Trend</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Average rating movement through the year</p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-2 text-sm text-gray-700 dark:text-gray-200"
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="insight-detail-panel mb-4">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Selected Month</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {MONTH_LABELS[activePoint.month]} {selectedYear}: {activePoint.average === null ? 'No ratings' : `${activePoint.average.toFixed(1)} avg from ${activePoint.count} rated update${activePoint.count === 1 ? '' : 's'}`}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Year Avg</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{yearlyAverage.toFixed(1)}</p>
        </div>
        <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Rated Updates</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{ratedUpdates}</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44">
        {[1, 3, 5, 7, 9].map((tick) => {
          const normalized = (tick - 1) / 9;
          const y = padding.top + innerHeight - normalized * innerHeight;
          return (
            <line
              key={tick}
              x1={padding.left}
              x2={chartWidth - padding.right}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
              strokeWidth="1"
            />
          );
        })}

        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#ratingTrendGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((point) => {
          if (point.y === null) {
            return null;
          }
          const isActive = point.month === activeMonth;
          return (
            <circle
              key={`point-${point.month}`}
              cx={point.x}
              cy={point.y}
              r={isActive ? 5 : 4}
              fill="#ffffff"
              stroke={isActive ? '#06b6d4' : '#2563eb'}
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setActiveMonth(point.month)}
              onClick={() => setActiveMonth(point.month)}
            />
          );
        })}

        {points.map((point) => (
          <text
            key={`label-${point.month}`}
            x={point.x}
            y={chartHeight - 10}
            textAnchor="middle"
            className={point.month === activeMonth ? 'fill-blue-600 dark:fill-cyan-300' : 'fill-gray-500 dark:fill-gray-400'}
            fontSize="10"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveMonth(point.month)}
          >
            {MONTH_LABELS[point.month]}
          </text>
        ))}

        <defs>
          <linearGradient id="ratingTrendGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mt-3 grid grid-cols-6 gap-1.5">
        {MONTH_LABELS.map((label, month) => (
          <button
            key={label}
            type="button"
            onMouseEnter={() => setActiveMonth(month)}
            onFocus={() => setActiveMonth(month)}
            onClick={() => setActiveMonth(month)}
            className={`h-7 rounded-md text-[11px] font-medium transition ${activeMonth === month ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MonthlyRatingTrendChart;
