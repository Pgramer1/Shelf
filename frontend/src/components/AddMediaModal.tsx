import React, { useState, useRef } from 'react';
import { mediaService } from '../services/mediaService';
import { shelfService } from '../services/shelfService';
import { searchMedia, getTVSeasons, SearchResult, TVSeason } from '../services/searchService';
import { MediaType, Status } from '../types';
import { X, Search, Loader2, PenLine, ChevronLeft } from 'lucide-react';

interface AddMediaModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddMediaModal: React.FC<AddMediaModalProps> = ({ onClose, onSuccess }) => {
  // step 0 = search, step 1 = review info, step 2 = status/rating
  const [step, setStep] = useState(0);

  // search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<MediaType>(MediaType.ANIME);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // media info state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MediaType>(MediaType.MOVIE);
  const [totalUnits, setTotalUnits] = useState(1);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [releaseYear, setReleaseYear] = useState<number | undefined>();

  // shelf state
  const [status, setStatus] = useState<Status>(Status.PLAN_TO_WATCH);
  const [progress, setProgress] = useState(0);
  const [rating, setRating] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // TV season picker state
  const [pendingTVShow, setPendingTVShow] = useState<SearchResult | null>(null);
  const [tvSeasons, setTvSeasons] = useState<TVSeason[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);

