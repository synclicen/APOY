#!/usr/bin/env python3
"""Apply the folder-picker feature to the Vite APOY ExportView.tsx."""
import sys
from pathlib import Path

path = Path('/tmp/APOY-push/src/components/ExportView.tsx')
src = path.read_text()

# --- Edit 1: imports + type declarations ---
old1 = """import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { 
  Download, 
  Share2, 
  CheckCircle2, 
  Printer, 
  Globe, 
  FileUp,
  ChevronRight,
  Loader2,
  FolderOpen,
  Monitor,
  Cloud,
  Check,
  AlertCircle
} from 'lucide-react';
import { Photo, AnalysisSettings } from '../types';
import { cn } from '../lib/utils';

interface ExportViewProps {"""

new1 = """import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { 
  Download, 
  Share2, 
  CheckCircle2, 
  Printer, 
  Globe, 
  FileUp,
  ChevronRight,
  Loader2,
  FolderOpen,
  Monitor,
  Cloud,
  Check,
  AlertCircle,
  X,
  FolderCheck
} from 'lucide-react';
import { Photo, AnalysisSettings } from '../types';
import { cn } from '../lib/utils';

// Minimal type declarations for the File System Access API
// (not in default TS lib for all targets).
interface FileSystemWritableFileStream {
  write: (data: Blob | BufferSource | string) => Promise<void>;
  close: () => Promise<void>;
}
interface FileSystemFileHandleW {
  createWritable: () => Promise<FileSystemWritableFileStream>;
}
interface WindowWithFS {
  showDirectoryPicker?: () => Promise<unknown>;
}

interface ExportViewProps {"""

assert old1 in src, "Edit 1 anchor not found"
src = src.replace(old1, new1, 1)

# --- Edit 2: add folder picker state ---
old2 = """  const [progress, setProgress] = useState(0);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);

  const selectedPhotos = photos.filter(p => p.selected);"""

new2 = """  const [progress, setProgress] = useState(0);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);

  // Folder picker state (File System Access API)
  const [dirHandle, setDirHandle] = useState<unknown>(null);
  const [folderName, setFolderName] = useState<string>('');
  const [folderPickerSupported] = useState<boolean>(
    typeof window !== 'undefined' && typeof (window as WindowWithFS).showDirectoryPicker === 'function'
  );
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string>('');

  const selectedPhotos = photos.filter(p => p.selected);"""

assert old2 in src, "Edit 2 anchor not found"
src = src.replace(old2, new2, 1)

# --- Edit 3: rewrite handleExport + add handleSelectFolder/clearSelectedFolder ---
old3 = """  const handleExport = async () => {
    if (selectedPhotos.length === 0) return;
    
    setIsExporting(true);
    setProgress(0);
    setCurrentProcessingIndex(0);

    const useZipFallback = destination === 'local' && selectedPhotos.length > 1;
    const zip = useZipFallback ? new JSZip() : null;

    for (let i = 0; i < selectedPhotos.length; i++) {
      setCurrentProcessingIndex(i);
      
      try {
        if (useZipFallback && zip) {
          const blob = await processAndDownload(selectedPhotos[i], i, true) as Blob;
          const suffix = selectedPhotos.length > 1 ? `-${i + 1}` : '';
          const extension = selectedFormat.toLowerCase();
          const fileName = `${exportName}${suffix}.${extension}`;
          zip.file(fileName, blob);
        } else {
          await processAndDownload(selectedPhotos[i], i);
        }
        
        setProgress(((i + 0.9) / selectedPhotos.length) * 100);
      } catch (err) {
        console.error("Export Error:", err);
      }
    }

    if (useZipFallback && zip) {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      const cleanPath = folderPath.replace(/[^a-zA-Z0-9_\\-\\/]/g, '_').replace(/\\//g, '_');
      link.download = `${cleanPath}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    setProgress(100);
    setIsExporting(false);
    setIsExported(true);
    setTimeout(() => {
      setIsExported(false);
      setProgress(0);
    }, 5000);
  };

  // folder picker removed for web compatibility"""

