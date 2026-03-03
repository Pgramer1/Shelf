import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { shelfService } from '../services/shelfService';
import { UserMedia, MediaType } from '../types';
import { LogOut, Plus, Star } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import AddMediaModal from '../components/AddMediaModal';

const typeLabels: Record<string, string> = {
  ALL: 'All',
  [MediaType.MOVIE]: 'Movies',
  [MediaType.TV_SERIES]: 'TV Series',
  [MediaType.ANIME]: 'Anime',
  [MediaType.BOOK]: 'Books',
  [MediaType.GAME]: 'Games',
};

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
  const [loading, setLoading]           = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => { loadShelfData(); }, []);

  const loadShelfData = async () => {
    setLoading(true);
    try {
      setAllData(await shelfService.getUserShelf());
    } catch (error) {
      console.error('Failed to load shelf data:', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleData = allData.filter((item) => {
    const typeMatch   = activeType   === 'ALL' || item.media.type === activeType;
    const statusMatch = activeStatus === 'ALL' || item.status === activeStatus;
    return typeMatch && statusMatch;
  });

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: branding */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shelf</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.username}</p>
            </div>

            {/* Center: type nav */}
            <nav className="flex items-center gap-1">
              {typeTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTypeChange(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeType === tab
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {typeLabels[tab]}
                </button>
              ))}
            </nav>

            {/* Right: actions */}
            <div className="flex-shrink-0 flex gap-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Add Media
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Secondary: status tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto border-t border-gray-100 dark:border-gray-700 pt-1">
            {/* All statuses pill */}
            <button
              onClick={() => setActiveStatus('ALL')}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                activeStatus === 'ALL'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              All
            </button>
            {statusTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveStatus(tab)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                  activeStatus === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                {statusLabel(tab)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Count bar */}
      {!loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
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
