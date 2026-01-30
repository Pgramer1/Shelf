import React, { useState } from 'react';
import { mediaService } from '../services/mediaService';
import { shelfService } from '../services/shelfService';
import { MediaType, Status } from '../types';
import { X } from 'lucide-react';

interface AddMediaModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddMediaModal: React.FC<AddMediaModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MediaType>(MediaType.MOVIE);
  const [totalUnits, setTotalUnits] = useState(1);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [releaseYear, setReleaseYear] = useState<number | undefined>();
  const [status, setStatus] = useState<Status>(Status.PLAN_TO_WATCH);
  const [progress, setProgress] = useState(0);
  const [rating, setRating] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First, create the media
      const media = await mediaService.createMedia({
        title,
        type,
        totalUnits,
        imageUrl: imageUrl || undefined,
        description: description || undefined,
        releaseYear: releaseYear || undefined,
      });

      // Then add it to user's shelf
      await shelfService.addToShelf({
        mediaId: media.id,
        status,
        progress,
        rating,
        notes: notes || undefined,
        isFavorite,
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
      case MediaType.MOVIE:
      case MediaType.TV_SERIES:
      case MediaType.ANIME:
        return [Status.WATCHING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_WATCH];
      case MediaType.BOOK:
        return [Status.READING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_READ];
      case MediaType.GAME:
        return [Status.PLAYING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_PLAY];
      default:
        return [Status.WATCHING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_WATCH];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add Media to Shelf
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step 1: Media Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Media Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter media title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as MediaType)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={MediaType.MOVIE}>Movie</option>
                    <option value={MediaType.TV_SERIES}>TV Series</option>
                    <option value={MediaType.ANIME}>Anime</option>
                    <option value={MediaType.GAME}>Game</option>
                    <option value={MediaType.BOOK}>Book</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Episodes/Chapters *
                  </label>
                  <input
                    type="number"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(parseInt(e.target.value))}
                    required
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Brief description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Release Year
                </label>
                <input
                  type="number"
                  value={releaseYear || ''}
                  onChange={(e) => setReleaseYear(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="2024"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              >
                Next: Progress & Status
              </button>
            </div>
          )}

          {/* Step 2: Progress & Status */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Progress & Status</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Progress (0 - {totalUnits})
                </label>
                <input
                  type="number"
                  value={progress}
                  onChange={(e) => setProgress(parseInt(e.target.value))}
                  min="0"
                  max={totalUnits}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
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
                  id="favorite"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="favorite" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Mark as favorite
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add to Shelf'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddMediaModal;
