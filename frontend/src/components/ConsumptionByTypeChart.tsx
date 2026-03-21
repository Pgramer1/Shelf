import React, { useMemo, useState } from 'react';
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
  [MediaType.MOVIE]: '#2563eb',
  [MediaType.TV_SERIES]: '#0891b2',
  [MediaType.ANIME]: '#0ea5e9',
  [MediaType.GAME]: '#0284c7',
  [MediaType.BOOK]: '#1d4ed8',
};

interface Slice {
  type: MediaType;
  value: number;
  percentage: number;
  start: number;
  end: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeDonutArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
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
    if (!total) {
      return baseTypes.map((type, i) => ({
        type,
        value: 0,
        percentage: 0,
        start: i * (360 / baseTypes.length),
        end: (i + 1) * (360 / baseTypes.length),
      }));
    }

    let cursor = 0;
    return baseTypes.map((type) => {
      const value = counts.get(type) ?? 0;
      const angle = (value / total) * 360;
      const start = cursor;
      const end = cursor + angle;
      cursor += angle;
      return {
        type,
        value,
        percentage: (value / total) * 100,
        start,
        end,
      };
    });
  }, [allData]);

  const total = useMemo(() => slices.reduce((sum, s) => sum + s.value, 0), [slices]);

  const highlighted = slices.find((s) => s.type === activeType) ?? slices[0];

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Content Mix</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Share of your shelf by media type</p>

      <div className="grid grid-cols-[180px_1fr] gap-5 items-center">
        <div className="relative">
          <svg viewBox="0 0 220 220" className="w-[180px] h-[180px]">
            <circle cx="110" cy="110" r="70" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="34" />
            {slices.map((slice) => {
              const isActive = activeType === slice.type;
              return (
                <path
                  key={slice.type}
                  d={describeDonutArc(110, 110, 70, slice.start, slice.end || slice.start + 0.00001)}
                  fill="none"
                  stroke={typeColors[slice.type]}
                  strokeWidth={isActive ? 38 : 34}
                  strokeLinecap="round"
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setActiveType(slice.type)}
                />
              );
            })}
          </svg>

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
