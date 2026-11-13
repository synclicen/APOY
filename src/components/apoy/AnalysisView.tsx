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
  Wand2,
  ShieldCheck,
  Camera,
  Maximize2,
  Scissors,
  Eraser,
  Sparkles,
} from 'lucide-react';
import { Photo, AnalysisSettings } from './types';
import { cn } from '@/lib/utils';
import { removeBackground } from '@/lib/bg-removal';
import { aiEnhanceCssFilter } from '@/lib/ai-enhance';

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
  const [commandResult, setCommandResult] = React.useState<string[]>([]);
  // Step 0 AI Enhance sub-stages: 'idle' → 'analyzing' → 'suggestions' → 'confirmed'
  const [enhanceStage, setEnhanceStage] = React.useState<'idle' | 'analyzing' | 'suggestions' | 'confirmed'>('idle');
  const [enhanceAnalysis, setEnhanceAnalysis] = React.useState<string[]>([]);
  const [selectedEnhanceVariant, setSelectedEnhanceVariant] = React.useState<number>(0);
  const [faceEnhance, setFaceEnhance] = React.useState<boolean>(false);

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
  const aiEnhanceEnabled = settings.aiEnhanceEnabled;

  // CSS filter for AI enhance preview (lightweight approximation)
  const aiEnhanceFilter = aiEnhanceEnabled
    ? aiEnhanceCssFilter({
        strength: settings.aiEnhanceStrength,
        brightness: settings.aiEnhanceBrightness,
        contrast: settings.aiEnhanceContrast,
        vibrance: settings.aiEnhanceVibrance,
      })
    : '';

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
      Object.values(bgRemovedUrls).forEach((url) => URL.revokeObjectURL(url));
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
        Object.values(bgRemovedUrls).forEach((url) => URL.revokeObjectURL(url));
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
    { id: 'enhance', title: 'AI Auto-Enhance', description: 'One-click professional photo restoration.' },
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
      bgRemovalMode: 'auto',
      bgRemovalColor: null,
      aiEnhanceEnabled: false,
      aiEnhanceStrength: 35,
      aiEnhanceBrightness: 25,
      aiEnhanceSharpen: 30,
      aiEnhanceContrast: 25,
      aiEnhanceShadows: 30,
      aiEnhanceHighlights: 50,
      aiEnhanceVibrance: 20,
      aiEnhanceDenoise: 15,
    });
    setAiCommand('');
    setActiveStep(0);
  };

  const handleSendCommand = () => {
    setIsCommandSending(true);

    // Parse the AI command and apply relevant settings changes
    const cmd = aiCommand.toLowerCase().trim();
    const newSettings = { ...settings };
    const actions: string[] = [];

    // Face tracking / face box removal
    if (cmd.match(/face.*(track|box|detect|remove|hide|clear)/) || cmd.match(/(remove|hide|clear|off|disable).*face/)) {
      newSettings.autoFocusFace = false;
      actions.push('face tracking boxes removed');
    }
    // Enable face tracking
    if (cmd.match(/(enable|show|add|on).*face/) || cmd.match(/face.*(track|detect|focus|on)/)) {
      if (!cmd.match(/remove|hide|clear|off|disable/)) {
        newSettings.autoFocusFace = true;
        actions.push('face tracking enabled');
      }
    }

    // Background removal
    if (cmd.match(/(remove|delete|clear|transparent).*back/) || cmd.match(/back.*(remove|delete|transparent)/)) {
      newSettings.bgRemovalEnabled = true;
      actions.push('background removal enabled');
    }
    if (cmd.match(/(keep|restore|undo).*back/) || cmd.match(/back.*(keep|restore|off|disable)/)) {
      newSettings.bgRemovalEnabled = false;
      actions.push('background removal disabled');
    }

    // Lens correction
    if (cmd.match(/(lens|distortion|vignette)/) && cmd.match(/(fix|correct|remove|on|enable)/)) {
      newSettings.lensCorrection = true;
      actions.push('lens correction enabled');
    }
    if (cmd.match(/(lens|distortion)/) && cmd.match(/(off|disable|remove)/)) {
      newSettings.lensCorrection = false;
      actions.push('lens correction disabled');
    }

    // White balance
    if (cmd.match(/(white.*balance|wb|color.*temp)/) && cmd.match(/(fix|adjust|correct|auto|on|enable)/)) {
      newSettings.whiteBalanceAdjusted = true;
      actions.push('white balance adjusted');
    }

    // Auto cut to ratio
    if (cmd.match(/(crop|cut|ratio|zoom).*auto/) || cmd.match(/auto.*(crop|cut|zoom)/)) {
      newSettings.autoCutToRatio = true;
      actions.push('auto cut to ratio enabled');
    }
    if (cmd.match(/(uncrop|no.*crop|disable.*crop|full.*photo|show.*all)/)) {
      newSettings.autoCutToRatio = false;
      actions.push('auto crop disabled');
    }

    // Auto arrange / horizon level
    if (cmd.match(/(straighten|level|horizon|tilt|rotate)/)) {
      newSettings.autoArrange = true;
      actions.push('auto horizon level enabled');
    }

    // Preserve humans / subjects
    if (cmd.match(/(keep|preserve|protect).*(human|people|subject|person|face)/)) {
      newSettings.preserveHumans = true;
      actions.push('subject preservation enabled');
    }

    // Style changes
    if (cmd.match(/portrait/)) { newSettings.selectedStyle = 'Portrait'; actions.push('style: Portrait'); }
    if (cmd.match(/landscape/)) { newSettings.selectedStyle = 'Landscape'; actions.push('style: Landscape'); }
    if (cmd.match(/street/)) { newSettings.selectedStyle = 'Street'; actions.push('style: Street'); }
    if (cmd.match(/architect/)) { newSettings.selectedStyle = 'Architectural'; actions.push('style: Architectural'); }
    if (cmd.match(/macro/)) { newSettings.selectedStyle = 'Macro'; actions.push('style: Macro'); }
    if (cmd.match(/event/)) { newSettings.selectedStyle = 'Event'; actions.push('style: Event'); }

    // Scenario changes
    if (cmd.match(/(formal|business|professional)/)) { newSettings.selectedTechnicalScenario = 'Formal'; actions.push('scenario: Formal'); }
    if (cmd.match(/(indoor|meeting|event)/) && !cmd.match(/outdoor/)) { newSettings.selectedTechnicalScenario = 'Indoor'; actions.push('scenario: Indoor'); }
    if (cmd.match(/(outdoor|field|nature)/)) { newSettings.selectedTechnicalScenario = 'Outdoor'; actions.push('scenario: Outdoor'); }
    if (cmd.match(/(night|gala|dinner|evening)/)) { newSettings.selectedTechnicalScenario = 'Night'; actions.push('scenario: Night'); }

    // Preset changes
    if (cmd.match(/(high.*contrast|contrast)/) && !cmd.match(/low/)) { newSettings.selectedPreset = 'Pro 1'; actions.push('preset: Pro 1 (High Contrast)'); }
    if (cmd.match(/(warm|film|vintage)/)) { newSettings.selectedPreset = 'Pro 2'; actions.push('preset: Pro 2 (Warm Film)'); }
    if (cmd.match(/(clean|commercial|minimal)/)) { newSettings.selectedPreset = 'Pro 3'; actions.push('preset: Pro 3 (Clean Commercial)'); }
    if (cmd.match(/(moody|noir|dark|black.*white|monochrome)/)) { newSettings.selectedPreset = 'Pro 4'; actions.push('preset: Pro 4 (Moody Noir)'); }
    if (cmd.match(/(vibrant|colorful|editorial|magazine)/)) { newSettings.selectedPreset = 'Pro 5'; actions.push('preset: Pro 5 (Vibrant Editorial)'); }

    // Clean base
    if (cmd.match(/(neutral|standard|raw)/)) { newSettings.selectedCleanBase = 'neutral'; actions.push('base: Neutral'); }
    if (cmd.match(/(portrait.*base|soft.*skin)/)) { newSettings.selectedCleanBase = 'portrait'; actions.push('base: Pro Portrait'); }
    if (cmd.match(/(landscape.*base|distant|clarity)/)) { newSettings.selectedCleanBase = 'landscape'; actions.push('base: Pro Landscape'); }
    if (cmd.match(/(studio|hdr|dynamic.*range)/)) { newSettings.selectedCleanBase = 'studio'; actions.push('base: Clean Studio'); }

    // AI Auto-Enhance
    if (cmd.match(/(enhance|fix.*dark|bright|lightroom|pro.*finish|hd|sharpen|deblur|restore)/)) {
      newSettings.aiEnhanceEnabled = true;
      if (cmd.match(/(dark|bright|exposure|underexpos)/)) { newSettings.aiEnhanceBrightness = 80; newSettings.aiEnhanceShadows = 70; actions.push('AI: dark→bright'); }
      if (cmd.match(/(blur|hd|sharp|deblur|focus)/)) { newSettings.aiEnhanceSharpen = 85; actions.push('AI: blur→HD'); }
      if (cmd.match(/(lightroom|pro|finish|professional)/)) { newSettings.aiEnhanceContrast = 50; newSettings.aiEnhanceVibrance = 45; actions.push('AI: pro finishing'); }
      if (!actions.some(a => a.startsWith('AI:'))) actions.push('AI enhance enabled');
    }
    if (cmd.match(/(disable|off|remove).*enhance/)) { newSettings.aiEnhanceEnabled = false; actions.push('AI enhance disabled'); }

    // Apply the settings — call onSettingsChange synchronously so the
    // state update is committed BEFORE we navigate to Export.
    onSettingsChange(newSettings);
    setCommandResult(actions);

    // Small delay just for the processing animation, then navigate
    setTimeout(() => {
      setIsCommandSending(false);
      setAiCommand('');
      onViewChange('export');
    }, 1200);
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

              {activeStep === 0 && (
                <div className="space-y-4">
                  {/* AI Auto-Enhance — 3-Stage Flow */}

                  {/* STAGE 1: ANALYZE */}
                  {enhanceStage === 'idle' && (
                    <div className="p-4 bg-surface-container-high rounded-2xl border border-outline-variant/10 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Wand2 size={18} className="text-primary" />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-headline font-bold text-on-surface">AI Auto-Enhance</h3>
                          <p className="text-[9px] text-on-surface-variant leading-tight">Analisis foto → pilih hasil → lanjut</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEnhanceStage('analyzing');
                          setEnhanceAnalysis([]);
                          // Simulate analysis
                          setTimeout(() => {
                            const findings: string[] = [];
                            // Basic analysis simulation
                            findings.push('Exposure: Checking brightness levels...');
                            findings.push('Faces: Detecting human subjects...');
                            findings.push('Noise: Scanning for grain/ISO artifacts...');
                            findings.push('Blur: Measuring edge sharpness...');
                            findings.push('Color: Analyzing white balance & vibrance...');
                            setEnhanceAnalysis(findings);
                            setTimeout(() => {
                              setEnhanceStage('suggestions');
                            }, 1500);
                          }, 500);
                        }}
                        disabled={selectedPhotos.length === 0}
                        className="w-full py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        <BrainCircuit size={16} />
                        Start AI Analysis
                      </button>
                      {selectedPhotos.length === 0 && (
                        <p className="text-[9px] text-on-surface-variant/50 text-center">Select at least 1 photo first</p>
                      )}
                    </div>
                  )}

                  {/* STAGE 1b: ANALYZING (loading) */}
                  {enhanceStage === 'analyzing' && (
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border border-primary/20 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Loader2 size={18} className="text-primary animate-spin" />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-headline font-bold text-primary">Analyzing Photo...</h3>
                          <p className="text-[9px] text-on-surface-variant leading-tight">AI sedang memeriksa setiap detail</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {enhanceAnalysis.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="flex items-center gap-2 text-[10px] text-on-surface-variant"
                          >
                            <CheckCircle2 size={10} className="text-green-400 shrink-0" />
                            {item}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STAGE 2: SUGGESTIONS (pick a variant) */}
                  {enhanceStage === 'suggestions' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                        <span className="text-[10px] font-bold text-green-400">Analysis complete — pick your preferred result</span>
                      </div>

                      {/* Face Enhance Toggle — adds face-specific effects on top of cinematic */}
                      <div className="p-3 bg-surface-container-high rounded-xl border border-outline-variant/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <UserCircle size={15} className={cn('transition-colors', faceEnhance ? 'text-primary' : 'text-on-surface-variant')} />
                            <div>
                              <span className="text-[10px] font-bold text-on-surface">Face Enhance</span>
                              <p className="text-[8px] text-on-surface-variant/60 leading-tight">Smooth kulit, cerahkan wajah gelap, tajamkan mata</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setFaceEnhance(!faceEnhance)}
                            className={cn(
                              'w-10 h-5 rounded-full relative flex items-center px-1 transition-all shrink-0',
                              faceEnhance ? 'bg-primary' : 'bg-outline/30'
                            )}
                          >
                            <motion.div
                              animate={{ x: faceEnhance ? 20 : 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              className="w-3 h-3 bg-white rounded-full"
                            />
                          </button>
                        </div>
                        {faceEnhance && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {['Face Brighten', 'Skin Smooth', 'Eye Sharp', 'HD Detail'].map((label) => (
                              <span key={label} className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded-md">
                                <CheckCircle2 size={8} className="text-primary" />
                                <span className="text-[7px] font-bold text-primary">{label}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-on-surface-variant px-1">Pilih 1 dari 6 hasil AI enhance di preview sebelah kanan:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2, 3, 4, 5].map((variant) => (
                          <button
                            key={variant}
                            onClick={() => setSelectedEnhanceVariant(variant)}
                            className={cn(
                              'py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border active:scale-95',
                              selectedEnhanceVariant === variant
                                ? 'bg-primary text-on-primary border-primary shadow-lg'
                                : 'bg-surface-container-high border-transparent text-on-surface-variant hover:bg-surface-container-highest'
                            )}
                          >
                            {['Cinematic 1', 'Cinematic 2', 'Cinematic 3', 'Cinematic 4', 'Cinematic 5', 'Cinematic 6'][variant]}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-on-surface-variant/60 px-1 leading-relaxed">
                        Cinematic 1 (soft) → Cinematic 6 (dramatic). Semua hasil bertema cinematic profesional.
                        {faceEnhance && ' + Face Enhance aktif (smooth + HD wajah).'}
                      </p>
                      <button
                        onClick={() => {
                          // Apply the selected variant to settings
                          const variantSettings = [
                            { strength: 35, brightness: 20, contrast: 30, vibrance: 20, sharpen: 30, shadows: 25, highlights: 45, denoise: 15 },
                            { strength: 50, brightness: 25, contrast: 40, vibrance: 25, sharpen: 40, shadows: 30, highlights: 45, denoise: 18 },
                            { strength: 65, brightness: 30, contrast: 50, vibrance: 30, sharpen: 50, shadows: 35, highlights: 50, denoise: 20 },
                            { strength: 75, brightness: 35, contrast: 60, vibrance: 35, sharpen: 60, shadows: 40, highlights: 50, denoise: 22 },
                            { strength: 85, brightness: 40, contrast: 70, vibrance: 40, sharpen: 70, shadows: 45, highlights: 55, denoise: 25 },
                            { strength: 95, brightness: 45, contrast: 80, vibrance: 45, sharpen: 80, shadows: 50, highlights: 55, denoise: 28 },
                          ][selectedEnhanceVariant];
                          onSettingsChange({
                            ...settings,
                            aiEnhanceEnabled: true,
                            ...Object.fromEntries(
                              Object.entries(variantSettings).map(([k, v]) => ['aiEnhance' + k.charAt(0).toUpperCase() + k.slice(1), v])
                            ),
                          });
                          setEnhanceStage('confirmed');
                        }}
                        className="w-full py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} />
                        Use This Result
                      </button>
                      <button
                        onClick={() => setEnhanceStage('idle')}
                        className="w-full py-2 text-[10px] text-on-surface-variant hover:text-on-surface font-bold uppercase tracking-wider transition-colors"
                      >
                        ← Re-analyze
                      </button>
                    </div>
                  )}

                  {/* STAGE 3: CONFIRMED */}
                  {enhanceStage === 'confirmed' && (
                    <div className="space-y-3">
                      <div className="p-4 bg-gradient-to-br from-primary/15 to-secondary/10 rounded-2xl border border-primary/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-lg shadow-primary/20">
                            <CheckCircle2 size={18} className="text-on-primary-container" />
                          </div>
                          <div>
                            <h3 className="text-[11px] font-headline font-bold text-on-surface">
                              AI Enhance Active
                            </h3>
                            <p className="text-[9px] text-on-surface-variant leading-tight">
                              {['Cinematic 1', 'Cinematic 2', 'Cinematic 3', 'Cinematic 4', 'Cinematic 5', 'Cinematic 6'][selectedEnhanceVariant]}{faceEnhance ? ' + Face Enhance' : ''} — click Apply & Next to continue
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-3">
                          {['Adaptive Exposure', 'Face Detection', 'Shadow Recovery', 'HD Detail', 'Pro Contrast', 'Vibrance', 'Denoise'].map((label) => (
                            <span key={label} className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 rounded-lg">
                              <CheckCircle2 size={8} className="text-green-400" />
                              <span className="text-[7px] font-bold text-green-400">{label}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEnhanceStage('idle');
                          updateSetting('aiEnhanceEnabled', false);
                        }}
                        className="w-full py-2 text-[10px] text-on-surface-variant hover:text-error font-bold uppercase tracking-wider transition-colors"
                      >
                        ✕ Remove Enhancement
                      </button>
                    </div>
                  )}

                  {/* Background Removal (always available) */}
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
                      </div>
                      <button
                        onClick={() => updateSetting('bgRemovalEnabled', !bgRemovalEnabled)}
                        className={cn(
                          'w-10 h-5 rounded-full relative flex items-center px-1 transition-all',
                          bgRemovalEnabled ? 'bg-primary' : 'bg-outline/30'
                        )}
                      >
                        <motion.div
                          animate={{ x: bgRemovalEnabled ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-3 h-3 bg-white rounded-full"
                        />
                      </button>
                    </div>
                    {bgRemovalEnabled && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Color to Remove</span>
                          <div className="grid grid-cols-3 gap-2">
                            {[{ id: 'auto', label: 'Auto' }, { id: 'preset', label: 'Presets' }, { id: 'eyedropper', label: 'Eyedropper' }].map((mode) => (
                              <button key={mode.id} onClick={() => updateSetting('bgRemovalMode', mode.id)} className={cn('py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all border active:scale-95', bgRemovalMode === mode.id ? 'bg-primary text-on-primary border-primary shadow-lg' : 'bg-surface-container-high border-transparent text-on-surface-variant hover:bg-surface-container-highest')}>{mode.label}</button>
                            ))}
                          </div>
                        </div>
                        {bgRemovalMode === 'preset' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {[{hex:'#ffffff',label:'White'},{hex:'#000000',label:'Black'},{hex:'#00b14f',label:'Green'},{hex:'#0047bb',label:'Blue'},{hex:'#ff0000',label:'Red'},{hex:'#ffd500',label:'Yellow'},{hex:'#f0f0f0',label:'L.Grey'},{hex:'#333333',label:'D.Grey'}].map((sw) => (
                                <button key={sw.hex} onClick={() => updateSetting('bgRemovalColor', sw.hex)} title={sw.label} className={cn('w-8 h-8 rounded-lg border-2 transition-all active:scale-90', bgRemovalColor === sw.hex ? 'border-primary scale-110 shadow-lg' : 'border-outline-variant/30 hover:border-primary/50')} style={{ backgroundColor: sw.hex }} />
                              ))}
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="color" value={bgRemovalColor || '#ffffff'} onChange={(e) => updateSetting('bgRemovalColor', e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-outline-variant/30" />
                              <span className="text-[10px] font-bold text-on-surface-variant/70">Custom</span>
                            </label>
                          </div>
                        )}
                        {bgRemovalMode === 'eyedropper' && (
                          <div className="space-y-2">
                            <button onClick={() => setEyedropperActive((v) => !v)} className={cn('w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 border', eyedropperActive ? 'bg-primary text-on-primary border-primary shadow-lg animate-pulse' : 'bg-surface-container-high text-on-surface-variant hover:text-primary border-outline-variant/20')}>
                              <Pipette size={14} />{eyedropperActive ? 'Click a photo to sample...' : 'Activate Eyedropper'}
                            </button>
                            {bgRemovalColor && (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-high">
                                <div className="w-6 h-6 rounded border border-outline-variant/30 shrink-0" style={{ backgroundColor: bgRemovalColor }} />
                                <span className="text-[10px] font-mono text-primary">{bgRemovalColor.toUpperCase()}</span>
                                <button onClick={() => updateSetting('bgRemovalColor', null)} className="ml-auto text-[9px] text-on-surface-variant/50 hover:text-error uppercase tracking-wider">Clear</button>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-on-surface-variant/70 flex items-center gap-1.5"><Scissors size={11} /> Tolerance</span><span className="text-[10px] font-mono text-primary">{bgRemovalTolerance}</span></div>
                          <input type="range" min="5" max="80" value={bgRemovalTolerance} onChange={(e) => updateSetting('bgRemovalTolerance', parseInt(e.target.value))} className="w-full accent-primary" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-on-surface-variant/70 flex items-center gap-1.5"><Sparkles size={11} /> Smoothness</span><span className="text-[10px] font-mono text-primary">{bgRemovalSmoothness}</span></div>
                          <input type="range" min="0" max="60" value={bgRemovalSmoothness} onChange={(e) => updateSetting('bgRemovalSmoothness', parseInt(e.target.value))} className="w-full accent-primary" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {activeStep === 1 && (
                <div className="space-y-8">
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

              {activeStep === 2 && (
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

              {activeStep === 3 && (
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

              {activeStep === 4 && (
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={aiCommand}
                      onChange={(e) => setAiCommand(e.target.value)}
                      placeholder="Ex: 'Remove face tracking boxes', 'Remove background', 'Warmer tones', 'Straighten horizon', 'Preset Pro 4'..."
                      className="w-full bg-surface-container-highest/30 border border-outline-variant/10 rounded-2xl p-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-all min-h-[120px] resize-none"
                    />
                  </div>

                  {/* Processing feedback */}
                  {isCommandSending && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Loader2 size={14} className="text-primary animate-spin" />
                        <span className="text-[11px] text-primary font-bold">
                          AI processing your command…
                        </span>
                      </div>
                      {commandResult.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {commandResult.map((a, i) => (
                            <span key={i} className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full text-[9px] font-bold">
                              ✓ {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Quick command chips */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Remove face tracking boxes',
                      'Remove background',
                      'AI enhance: fix dark to bright',
                      'AI enhance: blur to HD',
                      'AI enhance: pro Lightroom finish',
                      'Straighten horizon',
                      'Preset Pro 4 (Moody Noir)',
                      'Scenario: Night',
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => setAiCommand(chip)}
                        className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary rounded-full text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 border border-outline-variant/10"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-on-surface-variant">
                    Type any instruction or click a quick command above. The AI will parse it and
                    apply the relevant settings (face tracking, background removal, style, preset,
                    scenario, lens correction, white balance, cropping, and more).
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
                  onClick={activeStep === 4 ? handleSendCommand : handleNext}
                  disabled={isCommandSending}
                  className="flex-[2] px-6 py-3 bg-primary text-on-primary font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 text-sm flex items-center justify-center gap-2"
                >
                  {isCommandSending ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>{activeStep === 4 ? 'Apply Final AI' : 'Apply & Next'}</span>
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
          {/* AI Banner — only show from Step 1 onwards */}
          {activeStep > 0 && (
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
          )}

          {/* Step 0: Before/After side-by-side comparison */}
          {/* Step 0: Right column — 3-stage preview */}
          {activeStep === 0 && selectedPhotos.length > 0 && (
            <div className="space-y-4">
              {/* IDLE: show original photos */}
              {enhanceStage === 'idle' && (
                <div className="bg-surface-container-low rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] text-on-surface-variant text-center mb-3">{selectedPhotos.length} photo(s) selected — click "Start AI Analysis" to begin</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedPhotos.slice(0, 4).map((photo) => (
                      <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-black/90">
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[7px] font-bold rounded">{photo.name.slice(0,12)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ANALYZING: show scanning animation */}
              {enhanceStage === 'analyzing' && (
                <div className="bg-surface-container-low rounded-2xl p-8 border border-primary/20 flex flex-col items-center gap-4">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                    <BrainCircuit size={28} className="absolute inset-0 m-auto text-primary" />
                  </div>
                  <p className="text-xs font-bold text-primary">AI sedang menganalisis foto...</p>
                  <div className="space-y-1.5 w-full max-w-xs">
                    {enhanceAnalysis.map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }} className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                        <Loader2 size={10} className="text-primary animate-spin" /> {item}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUGGESTIONS: show variant previews */}
              {enhanceStage === 'suggestions' && (
                <div className="space-y-3">
                  {/* Focus mode indicator */}
                  <div className="flex items-center justify-center gap-2">
                    <span className={cn('px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider', !faceEnhance ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400')}>
                      {faceEnhance ? '👤 + Face Enhance' : '🎬 Cinematic Only'}
                    </span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant text-center">Pilih hasil AI enhance yang paling baik:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedPhotos.slice(0, 1).map((photo) => [0, 1, 2, 3, 4, 5].map((variant) => {
                      const baseFilters = [
                        'brightness(1.03) contrast(1.15) saturate(1.05) sepia(0.03)',  // Cinematic 1
                        'brightness(1.06) contrast(1.20) saturate(1.10) sepia(0.05)',  // Cinematic 2
                        'brightness(1.08) contrast(1.28) saturate(1.15) sepia(0.07)',  // Cinematic 3
                        'brightness(1.10) contrast(1.35) saturate(1.20) sepia(0.09)',  // Cinematic 4
                        'brightness(1.12) contrast(1.42) saturate(1.25) sepia(0.11)',  // Cinematic 5
                        'brightness(1.14) contrast(1.50) saturate(1.30) sepia(0.13)',  // Cinematic 6
                      ];
                      // Face Focus: add extra brightness + warmth to simulate face recovery
                      const faceBoost = ' brightness(1.02) saturate(1.03)';
                      const variantFilters = baseFilters.map(f =>
                        faceEnhance ? f + faceBoost : f
                      );
                      return (
                        <button
                          key={variant}
                          onClick={() => setSelectedEnhanceVariant(variant)}
                          className={cn(
                            'relative aspect-square rounded-xl overflow-hidden border-2 transition-all active:scale-95',
                            selectedEnhanceVariant === variant ? 'border-primary scale-105 shadow-lg shadow-primary/20' : 'border-transparent opacity-60 hover:opacity-100'
                          )}
                        >
                          <img src={photo.url} alt={`Variant ${variant + 1}`} className="w-full h-full object-cover" style={{ filter: variantFilters[variant] }} referrerPolicy="no-referrer" />
                          <div className={cn('absolute bottom-1 left-1 right-1 px-1 py-0.5 rounded text-[8px] font-black uppercase text-center', selectedEnhanceVariant === variant ? 'bg-primary text-on-primary' : 'bg-black/60 text-white')}>
                            {['Cinematic 1', 'Cinematic 2', 'Cinematic 3', 'Cinematic 4', 'Cinematic 5', 'Cinematic 6'][variant]}
                          </div>
                          {selectedEnhanceVariant === variant && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <CheckCircle2 size={12} className="text-on-primary" />
                            </div>
                          )}
                        </button>
                      );
                    }))}
                  </div>
                  {/* Before/After of selected variant */}
                  {selectedPhotos.slice(0, 1).map((photo) => {
                    const baseFilters = [
                      'brightness(1.03) contrast(1.15) saturate(1.05) sepia(0.03)',
                      'brightness(1.06) contrast(1.20) saturate(1.10) sepia(0.05)',
                      'brightness(1.08) contrast(1.28) saturate(1.15) sepia(0.07)',
                      'brightness(1.10) contrast(1.35) saturate(1.20) sepia(0.09)',
                      'brightness(1.12) contrast(1.42) saturate(1.25) sepia(0.11)',
                      'brightness(1.14) contrast(1.50) saturate(1.30) sepia(0.13)',
                    ];
                    const faceBoost = ' brightness(1.02) saturate(1.03)';
                    const variantFilters = baseFilters.map(f =>
                      faceEnhance ? f + faceBoost : f
                    );
                    return (
                      <div key={photo.id} className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
                        <div className="relative aspect-[4/5] bg-black/90">
                          <img src={photo.url} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-white text-black text-[8px] font-black rounded">BEFORE</div>
                        </div>
                        <div className="relative aspect-[4/5] bg-black/90">
                          <img src={photo.url} alt="After" className="w-full h-full object-cover transition-all duration-500" style={{ filter: variantFilters[selectedEnhanceVariant] }} referrerPolicy="no-referrer" />
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-black text-[8px] font-black rounded">✓ AFTER</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CONFIRMED: show selected result */}
              {enhanceStage === 'confirmed' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
                    {selectedPhotos.slice(0, 1).map((photo) => {
                      const baseFilters = [
                        'brightness(1.05) contrast(1.03) saturate(1.03)',
                        'brightness(1.08) contrast(1.06) saturate(1.05)',
                        'brightness(1.15) contrast(1.15) saturate(1.20)',
                        'brightness(1.10) contrast(1.25) saturate(1.10)',
                        'brightness(1.20) contrast(1.35) saturate(1.30) sepia(0.08)',
                        'brightness(0.95) contrast(1.40) saturate(1.15) sepia(0.15)',
                      ];
                      const faceBoost = ' brightness(1.02) saturate(1.03)';
                      const variantFilters = baseFilters.map(f =>
                        faceEnhance ? f + faceBoost : f
                      );
                      return (
                        <div key={photo.id} className="contents">
                          <div className="relative aspect-[4/5] bg-black/90">
                            <img src={photo.url} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-white text-black text-[8px] font-black rounded">BEFORE</div>
                          </div>
                          <div className="relative aspect-[4/5] bg-black/90">
                            <img src={photo.url} alt="After" className="w-full h-full object-cover" style={{ filter: variantFilters[selectedEnhanceVariant] }} referrerPolicy="no-referrer" />
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-black text-[8px] font-black rounded">✓ AFTER</div>
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-primary text-on-primary text-[8px] font-black rounded">{['Cinematic 1', 'Cinematic 2', 'Cinematic 3', 'Cinematic 4', 'Cinematic 5', 'Cinematic 6'][selectedEnhanceVariant]}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-2 p-2 bg-green-500/5 border border-green-500/20 rounded-xl">
                    <CheckCircle2 size={14} className="text-green-400" />
                    <span className="text-[10px] font-bold text-green-400">AI Enhance confirmed — ready for next step</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analysis Grid — only for Step 1+ */}
          {activeStep > 0 && (
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
                        aiEnhanceFilter,
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

                  {activeStep > 0 && (
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
                  )}

                  {activeStep > 0 && (
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
                  )}

                  {/* Step 0: Before/After labels */}
                  {activeStep === 0 && (
                    <>
                      <div className="absolute bottom-4 left-4 z-20">
                        <div className="text-[10px] font-label text-on-surface-variant uppercase tracking-widest mb-1">
                          {aiEnhanceEnabled ? 'After (AI Enhanced)' : 'Original Photo'}
                        </div>
                        <div className={cn(
                          'text-xl font-headline font-black',
                          aiEnhanceEnabled ? 'text-primary' : 'text-on-surface-variant'
                        )}>
                          {aiEnhanceEnabled ? '✓ Enhanced' : 'Not Enhanced'}
                        </div>
                      </div>
                      {aiEnhanceEnabled && (
                        <div className="absolute top-4 right-4 z-20 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-[8px] font-black uppercase tracking-wider border border-green-500/30">
                          AI Active
                        </div>
                      )}
                    </>
                  )}
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
          )}

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
          onClick={() => {
            // If there's an AI command typed, apply it before navigating
            if (aiCommand.trim()) {
              handleSendCommand();
            } else {
              onViewChange('export');
            }
          }}
          className="px-6 md:px-8 h-12 md:h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-full shadow-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:scale-110 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>Export Master</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
