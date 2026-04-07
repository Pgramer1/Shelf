import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Users } from 'lucide-react';
import { mediaService } from '../services/mediaService';
import { MediaDetails, RatingScope } from '../types';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const MediaDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { mediaId } = useParams<{ mediaId: string }>();
  const [scope, setScope] = useState<RatingScope>('GLOBAL');
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const parsedMediaId = Number(mediaId);

  useEffect(() => {
    if (!Number.isFinite(parsedMediaId) || parsedMediaId <= 0) {
      setError('Invalid media id');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await mediaService.getMediaDetails(parsedMediaId, scope);
        if (isMounted) {
          setDetails(response);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.response?.data?.message || 'Failed to load media details');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [parsedMediaId, scope]);

  const maxBucketCount = useMemo(() => {
    if (!details?.ratingDistribution?.length) return 1;
    return Math.max(...details.ratingDistribution.map((bucket) => bucket.count), 1);
  }, [details]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <p className="text-red-600 dark:text-red-400 text-sm">{error || 'Media details unavailable'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to shelf
        </button>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {details.media.imageUrl ? (
              <img
                src={details.media.imageUrl}
                alt={details.media.title}
                className="w-full sm:w-44 h-64 sm:h-64 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full sm:w-44 h-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-words">{details.media.title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {details.media.type.replace('_', ' ')}
                {details.media.releaseYear ? ` · ${details.media.releaseYear}` : ''}
                {details.media.totalUnits ? ` · ${details.media.totalUnits} units` : ''}
              </p>
              {details.media.description && (
                <p className="mt-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {details.media.description}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Average Rating</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                    {details.averageRating != null ? details.averageRating.toFixed(1) : '--'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Ratings</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{details.totalRatings}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Your Rating</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
                    {details.myRating != null ? `${details.myRating}/10` : '--'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2">
              <Users className="w-5 h-5" />
              Community Ratings
            </h2>
            <div className="inline-flex rounded-lg p-1 bg-gray-100 dark:bg-gray-700 w-fit">
              <button
                onClick={() => setScope('GLOBAL')}
                className={`px-3 py-1.5 rounded-md text-sm transition ${scope === 'GLOBAL'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Global
              </button>
              <button
                onClick={() => setScope('FRIENDS')}
                className={`px-3 py-1.5 rounded-md text-sm transition ${scope === 'FRIENDS'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Friends
              </button>
            </div>
          </div>

          {details.scopeNotice && (
            <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              {details.scopeNotice}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Rating Distribution</h3>
              {details.ratingDistribution.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No ratings yet.</p>
              ) : (
                <div className="space-y-2">
                  {details.ratingDistribution.map((bucket) => (
                    <div key={bucket.rating} className="flex items-center gap-3">
                      <span className="w-10 text-sm text-gray-700 dark:text-gray-300">{bucket.rating}/10</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${(bucket.count / maxBucketCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-gray-500 dark:text-gray-400">{bucket.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Ratings</h3>
              {details.recentRatings.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent ratings yet.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {details.recentRatings.map((item, index) => (
                    <div
                      key={`${item.username}-${item.updatedAt}-${index}`}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(item.updatedAt)}</p>
                      </div>
                      <p className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                        <Star className="w-4 h-4 fill-current" />
                        {item.rating}/10
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MediaDetailsPage;