  const todayStr = () => new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr());
  const [endDate, setEndDate] = useState<string>('');

  const handleSearch = async (query: string, t: MediaType) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    setSearchError('');
    try {
      const results = await searchMedia(query, t);
      setSearchResults(results);
      if (results.length === 0) setSearchError('No results found. Try a different title.');
    } catch {
      setSearchError('Search failed. Check your API key or try again.');
    } finally {
      setSearching(false);
    }
  };

  const onSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => handleSearch(value, searchType), 500);
  };

  const onTypeChange = (newType: MediaType) => {
    setSearchType(newType);
    setSearchResults([]);
    if (searchQuery.trim()) handleSearch(searchQuery, newType);
  };

  const getDefaultStatus = (t: MediaType) => {
    switch (t) {
      case MediaType.BOOK: return Status.PLAN_TO_READ;
      case MediaType.GAME: return Status.PLAN_TO_PLAY;
      default: return Status.PLAN_TO_WATCH;
    }
  };

  const selectResult = (result: SearchResult) => {
    if (result.type === MediaType.TV_SERIES) {
      setPendingTVShow(result);
      setLoadingSeasons(true);
      setTvSeasons([]);
      getTVSeasons(result.externalId).then((seasons) => {
        setTvSeasons(seasons);
        setLoadingSeasons(false);
      }).catch(() => setLoadingSeasons(false));
      return;
    }
    applyResult(result.title, result.type, result.totalUnits, result.imageUrl, result.description, result.releaseYear);
  };

  const applyResult = (
    t: string, tp: MediaType, units: number,
    img?: string, desc?: string, year?: number,
  ) => {
    setTitle(t); setType(tp); setTotalUnits(units);
    setImageUrl(img || ''); setDescription(desc || ''); setReleaseYear(year);
    setStatus(getDefaultStatus(tp));
    setStep(2);
  };

  const selectSeason = (show: SearchResult, season: TVSeason) => {
    const seasonTitle = `${show.title} — Season ${season.seasonNumber}`;
    applyResult(
      seasonTitle, MediaType.TV_SERIES, season.episodeCount,
      season.posterUrl || show.imageUrl, show.description, season.airYear || show.releaseYear,
    );
    setPendingTVShow(null);
  };

  const enterManually = () => {
    setTitle(searchQuery);
    setType(searchType);
    setTotalUnits(1);
    setImageUrl('');
    setDescription('');
    setReleaseYear(undefined);
    setStatus(getDefaultStatus(searchType));
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const media = await mediaService.createMedia({
        title, type, totalUnits,
        imageUrl: imageUrl || undefined,
        description: description || undefined,
        releaseYear: releaseYear || undefined,
      });
      await shelfService.addToShelf({
        mediaId: media.id, status, progress, rating,
        notes: notes || undefined, isFavorite,
        startedAt: startDate ? `${startDate}T00:00:00` : undefined,
        completedAt: endDate ? `${endDate}T00:00:00` : undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add media');
    } finally {
      setLoading(false);
    }
  };

  const getStatusOptions = () => {
    switch (type) {
      case MediaType.BOOK:
        return [Status.READING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_READ];
      case MediaType.GAME:
        return [Status.PLAYING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_PLAY];
      default:
        return [Status.WATCHING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_WATCH];
    }
  };

  const formatStatus = (s: string) => s.replace(/_/g, ' ');

  const unitLabel = (t: MediaType) => {
    switch (t) {
      case MediaType.BOOK: return 'pages';
      case MediaType.GAME: return 'hrs';
      case MediaType.MOVIE: return 'part';
      default: return 'episodes';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Media to Shelf</h2>
            <div className="flex gap-2 mt-1">
              {['Search', 'Details', 'Status'].map((label, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${step === i
                  ? 'bg-blue-600 text-white'
                  : step > i
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="p-6">

          {/* Step 0: Search */}
          {step === 0 && !pendingTVShow && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {Object.values(MediaType).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onTypeChange(t)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition ${searchType === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchInput(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={`Search for a ${searchType.toLowerCase().replace('_', ' ')}...`}
                  autoFocus
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />}
              </div>

              {searchError && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{searchError}</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.externalId}
                      type="button"
                      onClick={() => selectResult(result)}
                      className="w-full flex gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left"
                    >
                      {result.imageUrl ? (
                        <img src={result.imageUrl} alt={result.title} className="w-12 h-16 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-16 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{result.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {result.releaseYear && `${result.releaseYear} · `}
                          {result.totalUnits > 1 ? `${result.totalUnits} ${unitLabel(result.type)}` : '1 entry'}
                        </p>
                        {result.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{result.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={enterManually}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-400 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <PenLine className="w-4 h-4" />
                Enter manually
              </button>
            </div>
          )}

          {/* Step 0: TV Season Picker */}
          {step === 0 && pendingTVShow && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPendingTVShow(null)}
                className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to results
              </button>

              <div className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {pendingTVShow.imageUrl && (
                  <img src={pendingTVShow.imageUrl} alt={pendingTVShow.title} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{pendingTVShow.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {pendingTVShow.releaseYear} · Select a season to add
                  </p>
                </div>
              </div>

              {loadingSeasons ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading seasons…</span>
                </div>
              ) : tvSeasons.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No season data available.</p>
                  <button
                    type="button"
                    onClick={() => applyResult(pendingTVShow.title, MediaType.TV_SERIES, pendingTVShow.totalUnits, pendingTVShow.imageUrl, pendingTVShow.description, pendingTVShow.releaseYear)}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Add entire series instead
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {tvSeasons.map((season) => (
                    <button
                      key={season.seasonNumber}
                      type="button"
                      onClick={() => selectSeason(pendingTVShow, season)}
                      className="w-full flex gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left"
                    >
                      {season.posterUrl ? (
                        <img src={season.posterUrl} alt={season.name} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-14 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex flex-col justify-center">
                        <p className="font-medium text-gray-900 dark:text-white">{season.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {season.airYear && `${season.airYear} · `}{season.episodeCount} episodes
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Manual entry / review */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Media Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter media title" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type *</label>
                  <select value={type} onChange={(e) => { const t = e.target.value as MediaType; setType(t); setStatus(getDefaultStatus(t)); }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                    <option value={MediaType.MOVIE}>Movie</option>
                    <option value={MediaType.TV_SERIES}>TV Series</option>
                    <option value={MediaType.ANIME}>Anime</option>
                    <option value={MediaType.GAME}>Game</option>
                    <option value={MediaType.BOOK}>Book</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total {type === MediaType.GAME ? 'Hours (estimate)' : type === MediaType.BOOK ? 'Pages' : 'Episodes/Chapters'} *
                  </label>
                  <input type="number" value={totalUnits} onChange={(e) => setTotalUnits(parseInt(e.target.value))} required min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image URL</label>
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Brief description..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Release Year</label>
                <input type="number" value={releaseYear || ''} onChange={(e) => setReleaseYear(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="2024" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(0)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-lg transition">
                  Back
                </button>
                <button type="button" onClick={() => setStep(2)} disabled={!title}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
                  Next: Progress & Status
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Status & rating */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selected media preview */}
              <div className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {imageUrl && <img src={imageUrl} alt={title} className="w-12 h-16 object-cover rounded flex-shrink-0" />}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {type.replace('_', ' ')}{releaseYear ? ` · ${releaseYear}` : ''} · {totalUnits} {unitLabel(type)}
                  </p>
                  <button type="button" onClick={() => setStep(1)}
                    className="text-xs text-blue-500 hover:underline mt-0.5">Edit details</button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Progress & Status</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                <select value={status} onChange={(e) => {
                  const s = e.target.value as Status;
                  setStatus(s);
                  if (s === Status.COMPLETED) {
                    setProgress(totalUnits);
                    if (!endDate) setEndDate(todayStr());
                  }
                }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  {getStatusOptions().map((s) => (
                    <option key={s} value={s}>{formatStatus(s)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Progress (0 – {totalUnits} {unitLabel(type)})
                </label>
                <input type="number" value={progress} onChange={(e) => setProgress(parseInt(e.target.value))} min="0" max={totalUnits}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating (1–10)</label>
                <input type="number" value={rating || ''} onChange={(e) => setRating(e.target.value ? parseInt(e.target.value) : undefined)} min="1" max="10"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Your thoughts..." />
              </div>

              <div className="flex items-center">
                <input type="checkbox" id="favorite" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <label htmlFor="favorite" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Mark as favorite
                </label>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(0)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-lg transition">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
                  {loading ? 'Adding...' : 'Add to Shelf'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};


export default AddMediaModal;
