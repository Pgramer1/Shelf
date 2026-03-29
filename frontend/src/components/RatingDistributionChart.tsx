import React, { useMemo, useState } from 'react';
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

  return (
    <div className="insight-card-enter h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
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

      <div className="h-44 grid grid-cols-10 gap-1 items-end">
        {counts.map((count, index) => {
          const rating = index + 1;
          const isActive = selectedRating === rating;
          const heightPercent = (count / maxCount) * 100;
          return (
            <div key={rating} className="flex flex-col items-center justify-end h-full gap-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">{count}</span>
              <div className="w-full flex-1 flex items-end">
                <button
                  type="button"
                  onMouseEnter={() => setActiveRating(rating)}
                  onFocus={() => setActiveRating(rating)}
                  onClick={() => setActiveRating((prev) => (prev === rating ? null : rating))}
                  className={`w-full rounded-t bg-gradient-to-t from-blue-600 to-cyan-400 dark:from-indigo-500 dark:to-fuchsia-500 transition-all ${isActive ? 'ring-2 ring-cyan-300 dark:ring-fuchsia-400 brightness-110' : 'hover:brightness-110'}`}
                  style={{ height: `${heightPercent}%`, minHeight: count > 0 ? '6px' : '0px' }}
                  aria-label={`Rating ${rating} has ${count} titles`}
                />
              </div>
              <span className={`text-[10px] leading-none ${isActive ? 'text-blue-600 dark:text-fuchsia-300 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>{rating}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RatingDistributionChart;
