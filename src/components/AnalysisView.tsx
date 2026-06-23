'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  RotateCcw,
  RotateCw,
  ChevronRight,
  Instagram,
  Twitter,
  Globe,
  Zap,
  Focus,
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  Share2,
  Layers,
  Facebook,
  Linkedin,
  Music,
  Pin,
  Printer,
  Loader2,
  UserCircle,
  Pipette,
  ShieldCheck,
  Camera,
  Maximize2,
  Scissors,
  Eraser,
  Sparkles,
} from 'lucide-react';
import { Photo, AnalysisSettings } from '../types';
import { cn } from '../lib/utils';
import { removeBackground } from '../lib/bg-removal';

interface AnalysisViewProps {
  photos: Photo[];
  onViewChange: (view: 'import' | 'analysis' | 'export') => void;
  settings: AnalysisSettings;
  onSettingsChange: (settings: AnalysisSettings) => void;
}

export function AnalysisView({ photos, onViewChange, settings, onSettingsChange }: AnalysisViewProps) {
  const [activeStep, setActiveStep] = React.useState(0);
  const [isCommandSending, setIsCommandSending] = React.useState(false);
  const [aiCommand, setAiCommand] = React.useState('');

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
    customFrameUrl,
  } = settings;
  const bgRemovalEnabled = settings.bgRemovalEnabled;
  const bgRemovalTolerance = settings.bgRemovalTolerance;
  const bgRemovalSmoothness = settings.bgRemovalSmoothness;

  const updateSetting = (key: keyof AnalysisSettings, value: unknown) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const selectedPhotos = photos.filter((p) => p.selected);

  // Background removal: produce transparent-PNG versions of the selected
  // photos whenever the feature is enabled or its parameters change.
  const [bgRemovedUrls, setBgRemovedUrls] = React.useState<Record<string, string>>({});
  const [isProcessingBg, setIsProcessingBg] = React.useState(false);

  React.useEffect(() => {
    if (!bgRemovalEnabled) {
      // Clean up any previously generated blob URLs when disabled
      Object.values(bgRemovedUrls).forEach((url) => URL.revokeObjectURL(url as string));
      setBgRemovedUrls({});
      return;
    }
    let cancelled = false;
    setIsProcessingBg(true);
    (async () => {
      const results: Record<string, string> = {};
      for (const photo of selectedPhotos) {
        const url = await removeBackground(photo.url, {
          tolerance: bgRemovalTolerance,
          smoothness: bgRemovalSmoothness,
        });
        if (cancelled) return;
        if (url) results[photo.id] = url;
      }
      if (!cancelled) {
        // Revoke old urls before swapping
        Object.values(bgRemovedUrls).forEach((url) => URL.revokeObjectURL(url as string));
        setBgRemovedUrls(results);
        setIsProcessingBg(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgRemovalEnabled, bgRemovalTolerance, bgRemovalSmoothness, selectedPhotos.length]);

  const steps = [
    { id: 'platform', title: 'Target Platform', description: 'Where will these photos be published?' },
    { id: 'conditions', title: 'Lighting & Style', description: 'Set technical scenario, mood, and professional corrections.' },
    { id: 'presets', title: 'Pro Presets', description: 'Apply industry-standard event styles.' },
    { id: 'command', title: 'AI Command', description: 'Final custom refinements.' },
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      onViewChange('export');
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleReset = () => {
    onSettingsChange({
      selectedPlatform: 'ig',
      selectedTechnicalScenario: 'Formal',
      selectedStyle: 'Portrait',
      selectedPreset: 'Pro 1',
      selectedFrame: 'none',
      selectedRatio: '45',
      selectedCleanBase: 'neutral',
      exposure: 66,
      focus: 88,
      lensCorrection: true,
      whiteBalanceAdjusted: false,
      autoFocusFace: false,
      autoCutToRatio: false,
      preserveHumans: true,
      autoArrange: false,
      objectFit: 'cover',
      watermarkEnabled: false,
      watermarkText: 'APOY MASTERPIECE',
      watermarkFont: 'Inter',
      watermarkSize: 24,
      watermarkOpacity: 50,
      watermarkPosition: 'bottom-right',
      watermarkColor: '#ffffff',
      frameHistory: [],
      bgRemovalEnabled: false,
      bgRemovalTolerance: 32,
      bgRemovalSmoothness: 18,
    });
    setAiCommand('');
    setActiveStep(0);
  };

  const handleSendCommand = () => {
    setIsCommandSending(true);
    setTimeout(() => {
      setIsCommandSending(false);
      setAiCommand('');
      onViewChange('export');
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header & Stepper */}
      <section className="space-y-4 px-1 md:px-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-headline font-extrabold tracking-tight text-on-surface">
              Guided Analysis
            </h1>
            <p className="text-on-surface-variant font-body text-sm md:text-base">
              Step {activeStep + 1} of {steps.length}: {steps[activeStep].title}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-surface-container-high rounded-xl text-on-surface-variant font-medium hover:bg-surface-container-highest transition-all flex items-center gap-2 text-xs"
            >
              <RotateCcw size={14} />
              <span>Reset All</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 h-1.5 w-full">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-full transition-all duration-500',
                i <= activeStep ? 'bg-primary' : 'bg-surface-container-highest'
              )}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Active Step Controls */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-surface-container-low rounded-3xl p-8 border border-white/5 shadow-xl min-h-[500px] flex flex-col"
          >
            <div className="flex-1 space-y-8">
              <div className="space-y-2">
                <h3 className="text-xl font-headline font-bold text-on-surface">
                  {steps[activeStep].title}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {steps[activeStep].description}
                </p>
              </div>

              {/* Step Content Rendering */}
              {activeStep === 0 && (
                <div className="space-y-8">
                  {/* Background Removal — Transparent PNG (before Clean Base) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Eraser size={16} className="text-primary" />
                        <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                          Background Removal
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold">
                          TRANSPARENT PNG
                        </span>
                        {isProcessingBg && (
                          <Loader2 size={11} className="text-primary animate-spin" />
                        )}
                      </div>
                      <button
                        onClick={() => updateSetting('bgRemovalEnabled', !bgRemovalEnabled)}
                        className={cn(
                          'w-10 h-5 rounded-full relative flex items-center px-1 transition-all',
                          bgRemovalEnabled ? 'bg-primary' : 'bg-outline/30'
                        )}
                        aria-label="Toggle background removal"
                      >
                        <motion.div
                          animate={{ x: bgRemovalEnabled ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-3 h-3 bg-white rounded-full"
                        />
                      </button>
                    </div>

                    {bgRemovalEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 overflow-hidden"
                      >
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          Removes the dominant edge color (great for strong/bright
                          backgrounds) and exports a transparent PNG with smooth
                          feathered edges. Best on photos with a uniform background.
                        </p>

                        {/* Tolerance slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-on-surface-variant/70 flex items-center gap-1.5">
                              <Scissors size={11} /> Removal Tolerance
                            </span>
                            <span className="text-[10px] font-mono text-primary">
                              {bgRemovalTolerance}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="80"
                            value={bgRemovalTolerance}
                            onChange={(e) =>
                              updateSetting('bgRemovalTolerance', parseInt(e.target.value))
                            }
                            className="w-full accent-primary"
                          />
                          <p className="text-[9px] text-on-surface-variant/50">
                            Higher = remove more colors near the background. Too high may eat into the subject.
                          </p>
                        </div>

                        {/* Smoothness slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-on-surface-variant/70 flex items-center gap-1.5">
                              <Sparkles size={11} /> Edge Smoothness
                            </span>
                            <span className="text-[10px] font-mono text-primary">
                              {bgRemovalSmoothness}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="60"
                            value={bgRemovalSmoothness}
                            onChange={(e) =>
                              updateSetting('bgRemovalSmoothness', parseInt(e.target.value))
                            }
                            className="w-full accent-primary"
                          />
                          <p className="text-[9px] text-on-surface-variant/50">
                            Feathered alpha band at edges for smooth, anti-aliased cutouts.
                          </p>
                        </div>

                        {/* Status / hint */}
                        <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex gap-2">
                          <Pipette size={12} className="text-primary shrink-0 mt-0.5" />
                          <p className="text-[10px] text-on-surface-variant leading-snug">
                            Background sampled automatically from the 4 corners &amp; edges.
                            {selectedPhotos.length === 0
                              ? ' Select at least one photo to preview.'
                              : isProcessingBg
                                ? ' Processing photos…'
                                : ` ${Object.keys(bgRemovedUrls).length}/${selectedPhotos.length} photos processed.`}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary" />
                      <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                        Clean Base Foundation
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'neutral', label: 'Neutral Base', desc: 'Standard RAW prep' },
                        { id: 'portrait', label: 'Pro Portrait', desc: 'Soft skin texture' },
                        { id: 'landscape', label: 'Pro Landscape', desc: 'Distant clarity' },
                        { id: 'studio', label: 'Clean Studio', desc: 'High dynamic range' },
                      ].map((base) => (
                        <button
                          key={base.id}
                          onClick={() => updateSetting('selectedCleanBase', base.id)}
                          className={cn(
                            'flex flex-col items-start gap-1 p-3 rounded-xl transition-all border text-left active:scale-95',
                            selectedCleanBase === base.id
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-surface-container-high border-transparent text-on-surface-variant hover:bg-surface-container-highest'
                          )}
                        >
                          <span className="text-[10px] font-bold">{base.label}</span>
                          <span className="text-[8px] opacity-60 leading-tight">{base.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                      Publishing Destination
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'ig', label: 'Instagram', icon: Instagram },
                        { id: 'tw', label: 'Twitter', icon: Twitter },
                        { id: 'fb', label: 'Facebook', icon: Facebook },
                        { id: 'tk', label: 'TikTok', icon: Music },
                        { id: 'li', label: 'LinkedIn', icon: Linkedin },
                        { id: 'pn', label: 'Pin', icon: Pin },
                        { id: 'web', label: 'Web', icon: Globe },
                        { id: 'pr', label: 'Print', icon: Printer },
                      ].map((platform) => (
                        <button
                          key={platform.id}
                          onClick={() => updateSetting('selectedPlatform', platform.id)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded-xl transition-all border active:scale-95',
                            selectedPlatform === platform.id
                              ? 'bg-primary text-on-primary border-primary shadow-lg'
                              : 'bg-surface-container-high border-transparent text-on-surface-variant hover:bg-surface-container-highest'
                          )}
                        >
                          <platform.icon size={16} />
                          <span className="text-[8px] font-bold uppercase tracking-tighter">
                            {platform.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                      Lighting Scenario
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'Formal', label: 'Formal / Business Portrait', icon: UserCircle },
                        { id: 'Indoor', label: 'Indoor (Event / Meeting)', icon: Globe },
                        { id: 'Outdoor', label: 'Outdoor (Field Trip)', icon: Zap },
                        { id: 'Night', label: 'Night / Gala Dinner', icon: Focus },
                      ].map((scenario) => (
                        <button
                          key={scenario.id}
                          onClick={() => updateSetting('selectedTechnicalScenario', scenario.id)}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl transition-all border text-left active:scale-95',
                            selectedTechnicalScenario === scenario.id
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-surface-container-high border-transparent text-on-surface-variant hover:bg-surface-container-highest'
                          )}
                        >
                          <scenario.icon size={16} />
                          <span className="text-xs font-bold">{scenario.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                      Semantic Style
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['Portrait', 'Landscape', 'Street', 'Architectural', 'Macro', 'Event'].map((style) => (
                        <button
                          key={style}
                          onClick={() => updateSetting('selectedStyle', style)}
                          className={cn(
                            'px-4 py-2 rounded-xl text-[10px] font-bold transition-all border active:scale-95',
                            selectedStyle === style
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-surface-container-high border-transparent text-on-surface-variant hover:border-primary/50'
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-label font-bold uppercase tracking-widest text-primary/80">
                        Pro Camera Tools
                      </span>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        <div className="w-1 h-1 rounded-full bg-primary/40" />
                        <div className="w-1 h-1 rounded-full bg-primary/20" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        onClick={() => updateSetting('lensCorrection', !lensCorrection)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-xl transition-all border active:scale-[0.98]',
                          lensCorrection
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-surface-container-high border-transparent'
                        )}
                      >
                        <div className="flex items-center gap-3 text-left">
                          <Camera size={16} className={lensCorrection ? 'text-primary' : 'text-on-surface-variant'} />
                          <div>
                            <p className="text-xs font-bold text-on-surface">Lens Corrections</p>
                            <p className="text-[10px] text-on-surface-variant leading-tight">
                              Removes distortion &amp; vignette
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center',
                            lensCorrection ? 'bg-primary border-primary' : 'border-outline'
                          )}
                        >
                          {lensCorrection && <CheckCircle2 size={10} className="text-on-primary" />}
                        </div>
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => updateSetting('whiteBalanceAdjusted', !whiteBalanceAdjusted)}
                          className={cn(
                            'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border justify-center active:scale-95',
                            whiteBalanceAdjusted
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-surface-container-high border-transparent text-on-surface-variant'
                          )}
                        >
                          <Pipette size={16} />
                          <div className="text-center">
                            <p className="text-[10px] font-bold">WB Dropper</p>
                            <p className="text-[8px] opacity-60">Auto Neutralize</p>
                          </div>
                        </button>

                        <button
                          onClick={() => updateSetting('autoFocusFace', !autoFocusFace)}
                          className={cn(
                            'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border justify-center active:scale-95',
                            autoFocusFace
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-surface-container-high border-transparent text-on-surface-variant'
                          )}
                        >
                          <Maximize2 size={16} />
                          <div className="text-center">
                            <p className="text-[10px] font-bold">Group Focus</p>
                            <p className="text-[8px] opacity-60">Multi-Face Focus</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {['Pro 1', 'Pro 2', 'Pro 3', 'Pro 4', 'Pro 5'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => updateSetting('selectedPreset', preset)}
                        className={cn(
                          'flex flex-col items-center justify-center p-4 rounded-2xl border transition-all aspect-square active:scale-95',
                          selectedPreset === preset
                            ? 'bg-primary border-primary text-on-primary shadow-lg'
                            : 'bg-surface-container-high border-transparent text-on-surface-variant hover:border-primary/50'
                        )}
                      >
                        <Layers size={20} />
                        <span className="text-[10px] font-black mt-2">{preset}</span>
                      </button>
                    ))}
                  </div>
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-xs text-primary leading-relaxed italic font-medium">
                      {selectedPreset}:{' '}
                      {selectedPreset === 'Pro 1'
                        ? 'High Contrast & Clarity'
                        : selectedPreset === 'Pro 2'
                          ? 'Warm Film Aesthetic'
                          : selectedPreset === 'Pro 3'
                            ? 'Clean Commercial Look'
                            : selectedPreset === 'Pro 4'
                              ? 'Moody Noir Tones'
                              : 'Vibrant Editorial'}
                    </p>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={aiCommand}
                      onChange={(e) => setAiCommand(e.target.value)}
                      placeholder="Ex: 'Adjust skin tones to be warmer...'"
                      className="w-full bg-surface-container-highest/30 border border-outline-variant/10 rounded-2xl p-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-all min-h-[150px] resize-none"
                    />
                  </div>
                  <p className="text-[10px] text-on-surface-variant">
                    Type any specific instruction for the final AI pass.
                  </p>
                </div>
              )}
            </div>

            {/* Step Actions */}
            <div className="pt-8 flex flex-col gap-3">
              <div className="flex gap-3">
                {activeStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="flex-1 px-4 py-3 bg-surface-container-highest text-on-surface font-bold rounded-2xl hover:bg-surface-container-high transition-all text-sm"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={activeStep === 3 ? handleSendCommand : handleNext}
                  disabled={isCommandSending}
                  className="flex-[2] px-6 py-3 bg-primary text-on-primary font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 text-sm flex items-center justify-center gap-2"
                >
                  {isCommandSending ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>{activeStep === 3 ? 'Apply Final AI' : 'Apply & Next'}</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={handleNext}
                className="w-full py-2 text-on-surface-variant font-medium text-xs hover:text-on-surface transition-colors"
              >
                Skip this step
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Real-time Preview */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* AI Banner */}
          <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-secondary-container/20 to-primary-container/10 border border-white/5">
            <div className="relative z-10 flex flex-col sm:flex-row items-start gap-6">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 shrink-0">
                <BrainCircuit
                  className={cn('transition-colors', isCommandSending ? 'animate-pulse delay-75' : 'text-primary')}
                  size={28}
                />
              </div>
              <div className="space-y-2 max-w-xl">
                <h2 className="text-lg md:text-xl font-headline font-bold text-on-surface">
                  Luminous AI Recommendation
                </h2>
                <div className="text-on-surface-variant text-xs md:text-sm leading-relaxed space-y-1">
                  <p>
                    Platform: <strong>{selectedPlatform.toUpperCase()}</strong> • Ratio: <strong>{selectedRatio}</strong>
                  </p>
                  <p>
                    Base: <span className="text-primary font-bold uppercase">[{selectedCleanBase}]</span> • Scenario:{' '}
                    <strong>{selectedTechnicalScenario}</strong>
                  </p>
                  <p>
                    AI Preset: <span className="text-secondary font-bold">[{selectedPreset}]</span> • Style:{' '}
                    <strong>{selectedStyle}</strong>
                  </p>
                  {bgRemovalEnabled && (
                    <p className="text-primary">
                      BG Removal: <strong>ON</strong> • Tolerance {bgRemovalTolerance} • Smooth {bgRemovalSmoothness}{' '}
                      <span className="text-on-surface-variant/60">(→ transparent PNG)</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          </div>

          {/* Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedPhotos.slice(0, 2).map((photo, i) => (
              <div
                key={photo.id}
                className="bg-surface-container-low rounded-3xl overflow-hidden group border border-white/5 shadow-2xl relative"
              >
                {/* Frame Overlays */}
                {selectedFrame === 'film' && (
                  <div className="absolute inset-0 border-[20px] border-black z-10 pointer-events-none flex flex-col justify-between p-2 opacity-80">
                    <div className="flex justify-between text-[8px] text-white/30 font-mono">
                      <span>KODAK 400</span>
                      <span>36 EXP</span>
                    </div>
                    <div className="flex justify-between text-[8px] text-white/30 font-mono">
                      <span>10/24</span>
                      <span>APOY ENGINE</span>
                    </div>
                  </div>
                )}
                {selectedFrame === 'minimal' && (
                  <div className="absolute inset-4 border border-white/50 z-10 pointer-events-none" />
                )}
                {selectedFrame === 'cinema' && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-10 bg-black z-10 pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-black z-10 pointer-events-none" />
                  </>
                )}
                {selectedFrame === 'custom' && customFrameUrl && (
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    { }
                    <img src={customFrameUrl} className="w-full h-full object-cover" alt="Custom Frame Preview" />
                  </div>
                )}

                <div
                  className={cn(
                    'relative h-72 overflow-hidden transition-all duration-500 bg-black/90',
                    selectedRatio === '45' && 'aspect-[4/5] h-auto',
                    selectedRatio === '11' && 'aspect-square h-auto',
                    selectedRatio === '169' && 'aspect-video h-auto',
                    selectedRatio === '43' && 'aspect-[4/3] h-auto',
                    selectedRatio === '916' && 'aspect-[9/16] h-[400px]',
                    selectedRatio === 'original' && 'aspect-auto h-auto min-h-[18rem]',
                    selectedFrame === 'film' && 'p-4',
                    selectedFrame === 'minimal' && 'p-2',
                    selectedFrame === 'custom' && 'p-6',
                    selectedFrame === 'cinema' && 'py-8 px-0'
                  )}
                >
                  {/* Checkerboard backdrop when background removal is active */}
                  {bgRemovalEnabled && bgRemovedUrls[photo.id] && (
                    <div
                      className="absolute inset-0 z-[5] opacity-30"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #555 25%, transparent 25%), linear-gradient(-45deg, #555 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #555 75%), linear-gradient(-45deg, transparent 75%, #555 75%)',
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
                      }}
                    />
                  )}

                  {/* Blurred Background for Contain Mode */}
                  {settings.objectFit === 'contain' && !bgRemovalEnabled && (
                    <div className="absolute inset-0 z-0 overflow-hidden">
                      <img
                        src={photo.url}
                        alt=""
                        className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <img
                    src={bgRemovalEnabled && bgRemovedUrls[photo.id] ? bgRemovedUrls[photo.id] : photo.url}
                    alt={photo.name}
                    className={cn(
                      'w-full h-full transition-all duration-1000 relative z-10',
                      settings.objectFit === 'cover' ? 'object-cover' : 'object-contain'
                    )}
                    referrerPolicy="no-referrer"
                    style={{
                      filter: cn(
                        'brightness(1)',
                        selectedTechnicalScenario === 'Formal' && 'brightness(1.05) contrast(1.05) saturate(1.1)',
                        selectedTechnicalScenario === 'Indoor' && 'brightness(1.15) sepia(0.05)',
                        selectedTechnicalScenario === 'Outdoor' && 'contrast(1.1) saturate(1.2)',
                        selectedTechnicalScenario === 'Night' && 'brightness(1.05) contrast(1.15) saturate(0.85)',
                        selectedStyle === 'Portrait' && 'brightness(1.05) saturate(1.1) contrast(1.02)',
                        selectedStyle === 'Landscape' && 'saturate(1.3) contrast(1.1) brightness(1.05)',
                        selectedStyle === 'Street' && 'grayscale(0.1) contrast(1.2) brightness(0.95)',
                        selectedStyle === 'Architectural' && 'contrast(1.25) brightness(1.1) saturate(0.8)',
                        selectedStyle === 'Macro' && 'saturate(1.4) brightness(1.1)',
                        selectedStyle === 'Event' && 'brightness(1.1) contrast(1.1) saturate(1.15)',
                        selectedPreset === 'Pro 1' && 'contrast(1.25) brightness(1.1)',
                        selectedPreset === 'Pro 2' && 'sepia(0.2) brightness(0.95)',
                        selectedPreset === 'Pro 3' && 'contrast(1.1) saturate(1.05) brightness(1.05)',
                        selectedPreset === 'Pro 4' && 'grayscale(0.5) contrast(1.3)',
                        selectedPreset === 'Pro 5' && 'saturate(1.5) contrast(1.1)',
                        selectedCleanBase === 'neutral' && 'brightness(1.02) contrast(0.98) saturate(1.1)',
                        selectedCleanBase === 'portrait' && 'brightness(1.04) contrast(0.95) saturate(1.05)',
                        selectedCleanBase === 'landscape' && 'brightness(1) contrast(1.05) saturate(1.2)',
                        selectedCleanBase === 'studio' && 'brightness(1.08) contrast(1.02) saturate(1)',
                        lensCorrection && 'contrast(1.02) brightness(1.02)',
                        whiteBalanceAdjusted && 'saturate(1.05) contrast(1.05)'
                      ),
                      opacity: selectedPlatform === 'tk' ? 0.9 : 1,
                      mixBlendMode: selectedPlatform === 'li' ? ('luminosity' as React.CSSProperties['mixBlendMode']) : ('normal' as React.CSSProperties['mixBlendMode']),
                      transform: cn(
                        lensCorrection ? 'scale(1.02)' : 'scale(1)',
                        autoCutToRatio && !settings.preserveHumans && 'scale(1.15) translateY(-5%)',
                        autoCutToRatio && settings.preserveHumans && 'scale(1.0) translateY(0)',
                        autoArrange && 'scale(1.05) rotate(0.5deg)'
                      ),
                    }}
                  />
                  {/* AI Composition Guide Overlay */}
                  {autoCutToRatio && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      className="absolute inset-0 pointer-events-none z-30"
                    >
                      <div className="absolute top-1/3 w-full h-px bg-primary/50" />
                      <div className="absolute top-2/3 w-full h-px bg-primary/50" />
                      <div className="absolute left-1/3 h-full w-px bg-primary/50" />
                      <div className="absolute left-2/3 h-full w-px bg-primary/50" />
                    </motion.div>
                  )}
                  {/* Auto Focus Multi-Face Overlay */}
                  {autoFocusFace && (
                    <div className="absolute inset-0 z-30 pointer-events-none">
                      {[
                        { t: '30%', l: '45%', s: 20 },
                        { t: '35%', l: '65%', s: 16 },
                        { t: '28%', l: '25%', s: 18 },
                      ].map((face, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 1.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="absolute border border-primary/60 rounded-sm"
                          style={{
                            top: face.t,
                            left: face.l,
                            width: `${face.s * 4}px`,
                            height: `${face.s * 4}px`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary" />
                          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary" />
                          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary" />
                          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full animate-pulse" />
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {/* Platform Specific Overlays */}
                  {selectedPlatform === 'ig' && <div className="absolute inset-0 bg-primary/5 pointer-events-none" />}
                  {selectedPlatform === 'fb' && <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />}

                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-60" />

                  <div className="absolute top-4 left-4 z-20">
                    <div
                      className={cn(
                        'px-3 py-1 rounded-full backdrop-blur-md text-[10px] font-bold flex items-center gap-2 border border-white/10',
                        selectedPhotos.indexOf(photo) === 0 ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
                      )}
                    >
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          selectedPhotos.indexOf(photo) === 0 ? 'bg-primary' : 'bg-secondary'
                        )}
                      />
                      {selectedPlatform.toUpperCase()} OPTIMIZED
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 z-20">
                    <div className="text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-1">
                      AI Recommendation
                    </div>
                    <div className="text-3xl font-headline font-black text-white">
                      {i === 0 ? '98.2' : '84.5'}
                      <span className={cn('text-sm font-normal ml-1', i === 0 ? 'text-primary' : 'text-secondary')}>
                        /100
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 flex justify-between items-center bg-surface-container-low relative z-20">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-on-surface">{photo.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {selectedStyle} • {selectedPreset} • {selectedFrame !== 'none' ? selectedFrame : 'No Frame'}
                    </p>
                  </div>
                  {i === 0 ? (
                    <CheckCircle2 className="text-primary" size={20} fill="currentColor" />
                  ) : (
                    <AlertCircle className="text-on-surface-variant" size={20} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Ratio Selector (Always visible as a quick tool) */}
          <div className="bg-surface-container-low rounded-3xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-label font-bold uppercase tracking-widest text-on-surface-variant">
                Quick Ratio Check
              </h4>
              <div className="flex bg-surface-container-highest/50 rounded-lg p-1">
                {[
                  { id: 'cover', label: 'Fill', desc: 'Crop to fill' },
                  { id: 'contain', label: 'Fit', desc: 'Show all' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => updateSetting('objectFit', mode.id)}
                    className={cn(
                      'px-3 py-1 rounded-md text-[10px] font-bold transition-all',
                      settings.objectFit === mode.id
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
              {[
                { id: 'original', label: 'Original', icon: 'w-10 h-8 border-dashed' },
                { id: '45', label: '4:5 Vertical', icon: 'w-8 h-10' },
                { id: '11', label: '1:1 Square', icon: 'w-8 h-8' },
                { id: '43', label: '4:3 Horizontal', icon: 'w-10 h-8' },
                { id: '169', label: '16:9 Cinema', icon: 'w-10 h-6' },
                { id: '916', label: '9:16 Stories', icon: 'w-6 h-10' },
              ].map((ratio) => (
                <div
                  key={ratio.id}
                  onClick={() => updateSetting('selectedRatio', ratio.id)}
                  className={cn(
                    'bg-surface-container rounded-2xl p-4 border flex flex-col items-center justify-center gap-3 cursor-pointer transition-all',
                    selectedRatio === ratio.id
                      ? 'border-primary/40 bg-primary/5 shadow-inner'
                      : 'border-outline-variant/10 hover:border-primary/50'
                  )}
                >
                  <div
                    className={cn(
                      'border-2 rounded-sm',
                      ratio.icon,
                      selectedRatio === ratio.id ? 'border-primary' : 'border-on-surface-variant'
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-bold',
                      selectedRatio === ratio.id ? 'text-primary' : 'text-on-surface-variant'
                    )}
                  >
                    {ratio.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Magazine-Ready Composition (New) */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-6 border border-primary/20 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <BrainCircuit size={18} className="text-primary" />
              </div>
              <div>
                <h4 className="text-xs font-headline font-bold text-on-surface uppercase tracking-widest">
                  Magazine AI Composition
                </h4>
                <p className="text-[10px] text-on-surface-variant font-medium">Auto-frame your masterpieces</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => updateSetting('autoCutToRatio', !autoCutToRatio)}
                className={cn(
                  'flex items-center justify-between p-4 rounded-2xl border transition-all',
                  autoCutToRatio
                    ? 'bg-primary text-on-primary border-primary shadow-lg'
                    : 'bg-surface-container border-transparent text-on-surface-variant hover:border-primary/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <Maximize2 size={16} />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase">Auto Cut to Ratio</p>
                    <p className="text-[8px] opacity-70">Dramatic focal crop</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    autoCutToRatio ? 'border-on-primary' : 'border-on-surface-variant/30'
                  )}
                >
                  {autoCutToRatio && <div className="w-2 h-2 bg-on-primary rounded-full" />}
                </div>
              </button>

              <button
                onClick={() => updateSetting('preserveHumans', !settings.preserveHumans)}
                className={cn(
                  'flex items-center justify-between p-4 rounded-2xl border transition-all',
                  settings.preserveHumans
                    ? 'bg-primary text-on-primary border-primary shadow-lg'
                    : 'bg-surface-container border-transparent text-on-surface-variant hover:border-primary/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <UserCircle size={16} />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase">Keep Subjects</p>
                    <p className="text-[8px] opacity-70">Don&apos;t crop humans</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    settings.preserveHumans ? 'border-on-primary' : 'border-on-surface-variant/30'
                  )}
                >
                  {settings.preserveHumans && <div className="w-2 h-2 bg-on-primary rounded-full" />}
                </div>
              </button>

              <button
                onClick={() => updateSetting('autoArrange', !autoArrange)}
                className={cn(
                  'flex items-center justify-between p-4 rounded-2xl border transition-all',
                  autoArrange
                    ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/20'
                    : 'bg-surface-container border-transparent text-on-surface-variant hover:border-secondary/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <RotateCw size={16} />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase">Auto Horizon Level</p>
                    <p className="text-[8px] opacity-70">Straighten tilted shots</p>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    autoArrange ? 'border-white' : 'border-on-surface-variant/30'
                  )}
                >
                  {autoArrange && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Cluster */}
      <div className="fixed bottom-28 md:bottom-12 right-4 md:right-8 flex items-center gap-3 md:gap-4 z-50">
        <button className="w-12 h-12 md:w-14 md:h-14 bg-surface-container-highest backdrop-blur-xl border border-white/10 text-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
          <Share2 size={20} />
        </button>
        <button
          onClick={() => onViewChange('export')}
          className="px-6 md:px-8 h-12 md:h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-full shadow-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:scale-110 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>Export Master</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
