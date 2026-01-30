import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { shelfService } from '../services/shelfService';
import { UserMedia, Status, MediaType } from '../types';
import { LogOut, Plus, Film, Tv, Gamepad, Book, Star } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import AddMediaModal from '../components/AddMediaModal';

const statusLabels: Record<string, string> = {
  ALL: 'All',
  WATCHING: 'Watching',
  READING: 'Reading',
  PLAYING: 'Playing',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
  PLAN_TO_WATCH: 'Plan to Watch',
  PLAN_TO_READ: 'Plan to Read',
  PLAN_TO_PLAY: 'Plan to Play',
};

const Shelf: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [shelfData, setShelfData] = useState<UserMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadShelfData();
  }, [activeTab]);

  const loadShelfData = async () => {
    setLoading(true);
    try {
      let data: UserMedia[];
      if (activeTab === 'ALL') {
        data = await shelfService.getUserShelf();
      } else {
        data = await shelfService.getUserShelfByStatus(activeTab as Status);
      }
      setShelfData(data);
    } catch (error) {
      console.error('Failed to load shelf data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await shelfService.deleteFromShelf(id);
      loadShelfData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleUpdate = () => {
    loadShelfData();
  };

  const getMediaTypeIcon = (type: MediaType) => {
    switch (type) {
      case MediaType.MOVIE:
      case MediaType.ANIME:
        return <Film className="w-4 h-4" />;
      case MediaType.TV_SERIES:
        return <Tv className="w-4 h-4" />;
      case MediaType.GAME:
        return <Gamepad className="w-4 h-4" />;
      case MediaType.BOOK:
        return <Book className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const tabs = ['ALL', 'WATCHING', 'READING', 'PLAYING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLAN_TO_WATCH', 'PLAN_TO_READ', 'PLAN_TO_PLAY'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shelf</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Welcome, {user?.username}</p>
            </div>
            <div className="flex gap-3">
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
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {statusLabels[tab]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : shelfData.length === 0 ? (
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
            {shelfData.map((item) => (
              <MediaCard
                key={item.id}
                userMedia={item}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Media Modal */}
      {isAddModalOpen && (
        <AddMediaModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadShelfData();
          }}
        />
      )}
    </div>
  );
};

export default Shelf;
