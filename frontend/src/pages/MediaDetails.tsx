import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Star, Users } from 'lucide-react';
import { mediaService } from '../services/mediaService';
import { shelfService } from '../services/shelfService';
import { getSimilarContent, SearchResult } from '../services/searchService';
import { MediaDetails, MediaType, RatingScope, Status, UserMedia } from '../types';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const normalizeText = (value: string) => value.trim().toLowerCase();

const defaultPlannedStatusForType = (type: MediaType): Status => {
  if (type === MediaType.BOOK) return Status.PLAN_TO_READ;
  if (type === MediaType.GAME) return Status.PLAN_TO_PLAY;
  return Status.PLAN_TO_WATCH;
};

const buildShelfIdentityKey = (media: {
  source?: string;
  sourceId?: string;
  title: string;
  type: MediaType;
  releaseYear?: number;
}) => {
  const source = (media.source || '').trim().toUpperCase();
  const sourceId = (media.sourceId || '').trim();
  if (source && sourceId) {
    return `src:${source}:${sourceId}`;
  }
  const year = media.releaseYear ?? '';
  return `title:${media.type}:${normalizeText(media.title)}:${year}`;
};

const MediaDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { mediaId } = useParams<{ mediaId: string }>();
  const [scope, setScope] = useState<RatingScope>('GLOBAL');
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shelfItems, setShelfItems] = useState<UserMedia[]>([]);
  const [similarItems, setSimilarItems] = useState<SearchResult[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState('');
  const [addingIdentityKey, setAddingIdentityKey] = useState<string | null>(null);
  const [openingIdentityKey, setOpeningIdentityKey] = useState<string | null>(null);

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

  useEffect(() => {
    if (!Number.isFinite(parsedMediaId) || parsedMediaId <= 0) {
      return;
    }

    let isMounted = true;

    const loadShelf = async () => {
      try {
        const response = await shelfService.getUserShelf();
        if (isMounted) {
          setShelfItems(response);
        }
      } catch {
        if (isMounted) {
          setShelfItems([]);
        }
      }
    };

    loadShelf();

    return () => {
      isMounted = false;
    };
  }, [parsedMediaId]);

  useEffect(() => {
    if (!details?.media) {
      setSimilarItems([]);
      setSimilarError('');
      setSimilarLoading(false);
      return;
    }

    let isMounted = true;

    const loadSimilar = async () => {
      setSimilarLoading(true);
      setSimilarError('');
      try {
        const response = await getSimilarContent(details.media, 8);
        if (isMounted) {
          setSimilarItems(response);
        }
      } catch {
        if (isMounted) {
          setSimilarItems([]);
          setSimilarError('Unable to load similar content right now.');
        }
      } finally {
        if (isMounted) {
          setSimilarLoading(false);
        }
      }
    };

    loadSimilar();

    return () => {
      isMounted = false;
    };
  }, [
    details?.media?.id,
    details?.media?.source,
    details?.media?.sourceId,
    details?.media?.title,
    details?.media?.type,
    details?.media?.releaseYear,
  ]);

  const maxBucketCount = useMemo(() => {
    if (!details?.ratingDistribution?.length) return 1;
    return Math.max(...details.ratingDistribution.map((bucket) => bucket.count), 1);
  }, [details]);

  const shelfIdentityKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const shelfItem of shelfItems) {
      keys.add(buildShelfIdentityKey(shelfItem.media));
    }
    return keys;
  }, [shelfItems]);

  const visibleSimilarItems = useMemo(
    () => similarItems.filter((item) => !shelfIdentityKeys.has(buildShelfIdentityKey({
      source: item.source,
      sourceId: item.externalId,
      title: item.title,
      type: item.type,
      releaseYear: item.releaseYear,
    }))),
    [similarItems, shelfIdentityKeys]
  );

  const handleOpenSimilar = async (item: SearchResult) => {
    const identityKey = buildShelfIdentityKey({
      source: item.source,
      sourceId: item.externalId,
      title: item.title,
      type: item.type,
      releaseYear: item.releaseYear,
    });
    setOpeningIdentityKey(identityKey);
    try {
      const media = await mediaService.createMedia({
        title: item.title,
        type: item.type,
        totalUnits: item.totalUnits || 1,
        imageUrl: item.imageUrl,
        description: item.description,
        releaseYear: item.releaseYear,
        source: item.source,
        sourceId: item.externalId,
      });
      navigate(`/media/${media.id}`);
    } catch {
      setSimilarError('Could not open this title right now.');
    } finally {
      setOpeningIdentityKey(null);
    }
  };

  const handleQuickAdd = async (item: SearchResult) => {
    const identityKey = buildShelfIdentityKey({
      source: item.source,
      sourceId: item.externalId,
      title: item.title,
      type: item.type,
      releaseYear: item.releaseYear,
    });
    setAddingIdentityKey(identityKey);
    try {
      const media = await mediaService.createMedia({
        title: item.title,
        type: item.type,
        totalUnits: item.totalUnits || 1,
        imageUrl: item.imageUrl,
        description: item.description,
        releaseYear: item.releaseYear,
        source: item.source,
        sourceId: item.externalId,
      });

      try {
        await shelfService.addToShelf({
          mediaId: media.id,
          status: defaultPlannedStatusForType(item.type),
          progress: 0,
        });
      } catch (err: any) {
        const message = String(err?.response?.data?.message || '').toLowerCase();
        if (!message.includes('already in shelf')) {
          throw err;
        }
      }

      setShelfItems((prev) => {
        const alreadyPresent = prev.some((entry) => entry.media.id === media.id);
        if (alreadyPresent) return prev;
        return [
          ...prev,
          {
            id: -Date.now(),
            media: {
              id: media.id,
              title: media.title,
              type: media.type,
              totalUnits: media.totalUnits,
              imageUrl: media.imageUrl,
              description: media.description,
              releaseYear: media.releaseYear,
              source: media.source,
              sourceId: media.sourceId,
            },
            status: defaultPlannedStatusForType(item.type),
            progress: 0,
            rating: undefined,
            notes: undefined,
            isFavorite: false,
            startedAt: undefined,
            completedAt: undefined,
            updatedAt: new Date().toISOString(),
          },
        ];
      });
    } catch {
      setSimilarError('Could not add this title to your shelf right now.');
    } finally {
      setAddingIdentityKey(null);
    }
  };

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

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Similar Content</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Up to 8 picks</p>
          </div>

          {similarError && (
            <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              {similarError}
            </div>
          )}

          {similarLoading ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="min-w-[180px] sm:min-w-[200px] rounded-xl border border-gray-200 dark:border-gray-700 p-3 animate-pulse"
                >
                  <div className="w-full h-40 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-3 h-4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-3 h-8 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          ) : visibleSimilarItems.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No similar suggestions found.</p>
          ) : (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {visibleSimilarItems.map((item) => {
                const identityKey = buildShelfIdentityKey({
                  source: item.source,
                  sourceId: item.externalId,
                  title: item.title,
                  type: item.type,
                  releaseYear: item.releaseYear,
                });
                const isAdding = addingIdentityKey === identityKey;
                const isOpening = openingIdentityKey === identityKey;
                return (
                  <div
                    key={`${item.source}-${item.externalId}-${item.title}`}
                    className="min-w-[180px] sm:min-w-[200px] rounded-xl border border-gray-200 dark:border-gray-700 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenSimilar(item)}
                      disabled={isOpening}
                      className="w-full text-left"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-40 object-cover rounded-lg bg-gray-100 dark:bg-gray-700"
                        />
                      ) : (
                        <div className="w-full h-40 rounded-lg bg-gray-200 dark:bg-gray-700" />
                      )}
                      <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{item.title}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {item.type.replace('_', ' ')}
                        {item.releaseYear ? ` · ${item.releaseYear}` : ''}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(item)}
                      disabled={isAdding}
                      className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-60"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isAdding ? 'Adding...' : 'Quick Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MediaDetailsPage;
