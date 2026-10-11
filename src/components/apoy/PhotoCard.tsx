'use client';

import { Check, Sparkles, Loader2 } from 'lucide-react';
import { Photo } from './types';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface PhotoCardProps {
  photo: Photo;
  onToggleSelect: (id: string) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({ photo, onToggleSelect }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'aspect-square rounded-2xl overflow-hidden relative group cursor-pointer border-2 transition-all duration-300',
        photo.selected ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent hover:border-primary/30'
      )}
      onClick={() => onToggleSelect(photo.id)}
    >
      { }
      <img
        src={photo.url}
        alt={photo.name}
        className={cn(
          'w-full h-full object-cover transition-transform duration-700 group-hover:scale-110',
          photo.status === 'analyzing' && 'blur-sm grayscale'
        )}
        referrerPolicy="no-referrer"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {photo.isAiBestPick && (
        <div className="absolute top-3 left-3 bg-primary text-on-primary-container text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-md flex items-center gap-1 shadow-xl z-10">
          <Sparkles size={12} fill="currentColor" />
          AI Best Pick
        </div>
      )}

      {photo.status === 'analyzing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
          <Loader2 className="text-primary animate-spin" size={24} />
        </div>
      )}

      <div
        className={cn(
          'absolute bottom-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300',
          photo.selected
            ? 'bg-primary text-on-primary-container scale-110'
            : 'bg-black/20 backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100'
        )}
      >
        {photo.selected && <Check size={14} strokeWidth={3} />}
      </div>
    </motion.div>
  );
};
