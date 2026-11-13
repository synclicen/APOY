export interface Photo {
  id: string;
  url: string;
  name: string;
  size: string;
  type: string;
  isAiBestPick?: boolean;
  selected?: boolean;
  status: 'uploaded' | 'analyzing' | 'ready';
  score?: number;
  exposure?: number;
  focus?: number;
  style?: string;
  aperture?: string;
  shutter?: string;
}

export type ToolType = 'enhance' | 'lighting' | 'retouch' | 'mask' | 'presets';
export type ViewType = 'import' | 'analysis' | 'export';

export interface AnalysisSettings {
  selectedPlatform: string;
  selectedTechnicalScenario: string;
  selectedStyle: string;
  selectedPreset: string;
  selectedFrame: string;
  selectedRatio: string;
  exposure: number;
  focus: number;
  lensCorrection: boolean;
  whiteBalanceAdjusted: boolean;
  autoFocusFace: boolean;
  autoCutToRatio: boolean;
  preserveHumans: boolean;
  autoArrange: boolean;
  selectedCleanBase: string;
  objectFit: 'cover' | 'contain';
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkFont: string;
  watermarkSize: number;
  watermarkOpacity: number;
  watermarkPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  watermarkColor: string;
  customFrameUrl?: string;
  frameHistory: string[];
  // Background removal (transparent PNG output)
  bgRemovalEnabled: boolean;
  bgRemovalTolerance: number; // 0-100, how aggressively to remove similar colors
  bgRemovalSmoothness: number; // 0-100, edge feathering amount
  bgRemovalMode: 'auto' | 'preset' | 'eyedropper'; // how the target color is chosen
  bgRemovalColor: string | null; // hex color (#rrggbb) to remove, or null for auto sampling
  // AI Auto-Enhance (full image restoration: brighten dark, sharpen blur, pro finishing)
  aiEnhanceEnabled: boolean;
  aiEnhanceStrength: number; // 0-100, overall intensity of the enhancement
  aiEnhanceBrightness: number; // 0-100, auto-exposure / brightness boost
  aiEnhanceSharpen: number; // 0-100, unsharp mask strength for deblur
  aiEnhanceContrast: number; // 0-100, contrast curve (S-curve) for pro finishing
  aiEnhanceShadows: number; // 0-100, shadow recovery (lift dark areas)
  aiEnhanceHighlights: number; // 0-100, highlight protection (recover blown areas)
  aiEnhanceVibrance: number; // 0-100, natural saturation boost
  aiEnhanceDenoise: number; // 0-100, noise reduction for low-light photos
}
