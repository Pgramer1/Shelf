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
        label: TYPE_LABELS[type],
        total: data.total,
        favorites: data.favorites,
        nonFavorites: data.total - data.favorites,
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
    <div className="insight-card insight-card-enter h-full">
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

      <div className="h-52 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', color: 'var(--chart-tooltip-text)' }}
              labelStyle={{ color: 'var(--chart-tooltip-text)' }}
              itemStyle={{ color: 'var(--chart-tooltip-text)' }}
              formatter={(value: number | string, name: string) => {
                const numeric = Number(value);
                if (name === 'favorites') {
                  return [`${numeric} favorite${numeric === 1 ? '' : 's'}`, 'Favorites'];
                }
                return [`${numeric} non-favorite${numeric === 1 ? '' : 's'}`, 'Non-favorites'];
              }}
            />
            <Bar dataKey="favorites" stackId="total" radius={[8, 8, 0, 0]}>
              {rows.map((row) => (
                <Cell key={`favorites-${row.type}`} fill="var(--chart-3)" opacity={activeType === row.type ? 1 : 0.6} />
              ))}
            </Bar>
            <Bar dataKey="nonFavorites" stackId="total" radius={[8, 8, 0, 0]}>
              {rows.map((row) => (
                <Cell key={`non-favorites-${row.type}`} fill="var(--chart-text)" opacity={activeType === row.type ? 0.6 : 0.3} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <button
            type="button"
            key={row.type}
            onMouseEnter={() => setActiveType(row.type)}
            onFocus={() => setActiveType(row.type)}
            onClick={() => setActiveType(row.type)}
            className={`w-full text-left rounded-lg px-3 py-2 border transition ${activeType === row.type ? 'bg-gray-100 dark:bg-primary/20 border-primary/50 dark:border-primary/60' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-surface-hover'}`}
          >
            <div className="flex items-center justify-between text-xs gap-3">
              <span className={`font-medium ${activeType === row.type ? 'text-dark dark:text-light' : 'text-gray-700 dark:text-gray-300'}`}>{TYPE_LABELS[row.type]}</span>
              <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.favorites}/{row.total} ({row.favoriteRate.toFixed(0)}%)</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FavoritesBreakdownChart;
