import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { shelfService } from '../services/shelfService';
import { HeatmapDayActivity, UserMedia, MediaType } from '../types';
import {
  BarChart3,
  ChevronDown,
  LayoutGrid,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  SlidersHorizontal,
  Star,
  Sun,
} from 'lucide-react';
import MediaCard from '../components/MediaCard';
import AddMediaModal from '../components/AddMediaModal';
import ActivityHeatmap from '../components/ActivityHeatmap';
import ConsumptionByTypeChart from '../components/ConsumptionByTypeChart';

const typeLabels: Record<string, string> = {
  ALL: 'All',
  [MediaType.MOVIE]: 'Movies',
  [MediaType.TV_SERIES]: 'TV Series',
  [MediaType.ANIME]: 'Anime',
  [MediaType.BOOK]: 'Books',
  [MediaType.GAME]: 'Games',
};

type SortOption =
  | 'UPDATED_DESC'
  | 'UPDATED_ASC'
  | 'RATING_DESC'
  | 'RATING_ASC'
  | 'TITLE_ASC'
  | 'PROGRESS_DESC';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'UPDATED_DESC', label: 'Date: Recent first' },
  { value: 'UPDATED_ASC', label: 'Date: Oldest first' },
  { value: 'RATING_DESC', label: 'Rating: High to low' },
  { value: 'RATING_ASC', label: 'Rating: Low to high' },
  { value: 'TITLE_ASC', label: 'Title: A to Z' },
  { value: 'PROGRESS_DESC', label: 'Progress: Most completed' },
];

const statusLabel = (s: string) =>
  s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const getStatusTabs = (type: string): string[] => {
  const base = ['COMPLETED', 'ON_HOLD', 'DROPPED'];
  switch (type) {
    case MediaType.BOOK:     return ['READING',  ...base, 'PLAN_TO_READ'];
    case MediaType.GAME:     return ['PLAYING',  ...base, 'PLAN_TO_PLAY'];
    case MediaType.MOVIE:
    case MediaType.TV_SERIES:
    case MediaType.ANIME:   return ['WATCHING', ...base, 'PLAN_TO_WATCH'];
    default:                return ['WATCHING', 'READING', 'PLAYING', ...base, 'PLAN_TO_WATCH', 'PLAN_TO_READ', 'PLAN_TO_PLAY'];
  }
};

const Shelf: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeType, setActiveType]     = useState<string>('ALL');
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [allData, setAllData]           = useState<UserMedia[]>([]);
  const [heatmapData, setHeatmapData]   = useState<HeatmapDayActivity[]>([]);
  const [loading, setLoading]           = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('UPDATED_DESC');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<'collection' | 'insights'>('collection');

  useEffect(() => { loadShelfData(); }, []);

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

  const loadShelfData = async () => {
    setLoading(true);
    try {
      const [shelf, heatmap] = await Promise.all([
        shelfService.getUserShelf(),
        shelfService.getConsumptionHeatmap(730),
      ]);
      setAllData(shelf);
      setHeatmapData(heatmap);
    } catch (error) {
      console.error('Failed to load shelf data:', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleData = useMemo(() => {
    const filtered = allData.filter((item) => {
      const typeMatch = activeType === 'ALL' || item.media.type === activeType;
      const statusMatch = activeStatus === 'ALL' || item.status === activeStatus;
      return typeMatch && statusMatch;
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
  }, [allData, activeType, activeStatus, sortBy]);

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    setActiveStatus('ALL');
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
    const statusPart = activeStatus === 'ALL' ? '' : ` · ${statusLabel(activeStatus)}`;
    return `${visibleData.length} ${typePart}${statusPart}`;
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
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="mb-4 inline-flex items-center justify-center h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition"
              aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveSection('collection')}
                className={`w-full inline-flex items-center ${isSidebarOpen ? 'justify-start px-3' : 'justify-center'} h-11 rounded-lg text-sm font-medium transition ${activeSection === 'collection'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                {isSidebarOpen && <span className="ml-2">Your Collection</span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('insights')}
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

        <div className="flex-1 min-w-0">
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
                    onClick={logout}
                    className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 sm:px-4 h-10 rounded-lg transition whitespace-nowrap"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </div>

              <div className="sm:hidden grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveSection('collection')}
                  className={`h-10 rounded-lg text-sm font-medium transition ${activeSection === 'collection'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                >
                  Your Collection
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('insights')}
                  className={`h-10 rounded-lg text-sm font-medium transition ${activeSection === 'insights'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                >
                  Insights
                </button>
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

                  <div className={`${showMobileFilters ? 'grid' : 'hidden'} md:grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-gray-100 dark:border-gray-700 pt-3`}>
                    <label className="min-w-0">
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

                    <label className="min-w-0">
                      <span className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</span>
                      <select
                        value={activeStatus}
                        onChange={(e) => {
                          setActiveStatus(e.target.value);
                          setShowMobileFilters(false);
                        }}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg h-10 px-3 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ALL">All</option>
                        {statusTabs.map((tab) => (
                          <option key={tab} value={tab}>{statusLabel(tab)}</option>
                        ))}
                      </select>
                    </label>

                    <label className="min-w-0">
                      <span className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <SlidersHorizontal className="w-3 h-3" /> Sort By
                      </span>
                      <select
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value as SortOption);
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
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-2">
                    <ActivityHeatmap activityDays={heatmapData} />
                  </div>
                  <div>
                    <ConsumptionByTypeChart allData={allData} />
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
    </div>
  );
};

export default Shelf;
