import React, { useState } from 'react';
import { shelfService } from '../services/shelfService';
import { UserMedia, Status } from '../types';
import { X } from 'lucide-react';

interface EditMediaModalProps {
  userMedia: UserMedia;
  onClose: () => void;
  onSuccess: () => void;
}

const EditMediaModal: React.FC<EditMediaModalProps> = ({ userMedia, onClose, onSuccess }) => {
  const [status, setStatus] = useState<Status>(userMedia.status);
  const [progress, setProgress] = useState(userMedia.progress);
  const [rating, setRating] = useState<number | undefined>(userMedia.rating);
  const [notes, setNotes] = useState(userMedia.notes || '');
  const [isFavorite, setIsFavorite] = useState(userMedia.isFavorite);
  const [startDate, setStartDate] = useState(userMedia.startedAt ? userMedia.startedAt.slice(0, 10) : '');
  const [endDate, setEndDate] = useState(userMedia.completedAt ? userMedia.completedAt.slice(0, 10) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const localDateTimeNow = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await shelfService.updateMedia(userMedia.id, {
        mediaId: userMedia.media.id,
        status,
        progress,
        rating,
        notes: notes || undefined,
        isFavorite,
        startedAt: startDate ? `${startDate}T00:00:00` : undefined,
        completedAt: endDate ? `${endDate}T00:00:00` : undefined,
        activityAt: localDateTimeNow(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressIncrement = () => {
    if (progress < userMedia.media.totalUnits) {
      setProgress(progress + 1);
    }
  };

  const getStatusOptions = () => {
    const type = userMedia.media.type;
    switch (type) {
      case 'MOVIE':
      case 'TV_SERIES':
      case 'ANIME':
        return [Status.WATCHING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_WATCH];
      case 'BOOK':
        return [Status.READING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_READ];
      case 'GAME':
        return [Status.PLAYING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_PLAY];
      default:
        return [Status.WATCHING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_WATCH];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Edit: {userMedia.media.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                const nextStatus = e.target.value as Status;
                setStatus(nextStatus);
                if (nextStatus === Status.COMPLETED && !endDate) {
                  const now = new Date();
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const day = String(now.getDate()).padStart(2, '0');
                  setEndDate(`${year}-${month}-${day}`);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {getStatusOptions().map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress
              </label>
              <button
                type="button"
                onClick={handleProgressIncrement}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition"
              >
                +1
              </button>
            </div>
            <input
              type="number"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              min="0"
              max={userMedia.media.totalUnits}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max: {userMedia.media.totalUnits}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rating (1-10)
            </label>
            <input
              type="number"
              value={rating || ''}
              onChange={(e) => setRating(e.target.value ? parseInt(e.target.value) : undefined)}
              min="1"
              max="10"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Your thoughts..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="edit-favorite"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="edit-favorite" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Mark as favorite
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMediaModal;
