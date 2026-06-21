import React, { useState, useEffect } from 'react';
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

interface ExportViewProps {
  photos: Photo[];
  settings: AnalysisSettings;
  onSettingsChange: (settings: AnalysisSettings) => void;
}

export function ExportView({ photos, settings, onSettingsChange }: ExportViewProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [selectedFormat, setSelectedFormat] = useState('JPG');
  const [selectedQuality, setSelectedQuality] = useState('High');
  const [optimization, setOptimization] = useState('web');
  const [destination, setDestination] = useState<'local' | 'internal' | 'cloud'>('local');
  const [isExporting, setIsExporting] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [exportName, setExportName] = useState('My-APOY-Masterpiece');
  const [folderPath, setFolderPath] = useState('APOY_Exports');
  const [progress, setProgress] = useState(0);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);

  const selectedPhotos = photos.filter(p => p.selected);

  const formatSizeMapping: Record<string, Record<string, string>> = {
    'JPG': { 'Low': '1.2 MB', 'Medium': '2.5 MB', 'High': '4.2 MB', 'Ultra': '8.1 MB' },
    'PNG': { 'Low': '3.5 MB', 'Medium': '7.2 MB', 'High': '12.4 MB', 'Ultra': '24.1 MB' },
    'TIFF': { 'Low': '15 MB', 'Medium': '32 MB', 'High': '64 MB', 'Ultra': '128 MB' },
    'DNG': { 'Low': '20 MB', 'Medium': '45 MB', 'High': '85 MB', 'Ultra': '150 MB' },
  };

  const baseSizeStr = formatSizeMapping[selectedFormat]?.[selectedQuality] || '4.2 MB';
  const baseSize = parseFloat(baseSizeStr);
  const totalSize = (baseSize * selectedPhotos.length).toFixed(1);
  const estimatedSize = `${totalSize} MB`;

  const {
    selectedPlatform,
    selectedTechnicalScenario,
    selectedStyle,
    selectedPreset,
    selectedFrame,
    selectedRatio,
    lensCorrection,
    whiteBalanceAdjusted,
    autoFocusFace,
    autoCutToRatio,
    autoArrange,
    selectedCleanBase,
    customFrameUrl
  } = settings;

  const previewPhoto = selectedPhotos[0] || photos[0];

  const processAndDownload = async (photo: Photo, index: number, asBlob = false) => {
    return new Promise<Blob | void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Calculate aspect ratio dimensions
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        const ratioMap: Record<string, number> = {
          '45': 0.8,
          '11': 1,
          '169': 16/9,
          '916': 9/16,
          '43': 4/3
        };
        const targetRatio = ratioMap[selectedRatio] || (img.width / img.height);
        
        if (img.width / img.height > targetRatio) {
          // Image is wider than target ratio
          targetWidth = img.height * targetRatio;
        } else {
          // Image is taller than target ratio
          targetHeight = img.width / targetRatio;
        }

        canvas.width = 3000; // High res export
        canvas.height = 3000 / targetRatio;

        // Calculate Inset for photo based on frame type
        const getInset = () => {
          if (selectedFrame === 'film') return canvas.width * 0.05;
          if (selectedFrame === 'minimal') return canvas.width * 0.025;
          if (selectedFrame === 'custom') return canvas.width * 0.08; // Safe margin for custom frames
          return 0;
        };
        const inset = getInset();
        const innerWidth = canvas.width - (inset * 2);
        const innerHeight = canvas.height - (selectedFrame === 'cinema' ? canvas.height * 0.3 : (inset * 2));
        const startX = inset;
        const startY = selectedFrame === 'cinema' ? canvas.height * 0.15 : inset;

        // Fill background with black for professional look behind the frame
        if (selectedFrame !== 'none') {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Apply filters
        ctx.filter = activeFilter;
        
        // Handle Object Fit
        if (settings.objectFit === 'contain') {
          // Draw blurred background
          ctx.save();
          ctx.filter = `${activeFilter} blur(60px) brightness(0.6)`;
          ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Reset filter for the main image if needed, or keep it
          ctx.filter = activeFilter;

          // Draw contained image
          let drawWidth = innerWidth;
          let drawHeight = innerHeight;
          const imgRatio = img.width / img.height;
          const targetRatioValue = innerWidth / innerHeight;

          if (imgRatio > targetRatioValue) {
            drawHeight = innerWidth / imgRatio;
          } else {
            drawWidth = innerHeight * imgRatio;
          }

          const dx = startX + (innerWidth - drawWidth) / 2;
          const dy = startY + (innerHeight - drawHeight) / 2;

          ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, drawWidth, drawHeight);
        } else {
          // Draw image (center crop OR AI smart crop) - ORIGINAL cover behavior
          let sourceX = (img.width - targetWidth) / 2;
          let sourceY = (img.height - targetHeight) / 2;

          if (autoCutToRatio) {
            // AI Simulation: Move focal point to upper 35% (Rule of Thirds / Face Focus)
            // Also apply a slight dramatic zoom
            const zoomFactor = settings.preserveHumans ? 1.0 : 1.12; 
            const zoomedWidth = targetWidth / zoomFactor;
            const zoomedHeight = targetHeight / zoomFactor;
            
            sourceX = (img.width - zoomedWidth) / 2;
            // Bias towards top for faces (usually in the upper 1/3), unless preserving humans (center to preserve group)
            sourceY = settings.preserveHumans ? (img.height - zoomedHeight) / 2 : (img.height - zoomedHeight) * 0.38; 
            
            if (autoArrange) {
              // Smart Leveling
              ctx.save();
              ctx.translate(startX + innerWidth / 2, startY + innerHeight / 2);
              ctx.rotate(0.01); 
              ctx.scale(1.05, 1.05);
              ctx.drawImage(img, sourceX, sourceY, zoomedWidth, zoomedHeight, -innerWidth/2, -innerHeight/2, innerWidth, innerHeight);
              ctx.restore();
            } else {
              ctx.drawImage(img, sourceX, sourceY, zoomedWidth, zoomedHeight, startX, startY, innerWidth, innerHeight);
            }
          } else {
            if (autoArrange) {
              ctx.save();
              ctx.translate(startX + innerWidth / 2, startY + innerHeight / 2);
              ctx.rotate(0.01); 
              ctx.scale(1.05, 1.05);
              ctx.drawImage(img, sourceX, sourceY, targetWidth, targetHeight, -innerWidth/2, -innerHeight/2, innerWidth, innerHeight);
              ctx.restore();
            } else {
              ctx.drawImage(img, sourceX, sourceY, targetWidth, targetHeight, startX, startY, innerWidth, innerHeight);
            }
          }
        }
        
        ctx.filter = 'none';
        
        const drawWatermarkAndFinalize = () => {
          // Add Watermark if enabled
          if (settings.watermarkEnabled && settings.watermarkText) {
            ctx.save();
            ctx.globalAlpha = settings.watermarkOpacity / 100;
            ctx.fillStyle = settings.watermarkColor || '#ffffff';
            ctx.font = `bold ${settings.watermarkSize * 4}px ${settings.watermarkFont}`; 
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = settings.watermarkSize;
            
            const text = settings.watermarkText;
            const metrics = ctx.measureText(text);
            const textWidth = metrics.width;
            const textHeight = settings.watermarkSize * 4;
            const marginX = canvas.width * 0.04;
            const marginY = canvas.height * 0.04;
            
            let x = marginX;
            let y = marginY + textHeight;
            
            if (settings.watermarkPosition === 'bottom-right') {
              x = canvas.width - textWidth - marginX;
              y = canvas.height - marginY;
            } else if (settings.watermarkPosition === 'bottom-left') {
              x = marginX;
              y = canvas.height - marginY;
            } else if (settings.watermarkPosition === 'top-right') {
              x = canvas.width - textWidth - marginX;
              y = marginY + textHeight;
            } else if (settings.watermarkPosition === 'center') {
              x = (canvas.width - textWidth) / 2;
              y = (canvas.height + textHeight) / 2;
            }
            
            ctx.fillText(text, x, y);
            ctx.restore();
          }
          finalizeCanvas();
        };

        // Add Frames on top
        if (selectedFrame === 'film') {
          const borderWidth = canvas.width * 0.05;
          ctx.fillStyle = 'rgba(0, 0, 0, 1)';
          ctx.fillRect(0, 0, canvas.width, borderWidth);
          ctx.fillRect(0, canvas.height - borderWidth, canvas.width, borderWidth);
          ctx.fillRect(0, 0, borderWidth, canvas.height);
          ctx.fillRect(canvas.width - borderWidth, 0, borderWidth, canvas.height);
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = `${canvas.width * 0.015}px monospace`;
          ctx.fillText("KODAK PORTRA 400", borderWidth * 1.5, borderWidth * 0.7);
          ctx.fillText("APOY_MASTER_EDIT", canvas.width - (borderWidth * 6), canvas.height - (borderWidth * 0.4));
          drawWatermarkAndFinalize();
        } else if (selectedFrame === 'cinema') {
          const barHeight = canvas.height * 0.15;
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, barHeight);
          ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
          drawWatermarkAndFinalize();
        } else if (selectedFrame === 'minimal') {
          const margin = canvas.width * 0.02;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = canvas.width * 0.002;
          ctx.strokeRect(margin, margin, canvas.width - (margin * 2), canvas.height - (margin * 2));
          drawWatermarkAndFinalize();
        } else if (selectedFrame === 'custom' && customFrameUrl) {
          const frameImg = new Image();
          frameImg.crossOrigin = "anonymous";
          frameImg.onload = () => {
            ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
            drawWatermarkAndFinalize();
          };
          frameImg.onerror = () => {
            console.error("Failed to load custom frame");
            drawWatermarkAndFinalize();
          };
          frameImg.src = customFrameUrl;
        } else {
          drawWatermarkAndFinalize();
        }

        function finalizeCanvas() {
          // Export and Download/Save
          const qualityVal = selectedQuality === 'Ultra' ? 1.0 : selectedQuality === 'High' ? 0.9 : selectedQuality === 'Medium' ? 0.7 : 0.5;
          const extension = selectedFormat.toLowerCase();
          const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
          
          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }

            if (asBlob) {
              resolve(blob);
              return;
            }

            const suffix = selectedPhotos.length > 1 ? `-${index + 1}` : '';
            const fileName = `${exportName}${suffix}.${extension}`;

            try {
              // Traditional download fallback (Single File)
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              const cleanPath = folderPath.replace(/[^a-zA-Z0-9_\-\/]/g, '_').replace(/\//g, '_');
              link.download = destination === 'local' ? `${cleanPath}_${fileName}` : fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(() => URL.revokeObjectURL(url), 100);
              
              resolve();
            } catch (err) {
              reject(err);
            }
          }, mimeType, qualityVal);
        }

        // Removed premature finalizeCanvas call - handled by drawWatermarkAndFinalize
      };
      img.onerror = () => reject(new Error("Failed to load image for processing"));
      img.src = photo.url;
    });
  };

  const handleExport = async () => {
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
      const cleanPath = folderPath.replace(/[^a-zA-Z0-9_\-\/]/g, '_').replace(/\//g, '_');
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

  // folder picker removed for web compatibility

  const activeFilterItems = [
    "brightness(1)",
    selectedTechnicalScenario === 'Formal' && "brightness(1.05) contrast(1.05) saturate(1.1)",
    selectedTechnicalScenario === 'Indoor' && "brightness(1.15) sepia(0.05)",
    selectedTechnicalScenario === 'Outdoor' && "contrast(1.1) saturate(1.2)",
    selectedTechnicalScenario === 'Night' && "brightness(1.05) contrast(1.15) saturate(0.85)",
    selectedStyle === 'Portrait' && "brightness(1.05) saturate(1.1) contrast(1.02)",
    selectedStyle === 'Landscape' && "saturate(1.3) contrast(1.1) brightness(1.05)",
    selectedStyle === 'Street' && "grayscale(0.1) contrast(1.2) brightness(0.95)",
    selectedStyle === 'Architectural' && "contrast(1.25) brightness(1.1) saturate(0.8)",
    selectedStyle === 'Macro' && "saturate(1.4) brightness(1.1)",
    selectedStyle === 'Event' && "brightness(1.1) contrast(1.1) saturate(1.15)",
    selectedPreset === 'Pro 1' && "contrast(1.25) brightness(1.1)",
    selectedPreset === 'Pro 2' && "sepia(0.2) brightness(0.95)",
    selectedPreset === 'Pro 3' && "contrast(1.1) saturate(1.05) brightness(1.05)",
    selectedPreset === 'Pro 4' && "grayscale(0.5) contrast(1.3)",
    selectedPreset === 'Pro 5' && "saturate(1.5) contrast(1.1)",
    selectedCleanBase === 'neutral' && "brightness(1.02) contrast(0.98) saturate(1.1)",
    selectedCleanBase === 'portrait' && "brightness(1.04) contrast(0.95) saturate(1.05)",
    selectedCleanBase === 'landscape' && "brightness(1) contrast(1.05) saturate(1.2)",
    selectedCleanBase === 'studio' && "brightness(1.08) contrast(1.02) saturate(1)",
    lensCorrection && "contrast(1.02) brightness(1.02)",
    whiteBalanceAdjusted && "saturate(1.05) contrast(1.05)"
  ].filter(Boolean);

  const activeFilter = activeFilterItems.join(' ');

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Canvas Left */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-secondary/10 blur-2xl opacity-50" />
            
            <div className={cn(
              "relative bg-surface-container-low rounded-2xl overflow-hidden shadow-2xl border border-white/5",
              selectedRatio === '45' && "aspect-[4/5]",
              selectedRatio === '11' && "aspect-square",
              selectedRatio === '169' && "aspect-video",
              selectedRatio === '43' && "aspect-[4/3]",
              selectedRatio === '916' && "aspect-[9/16]",
              selectedRatio === 'original' && "aspect-auto min-h-[300px]",
              !['45', '11', '169', '43', '916', 'original'].includes(selectedRatio) && "aspect-[4/3]"
            )} id="preview-aspect-container">
              {/* Processing Badge */}
              <div className="absolute top-6 left-6 z-30 flex items-center gap-3 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                  AI Rendering Engine
                </span>
              </div>

              {/* Before/After Slider */}
              <div 
                className="relative w-full h-full cursor-ew-resize select-none"
                onMouseMove={(e) => {
                  if (e.buttons === 1) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    setSliderPos(Math.min(Math.max(x, 0), 100));
                  }
                }}
              >
                {/* Original (Bottom) */}
                <div 
                  className={cn(
                    "absolute inset-0 bg-black/90",
                    selectedFrame === 'film' && "p-8",
                    selectedFrame === 'minimal' && "p-4",
                    selectedFrame === 'custom' && "p-12",
                    selectedFrame === 'cinema' && "py-16"
                  )}
                >
                  {settings.objectFit === 'contain' && (
                    <img 
                      src={previewPhoto?.url} 
                      className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <img 
                    src={previewPhoto?.url} 
                    className={cn(
                      "w-full h-full transition-all duration-300 relative z-10",
                      settings.objectFit === 'cover' ? "object-cover" : "object-contain"
                    )}
                    alt="Original"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                {/* Edited (Top) */}
                <div 
                  className="absolute inset-0 overflow-hidden border-r-2 border-white/50 z-10"
                  style={{ width: `${sliderPos}%` }}
                >
                  <div className={cn(
                      "absolute inset-0",
                      selectedFrame === 'film' && "p-8",
                      selectedFrame === 'minimal' && "p-4",
                      selectedFrame === 'custom' && "p-12",
                      selectedFrame === 'cinema' && "py-16"
                    )}
                    style={{ width: `${100 * (100 / sliderPos)}%` }}
                  >
                    {settings.objectFit === 'contain' && (
                      <img 
                        src={previewPhoto?.url} 
                        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110"
                        alt=""
                        style={{ filter: activeFilter }}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <img 
                      src={previewPhoto?.url} 
                      className={cn(
                        "w-full h-full transition-all duration-300 relative z-10",
                        settings.objectFit === 'cover' ? "object-cover" : "object-contain"
                      )}
                      style={{ 
                        filter: activeFilter,
                        opacity: selectedPlatform === 'tk' ? 0.9 : 1,
                        mixBlendMode: selectedPlatform === 'li' ? 'luminosity' as any : 'normal' as any,
                        transform: lensCorrection ? 'scale(1.02)' : 'scale(1)'
                      }}
                      alt="Edited"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {/* Auto Focus Multi-Face Overlay on Edited part */}
                  {autoFocusFace && (
                    <div className="absolute inset-0 z-30 pointer-events-none">
                      {[
                        { t: '30%', l: '45%', s: 20 },
                        { t: '35%', l: '65%', s: 16 },
                        { t: '28%', l: '25%', s: 18 }
                      ].map((face, idx) => (
                        <motion.div 
                          key={`focus-export-${idx}`}
                          initial={{ opacity: 0, scale: 1.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="absolute border border-primary/60 rounded-sm"
                          style={{ 
                            top: face.t, 
                            left: face.l, 
                            width: `${face.s * 4}px`, 
                            height: `${face.s * 4}px`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary" />
                          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary" />
                          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary" />
                          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary" />
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {/* Platform Overlays on Edited part */}
                  {selectedPlatform === 'ig' && <div className="absolute inset-0 bg-primary/5 pointer-events-none" />}
                  {selectedPlatform === 'fb' && <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />}

                  {/* Real-time Watermark Preview */}
                  {settings.watermarkEnabled && (
                    <div className={cn(
                      "absolute z-40 pointer-events-none text-white font-bold select-none whitespace-nowrap px-3 py-1.5",
                      settings.watermarkPosition === 'bottom-right' && "bottom-[4%] right-[4%]",
                      settings.watermarkPosition === 'bottom-left' && "bottom-[4%] left-[4%]",
                      settings.watermarkPosition === 'top-right' && "top-[4%] right-[4%]",
                      settings.watermarkPosition === 'top-left' && "top-[4%] left-[4%]",
                      settings.watermarkPosition === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    )}
                    style={{
                      fontFamily: settings.watermarkFont,
                      fontSize: `${Math.max(10, settings.watermarkSize / 2.5)}px`, 
                      opacity: settings.watermarkOpacity / 100,
                      color: settings.watermarkColor,
                      textShadow: '0 1px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.4)',
                      background: `rgba(0,0,0,${(settings.watermarkOpacity / 100) * 0.1})`,
                      borderRadius: '4px'
                    }}>
                      {settings.watermarkText}
                    </div>
                  )}
                </div>

                {/* Slider Handle */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white z-20 pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-3 bg-surface rounded-full" />
                      <div className="w-0.5 h-3 bg-surface rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute bottom-6 left-6 z-30 text-[10px] font-black tracking-[0.2em] bg-white text-black px-2 py-1 rounded uppercase">
                  RAW
                </div>
                <div className="absolute bottom-6 right-6 z-30 text-[10px] font-black tracking-[0.2em] bg-primary text-black px-2 py-1 rounded uppercase">
                  APOY MASTER
                </div>

                {/* Frame Overlays */}
                {selectedFrame === 'film' && (
                  <div className="absolute inset-0 border-[20px] md:border-[32px] border-black/90 flex flex-col justify-between p-4 pointer-events-none z-20">
                    <div className="flex justify-between text-[10px] text-white/30 font-mono tracking-widest uppercase">
                      <span>Kodak Portra 400</span>
                      <span>36 Exp</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-white/30 font-mono tracking-widest uppercase">
                      <span>12/24</span>
                      <span>APOY_MASTER_EDIT</span>
                    </div>
                  </div>
                )}
                {selectedFrame === 'minimal' && <div className="absolute inset-4 md:inset-8 border border-white/50 z-20 pointer-events-none" />}
                {selectedFrame === 'cinema' && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-10 md:h-12 bg-black z-20 pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-12 md:h-16 bg-black z-20 pointer-events-none" />
                  </>
                )}
                {selectedFrame === 'custom' && customFrameUrl && (
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    <img src={customFrameUrl} className="w-full h-full object-cover" alt="Custom Frame Preview" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Success Card */}
          <div className={cn(
            "bg-surface-container-high/40 rounded-2xl p-4 md:p-6 border border-primary/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-500",
            isExported ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="text-green-500" size={20} md:size={24} />
              </div>
              <div>
                <h3 className="font-headline font-bold text-on-surface text-base md:text-lg">Saved to Downloads</h3>
                <p className="font-body text-xs md:text-sm text-on-surface-variant">
                  Your APOY Masterpiece has been exported successfully.
                </p>
              </div>
            </div>
            <button className="p-3 rounded-full hover:bg-surface-container-highest transition-colors text-primary">
              <Share2 size={24} />
            </button>
          </div>
        </div>

        {/* Control Panel Right */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          {/* Automatic Frames */}
          <section className="bg-surface-container-low rounded-3xl p-8 border border-white/5">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <h2 className="font-headline text-xl font-bold">Automatic Frames</h2>
                <button 
                  onClick={() => {
                    if (selectedFrame !== 'none') {
                      onSettingsChange({ ...settings, selectedFrame: 'none' });
                    } else {
                      onSettingsChange({ ...settings, selectedFrame: 'film' });
                    }
                  }}
                  className={cn(
                    "w-10 h-5 rounded-full relative flex items-center px-1 transition-all",
                    selectedFrame !== 'none' ? "bg-primary" : "bg-outline/30"
                  )}
                >
                  <motion.div 
                    animate={{ x: selectedFrame !== 'none' ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-3 h-3 bg-white rounded-full" 
                  />
                </button>
              </div>
              <span className="text-[10px] font-label font-bold uppercase tracking-widest text-primary">
                Pro Presets
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { id: 'film', label: 'Film Border', icon: 'border-2 border-white/20' },
                { id: 'minimal', label: 'Minimalist', icon: 'bg-white/10' },
                { id: 'cinema', label: 'Cinematic', icon: 'border-y border-white/20' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => onSettingsChange({ ...settings, selectedFrame: f.id })}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-xl transition-all active:scale-95",
                    selectedFrame === f.id 
                      ? "bg-surface-container-high border border-primary/40" 
                      : "bg-surface-container-highest/10 hover:bg-surface-container-highest"
                  )}
                >
                  <div className={cn("w-full aspect-square rounded flex items-center justify-center", f.icon)}>
                    <div className="w-8 h-8 border border-white/10" />
                  </div>
                  <span className="text-[10px] font-label font-bold uppercase tracking-tighter">
                    {f.label}
                  </span>
                </button>
              ))}
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      const currentHistory = settings.frameHistory || [];
                      const updatedHistory = [url, ...currentHistory.filter(h => h !== url)].slice(0, 5);
                      onSettingsChange({ 
                        ...settings, 
                        selectedFrame: 'custom',
                        customFrameUrl: url,
                        frameHistory: updatedHistory
                      });
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <button 
                  className={cn(
                    "w-full flex flex-col items-center gap-3 p-4 rounded-xl transition-all border",
                    selectedFrame === 'custom'
                      ? "bg-surface-container-high border-primary/40"
                      : "bg-surface-container-highest/5 border-dashed border-outline/30 group-hover:border-primary/50"
                  )}
                >
                  <div className="w-full aspect-square rounded flex items-center justify-center relative overflow-hidden">
                    {customFrameUrl ? (
                      <img src={customFrameUrl} className="w-full h-full object-cover rounded" alt="Custom frame" />
                    ) : (
                      <FileUp className="text-on-surface-variant group-hover:text-primary transition-colors" size={24} />
                    )}
                  </div>
                  <span className="text-[10px] font-label font-bold uppercase tracking-tighter text-on-surface-variant">
                    {customFrameUrl ? 'Change Custom' : 'Custom'}
                  </span>
                </button>
              </div>
            </div>

            {/* Frame History */}
            {(settings.frameHistory && settings.frameHistory.length > 0) && (
              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">Recent Frames</span>
                  <button 
                    onClick={() => onSettingsChange({ ...settings, frameHistory: [] })}
                    className="text-[10px] font-bold text-error/60 hover:text-error transition-colors flex items-center gap-1.5"
                  >
                    Clear History
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
                  {settings.frameHistory.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSettingsChange({ ...settings, selectedFrame: 'custom', customFrameUrl: url })}
                      className={cn(
                        "w-16 h-16 rounded-xl border-2 shrink-0 overflow-hidden transition-all group relative",
                        selectedFrame === 'custom' && customFrameUrl === url 
                          ? "border-primary scale-105 shadow-lg shadow-primary/20" 
                          : "border-transparent opacity-40 hover:opacity-100 hover:border-white/20"
                      )}
                    >
                      <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={`Recent frame ${idx}`} />
                      {selectedFrame === 'custom' && customFrameUrl === url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Watermark Section */}
            <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">Intelligent Watermark</span>
                  <div className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold">BETA</div>
                </div>
                <button 
                  onClick={() => onSettingsChange({ ...settings, watermarkEnabled: !settings.watermarkEnabled })}
                  className={cn(
                    "w-8 h-4 rounded-full relative flex items-center px-1 transition-all",
                    settings.watermarkEnabled ? "bg-primary" : "bg-outline/30"
                  )}
                >
                  <motion.div 
                    animate={{ x: settings.watermarkEnabled ? 16 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-2.5 h-2.5 bg-white rounded-full" 
                  />
                </button>
              </div>

              {settings.watermarkEnabled && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-on-surface-variant/70">Custom Text</span>
                    <input 
                      type="text"
                      value={settings.watermarkText}
                      onChange={(e) => onSettingsChange({ ...settings, watermarkText: e.target.value })}
                      placeholder="Enter watermark text..."
                      className="w-full bg-surface-container-highest/20 border border-outline-variant/10 rounded-xl px-4 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-on-surface-variant/70">Style</span>
                      <select 
                        value={settings.watermarkFont}
                        onChange={(e) => onSettingsChange({ ...settings, watermarkFont: e.target.value })}
                        className="w-full bg-surface-container-highest/20 border border-outline-variant/10 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none"
                      >
                        <option value="Inter">Modern (Inter)</option>
                        <option value="JetBrains Mono">Technical (Mono)</option>
                        <option value="Playfair Display">Elegant (Serif)</option>
                        <option value="Bebas Neue">Bold (Impact)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-on-surface-variant/70">Size ({settings.watermarkSize}px)</span>
                      <input 
                        type="range"
                        min="12"
                        max="120"
                        value={settings.watermarkSize}
                        onChange={(e) => onSettingsChange({ ...settings, watermarkSize: parseInt(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-on-surface-variant/70">Opacity ({settings.watermarkOpacity}%)</span>
                      <input 
                        type="range"
                        min="5"
                        max="100"
                        value={settings.watermarkOpacity}
                        onChange={(e) => onSettingsChange({ ...settings, watermarkOpacity: parseInt(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-on-surface-variant/70">Position</span>
                      <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container-highest/20 rounded-lg">
                        {[
                          { id: 'top-left', label: 'TL' },
                          { id: 'top-right', label: 'TR' },
                          { id: 'center', label: 'C' },
                          { id: 'bottom-left', label: 'BL' },
                          { id: 'bottom-right', label: 'BR' },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            onClick={() => onSettingsChange({ ...settings, watermarkPosition: pos.id as any })}
                            className={cn(
                              "py-1 rounded text-[8px] font-bold transition-all",
                              settings.watermarkPosition === pos.id ? "bg-primary text-on-primary" : "hover:bg-surface-container-highest"
                            )}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Format & Quality */}
          <section className="bg-surface-container-low rounded-3xl p-8 border border-white/5">
            <h2 className="font-headline text-xl font-bold mb-6">Format & Quality</h2>
            <div className="space-y-6">
              <div className="space-y-3">
                <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">File Format</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['JPG', 'PNG', 'TIFF', 'DNG'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedFormat(f)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-xs font-bold transition-all border active:scale-95",
                        selectedFormat === f 
                          ? "bg-primary text-on-primary border-primary shadow-lg" 
                          : "bg-surface-container-high border-transparent text-on-surface-variant hover:bg-surface-container-highest"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">Export Quality</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Low', 'Medium', 'High', 'Ultra'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setSelectedQuality(q)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold transition-all border active:scale-95",
                        selectedQuality === q 
                          ? "bg-primary/20 border-primary text-primary" 
                          : "bg-surface-container-high border-transparent text-on-surface-variant hover:bg-surface-container-highest"
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Insight Display */}
              <div className="p-5 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Estimated File Size</p>
                  <p className="text-2xl font-headline font-black text-primary">{estimatedSize}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{selectedFormat} Format</p>
                  <p className="text-[10px] font-medium text-on-surface-variant/60">{selectedQuality} Quality Level</p>
                </div>
              </div>
            </div>
          </section>

          {/* Business Optimization */}
          <section className="bg-surface-container-low rounded-3xl p-8 border border-white/5">
            <h2 className="font-headline text-xl font-bold mb-6">Business Use-case</h2>
            <div className="space-y-4">
              {[
                { id: 'web', label: 'Web-ready', desc: 'Optimized for speed & social', icon: Globe },
                { id: 'print', label: 'High-res print', desc: 'Lossless TIFF, 300 DPI', icon: Printer },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all border",
                    optimization === opt.id 
                      ? "bg-surface-container-high border-primary/20" 
                      : "bg-surface-container-high/40 border-transparent hover:bg-surface-container-highest"
                  )}
                  onClick={() => setOptimization(opt.id)}
                >
                  <div className="flex items-center gap-5">
                    <opt.icon className={cn(optimization === opt.id ? "text-primary" : "text-on-surface-variant")} size={24} />
                    <div>
                      <div className="text-sm font-bold">{opt.label}</div>
                      <div className="text-xs text-on-surface-variant">{opt.desc}</div>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    optimization === opt.id ? "border-primary" : "border-outline-variant"
                  )}>
                    {optimization === opt.id && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* File Naming */}
          <section className="bg-surface-container-low rounded-3xl p-8 border border-white/5">
            <h2 className="font-headline text-xl font-bold mb-6 text-on-surface">File Naming</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">Project / Batch Name</label>
                <input 
                  type="text" 
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  placeholder="Enter custom name..."
                  className="w-full bg-surface-container-high border border-white/5 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
              <div className="p-3 bg-surface-container-highest/10 rounded-xl border border-white/5">
                <p className="text-[10px] text-on-surface-variant italic">
                  Example: {exportName}{selectedPhotos.length > 1 ? '-1' : ''}.{selectedFormat.toLowerCase()}
                </p>
              </div>
            </div>
          </section>

          {/* Export Destination */}
          <section className="bg-surface-container-low rounded-3xl p-8 border border-white/5">
            <h2 className="font-headline text-xl font-bold mb-6 text-on-surface">Export Destination</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'local', label: 'Local', icon: Monitor },
                  { id: 'internal', label: 'Internal', icon: FolderOpen },
                  { id: 'cloud', label: 'Cloud', icon: Cloud },
                ].map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => setDestination(dest.id as any)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                      destination === dest.id 
                        ? "bg-primary/20 border-primary text-primary" 
                        : "bg-surface-container-high border-transparent text-on-surface-variant hover:bg-surface-container-highest"
                    )}
                  >
                    <dest.icon size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{dest.label}</span>
                  </button>
                ))}
              </div>

              {destination === 'local' && (
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
              )}

              {destination === 'internal' && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3">
                  <AlertCircle size={18} className="text-yellow-500 shrink-0" />
                  <p className="text-[10px] text-yellow-200/80 leading-snug">
                    Internal storage is persistent within this browser session. Files will be stored in indexedDB.
                  </p>
                </div>
              )}

              {destination === 'cloud' && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3">
                  <Cloud size={18} className="text-blue-400 shrink-0" />
                  <p className="text-[10px] text-blue-200/80 leading-snug">
                    Cloud sync requires account connection. Files will be uploaded to your default APOY vault.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Export Button */}
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              "w-full py-8 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-3xl shadow-2xl flex flex-col items-center justify-center gap-2 group hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50",
              isExported && "from-green-500 to-green-600"
            )}
          >
            {isExporting ? (
              <Loader2 className="animate-spin" size={32} />
            ) : isExported ? (
              <CheckCircle2 size={32} />
            ) : (
              <Download className="group-hover:translate-y-1 transition-transform" size={32} />
            )}
            <span className="font-headline font-black uppercase tracking-widest text-sm text-center">
              {isExporting ? "Exporting..." : isExported ? "Photos Exported!" : `Export ${selectedPhotos.length} ${selectedPhotos.length === 1 ? 'Photo' : 'Photos'}`}
            </span>
          </button>
        </div>
      </div>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isExporting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-surface/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <div className="w-full max-w-md space-y-8 text-center p-8 rounded-3xl bg-surface-container border border-white/5 shadow-2xl">
              <div className="relative w-24 h-24 mx-auto">
                <Loader2 className="w-full h-full text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-headline font-black text-on-surface">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-headline font-bold text-on-surface">Generating Masterpieces</h3>
                <div className="flex items-center justify-center gap-2 text-on-surface-variant text-sm">
                  <span>Processing photo {currentProcessingIndex + 1} of {selectedPhotos.length}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary shadow-[0_0_15px_rgba(201,190,255,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
                  <span>Analyzing</span>
                  <span>Infusing Effects</span>
                  <span>Saving</span>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant/60 leading-relaxed italic">
                Applying AI corrections, {selectedPreset} preset, and {selectedFrame} frame to all selected assets.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Details */}
      <footer className="mt-12 flex flex-col sm:flex-row justify-between items-center border-t border-white/5 pt-8 gap-6">
        <div className="flex flex-wrap justify-center sm:justify-start gap-4 md:gap-10 text-[10px] font-label font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          <span>Resolution: 4500 x 6000 px</span>
          <span>Format: {selectedFormat} ({selectedQuality})</span>
          <span>Estimated Size: {estimatedSize}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
          <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
            Hardware Acceleration Active
          </span>
        </div>
      </footer>
    </div>
  );
}
