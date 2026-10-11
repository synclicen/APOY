'use client';

import { useState, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { UploadZone } from './components/UploadZone';
import { PhotoGrid } from './components/PhotoGrid';
import { AnalysisView } from './components/AnalysisView';
import { ExportView } from './components/ExportView';
import { Photo, ToolType, ViewType, AnalysisSettings } from './types';
import { ArrowRight, Sparkles, ChevronDown, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Sample initial photos to match the screenshot
const INITIAL_PHOTOS: Photo[] = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    name: 'Mountain Peak.RAW',
    size: '42MB',
    type: 'image/x-sony-arw',
    isAiBestPick: true,
    selected: true,
    status: 'ready',
    score: 98.2,
    exposure: 12,
    focus: 88,
    style: 'Landscape',
  },
  {
    id: '2',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
    name: 'Forest Mist.RAW',
    size: '38MB',
    type: 'image/x-canon-cr3',
    selected: false,
    status: 'ready',
    score: 85.5,
    exposure: 15,
    focus: 72,
    style: 'Landscape',
  },
  {
    id: '3',
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
    name: 'Sunlight Rays.RAW',
    size: '45MB',
    type: 'image/x-nikon-nef',
    isAiBestPick: true,
    selected: true,
    status: 'ready',
    score: 94.1,
    exposure: 8,
    focus: 92,
    style: 'Landscape',
  },
  {
    id: '4',
    url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80',
    name: 'Valley View.RAW',
    size: '31MB',
    type: 'image/x-sony-arw',
    selected: true,
    status: 'ready',
    score: 74.5,
    exposure: 22,
    focus: 65,
    style: 'Landscape',
  },
];

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>(INITIAL_PHOTOS);
  const [activeTool, setActiveTool] = useState<ToolType | null>('enhance');
  const [currentView, setCurrentView] = useState<ViewType>('import');
  const [isAiSmartSelection, setIsAiSmartSelection] = useState(true);
  const [aiSelectionLimit, setAiSelectionLimit] = useState(10);
  const [showLimitDropdown, setShowLimitDropdown] = useState(false);
  const [isReRunning, setIsReRunning] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Selection limit options: 1-50 (every number), then multiples of 50 up to 500
  const AI_LIMIT_OPTIONS = [
    ...Array.from({ length: 50 }, (_, i) => i + 1),
    100, 150, 200, 250, 300, 350, 400, 450, 500,
  ];

  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>({
    selectedPlatform: 'ig',
    selectedTechnicalScenario: 'Formal',
    selectedStyle: 'Portrait',
    selectedPreset: 'Pro 1',
    selectedFrame: 'none',
    selectedRatio: '45',
    exposure: 66,
    focus: 88,
    lensCorrection: true,
    whiteBalanceAdjusted: false,
    autoFocusFace: false,
    autoCutToRatio: false,
    preserveHumans: true,
    autoArrange: false,
    selectedCleanBase: 'neutral',
    objectFit: 'cover',
    watermarkEnabled: false,
    watermarkText: 'APOY MASTERPIECE',
    watermarkFont: 'Inter',
    watermarkSize: 24,
    watermarkOpacity: 50,
    watermarkPosition: 'bottom-right',
    watermarkColor: '#ffffff',
    customFrameUrl: undefined,
    frameHistory: [],
    bgRemovalEnabled: false,
    bgRemovalTolerance: 32,
    bgRemovalSmoothness: 18,
    bgRemovalMode: 'auto',
    bgRemovalColor: null,
  });

  const analyzePhotos = useCallback(
    (newPhotos: Photo[]) => {
      setPhotos((prev) =>
        prev.map((p) => (newPhotos.find((np) => np.id === p.id) ? { ...p, status: 'analyzing' } : p))
      );

      setTimeout(() => {
        // Rank new photos by score and pick the top N within the limit
        const ranked = [...newPhotos].sort((a, b) => (b.score || 0) - (a.score || 0));
        const limit = Math.min(aiSelectionLimit, ranked.length);
        const bestPickIds = new Set(ranked.slice(0, limit).map((p) => p.id));

        setPhotos((prev) =>
          prev.map((p) => {
            const isNew = newPhotos.find((np) => np.id === p.id);
            if (isNew) {
              const isBestPick = bestPickIds.has(p.id);
              return {
                ...p,
                status: 'ready',
                isAiBestPick: isBestPick,
                selected: isBestPick,
              };
            }
            return p;
          })
        );
      }, 2000);
    },
    [aiSelectionLimit]
  );

  // Re-run AI selection across ALL photos — picks the top N by score globally
  const reRunAiSelection = useCallback(() => {
    setIsReRunning(true);
    setPhotos((prev) => prev.map((p) => ({ ...p, status: 'analyzing' })));
    setTimeout(() => {
      setPhotos((prev) => {
        const ranked = [...prev].sort((a, b) => (b.score || 0) - (a.score || 0));
        const limit = Math.min(aiSelectionLimit, ranked.length);
        const bestPickIds = new Set(ranked.slice(0, limit).map((p) => p.id));
        return prev.map((p) => ({
          ...p,
          status: 'ready' as const,
          isAiBestPick: bestPickIds.has(p.id),
          selected: bestPickIds.has(p.id),
        }));
      });
      setIsReRunning(false);
    }, 1500);
  }, [aiSelectionLimit]);

  const handleUpload = useCallback(
    (files: FileList) => {
      const newPhotos: Photo[] = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substring(2, 11),
        url: URL.createObjectURL(file),
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        type: file.type,
        status: 'uploaded',
        selected: false,
        score: Math.floor(Math.random() * 30) + 70,
        exposure: Math.floor(Math.random() * 20),
        focus: Math.floor(Math.random() * 40) + 60,
      }));

      setPhotos((prev) => [...newPhotos, ...prev]);

      if (isAiSmartSelection) {
        analyzePhotos(newPhotos);
      }
    },
    [isAiSmartSelection, analyzePhotos]
  );

  const toggleSelect = (id: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  };

  const handleSelectAll = () => {
    const allSelected = photos.every((p) => p.selected);
    setPhotos((prev) => prev.map((p) => ({ ...p, selected: !allSelected })));
  };

  const handleLoadProject = (project: any) => {
    if (project.settings?.analysisSettings) {
      setAnalysisSettings(project.settings.analysisSettings);
    }
    if (project.settings?.photos && project.settings.photos.length > 0) {
      // Restore photo metadata. Blob URLs from a previous session won't
      // render, but remote/sample URLs and all selections/scores will.
      setPhotos(
        project.settings.photos.map((p) => ({
          id: p.id || Math.random().toString(36).slice(2),
          url: p.url || '',
          name: p.name || 'Unknown',
          size: p.size || '',
          type: p.type || '',
          isAiBestPick: p.isAiBestPick,
          selected: p.selected,
          status: (p.status as Photo['status']) || 'ready',
          score: p.score,
          exposure: p.exposure,
          focus: p.focus,
          style: p.style,
        }))
      );
    }
  };

  const selectedCount = photos.filter((p) => p.selected).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />
      <Sidebar activeTool={activeTool} onToolSelect={setActiveTool} />

      <main className="flex-1 min-h-0 md:ml-24 mt-16 px-4 md:px-6 pt-4 pb-24 md:pb-3 w-full max-w-[1700px] mx-auto flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'import' && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4 shrink-0">
                <div className="max-w-2xl">
                  <h1 className="font-headline font-extrabold text-2xl md:text-4xl tracking-tight text-on-surface mb-1">
                    Import <span className="text-gradient">Masterpieces.</span>
                  </h1>
                  <p className="text-on-surface-variant text-sm md:text-base mb-3">
                    Drop your RAW files here. Our AI will curate your best shots automatically.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleSelectAll}
                      className="px-4 py-2 bg-surface-container-high rounded-xl text-xs font-bold uppercase tracking-widest text-primary hover:bg-surface-container-highest active:scale-95 transition-all border border-primary/10"
                    >
                      {photos.every((p) => p.selected) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-full border border-outline-variant/10 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-3 px-4">
                      <Sparkles
                        className={cn('transition-colors', isAiSmartSelection ? 'text-primary' : 'text-on-surface-variant')}
                        size={18}
                        fill={isAiSmartSelection ? 'currentColor' : 'none'}
                      />
                      <span className="text-xs font-bold tracking-widest text-on-surface-variant uppercase">
                        AI Smart Selection
                      </span>
                    </div>

                    {/* Limit selector — elegant dropdown */}
                    {isAiSmartSelection && (
                      <div className="relative">
                        <button
                          onClick={() => setShowLimitDropdown((v) => !v)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest rounded-full text-[10px] font-bold uppercase tracking-widest text-primary transition-all active:scale-95 border border-primary/20"
                        >
                          <span className="opacity-70">Pick</span>
                          <span className="text-primary font-black">{aiSelectionLimit}</span>
                          <ChevronDown
                            size={12}
                            className={cn('transition-transform', showLimitDropdown && 'rotate-180')}
                          />
                        </button>

                        <AnimatePresence>
                          {showLimitDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowLimitDropdown(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-2 w-44 bg-surface-container-low rounded-2xl border border-outline-variant/20 shadow-2xl z-50 overflow-hidden"
                              >
                                <div className="px-3 py-2 border-b border-outline-variant/10">
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                                    Max Photos to Select
                                  </span>
                                </div>
                                <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
                                  {AI_LIMIT_OPTIONS.map((n) => (
                                    <button
                                      key={n}
                                      onClick={() => {
                                        setAiSelectionLimit(n);
                                        setShowLimitDropdown(false);
                                      }}
                                      className={cn(
                                        'w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors',
                                        n === aiSelectionLimit
                                          ? 'bg-primary/15 text-primary font-bold'
                                          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                                      )}
                                    >
                                      <span className="font-mono">{n}</span>
                                      {n === aiSelectionLimit && <Check size={12} />}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Re-run button */}
                    {isAiSmartSelection && (
                      <button
                        onClick={reRunAiSelection}
                        disabled={isReRunning || photos.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest rounded-full text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all active:scale-95 disabled:opacity-40 border border-outline-variant/10"
                        title="Re-run AI selection on all photos"
                      >
                        <RefreshCw size={12} className={cn(isReRunning && 'animate-spin')} />
                        <span className="hidden sm:inline">{isReRunning ? 'Selecting…' : 'Re-run'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setIsAiSmartSelection(!isAiSmartSelection)}
                      className={cn(
                        'w-12 h-6 rounded-full relative flex items-center transition-all duration-300 px-1 shrink-0',
                        isAiSmartSelection ? 'bg-primary-container' : 'bg-surface-container-highest'
                      )}
                    >
                      <motion.div
                        animate={{ x: isAiSmartSelection ? 24 : 0 }}
                        className={cn(
                          'w-4 h-4 rounded-full shadow-sm',
                          isAiSmartSelection ? 'bg-on-primary-container' : 'bg-on-surface-variant'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 md:gap-6 items-stretch flex-1 min-h-0">
                <div className="col-span-12 lg:col-span-4 min-h-0">
                  <UploadZone onUpload={handleUpload} />
                </div>
                <div className="col-span-12 lg:col-span-8 min-h-0">
                  <PhotoGrid
                    photos={photos}
                    onToggleSelect={toggleSelect}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 md:gap-8 flex-wrap mt-4 shrink-0">
                {selectedCount > 0 && (
                  <span className="text-on-surface-variant font-medium text-sm">
                    {selectedCount} RAW files selected for analysis
                  </span>
                )}
                <button
                  disabled={selectedCount === 0}
                  onClick={() => setCurrentView('analysis')}
                  className={cn(
                    'btn-primary text-base px-8 py-3 group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
                    selectedCount > 0 && 'hover:shadow-[0px_0px_40px_rgba(201,190,255,0.3)]'
                  )}
                >
                  Move to Analysis
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {currentView === 'analysis' && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1"
            >
              <AnalysisView
                photos={photos}
                onViewChange={setCurrentView}
                settings={analysisSettings}
                onSettingsChange={setAnalysisSettings}
              />
            </motion.div>
          )}

          {currentView === 'export' && (
            <motion.div
              key="export"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 min-h-0 overflow-hidden"
            >
              <ExportView
                photos={photos}
                settings={analysisSettings}
                onSettingsChange={setAnalysisSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Four-line attribution footer — each line uses a distinct font style */}
      <footer className="hidden md:flex flex-col h-20 shrink-0 items-center justify-center gap-0.5 border-t border-outline-variant/5 bg-surface/60 px-6">
        {/* Line 1 — credit/attribution (monospace italic, muted) */}
        <span className="font-mono italic text-[10px] text-on-surface-variant/50 leading-tight">
          © 2026-Made by Fajrianor
        </span>
        {/* Line 2 — brand headline (Manrope extrabold, primary purple) */}
        <span className="font-headline font-extrabold text-[12px] text-primary tracking-tight leading-tight">
          APOY-Add Photos, Originate Yours
        </span>
        {/* Line 3 — institutional label (Inter semibold uppercase, wide tracking) */}
        <span className="font-label font-semibold text-[8px] text-on-surface-variant/60 tracking-[0.25em] uppercase leading-tight">
          Pusat Humas dan Keterbukaan Informasi
        </span>
        {/* Line 4 — university name (serif italic, secondary) */}
        <span className="font-serif italic text-[10px] text-secondary/70 leading-tight">
          UIN Antasari Banjarmasin
        </span>
      </footer>
    </div>
  );
}
