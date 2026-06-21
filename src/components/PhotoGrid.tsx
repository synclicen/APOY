import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Photo } from '../types';
import { PhotoCard } from './PhotoCard';
import { cn } from '../lib/utils';

interface PhotoGridProps {
  photos: Photo[];
  onToggleSelect: (id: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function PhotoGrid({ photos, onToggleSelect, viewMode, onViewModeChange }: PhotoGridProps) {
  const selectedCount = photos.filter(p => p.selected).length;

  return (
    <div className="bg-surface-container-low rounded-3xl p-4 md:p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 items-baseline">
          <span className="text-on-surface font-bold text-lg">
            Uploaded ({photos.length})
          </span>
          <span className="text-on-surface-variant text-sm">
            Selected ({selectedCount})
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onViewModeChange('grid')}
            className={cn(
              "p-2 rounded-lg transition-all",
              viewMode === 'grid' ? "bg-primary text-on-primary shadow-lg" : "hover:bg-surface-container-high text-on-surface-variant"
            )}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => onViewModeChange('list')}
            className={cn(
              "p-2 rounded-lg transition-all",
              viewMode === 'list' ? "bg-primary text-on-primary shadow-lg" : "hover:bg-surface-container-high text-on-surface-variant"
            )}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      <div className={cn(
        "gap-4 overflow-y-auto pr-2 custom-scrollbar",
        viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "flex flex-col"
      )}>
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onToggleSelect={onToggleSelect}
          />
        ))}
        {photos.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-on-surface-variant gap-2 opacity-50">
            <LayoutGrid size={48} strokeWidth={1} />
            <p>No photos uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
