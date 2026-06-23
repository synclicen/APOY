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
  bgRemovalTolerance: number;
  bgRemovalSmoothness: number;
}
