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
      className="h-full min-h-0 bg-glass rounded-2xl flex flex-col items-center justify-center p-4 md:p-5 text-center group hover:border-primary/40 transition-all duration-500 cursor-pointer border-2 border-dashed border-outline-variant/20"
    >
      <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500 shadow-inner">
        <CloudUpload className="text-primary" size={28} />
      </div>
      <h3 className="font-headline font-bold text-base mb-1 text-on-surface">
        Unlimited RAW Import
      </h3>
      <p className="text-on-surface-variant text-[11px] mb-4 leading-relaxed max-w-[240px]">
        Supports .ARW, .CR3, .NEF, .DNG.{' '}
        <span className="text-primary font-bold">No batch limits.</span>
      </p>

      {folderInfo && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-400 max-w-[240px]">
          <FolderOpen size={12} className="shrink-0" />
          <span className="text-[9px] font-bold uppercase tracking-wider truncate">
            {folderInfo.name}
          </span>
          <span className="text-[9px] text-on-surface-variant ml-auto shrink-0">
            {folderInfo.count} photo{folderInfo.count === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full max-w-[240px]">
        <label className="btn-primary cursor-pointer flex-1 w-full !px-4 !py-2 !text-xs">
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

        <label className="w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-2 rounded-full font-bold tracking-wide bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-primary active:scale-95 transition-all border border-outline-variant/20 text-xs">
          <FolderOpen size={15} />
          <span>Select Folder</span>
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

      <p className="text-[8px] text-on-surface-variant/40 mt-3 max-w-[220px] leading-relaxed">
        <span className="text-primary/60">Select Folder</span> imports all images in a folder.
      </p>
    </div>
  );
}
