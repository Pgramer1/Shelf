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
import { UserMedia } from '../types';

interface RatingDistributionChartProps {
  allData: UserMedia[];
}

const RatingDistributionChart: React.FC<RatingDistributionChartProps> = ({ allData }) => {
  const [activeRating, setActiveRating] = useState<number | null>(null);

  const { counts, ratedCount, averageRating, maxCount } = useMemo(() => {
    const bucket = Array.from({ length: 10 }, () => 0);
    let totalScore = 0;
    let totalRated = 0;

    for (const item of allData) {
      const rating = item.rating;
      if (typeof rating === 'number' && rating >= 1 && rating <= 10) {
        bucket[rating - 1] += 1;
        totalScore += rating;
        totalRated += 1;
      }
    }

    return {
      counts: bucket,
      ratedCount: totalRated,
      averageRating: totalRated > 0 ? totalScore / totalRated : 0,
      maxCount: Math.max(1, ...bucket),
    };
  }, [allData]);

  const selectedRating = activeRating ?? 10;
  const selectedCount = counts[selectedRating - 1] ?? 0;
  const selectedPercent = ratedCount > 0 ? (selectedCount / ratedCount) * 100 : 0;
  const chartData = useMemo(
    () => counts.map((count, index) => ({ rating: index + 1, count })),
    [counts]
  );

  return (
    <div className="insight-card-enter h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Rating Distribution</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">How your ratings are spread from 1 to 10</p>

      <div className="insight-detail-panel mb-4">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Selected Rating</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {selectedRating}/10: {selectedCount} title{selectedCount === 1 ? '' : 's'} ({selectedPercent.toFixed(1)}%)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Rated Titles</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{ratedCount}</p>
        </div>
        <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Average Rating</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{averageRating.toFixed(1)}</p>
        </div>
      </div>

      <div className="h-44 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#748D92" vertical={false} />
            <XAxis dataKey="rating" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              allowDecimals={false}
              domain={[0, maxCount]}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number | string, _name: string, item: { payload?: { rating: number } }) => {
                const rating = item.payload?.rating;
                const count = Number(value);
                return [`${count} title${count === 1 ? '' : 's'}`, `Rating ${rating ?? ''}`];
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.rating} fill={selectedRating === entry.rating ? '#124E66' : '#748D92'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-10 gap-1.5">
        {chartData.map((entry) => {
          const isActive = selectedRating === entry.rating;
          return (
            <button
              key={entry.rating}
              type="button"
              onMouseEnter={() => setActiveRating(entry.rating)}
              onFocus={() => setActiveRating(entry.rating)}
              onClick={() => setActiveRating((prev) => (prev === entry.rating ? null : entry.rating))}
              className={`h-7 rounded-md text-[11px] font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {entry.rating}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RatingDistributionChart;
