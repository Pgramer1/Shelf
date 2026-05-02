import React, { useEffect, useRef, useState } from 'react';
import { UserMedia, Status, MediaType, UserMediaRequest } from '../types';
import { Pencil, Trash2, Star, Minus, Plus } from 'lucide-react';
import EditMediaModal from './EditMediaModal';
import { useNavigate } from 'react-router-dom';

interface MediaCardProps {
  userMedia: UserMedia;
  onDelete: (id: number) => void;
  onProgressUpdate: (id: number, data: UserMediaRequest) => Promise<void>;
  onRefresh: () => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ userMedia, onDelete, onProgressUpdate, onRefresh }) => {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localProgress, setLocalProgress] = useState(userMedia.progress);
  const [updating, setUpdating] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [editValue, setEditValue] = useState('');
  const pendingProgressRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalProgress(userMedia.progress);
  }, [userMedia.progress]);

  const toLocalDateTimeString = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const handleProgressChange = async (newProgress: number) => {
    if (newProgress < 0 || newProgress > userMedia.media.totalUnits) return;
    setLocalProgress(newProgress);
    pendingProgressRef.current = newProgress;

    if (updating) return;

    setUpdating(true);
    try {
      let nextProgress = pendingProgressRef.current;
      while (nextProgress !== null) {
        pendingProgressRef.current = null;
        const isNowComplete = nextProgress === userMedia.media.totalUnits;
        const activityAt = toLocalDateTimeString(new Date());
        await onProgressUpdate(userMedia.id, {
          mediaId: userMedia.media.id,
          status: isNowComplete ? Status.COMPLETED : userMedia.status === Status.COMPLETED ? Status.WATCHING : userMedia.status,
          progress: nextProgress,
          rating: userMedia.rating,
          notes: userMedia.notes,
          isFavorite: userMedia.isFavorite,
          startedAt: userMedia.startedAt,
          completedAt: isNowComplete ? activityAt : userMedia.completedAt,
          activityAt,
        });
        nextProgress = pendingProgressRef.current;
      }
    } catch {
      setLocalProgress(userMedia.progress);
      pendingProgressRef.current = null;
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to remove this from your shelf?')) {
      setIsDeleting(true);
      try {
        await onDelete(userMedia.id);
      } catch (error) {
        console.error('Failed to delete:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const statusBadgeClass = () => {
    switch (userMedia.status) {
      case Status.COMPLETED: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case Status.WATCHING: case Status.READING: case Status.PLAYING:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case Status.ON_HOLD: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case Status.DROPPED: return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const formatStatus = (s: string) =>
    s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const progressPercentage = (localProgress / userMedia.media.totalUnits) * 100;
  const unitLabel = () => {
    switch (userMedia.media.type) {
      case MediaType.GAME: return 'hrs';
      case MediaType.BOOK: return 'pages';
      default: return 'ep';
    }
  };

  const openDetails = () => {
    navigate(`/media/${userMedia.media.id}`);
  };

  return (
    <>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition min-w-0 cursor-pointer h-full flex flex-col"
        onClick={openDetails}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetails();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Image */}
        <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700">
          {userMedia.media.imageUrl ? (
            <img
              src={userMedia.media.imageUrl}
              alt={userMedia.media.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Star className="w-16 h-16" />
            </div>
          )}
          
          {/* Favorite Badge */}
          {userMedia.isFavorite && (
            <div className="absolute top-2 right-2 bg-yellow-500 rounded-full p-1.5">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 min-w-0 flex flex-col flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2 min-h-[2.5rem]" title={userMedia.media.title}>
            {userMedia.media.title}
          </h3>
          
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2 min-h-[1rem]">
            <span className="truncate mr-2">{userMedia.media.type.replace('_', ' ')}</span>
            {userMedia.rating && (
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {userMedia.rating}/10
              </span>
            )}
          </div>

          {/* Progress Bar + Incrementor */}
          <div className="mb-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <div className="flex items-center gap-1 min-w-0">
                <button
                  onClick={() => handleProgressChange(localProgress - 1)}
                  disabled={localProgress <= 0}
                  className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-30 transition"
                >
                  <Minus className="w-3 h-3" />
                </button>
                {editingProgress ? (
                  <input
                    type="number"
                    value={editValue}
                    min={0}
                    max={userMedia.media.totalUnits}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => {
                      const val = Math.min(userMedia.media.totalUnits, Math.max(0, parseInt(editValue) || 0));
                      setEditingProgress(false);
                      handleProgressChange(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') { setEditingProgress(false); setEditValue(''); }
                    }}
                    className="w-14 sm:w-16 text-center tabular-nums bg-white dark:bg-gray-700 border border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none"
                  />
                ) : (
                  <span
                    className="w-14 sm:w-16 text-center tabular-nums cursor-pointer hover:text-blue-500 transition truncate"
                    title="Click to edit"
                    onClick={() => { setEditValue(String(localProgress)); setEditingProgress(true); }}
                  >
                    {localProgress}/{userMedia.media.totalUnits} {unitLabel()}
                  </span>
                )}
                <button
                  onClick={() => handleProgressChange(localProgress + 1)}
                  disabled={localProgress >= userMedia.media.totalUnits}
                  className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-30 transition"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-auto pt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className={`inline-block max-w-full truncate px-2 py-1 text-xs font-medium rounded ${statusBadgeClass()}`}>
              {formatStatus(userMedia.status)}
            </span>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                aria-label="Edit media"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
                aria-label="Delete media"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditMediaModal
          userMedia={userMedia}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
};

export default MediaCard;
