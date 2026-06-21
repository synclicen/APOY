import React, { useCallback } from 'react';
import { CloudUpload } from 'lucide-react';
import { cn } from '../lib/utils';

interface UploadZoneProps {
  onUpload: (files: FileList) => void;
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      onUpload(e.dataTransfer.files);
    }
  }, [onUpload]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="h-full min-h-[300px] md:min-h-[400px] bg-glass rounded-3xl flex flex-col items-center justify-center p-8 md:p-12 text-center group hover:border-primary/40 transition-all duration-500 cursor-pointer border-2 border-dashed border-outline-variant/20"
    >
      <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
        <CloudUpload className="text-primary" size={40} />
      </div>
      <h3 className="font-headline font-bold text-xl mb-2 text-on-surface">
        Unlimited RAW Import
      </h3>
      <p className="text-on-surface-variant text-sm mb-8 leading-relaxed max-w-[280px]">
        Supports .ARW, .CR3, .NEF, and .DNG. <span className="text-primary font-bold">No batch limits</span>—import as many files as your hardware can handle.
      </p>
      
      <label className="btn-primary cursor-pointer">
        Browse Files
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onUpload(e.target.files)}
        />
      </label>
    </div>
  );
}
