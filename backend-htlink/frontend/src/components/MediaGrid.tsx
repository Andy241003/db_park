import { faStar, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { getApiBaseUrl } from '../utils/api';

interface MediaGridProps {
  /** List of media IDs to display */
  mediaIds: number[];
  /** ID of the primary/featured image */
  primaryImageMediaId?: number;
  /** Callback when remove button is clicked */
  onRemove: (mediaId: number) => void;
  /** Callback when set as primary button is clicked */
  onSetPrimary: (mediaId: number) => void;
  /** Number of columns for responsive grid (default: 4 on desktop, 2 on mobile) */
  columns?: number;
  /** Height of each grid item in pixels */
  gridItemHeight?: number;
  /** Alt text for images */
  altText?: string;
}

/**
 * MediaGrid component
 * Displays a grid of media items with options to remove and set as primary
 * Reusable across different pages (Careers, Spaces, Menu, etc.)
 */
const MediaGrid: React.FC<MediaGridProps> = ({
  mediaIds,
  primaryImageMediaId,
  onRemove,
  onSetPrimary,
  columns = 4,
  gridItemHeight = 96,
  altText = 'Media item',
}) => {
  if (mediaIds.length === 0) {
    return null;
  }

  const apiBaseUrl = getApiBaseUrl();

  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 md:grid-cols-${columns}`}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${gridItemHeight}px, 1fr))`,
      }}
    >
      {mediaIds.map((mediaId) => {
        const isPrimary = primaryImageMediaId === mediaId;
        return (
          <div
            key={mediaId}
            className="group relative overflow-hidden rounded-md border border-slate-200 bg-slate-50"
            style={{ height: `${gridItemHeight}px` }}
          >
            <img
              src={`${apiBaseUrl}/media/${mediaId}/view`}
              alt={`${altText} ${mediaId}`}
              className="h-full w-full object-cover"
            />
            {isPrimary && (
              <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white">
                <FontAwesomeIcon icon={faStar} />
                Primary
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onRemove(mediaId)}
                className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                title="Remove image"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MediaGrid;

