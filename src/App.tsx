import React, { useState, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { UploadZone } from './components/UploadZone';
import { PhotoGrid } from './components/PhotoGrid';
import { AnalysisView } from './components/AnalysisView';
import { ExportView } from './components/ExportView';
import { Photo, ToolType, ViewType, AnalysisSettings } from './types';
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
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
    style: 'Landscape'
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
    style: 'Landscape'
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
    style: 'Landscape'
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
    style: 'Landscape'
  }
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>(INITIAL_PHOTOS);
  const [activeTool, setActiveTool] = useState<ToolType | null>('enhance');
  const [currentView, setCurrentView] = useState<ViewType>('import');
  const [isAiSmartSelection, setIsAiSmartSelection] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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
  });

  const handleUpload = useCallback((files: FileList) => {
    const newPhotos: Photo[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
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

    setPhotos(prev => [...newPhotos, ...prev]);

    if (isAiSmartSelection) {
      analyzePhotos(newPhotos);
    }
  }, [isAiSmartSelection]);

  const analyzePhotos = async (newPhotos: Photo[]) => {
    setIsAnalyzing(true);
    setPhotos(prev => prev.map(p => 
      newPhotos.find(np => np.id === p.id) ? { ...p, status: 'analyzing' } : p
    ));

    await new Promise(resolve => setTimeout(resolve, 2000));

    setPhotos(prev => prev.map(p => {
      const isNew = newPhotos.find(np => np.id === p.id);
      if (isNew) {
        const isBestPick = Math.random() > 0.6;
        return { 
          ...p, 
          status: 'ready', 
          isAiBestPick: isBestPick,
          selected: isBestPick 
        };
      }
      return p;
    }));
    
    setIsAnalyzing(false);
  };

  const toggleSelect = (id: string) => {
    setPhotos(prev => prev.map(p => 
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  };

  const handleSelectAll = () => {
    const allSelected = photos.every(p => p.selected);
    setPhotos(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const selectedCount = photos.filter(p => p.selected).length;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />
      <Sidebar activeTool={activeTool} onToolSelect={setActiveTool} />

      <main className="flex-1 md:ml-24 mt-16 p-4 md:p-8 max-w-[1600px] mx-auto w-full pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          {currentView === 'import' && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div className="max-w-2xl">
                  <h1 className="font-headline font-extrabold text-3xl md:text-5xl tracking-tight text-on-surface mb-2">
                    Import <span className="text-gradient">Masterpieces.</span>
                  </h1>
                  <p className="text-on-surface-variant text-base md:text-lg mb-4">
                    Drop your RAW files here. Our AI will curate your best shots automatically.
                  </p>
                  <button 
                    onClick={handleSelectAll}
                    className="px-4 py-2 bg-surface-container-high rounded-xl text-xs font-bold uppercase tracking-widest text-primary hover:bg-surface-container-highest active:scale-95 transition-all border border-primary/10"
                  >
                    {photos.every(p => p.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-full border border-outline-variant/10 w-full md:w-auto justify-between md:justify-start">
                  <div className="flex items-center gap-3 px-4">
                    <Sparkles className={cn("transition-colors", isAiSmartSelection ? "text-primary" : "text-on-surface-variant")} size={18} fill={isAiSmartSelection ? "currentColor" : "none"} />
                    <span className="text-xs font-bold tracking-widest text-on-surface-variant uppercase">
                      AI Smart Selection
                    </span>
                  </div>
                  <button 
                    onClick={() => setIsAiSmartSelection(!isAiSmartSelection)}
                    className={cn(
                      "w-12 h-6 rounded-full relative flex items-center transition-all duration-300 px-1",
                      isAiSmartSelection ? "bg-primary-container" : "bg-surface-container-highest"
                    )}
                  >
                    <motion.div 
                      animate={{ x: isAiSmartSelection ? 24 : 0 }}
                      className={cn(
                        "w-4 h-4 rounded-full shadow-sm",
                        isAiSmartSelection ? "bg-on-primary-container" : "bg-on-surface-variant"
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6 items-stretch mb-12">
                <div className="col-span-12 lg:col-span-4">
                  <UploadZone onUpload={handleUpload} />
                </div>
                <div className="col-span-12 lg:col-span-8">
                  <PhotoGrid 
                    photos={photos} 
                    onToggleSelect={toggleSelect} 
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-8">
                {selectedCount > 0 && (
                  <span className="text-on-surface-variant font-medium text-sm">
                    {selectedCount} RAW files selected for analysis
                  </span>
                )}
                <button 
                  disabled={selectedCount === 0}
                  onClick={() => setCurrentView('analysis')}
                  className={cn(
                    "btn-primary text-lg px-10 py-4 group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
                    selectedCount > 0 && "hover:shadow-[0px_0px_40px_rgba(201,190,255,0.3)]"
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

      <footer className="w-full py-8 flex flex-col items-center gap-2 border-t border-outline-variant/5 mt-auto">
        <p className="text-[10px] text-on-surface-variant/40 tracking-[0.2em] font-medium uppercase">
          APOY - Add Photos, Originate Yours
        </p>
        <p className="text-[10px] text-on-surface-variant/20">
          Made by Fajrianor - PUSHAKIN UIN Antasari Banjarmasin 2026
        </p>
      </footer>
    </div>
  );
}
