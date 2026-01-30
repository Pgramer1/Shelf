import React, { useState } from 'react';
import { UserMedia, Status } from '../types';
import { shelfService } from '../services/shelfService';
import { Pencil, Trash2, Star } from 'lucide-react';
import EditMediaModal from './EditMediaModal';

interface MediaCardProps {
  userMedia: UserMedia;
  onDelete: (id: number) => void;
  onUpdate: () => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ userMedia, onDelete, onUpdate }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const progressPercentage = (userMedia.progress / userMedia.media.totalUnits) * 100;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group">
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

          {/* Actions (show on hover) */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
            {userMedia.media.title}
          </h3>
          
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
            <span>{userMedia.media.type.replace('_', ' ')}</span>
            {userMedia.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {userMedia.rating}/10
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{userMedia.progress}/{userMedia.media.totalUnits}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Status Badge */}
          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
            {userMedia.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Edit Modal */}
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

export default MediaCard;
