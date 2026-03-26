import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Clapperboard, Gamepad2, Tv2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DayConsumption, DayConsumptionItem, MediaType } from '../types';
import { shelfService } from '../services/shelfService';

const getUnitLabel = (mediaType: MediaType, units: number) => {
  if (mediaType === MediaType.BOOK) {
    return units === 1 ? 'page' : 'pages';
  }
  if (mediaType === MediaType.GAME) {
    return units === 1 ? 'level' : 'levels';
  }
  return units === 1 ? 'episode' : 'episodes';
};

const getRangeLabel = (item: DayConsumptionItem) => {
  if (item.addOnlyActivity) {
    return 'Added to shelf';
  }

  const unitLabel = getUnitLabel(item.mediaType, item.unitsConsumed);
  if (item.mediaType === MediaType.BOOK) {
    return `${item.unitsConsumed} ${unitLabel} read (${item.fromUnit}-${item.toUnit})`;
  }
  if (item.mediaType === MediaType.GAME) {
    return `${item.unitsConsumed} ${unitLabel} completed (${item.fromUnit}-${item.toUnit})`;
  }
  return `${item.unitsConsumed} ${unitLabel} watched (${item.fromUnit}-${item.toUnit})`;
};

const getTypeIcon = (mediaType: MediaType) => {
  if (mediaType === MediaType.BOOK) return <BookOpen className="w-4 h-4" />;
  if (mediaType === MediaType.GAME) return <Gamepad2 className="w-4 h-4" />;
  if (mediaType === MediaType.MOVIE) return <Clapperboard className="w-4 h-4" />;
  return <Tv2 className="w-4 h-4" />;
};

const ActivityDayDetails: React.FC = () => {
  const navigate = useNavigate();
  const { date } = useParams<{ date: string }>();
  const [data, setData] = useState<DayConsumption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!date) {
        navigate('/');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await shelfService.getConsumptionByDate(date);
        setData(response);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load day details');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [date, navigate]);

  const formattedDate = useMemo(() => {
    if (!date) return '';
    const d = new Date(`${date}T00:00:00`);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [date]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shelf
          </Link>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Activity Details</p>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{formattedDate}</h1>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No tracked consumption on this day</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">This day has no progress-based activity logs yet.</p>
          </div>
        ) : data ? (
          <>
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Titles Consumed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalTitles}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Units</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalUnits}</p>
              </div>
            </div>

            <div className="space-y-3">
              {data.items.map((item) => (
                <div
                  key={item.userMediaId}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{getRangeLabel(item)}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                      {getTypeIcon(item.mediaType)}
                      {item.mediaType.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ActivityDayDetails;
