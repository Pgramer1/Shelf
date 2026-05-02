import React, { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { MediaType, UserMedia } from '../types';

interface ConsumptionByTypeChartProps {
  allData: UserMedia[];
}

const typeNames: Record<MediaType, string> = {
  [MediaType.MOVIE]: 'Movies',
  [MediaType.TV_SERIES]: 'TV Series',
  [MediaType.ANIME]: 'Anime',
  [MediaType.GAME]: 'Games',
  [MediaType.BOOK]: 'Books',
};

const typeColors: Record<MediaType, string> = {
  [MediaType.MOVIE]: '#124E66',
  [MediaType.TV_SERIES]: '#748D92',
  [MediaType.ANIME]: '#212A31',
  [MediaType.GAME]: '#124E66',
  [MediaType.BOOK]: '#748D92',
};

interface Slice {
  type: MediaType;
  name: string;
  value: number;
  chartValue: number;
  percentage: number;
  fill: string;
}

const ConsumptionByTypeChart: React.FC<ConsumptionByTypeChartProps> = ({ allData }) => {
  const baseTypes = Object.values(MediaType);
  const [activeType, setActiveType] = useState<MediaType>(MediaType.MOVIE);

  const slices = useMemo<Slice[]>(() => {
    const counts = new Map<MediaType, number>(baseTypes.map((t) => [t, 0]));

    for (const item of allData) {
      counts.set(item.media.type, (counts.get(item.media.type) ?? 0) + 1);
    }

    const total = baseTypes.reduce((sum, type) => sum + (counts.get(type) ?? 0), 0);
    return baseTypes.map((type) => {
      const value = counts.get(type) ?? 0;
      return {
        type,
        name: typeNames[type],
        value,
        chartValue: total > 0 ? value : 1,
        percentage: total > 0 ? (value / total) * 100 : 0,
        fill: typeColors[type],
      };
    });
  }, [allData]);

  const total = useMemo(() => slices.reduce((sum, s) => sum + s.value, 0), [slices]);

  const highlighted = slices.find((s) => s.type === activeType) ?? slices[0];

  const activeIndex = Math.max(0, slices.findIndex((slice) => slice.type === activeType));

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Content Mix</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Share of your shelf by media type</p>

      <div className="grid grid-cols-[180px_1fr] gap-5 items-center">
        <div className="relative">
          <div className="w-[180px] h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="chartValue"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  activeIndex={activeIndex}
                  onMouseEnter={(_entry, index) => {
                    const slice = slices[index];
                    if (slice) {
                      setActiveType(slice.type);
                    }
                  }}
                  onClick={(_entry, index) => {
                    const slice = slices[index];
                    if (slice) {
                      setActiveType(slice.type);
                    }
                  }}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.type} fill={slice.fill} opacity={activeType === slice.type ? 1 : 0.5} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(_value: number | string, _name: string, item: { payload?: Slice }) => {
                    const payload = item.payload;
                    if (!payload) {
                      return ['0 (0.0%)', 'Titles'];
                    }
                    return [`${payload.value} (${payload.percentage.toFixed(1)}%)`, 'Titles'];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{typeNames[highlighted.type]}</span>
            <span className="text-2xl font-semibold text-gray-900 dark:text-white">{Math.round(highlighted.percentage)}%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{highlighted.value} of {total}</span>
          </div>
        </div>

        <div className="space-y-2">
          {slices.map((slice) => {
            const isActive = activeType === slice.type;
            return (
              <button
                type="button"
                key={slice.type}
                onMouseEnter={() => setActiveType(slice.type)}
                onFocus={() => setActiveType(slice.type)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left transition ${
                  isActive
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-700'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: typeColors[slice.type] }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{typeNames[slice.type]}</span>
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{slice.value} ({slice.percentage.toFixed(1)}%)</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConsumptionByTypeChart;