new3 = """  const handleExport = async () => {
    if (selectedPhotos.length === 0) return;

    setIsExporting(true);
    setProgress(0);
    setCurrentProcessingIndex(0);

    // If the user picked a local folder, write each processed file directly
    // into that folder (no ZIP bundling needed).
    const useDirHandle = destination === 'local' && !!dirHandle && folderPickerSupported;
    const useZipFallback = !useDirHandle && destination === 'local' && selectedPhotos.length > 1;
    const zip = useZipFallback ? new JSZip() : null;

    const extension = selectedFormat.toLowerCase();

    if (useDirHandle) {
      const handle = dirHandle as {
        getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<FileSystemFileHandleW>;
      };
      for (let i = 0; i < selectedPhotos.length; i++) {
        setCurrentProcessingIndex(i);
        try {
          const blob = await processAndDownload(selectedPhotos[i], i, true) as Blob;
          const suffix = selectedPhotos.length > 1 ? `-${i + 1}` : '';
          const fileName = `${exportName}${suffix}.${extension}`;
          const fileHandle = await handle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          setProgress(((i + 0.9) / selectedPhotos.length) * 100);
        } catch (err) {
          console.error('Export Error (folder write):', err);
        }
      }
    } else {
      for (let i = 0; i < selectedPhotos.length; i++) {
        setCurrentProcessingIndex(i);

        try {
          if (useZipFallback && zip) {
            const blob = await processAndDownload(selectedPhotos[i], i, true) as Blob;
            const suffix = selectedPhotos.length > 1 ? `-${i + 1}` : '';
            const fileName = `${exportName}${suffix}.${extension}`;
            zip.file(fileName, blob);
          } else {
            await processAndDownload(selectedPhotos[i], i);
          }

          setProgress(((i + 0.9) / selectedPhotos.length) * 100);
        } catch (err) {
          console.error('Export Error:', err);
        }
      }

      if (useZipFallback && zip) {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        const cleanPath = folderPath.replace(/[^a-zA-Z0-9_\\-\\/]/g, '_').replace(/\\//g, '_');
        link.download = `${cleanPath}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    }

    setProgress(100);
    setIsExporting(false);
    setIsExported(true);
    setTimeout(() => {
      setIsExported(false);
      setProgress(0);
    }, 5000);
  };

  // Open the native folder picker (File System Access API) so the user can
  // choose exactly which local folder should receive the exported files.
  const handleSelectFolder = async () => {
    setFolderError('');
    const win = window as WindowWithFS;
    if (!win.showDirectoryPicker) {
      setFolderError('Your browser does not support folder selection. Use Chrome/Edge.');
      return;
    }
    setIsPickingFolder(true);
    try {
      const handle = await win.showDirectoryPicker();
      setDirHandle(handle);
      const name = (handle as { name?: string }).name || 'Selected folder';
      setFolderName(name);
    } catch (err) {
      // User cancelled or denied permission
      const msg = err instanceof Error ? err.message : String(err);
      if (!/abort/i.test(msg)) {
        setFolderError(`Could not access folder: ${msg}`);
      }
    } finally {
      setIsPickingFolder(false);
    }
  };

  const clearSelectedFolder = () => {
    setDirHandle(null);
    setFolderName('');
    setFolderError('');
  };"""

assert old3 in src, "Edit 3 anchor not found"
src = src.replace(old3, new3, 1)

# --- Edit 4: replace the local destination UI block ---
old4 = """              {destination === 'local' && (
                <div className="space-y-4 pt-2">
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex gap-3"
                  >
                    <AlertCircle size={14} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      <span className="text-primary font-bold uppercase tracking-tight">Standard Web Export:</span> Processed photos will be downloaded through your browser's default download manager. 
                      {selectedPhotos.length > 1 && " Since you have multiple photos selected, they will be automatically bundled into a high-speed ZIP archive."}
                    </p>
                  </motion.div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant px-1">Archive Output Name</label>
                    <input 
                      type="text"
                      value={folderPath}
                      onChange={(e) => {
                        setFolderPath(e.target.value);
                      }}
                      placeholder="e.g. APOY_Exports"
                      className="w-full bg-surface-container-high border border-white/5 rounded-xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary/50 transition-all font-mono"
                    />
                    <p className="text-[9px] text-on-surface-variant/60 px-1 italic">
                      Output will be saved to your device as <span className="text-primary font-mono">{folderPath}{selectedPhotos.length > 1 ? '.zip' : ''}</span>
                    </p>
                  </div>
                </div>
              )}"""

