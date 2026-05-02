import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UserMedia } from '../types';

interface MonthlyRatingTrendChartProps {
  allData: UserMedia[];
}

interface MonthlyPoint {
  month: number;
  label: string;
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
        label: MONTH_LABELS[month],
        average: count > 0 ? sum / count : null,
        count,
      };
    });
  }, [allData, selectedYear]);

  const activePoint = monthlyData.find((point) => point.month === activeMonth) ?? monthlyData[0];

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
    <div className="insight-card-enter h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
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

      <div className="h-44 mb-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#748D92" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[1, 10]}
              ticks={[1, 3, 5, 7, 9]}
              allowDecimals={false}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(label: string) => `${label} ${selectedYear}`}
            />
            <ReferenceLine y={yearlyAverage} stroke="#748D92" strokeDasharray="4 4" />
            <ReferenceLine x={MONTH_LABELS[activeMonth]} stroke="#124E66" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#124E66"
              strokeWidth={3}
              dot={{ r: 4, stroke: '#124E66', strokeWidth: 2, fill: '#D3D9D4' }}
              activeDot={{ r: 6, stroke: '#0F3F52', strokeWidth: 2, fill: '#D3D9D4' }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

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
