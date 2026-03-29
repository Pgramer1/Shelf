import React, { useMemo, useState } from 'react';
import { MediaType, UserMedia } from '../types';

interface FavoritesBreakdownChartProps {
  allData: UserMedia[];
}

const TYPE_LABELS: Record<MediaType, string> = {
  [MediaType.MOVIE]: 'Movies',
  [MediaType.TV_SERIES]: 'TV Series',
  [MediaType.ANIME]: 'Anime',
  [MediaType.GAME]: 'Games',
  [MediaType.BOOK]: 'Books',
};

const FavoritesBreakdownChart: React.FC<FavoritesBreakdownChartProps> = ({ allData }) => {
  const [activeType, setActiveType] = useState<MediaType>(MediaType.MOVIE);

  const { rows, totalFavorites, totalItems } = useMemo(() => {
    const types = Object.values(MediaType);
    const accumulator = new Map<MediaType, { total: number; favorites: number }>();

    for (const type of types) {
      accumulator.set(type, { total: 0, favorites: 0 });
    }

    for (const item of allData) {
      const row = accumulator.get(item.media.type);
      if (!row) {
        continue;
      }
      row.total += 1;
      if (item.isFavorite) {
        row.favorites += 1;
      }
    }

    const computedRows = types.map((type) => {
      const data = accumulator.get(type) ?? { total: 0, favorites: 0 };
      const favoriteRate = data.total > 0 ? (data.favorites / data.total) * 100 : 0;
      return {
        type,
        total: data.total,
        favorites: data.favorites,
        favoriteRate,
      };
    });

    const favorites = computedRows.reduce((sum, row) => sum + row.favorites, 0);
    return {
      rows: computedRows,
      totalFavorites: favorites,
      totalItems: allData.length,
    };
  }, [allData]);

  const overallRate = totalItems > 0 ? (totalFavorites / totalItems) * 100 : 0;
  const activeRow = rows.find((row) => row.type === activeType) ?? rows[0];
  const nonFavorites = (activeRow?.total ?? 0) - (activeRow?.favorites ?? 0);

  return (
    <div className="insight-card-enter h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Favorites Breakdown</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">How favorites are distributed by media type</p>

      <div className="mb-4 insight-detail-panel">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Overall Favorite Rate</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{overallRate.toFixed(1)}%</p>
        {activeRow && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            {TYPE_LABELS[activeRow.type]}: {activeRow.favorites} favorites, {nonFavorites} non-favorites
          </p>
        )}
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <button
            type="button"
            key={row.type}
            onMouseEnter={() => setActiveType(row.type)}
            onFocus={() => setActiveType(row.type)}
            onClick={() => setActiveType(row.type)}
            className={`w-full text-left space-y-1 rounded-lg px-2 py-1.5 transition ${activeType === row.type ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300/70 dark:border-amber-700/70' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40 border border-transparent'}`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${activeType === row.type ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>{TYPE_LABELS[row.type]}</span>
              <span className="text-gray-500 dark:text-gray-400">{row.favorites}/{row.total} ({row.favoriteRate.toFixed(0)}%)</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                style={{ width: `${row.favoriteRate}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FavoritesBreakdownChart;