new4 = """              {destination === 'local' && (
                <div className="space-y-4 pt-2">
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'p-3 border rounded-xl flex gap-3',
                      dirHandle
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-primary/5 border-primary/10'
                    )}
                  >
                    {dirHandle ? (
                      <FolderCheck size={14} className="text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={14} className="text-primary shrink-0 mt-0.5" />
                    )}
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      {dirHandle ? (
                        <>
                          <span className="text-green-400 font-bold uppercase tracking-tight">Folder Selected:</span>{' '}
                          Files will be saved directly to{' '}
                          <span className="text-green-400 font-mono font-bold">{folderName}</span> — no ZIP
                          archive, each photo written as a separate file.
                        </>
                      ) : (
                        <>
                          <span className="text-primary font-bold uppercase tracking-tight">Standard Web Export:</span>{' '}
                          Processed photos will be downloaded through your browser's default download manager.
                          {selectedPhotos.length > 1 &&
                            ' Multiple photos are bundled into a high-speed ZIP archive — or pick a folder below to save each file individually.'}
                        </>
                      )}
                    </p>
                  </motion.div>

                  {/* Folder Picker (File System Access API) */}
                  <div className="space-y-2 pt-1">
                    <label className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant px-1">
                      Destination Folder
                    </label>

                    {folderPickerSupported ? (
                      dirHandle ? (
                        <div className="flex items-stretch gap-2">
                          <div className="flex-1 flex items-center gap-3 bg-surface-container-high border border-green-500/30 rounded-xl px-4 py-2.5">
                            <FolderCheck size={16} className="text-green-400 shrink-0" />
                            <span className="text-xs text-on-surface font-mono truncate">{folderName}</span>
                            <Check size={14} className="text-green-400 ml-auto shrink-0" />
                          </div>
                          <button
                            onClick={handleSelectFolder}
                            disabled={isPickingFolder}
                            className="px-3 py-2.5 bg-surface-container-highest text-on-surface-variant rounded-xl text-[10px] font-bold uppercase tracking-tighter hover:text-on-surface transition-all active:scale-95 disabled:opacity-50"
                          >
                            Change
                          </button>
                          <button
                            onClick={clearSelectedFolder}
                            className="p-2.5 bg-surface-container-highest text-on-surface-variant hover:text-error rounded-xl transition-all active:scale-95"
                            aria-label="Clear selected folder"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleSelectFolder}
                          disabled={isPickingFolder}
                          className={cn(
                            'w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all active:scale-[0.98]',
                            'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/60',
                            isPickingFolder && 'opacity-60 cursor-wait'
                          )}
                        >
                          {isPickingFolder ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <FolderOpen size={18} />
                          )}
                          <span className="text-xs font-bold uppercase tracking-widest">
                            {isPickingFolder ? 'Opening Picker...' : 'Select Destination Folder'}
                          </span>
                        </button>
                      )
                    ) : (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-2">
                        <AlertCircle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-yellow-200/80 leading-snug">
                          Folder selection needs a Chromium browser (Chrome/Edge). On other browsers, files
                          download via the default download manager.
                        </p>
                      </div>
                    )}

                    {folderError && (
                      <p className="text-[10px] text-error px-1">{folderError}</p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant px-1">
                      {dirHandle ? 'File Name Prefix' : 'Archive Output Name'}
                    </label>
                    <input 
                      type="text"
                      value={folderPath}
                      onChange={(e) => {
                        setFolderPath(e.target.value);
                      }}
                      placeholder="e.g. APOY_Exports"
                      className="w-full bg-surface-container-high border border-white/5 rounded-xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary/50 transition-all font-mono"
                    />
                    <p className="text-[9px] text-on-surface-variant/60 px-1 italic">
                      {dirHandle ? (
                        <>
                          Each photo saved as{' '}
                          <span className="text-green-400 font-mono">
                            {folderPath}{selectedPhotos.length > 1 ? '-1' : ''}.{selectedFormat.toLowerCase()}
                          </span>{' '}
                          inside <span className="text-green-400 font-mono">{folderName}</span>
                        </>
                      ) : (
                        <>
                          Output will be saved to your device as <span className="text-primary font-mono">{folderPath}{selectedPhotos.length > 1 ? '.zip' : ''}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}"""

assert old4 in src, "Edit 4 anchor not found"
src = src.replace(old4, new4, 1)

path.write_text(src)
print("All 4 edits applied successfully to", path)
