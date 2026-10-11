'use client';

import React, { useCallback, useRef, useState } from 'react';
import { CloudUpload, FolderOpen } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (files: FileList) => void;
}

// webkitdirectory is set via spread props to avoid TS augmentation issues

const IMAGE_EXTENSIONS = [
  '.arw', '.cr2', '.cr3', '.nef', '.dng', '.raf', '.rw2', '.orf',
  '.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic',
];

function isImageFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [folderInfo, setFolderInfo] = useState<{ name: string; count: number } | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files) {
        onUpload(e.dataTransfer.files);
      }
    },
    [onUpload]
  );

  // Filter a FileList down to image files only (folders often contain
  // non-image junk like .DS_Store, README, etc.) and forward to onUpload.
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = e.target.files;
    if (!allFiles || allFiles.length === 0) return;

    const images = Array.from(allFiles).filter(isImageFile);

    const firstPath = (allFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath || '';
    const folderName = firstPath.split('/')[0] || 'Selected folder';

    setFolderInfo({ name: folderName, count: images.length });

    if (images.length > 0) {
      const dt = new DataTransfer();
      images.forEach((f: File) => dt.items.add(f));
      onUpload(dt.files);
    }

    e.target.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onUpload(e.target.files);
    setFolderInfo(null);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="h-full min-h-0 bg-glass rounded-3xl flex flex-col items-center justify-center p-6 md:p-8 text-center group hover:border-primary/40 transition-all duration-500 cursor-pointer border-2 border-dashed border-outline-variant/20"
    >
      <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
        <CloudUpload className="text-primary" size={40} />
      </div>
      <h3 className="font-headline font-bold text-xl mb-2 text-on-surface">
        Unlimited RAW Import
      </h3>
      <p className="text-on-surface-variant text-sm mb-6 leading-relaxed max-w-[280px]">
        Supports .ARW, .CR3, .NEF, and .DNG.{' '}
        <span className="text-primary font-bold">No batch limits</span>—import as many files as
        your hardware can handle.
      </p>

      {folderInfo && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-400 max-w-[280px]">
          <FolderOpen size={14} className="shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate">
            {folderInfo.name}
          </span>
          <span className="text-[10px] text-on-surface-variant ml-auto shrink-0">
            {folderInfo.count} photo{folderInfo.count === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-[280px]">
        <label className="btn-primary cursor-pointer flex-1 w-full sm:w-auto">
          Browse Files
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.arw,.cr2,.cr3,.nef,.dng,.raf,.rw2,.orf,.heic"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>

        <label className="flex-1 w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold tracking-wide bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-primary active:scale-95 transition-all border border-outline-variant/20">
          <FolderOpen size={18} />
          <span className="text-sm">Select Folder</span>
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFolderSelect}
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          />
        </label>
      </div>

      <p className="text-[9px] text-on-surface-variant/40 mt-4 max-w-[260px] leading-relaxed">
        <span className="text-primary/60">Select Folder</span> imports every supported image
        inside a folder (recursively) — perfect for batch RAW imports.
      </p>
    </div>
  );
}
