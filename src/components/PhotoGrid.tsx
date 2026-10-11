'use client';

import { useState } from 'react';
import { LayoutGrid, List, ChevronDown, ChevronUp, ImageIcon } from 'lucide-react';
import { Photo } from '../types';
import { PhotoCard } from './PhotoCard';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PhotoGridProps {
  photos: Photo[];
  onToggleSelect: (id: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

// Number of photos shown in the collapsed ("fit one screen") state.
// Anything beyond this is revealed via the "Show all" dropdown toggle.
const COLLAPSED_LIMIT = 8;

export function PhotoGrid({ photos, onToggleSelect, viewMode, onViewModeChange }: PhotoGridProps) {
  const selectedCount = photos.filter((p) => p.selected).length;
  const [expanded, setExpanded] = useState(false);

  const hasOverflow = photos.length > COLLAPSED_LIMIT;
  const visiblePhotos = expanded || !hasOverflow ? photos : photos.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = photos.length - COLLAPSED_LIMIT;

  return (
    <div className="bg-surface-container-low rounded-2xl p-3 md:p-4 h-full min-h-0 flex flex-col">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <div className="flex gap-3 items-baseline">
          <span className="text-on-surface font-bold text-sm md:text-base">Uploaded ({photos.length})</span>
          <span className="text-on-surface-variant text-xs">Selected ({selectedCount})</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'p-1.5 rounded-md transition-all',
              viewMode === 'grid'
                ? 'bg-primary text-on-primary shadow-lg'
                : 'hover:bg-surface-container-high text-on-surface-variant'
            )}
            aria-label="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'p-1.5 rounded-md transition-all',
              viewMode === 'list'
                ? 'bg-primary text-on-primary shadow-lg'
                : 'hover:bg-surface-container-high text-on-surface-variant'
            )}
            aria-label="List view"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'flex-1 min-h-0 gap-2 md:gap-3 overflow-y-auto custom-scrollbar pr-1',
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 auto-rows-min'
            : 'flex flex-col'
        )}
      >
        {visiblePhotos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} onToggleSelect={onToggleSelect} />
        ))}
        {photos.length === 0 && (
          <div className="col-span-full h-40 flex flex-col items-center justify-center text-on-surface-variant gap-2 opacity-50">
            <ImageIcon size={36} strokeWidth={1} />
            <p className="text-xs">No photos uploaded yet</p>
          </div>
        )}
      </div>

      {/* Dropdown toggle to reveal more photos instead of forcing a long scroll */}
      <AnimatePresence>
        {hasOverflow && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 pt-2 mt-2 border-t border-white/5"
          >
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-all active:scale-[0.98]"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {expanded
                  ? `Show Less`
                  : `Show ${hiddenCount} More Photo${hiddenCount === 1 ? '' : 's'}`}
              </span>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
