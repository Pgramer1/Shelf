import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { shelfService } from '../services/shelfService';
import { HeatmapDayActivity, UserMedia, MediaType } from '../types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  CollectionSortOption,
  setActiveStatus as setActiveStatusFilter,
  setActiveType as setActiveTypeFilter,
  setSortBy as setSortByFilter,
} from '../store/collectionFiltersSlice';
import {
  setShelfActiveSection,
  setShelfDesktopCollectionViewMode,
  setShelfMobileCollectionViewMode,
  setShelfSearchQuery,
  setShelfSidebarOpen,
} from '../store/shelfUiSlice';
import {
  BarChart3,
  ChevronDown,
  LayoutGrid,
  List,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MediaCard from '../components/MediaCard';
import AddMediaModal from '../components/AddMediaModal';
import ActivityHeatmap from '../components/ActivityHeatmap';
import RatingDistributionChart from '../components/RatingDistributionChart';
import FavoritesBreakdownChart from '../components/FavoritesBreakdownChart';
import MonthlyRatingTrendChart from '../components/MonthlyRatingTrendChart';
import CompletionFunnelChart from '../components/CompletionFunnelChart';
import MediaListRow from '../components/MediaListRow';

const typeLabels: Record<string, string> = {
  ALL: 'All',
  [MediaType.MOVIE]: 'Movies',
  [MediaType.TV_SERIES]: 'TV Series',
  [MediaType.ANIME]: 'Anime',
  [MediaType.BOOK]: 'Books',
  [MediaType.GAME]: 'Games',
};

const sortOptions: { value: CollectionSortOption; label: string }[] = [
  { value: 'UPDATED_DESC', label: 'Date: Recent first' },
  { value: 'UPDATED_ASC', label: 'Date: Oldest first' },
  { value: 'RATING_DESC', label: 'Rating: High to low' },
  { value: 'RATING_ASC', label: 'Rating: Low to high' },
  { value: 'TITLE_ASC', label: 'Title: A to Z' },
  { value: 'PROGRESS_DESC', label: 'Progress: Most completed' },
];

const IN_PROGRESS_FILTER = 'IN_PROGRESS';
const PLANNED_FILTER = 'PLANNED';
const AUTO_REFRESH_INTERVAL_MS = 60_000;

const inProgressStatuses = new Set(['WATCHING', 'READING', 'PLAYING']);
const plannedStatuses = new Set(['PLAN_TO_WATCH', 'PLAN_TO_READ', 'PLAN_TO_PLAY']);

const matchesStatusFilter = (status: string, filter: string) => {
  if (filter === 'ALL') return true;
  if (filter === IN_PROGRESS_FILTER) return inProgressStatuses.has(status);
  if (filter === PLANNED_FILTER) return plannedStatuses.has(status);
  return status === filter;
};

const statusLabel = (s: string) =>
  s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const statusFilterLabel = (s: string) => {
  if (s === IN_PROGRESS_FILTER) return 'In Progress';
  if (s === PLANNED_FILTER) return 'Planned';
  return statusLabel(s);
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const getStatusTabs = (type: string): string[] => {
  const base = ['COMPLETED', 'ON_HOLD', 'DROPPED'];
  switch (type) {
    case MediaType.BOOK:     return [IN_PROGRESS_FILTER, ...base, PLANNED_FILTER];
    case MediaType.GAME:     return [IN_PROGRESS_FILTER, ...base, PLANNED_FILTER];
    case MediaType.MOVIE:
    case MediaType.TV_SERIES:
    case MediaType.ANIME:   return [IN_PROGRESS_FILTER, ...base, PLANNED_FILTER];
    default:                return [IN_PROGRESS_FILTER, ...base, PLANNED_FILTER];
  }
};

const Shelf: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { activeType, activeStatus, sortBy } = useAppSelector((state) => state.collectionFilters);
  const {
    activeSection,
    searchQuery,
    isSidebarOpen,
    mobileCollectionViewMode,
    desktopCollectionViewMode,
  } = useAppSelector((state) => state.shelfUi);
  const [allData, setAllData]           = useState<UserMedia[]>([]);
  const [heatmapData, setHeatmapData]   = useState<HeatmapDayActivity[]>([]);
  const [loading, setLoading]           = useState(true);
  const [isShelfUsingCachedData, setIsShelfUsingCachedData] = useState(false);
  const [isHeatmapUsingCachedData, setIsHeatmapUsingCachedData] = useState(false);
  const [shelfLastSyncedAt, setShelfLastSyncedAt] = useState<string | null>(null);
  const [heatmapLastSyncedAt, setHeatmapLastSyncedAt] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const isRefreshInFlightRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = stored ? stored === 'dark' : prefersDark;
    setIsDarkMode(shouldUseDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const filteredByFacet = useMemo(() => {
    return allData.filter((item) => {
      const typeMatch = activeType === 'ALL' || item.media.type === activeType;
      const statusMatch = matchesStatusFilter(item.status, activeStatus);
      return typeMatch && statusMatch;
    });
  }, [allData, activeType, activeStatus]);

  const suggestionItems = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return [] as UserMedia[];

    const ranked = filteredByFacet
      .map((item) => {
        const title = item.media.title || '';
        const normalizedTitle = normalizeText(title);
        if (!normalizedTitle.includes(query)) {
          return null;
        }

        const startsWith = normalizedTitle.startsWith(query);
        return {
          item,
          score: startsWith ? 2 : 1,
          updatedAt: new Date(item.updatedAt).getTime(),
        };
      })
      .filter((value): value is { item: UserMedia; score: number; updatedAt: number } => value !== null)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.updatedAt - a.updatedAt;
      });

    const seen = new Set<string>();
    const unique = ranked
      .map((entry) => entry.item)
      .filter((item) => {
        const key = normalizeText(item.media.title || '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return unique.slice(0, 6);
  }, [filteredByFacet, searchQuery]);

  const loadShelfData = useCallback(async (options?: { silent?: boolean }) => {
    if (isRefreshInFlightRef.current) {
      return;
    }

    isRefreshInFlightRef.current = true;

    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const [shelfResult, heatmapResult] = await Promise.all([
        shelfService.getUserShelfCached(),
        shelfService.getConsumptionHeatmapCached(730),
      ]);
      setAllData(shelfResult.data);
      setHeatmapData(heatmapResult.data);

      setIsShelfUsingCachedData(shelfResult.source === 'cache');
      setIsHeatmapUsingCachedData(heatmapResult.source === 'cache');
      setShelfLastSyncedAt(shelfResult.cachedAt ?? null);
      setHeatmapLastSyncedAt(heatmapResult.cachedAt ?? null);
    } catch (error) {
      console.error('Failed to load shelf data:', error);
      setIsShelfUsingCachedData(false);
      setIsHeatmapUsingCachedData(false);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }

      isRefreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadShelfData();
  }, [loadShelfData]);

  const isUsingCachedData = useMemo(() => {
    if (activeSection === 'collection') {
      return isShelfUsingCachedData;
    }

    return isShelfUsingCachedData || isHeatmapUsingCachedData;
  }, [activeSection, isShelfUsingCachedData, isHeatmapUsingCachedData]);

  const lastSyncedAt = useMemo(() => {
    if (activeSection === 'collection') {
      return shelfLastSyncedAt;
    }

    const timestamps = [shelfLastSyncedAt, heatmapLastSyncedAt]
      .filter((value): value is string => Boolean(value));

    if (timestamps.length === 0) {
      return null;
    }

    return [...timestamps].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }, [activeSection, shelfLastSyncedAt, heatmapLastSyncedAt]);

  useEffect(() => {
    const refreshIfOnline = () => {
      if (!navigator.onLine) return;
      void loadShelfData({ silent: true });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshIfOnline();
      }
    };

    window.addEventListener('online', refreshIfOnline);
    window.addEventListener('focus', refreshIfOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshIfOnline();
      }
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', refreshIfOnline);
      window.removeEventListener('focus', refreshIfOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [loadShelfData]);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncedAt) return null;

    const parsed = new Date(lastSyncedAt);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [lastSyncedAt]);

  const visibleData = useMemo(() => {
    const query = normalizeText(searchQuery);
    const tokens = query.length > 0 ? query.split(/\s+/).filter(Boolean) : [];
    const filtered = filteredByFacet.filter((item) => {
      if (tokens.length === 0) return true;

      const haystack = normalizeText([
        item.media.title,
        item.media.type,
        item.status,
        item.notes || '',
        item.media.releaseYear ? String(item.media.releaseYear) : '',
      ].join(' '));

      return tokens.every((token) => haystack.includes(token));
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'UPDATED_DESC') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'UPDATED_ASC') return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      if (sortBy === 'RATING_DESC') return (b.rating ?? -1) - (a.rating ?? -1);
      if (sortBy === 'RATING_ASC') return (a.rating ?? 11) - (b.rating ?? 11);
      if (sortBy === 'TITLE_ASC') return a.media.title.localeCompare(b.media.title);

      const aPct = a.media.totalUnits > 0 ? a.progress / a.media.totalUnits : 0;
      const bPct = b.media.totalUnits > 0 ? b.progress / b.media.totalUnits : 0;
      return bPct - aPct;
    });

    return sorted;
  }, [filteredByFacet, searchQuery, sortBy]);

  const commitSuggestion = (item: UserMedia) => {
    dispatch(setShelfSearchQuery(item.media.title));
    setIsSearchFocused(false);
    setActiveSuggestionIndex(-1);
  };

  const handleSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (suggestionItems.length === 0) return;
      setActiveSuggestionIndex((prev) => (prev + 1) % suggestionItems.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (suggestionItems.length === 0) return;
      setActiveSuggestionIndex((prev) => (prev <= 0 ? suggestionItems.length - 1 : prev - 1));
      return;
    }

    if (event.key === 'Tab') {
      if (suggestionItems.length > 0 && searchQuery.trim()) {
        event.preventDefault();
        const picked = suggestionItems[Math.max(activeSuggestionIndex, 0)];
        commitSuggestion(picked);
      }
      return;
    }

    if (event.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && suggestionItems[activeSuggestionIndex]) {
        event.preventDefault();
        commitSuggestion(suggestionItems[activeSuggestionIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
      setIsSearchFocused(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const handleTypeChange = (type: string) => {
    dispatch(setActiveTypeFilter(type));
  };

  const handleDelete = async (id: number) => {
    try {
      await shelfService.deleteFromShelf(id);
      loadShelfData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const typeTabs   = ['ALL', ...Object.values(MediaType)];
  const statusTabs = getStatusTabs(activeType);

  const countLabel = () => {
    const typePart   = activeType   === 'ALL' ? 'items' : typeLabels[activeType].toLowerCase();
    const statusPart = activeStatus === 'ALL' ? '' : ` · ${statusFilterLabel(activeStatus)}`;
    const searchPart = searchQuery.trim() ? ` · Search: "${searchQuery.trim()}"` : '';
    return `${visibleData.length} ${typePart}${statusPart}${searchPart}`;
  };

  const cycleMobileViewMode = () => {
    const nextMode = mobileCollectionViewMode === 'single'
      ? 'double'
      : mobileCollectionViewMode === 'double'
        ? 'list'
        : 'single';
    dispatch(setShelfMobileCollectionViewMode(nextMode));
  };

  const cycleDesktopViewMode = () => {
    dispatch(setShelfDesktopCollectionViewMode(desktopCollectionViewMode === 'cards' ? 'list' : 'cards'));
  };

  const mobileViewTitle = mobileCollectionViewMode === 'single'
    ? 'One at a time view'
    : mobileCollectionViewMode === 'double'
      ? 'Two at a time view'
      : 'List view';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="flex min-h-screen">
        <aside
          className={`${isSidebarOpen ? 'w-56' : 'w-16'} hidden sm:block border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300`}
        >
          <div className="sticky top-0 h-screen p-3 flex flex-col">
            <button
              type="button"
              onClick={() => dispatch(setShelfSidebarOpen(!isSidebarOpen))}
              className="mb-4 inline-flex items-center justify-center h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition"
              aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => dispatch(setShelfActiveSection('collection'))}
                className={`w-full inline-flex items-center ${isSidebarOpen ? 'justify-start px-3' : 'justify-center'} h-11 rounded-lg text-sm font-medium transition ${activeSection === 'collection'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                {isSidebarOpen && <span className="ml-2">Your Collection</span>}
              </button>

              <button
                type="button"
                onClick={() => dispatch(setShelfActiveSection('insights'))}
                className={`w-full inline-flex items-center ${isSidebarOpen ? 'justify-start px-3' : 'justify-center'} h-11 rounded-lg text-sm font-medium transition ${activeSection === 'insights'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                <BarChart3 className="w-4 h-4" />
                {isSidebarOpen && <span className="ml-2">Insights</span>}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 pb-20 sm:pb-0">
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">Shelf</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px] sm:max-w-[280px]">{user?.username}</p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={cycleMobileViewMode}
                    className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition"
                    aria-label={mobileViewTitle}
                    title={mobileViewTitle}
                  >
                    {mobileCollectionViewMode === 'single' ? (
                      <span className="inline-flex h-5 w-4 items-center justify-center rounded-sm border-2 border-current" />
                    ) : mobileCollectionViewMode === 'double' ? (
                      <span className="grid h-5 w-6 grid-cols-2 gap-1">
                        <span className="rounded-sm border-2 border-current" />
                        <span className="rounded-sm border-2 border-current" />
                      </span>
                    ) : (
                      <List className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={cycleDesktopViewMode}
                    className="hidden sm:inline-flex items-center justify-center h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition"
                    aria-label={desktopCollectionViewMode === 'cards' ? 'Cards view' : 'List view'}
                    title={desktopCollectionViewMode === 'cards' ? 'Cards view' : 'List view'}
                  >
                    {desktopCollectionViewMode === 'cards' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDarkMode((prev) => !prev)}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition"
                    aria-label="Toggle theme"
                    title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 h-10 rounded-lg transition whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Media</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="hidden sm:inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 sm:px-4 h-10 rounded-lg transition whitespace-nowrap"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center sm:gap-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 px-3 sm:px-4 h-10 rounded-lg transition whitespace-nowrap"
                    aria-label="Log out"
                    title="Log out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Log out</span>
                  </button>
                </div>
              </div>

              {activeSection === 'collection' && (
                <>
                  <div className="md:hidden border-t border-gray-100 dark:border-gray-700 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowMobileFilters((prev) => !prev)}
                      className="w-full inline-flex items-center justify-between px-3 h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200"
                    >
                      <span className="inline-flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Filters and Sort</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  <div className={`${showMobileFilters ? 'grid' : 'hidden'} md:grid grid-cols-1 md:grid-cols-12 gap-3 border-t border-gray-100 dark:border-gray-700 pt-3`}>
                    <div className="min-w-0 md:col-span-12" ref={searchBoxRef}>
                      <span className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Search Collection</span>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          value={searchQuery}
                          onChange={(e) => {
                            dispatch(setShelfSearchQuery(e.target.value));
                            setIsSearchFocused(true);
                            setActiveSuggestionIndex(-1);
                          }}
                          onFocus={() => setIsSearchFocused(true)}
                          onKeyDown={handleSearchKeyDown}
                          placeholder="Search title, status, notes, year..."
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg h-10 pl-10 pr-10 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Search your shelf"
                        />
                        {searchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              dispatch(setShelfSearchQuery(''));
                              setActiveSuggestionIndex(-1);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                            aria-label="Clear search"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        {isSearchFocused && searchQuery.trim() && suggestionItems.length > 0 && (
                          <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                            {suggestionItems.map((suggestion, index) => (
                              <button
                                key={`${suggestion.id}-${suggestion.media.title}`}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => commitSuggestion(suggestion)}
                                className={`w-full px-3 py-2 text-left text-sm transition ${index === activeSuggestionIndex
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                              >
                                <span className="font-medium">{suggestion.media.title}</span>
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                  {typeLabels[suggestion.media.type]} · {statusFilterLabel(suggestion.status)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <label className="min-w-0 md:col-span-4">
                      <span className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Type</span>
                      <select
                        value={activeType}
                        onChange={(e) => {
                          handleTypeChange(e.target.value);
                          setShowMobileFilters(false);
                        }}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg h-10 px-3 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {typeTabs.map((tab) => (
                          <option key={tab} value={tab}>{typeLabels[tab]}</option>
                        ))}
                      </select>
                    </label>

                    <label className="min-w-0 md:col-span-4">
                      <span className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</span>
                      <select
                        value={activeStatus}
                        onChange={(e) => {
                          dispatch(setActiveStatusFilter(e.target.value));
                          setShowMobileFilters(false);
                        }}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg h-10 px-3 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ALL">All</option>
                        {statusTabs.map((tab) => (
                          <option key={tab} value={tab}>{statusFilterLabel(tab)}</option>
                        ))}
                      </select>
                    </label>

                    <label className="min-w-0 md:col-span-4">
                      <span className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <SlidersHorizontal className="w-3 h-3" /> Sort By
                      </span>
                      <select
                        value={sortBy}
                        onChange={(e) => {
                          dispatch(setSortByFilter(e.target.value as CollectionSortOption));
                          setShowMobileFilters(false);
                        }}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg h-10 px-3 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {sortOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                  </div>
                </>
              )}
            </div>
          </header>

          {isUsingCachedData && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                Showing cached data due to a recent connectivity or server issue.
                {lastSyncLabel ? ` Last sync: ${lastSyncLabel}.` : ''}
              </div>
            </div>
          )}

          {activeSection === 'insights' && (
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              ) : allData.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No insights yet</h3>
                  <p className="text-gray-600 dark:text-gray-400">Add media and update progress to unlock activity analytics.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <ActivityHeatmap activityDays={heatmapData} />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <RatingDistributionChart allData={allData} />
                    <FavoritesBreakdownChart allData={allData} />
                    <MonthlyRatingTrendChart allData={allData} />
                    <CompletionFunnelChart allData={allData} />
                  </div>
                </div>
              )}
            </main>
          )}

          {activeSection === 'collection' && (
            <>
              {!loading && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {countLabel()}
                  </p>
                </div>
              )}

              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                  </div>
                ) : visibleData.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
                      <Star className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No media found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Start building your collection by adding media</p>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
                    >
                      <Plus className="w-5 h-5" />
                      Add Your First Media
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="md:hidden">
                      {mobileCollectionViewMode === 'list' ? (
                        <div className="space-y-3">
                          {visibleData.map((item) => (
                            <MediaListRow
                              key={item.id}
                              userMedia={item}
                              onDelete={handleDelete}
                              onUpdate={loadShelfData}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className={`grid ${mobileCollectionViewMode === 'single' ? 'grid-cols-1 gap-6' : 'grid-cols-2 gap-4 sm:gap-5'}`}>
                          {visibleData.map((item) => (
                            <div key={item.id} className={mobileCollectionViewMode === 'single' ? 'max-w-md w-full mx-auto' : ''}>
                              <MediaCard
                                userMedia={item}
                                onDelete={handleDelete}
                                onUpdate={loadShelfData}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="hidden md:block">
                      {desktopCollectionViewMode === 'list' ? (
                        <div className="space-y-3">
                          {visibleData.map((item) => (
                            <MediaListRow
                              key={item.id}
                              userMedia={item}
                              onDelete={handleDelete}
                              onUpdate={loadShelfData}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                          {visibleData.map((item) => (
                            <MediaCard
                              key={item.id}
                              userMedia={item}
                              onDelete={handleDelete}
                              onUpdate={loadShelfData}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </main>
            </>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <AddMediaModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => { setIsAddModalOpen(false); loadShelfData(); }}
        />
      )}

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => dispatch(setShelfActiveSection('collection'))}
            className={`h-11 rounded-lg inline-flex items-center justify-center transition ${activeSection === 'collection'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            aria-label="Open collection"
            title="Collection"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => dispatch(setShelfActiveSection('insights'))}
            className={`h-11 rounded-lg inline-flex items-center justify-center transition ${activeSection === 'insights'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            aria-label="Open insights"
            title="Insights"
          >
            <BarChart3 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="h-11 rounded-lg inline-flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Open profile"
            title="Profile"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Shelf;
