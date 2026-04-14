import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { MediaType, Status, UserMedia } from '../types';
import { shelfService } from '../services/shelfService';
import EditMediaModal from './EditMediaModal';

interface MediaListRowProps {
  userMedia: UserMedia;
  onDelete: (id: number) => void;
  onUpdate: () => void;
}

const MediaListRow: React.FC<MediaListRowProps> = ({ userMedia, onDelete, onUpdate }) => {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localProgress, setLocalProgress] = useState(userMedia.progress);
  const [updating, setUpdating] = useState(false);

  const toLocalDateTimeString = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const totalUnits = Math.max(userMedia.media.totalUnits, 0);
  const progressPercentage = totalUnits > 0 ? (localProgress / totalUnits) * 100 : 0;

  const formatStatus = (s: string) =>
    s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const unitLabel = () => {
    switch (userMedia.media.type) {
      case MediaType.GAME:
        return 'hrs';
      case MediaType.BOOK:
        return 'pages';
      default:
        return 'ep';
    }
  };

  const handleProgressChange = async (newProgress: number) => {
    if (newProgress < 0 || newProgress > totalUnits || updating || totalUnits === 0) return;
    setLocalProgress(newProgress);
    setUpdating(true);

    try {
      const isNowComplete = newProgress === totalUnits;
      const activityAt = toLocalDateTimeString(new Date());
      await shelfService.updateMedia(userMedia.id, {
        mediaId: userMedia.media.id,
        status:
          isNowComplete
            ? Status.COMPLETED
            : userMedia.status === Status.COMPLETED
              ? Status.WATCHING
              : userMedia.status,
        progress: newProgress,
        rating: userMedia.rating,
        notes: userMedia.notes,
        isFavorite: userMedia.isFavorite,
        startedAt: userMedia.startedAt,
        completedAt: isNowComplete ? activityAt : userMedia.completedAt,
        activityAt,
      });
      onUpdate();
    } catch {
      setLocalProgress(userMedia.progress);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove this from your shelf?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(userMedia.id);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDetails = () => {
    navigate(`/media/${userMedia.media.id}`);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openDetails}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDetails();
          }
        }}
        className="group flex items-stretch gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-sm hover:shadow-md transition cursor-pointer"
      >
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
          {userMedia.media.imageUrl ? (
            <img
              src={userMedia.media.imageUrl}
              alt={userMedia.media.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              <Star className="w-7 h-7" />
            </div>
          )}
          {userMedia.isFavorite && (
            <div className="absolute right-1 top-1 rounded-full bg-yellow-500 p-1">
              <Star className="h-3 w-3 fill-white text-white" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-between py-1">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white line-clamp-2">
                {userMedia.media.title}
              </h3>
              {userMedia.rating !== undefined && userMedia.rating !== null && (
                <span className="inline-flex items-center gap-1 shrink-0 text-xs sm:text-sm font-semibold text-yellow-500">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {userMedia.rating}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
              {userMedia.media.type.replace('_', ' ')}
              {userMedia.media.releaseYear ? ` • ${userMedia.media.releaseYear}` : ''}
              {' • '}
              {formatStatus(userMedia.status)}
            </p>
          </div>

          <div className="mt-2" onClick={(event) => event.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{localProgress}/{totalUnits} {unitLabel()}</span>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleProgressChange(localProgress - 1)}
                  disabled={localProgress <= 0 || updating || totalUnits === 0}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
                  aria-label="Decrease progress"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleProgressChange(localProgress + 1)}
                  disabled={localProgress >= totalUnits || updating || totalUnits === 0}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                  aria-label="Increase progress"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            aria-label="Edit media"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
            aria-label="Delete media"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isEditModalOpen && (
        <EditMediaModal
          userMedia={userMedia}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
};

export default MediaListRow;
