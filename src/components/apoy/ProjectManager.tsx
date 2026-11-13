'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen,
  Save,
  Trash2,
  ChevronDown,
  X,
  Loader2,
  Check,
  Folder,
  Clock,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Photo, AnalysisSettings } from './types';

interface SavedProject {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  photo_count: number;
  settings: {
    analysisSettings?: AnalysisSettings;
    photos?: Array<Partial<Photo>>;
    exportSettings?: { format: string; quality: string };
  };
}

interface ProjectManagerProps {
  photos: Photo[];
  analysisSettings: AnalysisSettings;
  onLoadProject: (project: SavedProject) => void;
}

export function ProjectManager({ photos, analysisSettings, onLoadProject }: ProjectManagerProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) setProjects(data.projects);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadProjects();
  }, [open, loadProjects]);

  const handleSave = async () => {
    const name = saveName.trim() || `Project ${new Date().toLocaleString()}`;
    setIsSaving(true);
    try {
      // Save photo metadata (urls for uploaded blobs won't survive a reload,
      // but sample/remote photos and all settings/selections will).
      const photoMeta = photos.map((p) => ({
        id: p.id,
        name: p.name,
        size: p.size,
        type: p.type,
        isAiBestPick: p.isAiBestPick,
        selected: p.selected,
        status: p.status,
        score: p.score,
        exposure: p.exposure,
        focus: p.focus,
        style: p.style,
        url: p.url,
      }));
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          photo_count: photos.length,
          settings: { analysisSettings, photos: photoMeta },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Saved "${name}"`);
        setShowSaveForm(false);
        setSaveName('');
        loadProjects();
      } else {
        showToast('Save failed');
      }
    } catch {
      showToast('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* ignore */
    }
  };

  const handleLoad = (project: SavedProject) => {
    onLoadProject(project);
    setOpen(false);
    showToast(`Loaded "${project.name}"`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-xl text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-highest hover:text-primary active:scale-95 transition-all border border-outline-variant/10"
      >
        <FolderOpen size={14} />
        <span>My Projects</span>
        <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
          {projects.length}
        </span>
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-surface-container-low rounded-2xl border border-outline-variant/20 shadow-2xl z-50 overflow-hidden"
            >
              {/* Save form */}
              <div className="p-4 border-b border-outline-variant/10">
                {showSaveForm ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                      placeholder="Project name..."
                      className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-on-primary rounded-lg text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Save
                      </button>
                      <button
                        onClick={() => setShowSaveForm(false)}
                        className="px-3 py-2 bg-surface-container-high text-on-surface-variant rounded-lg text-[10px] font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaveForm(true)}
                    disabled={photos.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-all disabled:opacity-40"
                  >
                    <Save size={14} />
                    Save Current Session
                  </button>
                )}
              </div>

              {/* Projects list */}
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="p-6 flex items-center justify-center gap-2 text-on-surface-variant text-xs">
                    <Loader2 size={14} className="animate-spin" /> Loading...
                  </div>
                ) : projects.length === 0 ? (
                  <div className="p-6 flex flex-col items-center gap-2 text-on-surface-variant/50">
                    <Folder size={32} strokeWidth={1} />
                    <p className="text-xs">No saved projects yet</p>
                  </div>
                ) : (
                  projects.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center gap-3 p-3 hover:bg-surface-container-high transition-colors border-b border-outline-variant/5 last:border-0"
                    >
                      <button
                        onClick={() => handleLoad(p)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Folder size={14} className="text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-on-surface truncate">{p.name}</p>
                          <p className="text-[10px] text-on-surface-variant flex items-center gap-2">
                            <span>{p.photo_count} photos</span>
                            <span className="opacity-50">•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock size={9} />
                              {new Date(p.updated_at).toLocaleDateString()}
                            </span>
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 text-on-surface-variant/40 hover:text-error rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        aria-label="Delete project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-outline-variant/10 bg-surface-container/50">
                <p className="text-[9px] text-on-surface-variant/50 text-center flex items-center justify-center gap-1">
                  <Upload size={9} />
                  Cloud-synced via Turso
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-32 md:bottom-12 left-1/2 -translate-x-1/2 z-[60] bg-surface-container-highest border border-primary/30 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2"
          >
            <Check size={14} className="text-green-400" />
            <span className="text-xs font-medium text-on-surface">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type { SavedProject };
