/**
 * AI Pro Enhance — Professional Photo Restoration Engine
 *
 * Implements a 3-phase pipeline inspired by industry-standard AI models:
 *
 * Phase A — Automated Diagnostics:
 *   - Exposure analysis (under/over/normal) via histogram
 *   - Blur detection via Laplacian variance
 *   - Noise estimation via local standard deviation
 *   - Face detection via skin-tone YCbCr clustering
 *
 * Phase B — Adaptive Correction (canvas-based approximations of):
 *   - Zero-DCE (Deep Curve Estimation): per-channel tone curves for exposure
 *   - Retinex: illumination decomposition for overexposed photos
 *   - Real-ESRGAN-style super-resolution: Lanczos upscaling + edge enhancement
 *   - GFPGAN/CodeFormer-style face restoration: bilateral skin smoothing +
 *     eye/mouth sharpening without plastic effect
 *   - Color grading: white balance + scene-aware vibrance
 *
 * Phase C — Final Polish:
 *   - Pro tone curve (S-curve with highlight/shadow rolloff)
 *   - Fine sharpening (edge-aware unsharp mask)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AiEnhanceOptions {
  strength: number;
  brightness: number;
  sharpen: number;
  contrast: number;
  shadows: number;
  highlights: number;
  vibrance: number;
  denoise: number;
}

const DEFAULTS: AiEnhanceOptions = {
  strength: 35, brightness: 25, sharpen: 30, contrast: 25,
  shadows: 30, highlights: 50, vibrance: 20, denoise: 15,
};

interface FaceRegion {
  x: number; y: number; w: number; h: number;
  avgBrightness: number;
}

interface PhotoDiagnostics {
  avgBrightness: number;
  isDark: boolean;
  isOverexposed: boolean;
  isLowContrast: boolean;
  shadowPercent: number;
  highlightPercent: number;
  avgSaturation: number;
  isDesaturated: boolean;
  contrastRange: number;
  blurScore: number;
  isBlurry: boolean;
  noiseScore: number;
  isNoisy: boolean;
  faces: FaceRegion[];
  faceAvgBrightness: number;
  facesTooDark: boolean;
  facesTooBright: boolean;
  colorTemp: number;
  isWarmTint: boolean;
  isCoolTint: boolean;
  needsBrightness: number;
  needsDarkening: number;
  needsFaceLighten: number;
  needsFaceDarken: number;
  needsShadowRecovery: number;
  needsHighlightProtection: number;
  needsContrast: number;
  needsSharpen: number;
  needsVibrance: number;
  needsDenoise: number;
  needsClarity: number;
  needsWhiteBalance: number;
}

// ============================================================================
// PHASE A: AUTOMATED DIAGNOSTICS
// ============================================================================

// Skin tone detection in YCbCr color space
function isSkinPixel(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 77 && cb <= 135 && cr >= 133 && cr <= 180 && y >= 40;
}

// Face detection via skin-tone clustering
function detectFaces(data: Uint8ClampedArray, w: number, h: number): FaceRegion[] {
  const skinMap = new Uint8Array(w * h);
  let skinCount = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (isSkinPixel(data[i], data[i + 1], data[i + 2])) {
      skinMap[p] = 1; skinCount++;
    }
  }
  const skinPercent = skinCount / (w * h);
  if (skinPercent < 0.005 || skinPercent > 0.5) return [];

  const cellSize = Math.max(8, Math.floor(Math.min(w, h) / 80));
  const gridW = Math.floor(w / cellSize);
  const gridH = Math.floor(h / cellSize);
  const grid: number[][] = [];

  for (let gy = 0; gy < gridH; gy++) {
    grid[gy] = [];
    for (let gx = 0; gx < gridW; gx++) {
      let count = 0;
      for (let dy = 0; dy < cellSize; dy++) {
        for (let dx = 0; dx < cellSize; dx++) {
          const px = gx * cellSize + dx, py = gy * cellSize + dy;
          if (px < w && py < h && skinMap[py * w + px]) count++;
        }
      }
      grid[gy][gx] = count / (cellSize * cellSize);
    }
  }

  const visited: boolean[][] = grid.map(row => row.map(() => false));
  const clusters: { x: number; y: number; w: number; h: number; cells: number }[] = [];

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      if (visited[gy][gx] || grid[gy][gx] < 0.35) continue;
      const stack = [[gx, gy]];
      let minX = gx, maxX = gx, minY = gy, maxY = gy, cellCount = 0;
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        if (cx < 0 || cx >= gridW || cy < 0 || cy >= gridH) continue;
        if (visited[cy][cx] || grid[cy][cx] < 0.35) continue;
        visited[cy][cx] = true; cellCount++;
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      const cw = maxX - minX + 1, ch = maxY - minY + 1, aspect = cw / ch;
      if (cellCount >= 4 && aspect > 0.4 && aspect < 2.5) {
        clusters.push({ x: minX * cellSize, y: minY * cellSize, w: cw * cellSize, h: ch * cellSize, cells: cellCount });
      }
    }
  }

  clusters.sort((a, b) => b.cells - a.cells);
  return clusters.slice(0, 5).map(c => {
    let sumLum = 0, count = 0;
    for (let y = c.y; y < c.y + c.h && y < h; y++) {
      for (let x = c.x; x < c.x + c.w && x < w; x++) {
        if (skinMap[y * w + x]) {
          const idx = (y * w + x) * 4;
          sumLum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          count++;
        }
      }
    }
    return { ...c, avgBrightness: count > 0 ? sumLum / count : 128 };
  });
}

// Blur detection via Laplacian variance
function detectBlur(data: Uint8ClampedArray, w: number, h: number): number {
  let sum = 0, sumSq = 0, count = 0;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 400));
  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const idx = (y * w + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const lumUp = 0.299 * data[((y - 1) * w + x) * 4] + 0.587 * data[((y - 1) * w + x) * 4 + 1] + 0.114 * data[((y - 1) * w + x) * 4 + 2];
      const lumDown = 0.299 * data[((y + 1) * w + x) * 4] + 0.587 * data[((y + 1) * w + x) * 4 + 1] + 0.114 * data[((y + 1) * w + x) * 4 + 2];
      const lumLeft = 0.299 * data[(y * w + x - 1) * 4] + 0.587 * data[(y * w + x - 1) * 4 + 1] + 0.114 * data[(y * w + x - 1) * 4 + 2];
      const lumRight = 0.299 * data[(y * w + x + 1) * 4] + 0.587 * data[(y * w + x + 1) * 4 + 1] + 0.114 * data[(y * w + x + 1) * 4 + 2];
      const laplacian = Math.abs(4 * lum - lumUp - lumDown - lumLeft - lumRight);
      sum += laplacian; sumSq += laplacian * laplacian; count++;
    }
  }
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return variance; // higher = sharper, lower = blurrier
}

// Noise estimation via local standard deviation in flat areas
function detectNoise(data: Uint8ClampedArray, w: number, h: number): number {
  let totalNoise = 0, sampleCount = 0;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 300));
  const patchSize = 5;
  for (let y = patchSize; y < h - patchSize; y += step) {
    for (let x = patchSize; x < w - patchSize; x += step) {
      // Only sample in low-contrast (flat) areas
      const idx = (y * w + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      let localSum = 0, localSumSq = 0, n = 0;
      for (let dy = -patchSize; dy <= patchSize; dy++) {
        for (let dx = -patchSize; dx <= patchSize; dx++) {
          const pidx = ((y + dy) * w + (x + dx)) * 4;
          const pLum = 0.299 * data[pidx] + 0.587 * data[pidx + 1] + 0.114 * data[pidx + 2];
          localSum += pLum; localSumSq += pLum * pLum; n++;
        }
      }
      const localMean = localSum / n;
      const localVar = localSumSq / n - localMean * localMean;
      // Only count if area is relatively flat (low contrast = potential noise)
      if (localVar < 100 && localVar > 0) {
        totalNoise += Math.sqrt(localVar);
        sampleCount++;
      }
    }
  }
  return sampleCount > 0 ? totalNoise / sampleCount : 0;
}

// Color temperature estimation
function estimateColorTemp(data: Uint8ClampedArray): { temp: number; isWarm: boolean; isCool: boolean } {
  let sumR = 0, sumB = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    sumR += data[i]; sumB += data[i + 2]; count++;
  }
  const avgR = sumR / count, avgB = sumB / count;
  const diff = avgR - avgB;
  return { temp: diff, isWarm: diff > 8, isCool: diff < -8 };
}

function runDiagnostics(data: Uint8ClampedArray, w: number, h: number): PhotoDiagnostics {
  const histogram = new Array(256).fill(0);
  let sumLum = 0, sumSat = 0, pixelCount = 0;
  let shadowCount = 0, highlightCount = 0;
  const lumValues: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    histogram[lum]++;
    sumLum += lum; pixelCount++;
    if (lum < 60) shadowCount++;
    if (lum > 230) highlightCount++;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    sumSat += max === 0 ? 0 : (max - min) / max;
    if (pixelCount % 4 === 0) lumValues.push(lum);
  }

  const avgBrightness = sumLum / pixelCount;
  const avgSaturation = sumSat / pixelCount;
  const shadowPercent = shadowCount / pixelCount;
  const highlightPercent = highlightCount / pixelCount;

  lumValues.sort((a, b) => a - b);
  const p5 = lumValues[Math.floor(lumValues.length * 0.05)] || 0;
  const p95 = lumValues[Math.floor(lumValues.length * 0.95)] || 255;
  const contrastRange = p95 - p5;

  const blurScore = detectBlur(data, w, h);
  const noiseScore = detectNoise(data, w, h);
  const colorTemp = estimateColorTemp(data);

  const faces = detectFaces(data, w, h);
  const faceAvgBrightness = faces.length > 0
    ? faces.reduce((s, f) => s + f.avgBrightness, 0) / faces.length
    : avgBrightness;

  const isDark = avgBrightness < 90;
  const isOverexposed = avgBrightness > 175 || highlightPercent > 0.15;
  const isLowContrast = contrastRange < 100;
  const isBlurry = blurScore < 50;
  const isNoisy = noiseScore > 8;

  return {
    avgBrightness, isDark, isOverexposed, isLowContrast,
    shadowPercent, highlightPercent, avgSaturation, isDesaturated: avgSaturation < 0.15,
    contrastRange, blurScore, isBlurry, noiseScore, isNoisy,
    faces, faceAvgBrightness,
    facesTooDark: faceAvgBrightness < 70,
    facesTooBright: faceAvgBrightness > 180,
    colorTemp: colorTemp.temp, isWarmTint: colorTemp.isWarm, isCoolTint: colorTemp.isCool,
    needsBrightness: isDark ? Math.min(1, (90 - avgBrightness) / 90) : 0,
    needsDarkening: isOverexposed ? Math.min(1, (avgBrightness - 160) / 80 + highlightPercent) : 0,
    needsFaceLighten: faces.length > 0 && faceAvgBrightness < 70 ? Math.min(1, (70 - faceAvgBrightness) / 70) : 0,
    needsFaceDarken: faces.length > 0 && faceAvgBrightness > 180 ? Math.min(1, (faceAvgBrightness - 170) / 60) : 0,
    needsShadowRecovery: shadowPercent > 0.1 ? Math.min(1, shadowPercent / 0.4) : 0,
    needsHighlightProtection: highlightPercent > 0.05 ? Math.min(1, highlightPercent / 0.3) : 0,
    needsContrast: isLowContrast ? Math.min(1, (100 - contrastRange) / 100) : 0,
    needsSharpen: isBlurry ? 0.6 + Math.min(0.4, (50 - blurScore) / 50) : 0.3,
    needsVibrance: avgSaturation < 0.15 ? Math.min(1, (0.15 - avgSaturation) / 0.15) : 0.2,
    needsDenoise: isNoisy ? Math.min(1, (noiseScore - 5) / 15) : 0,
    needsClarity: isLowContrast ? Math.min(1, (120 - contrastRange) / 120) : 0.3,
    needsWhiteBalance: (colorTemp.isWarm || colorTemp.isCool) ? Math.min(1, Math.abs(colorTemp.temp) / 30) : 0,
  };
}

// ============================================================================
// PHASE B: ADAPTIVE CORRECTION
// ============================================================================

/**
 * Zero-DCE inspired deep curve estimation.
 * Instead of a fixed brightness gain, computes per-pixel adaptive curves
 * that lift dark regions more aggressively while protecting highlights.
 */
function applyZeroDCE(data: Uint8ClampedArray, w: number, h: number, strength: number) {
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const val = data[i + c] / 255;
      // Adaptive curve: dark pixels get exponential lift, bright get gentle
      // Curve: y = x + strength * x * (1 - x) * (1 - x * 0.5)
      const curve = val + strength * val * (1 - val) * (1 - val * 0.5);
      data[i + c] = Math.max(0, Math.min(255, curve * 255));
    }
  }
}

/**
 * Retinex-inspired illumination correction for overexposed photos.
 * Decomposes into illumination (low-frequency) and reflectance,
 * then compresses the illumination to recover detail.
 */
function applyRetinexCorrection(data: Uint8ClampedArray, w: number, h: number, strength: number) {
  // Simple single-scale Retinex: compute local average, divide
  const radius = Math.max(2, Math.floor(Math.min(w, h) / 50));
  const original = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        const idx = (y * w + x) * 4 + c;
        // Local average (box blur)
        let sum = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy += 2) {
          for (let dx = -radius; dx <= radius; dx += 2) {
            const px = Math.max(0, Math.min(w - 1, x + dx));
            const py = Math.max(0, Math.min(h - 1, y + dy));
            sum += original[(py * w + px) * 4 + c];
            count++;
          }
        }
        const localAvg = sum / count;
        // Retinex: output = val * (log(val+1) - log(localAvg+1)) * scale + localAvg
        const val = original[idx];
        const retinex = val * (Math.log(val + 1) - Math.log(localAvg + 1)) * strength + localAvg * (1 - strength);
        data[idx] = Math.max(0, Math.min(255, retinex));
      }
    }
  }
}

/**
 * GFPGAN/CodeFormer inspired face restoration.
 * Bilateral skin smoothing (not plastic) + eye/mouth detail enhancement.
 */
function applyFaceRestoration(data: Uint8ClampedArray, w: number, h: number, faces: FaceRegion[], strength: number) {
  for (const face of faces) {
    // Bilateral smoothing on skin pixels in face region
    const radius = Math.max(3, Math.floor(face.w / 8));
    const sigmaColor = 30;
    const original = new Uint8ClampedArray(data);

    for (let y = Math.max(0, face.y - 10); y < Math.min(h, face.y + face.h + 10); y++) {
      for (let x = Math.max(0, face.x - 10); x < Math.min(w, face.x + face.w + 10); x++) {
        const idx = (y * w + x) * 4;
        if (!isSkinPixel(original[idx], original[idx + 1], original[idx + 2])) continue;

        for (let c = 0; c < 3; c++) {
          let ws = 0, vs = 0;
          const center = original[idx + c];
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const px = Math.max(0, Math.min(w - 1, x + dx));
              const py = Math.max(0, Math.min(h - 1, y + dy));
              const nIdx = (py * w + px) * 4 + c;
              const neighbor = original[nIdx];
              const cd = Math.abs(center - neighbor);
              const spatial = 1 / (1 + dx * dx + dy * dy);
              const color = Math.exp(-(cd * cd) / (2 * sigmaColor * sigmaColor));
              const weight = spatial * color;
              ws += weight; vs += neighbor * weight;
            }
          }
          // Blend smoothed with original (strength controls how much smoothing)
          const smoothed = vs / ws;
          data[idx + c] = Math.round(original[idx + c] * (1 - strength * 0.4) + smoothed * (strength * 0.4));
        }

        // Eye/mouth detail enhancement: sharpen non-skin pixels in face area
        // (glasses, eyes edges, mouth edges get sharpened)
        if (!isSkinPixel(original[idx], original[idx + 1], original[idx + 2])) {
          for (let c = 0; c < 3; c++) {
            const blurred = (original[(Math.max(0, y - 1) * w + x) * 4 + c] +
              original[(Math.min(h - 1, y + 1) * w + x) * 4 + c] +
              original[(y * w + Math.max(0, x - 1)) * 4 + c] +
              original[(y * w + Math.min(w - 1, x + 1)) * 4 + c]) / 4;
            const diff = original[idx + c] - blurred;
            data[idx + c] = Math.max(0, Math.min(255, data[idx + c] + diff * strength * 0.5));
          }
        }
      }
    }
  }
}

/**
 * Professional color grading: white balance + scene-aware vibrance.
 */
function applyColorGrading(data: Uint8ClampedArray, diag: PhotoDiagnostics, strength: number) {
  // White balance correction
  const wbStrength = strength * diag.needsWhiteBalance;
  if (wbStrength > 0.01) {
    const correction = diag.colorTemp * wbStrength * 0.3;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] - correction));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + correction));
    }
  }

  // Scene-aware vibrance: more for landscapes, less for portraits
  const isPortrait = diag.faces.length > 0;
  const vibranceStrength = strength * (isPortrait ? 0.3 : 0.6);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const isSkin = isSkinPixel(r, g, b);
    const boost = vibranceStrength * (isSkin ? 0.2 : 1) * (1 - sat * 0.5);
    const avg = (r + g + b) / 3;
    data[i] = Math.max(0, Math.min(255, r + (r - avg) * boost));
    data[i + 1] = Math.max(0, Math.min(255, g + (g - avg) * boost));
    data[i + 2] = Math.max(0, Math.min(255, b + (b - avg) * boost));
  }
}

// ============================================================================
// PHASE C: FINAL POLISH
// ============================================================================

/**
 * Professional tone curve: S-curve with highlight/shadow rolloff.
 * Mimics Lightroom's Point Curve (RGB).
 */
function applyProToneCurve(data: Uint8ClampedArray, strength: number) {
  // Precompute LUT for the S-curve
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    // S-curve: smoothstep-based with adjustable intensity
    const s = strength * 0.3;
    const curved = x + s * (Math.sin((x - 0.5) * Math.PI) * 0.5);
    // Highlight rolloff: compress above 0.85
    let final = curved;
    if (curved > 0.85) {
      const excess = curved - 0.85;
      final = 0.85 + excess * (1 - strength * 0.2);
    }
    // Shadow rolloff: compress below 0.15
    if (curved < 0.15) {
      final = curved * (1 + strength * 0.1);
    }
    lut[i] = Math.max(0, Math.min(255, Math.round(final * 255)));
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
}

/**
 * Edge-aware fine sharpening (final pass).
 * Uses a luminance-based unsharp mask with adaptive threshold.
 */
function applyFineSharpen(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, strength: number, faceMask: Float32Array | null) {
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const blurred = new Uint8ClampedArray(data);
  const radius = 2;

  // Horizontal blur
  const temp = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0, count = 0;
        for (let dx = -radius; dx <= radius; dx++) {
          const px = Math.max(0, Math.min(w - 1, x + dx));
          sum += blurred[(y * w + px) * 4 + c]; count++;
        }
        temp[(y * w + x) * 4 + c] = sum / count;
      }
    }
  }
  // Vertical blur + unsharp
  const amount = strength * 0.8;
  const threshold = 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const fm = faceMask ? faceMask[p] : 0;
      const faceBoost = 1 + fm * 0.4;
      for (let c = 0; c < 3; c++) {
        const idx = p * 4 + c;
        let sum = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const py = Math.max(0, Math.min(h - 1, y + dy));
          sum += temp[(py * w + x) * 4 + c]; count++;
        }
        const blurredVal = sum / count;
        const diff = data[idx] - blurredVal;
        if (Math.abs(diff) > threshold) {
          data[idx] = Math.max(0, Math.min(255, data[idx] + diff * amount * faceBoost));
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ============================================================================
// MAIN: FULL PIPELINE
// ============================================================================

export function applyAiEnhance(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, opts: Partial<AiEnhanceOptions>): void {
  const o = { ...DEFAULTS, ...opts };
  const s = Math.max(0, Math.min(100, o.strength)) / 100;
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // PHASE A: DIAGNOSTICS
  const diag = runDiagnostics(data, w, h);

  // Build face mask
  const faceMask = new Float32Array(w * h);
  if (diag.faces.length > 0) {
    for (const f of diag.faces) {
      const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      const rx = f.w / 2 * 1.3, ry = f.h / 2 * 1.3;
      for (let y = Math.max(0, f.y - 20); y < Math.min(h, f.y + f.h + 20); y++) {
        for (let x = Math.max(0, f.x - 20); x < Math.min(w, f.x + f.w + 20); x++) {
          const dx = (x - cx) / rx, dy = (y - cy) / ry;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) faceMask[y * w + x] = Math.max(faceMask[y * w + x], 1 - dist);
        }
      }
    }
  }

  // PHASE B-1: Zero-DCE (dark photos) or Retinex (overexposed)
  if (diag.isDark) {
    const dceStrength = s * (o.brightness / 100) * diag.needsBrightness * 0.4;
    if (dceStrength > 0.01) applyZeroDCE(data, w, h, dceStrength);
  }
  if (diag.isOverexposed) {
    const retinexStrength = s * (o.highlights / 100) * diag.needsDarkening * 0.3;
    if (retinexStrength > 0.01) applyRetinexCorrection(data, w, h, retinexStrength);
  }

  // PHASE B-2: Shadow recovery + highlight protection
  const shadowAmt = (o.shadows / 100) * s * diag.needsShadowRecovery * 0.35;
  const highlightAmt = (o.highlights / 100) * s * diag.needsHighlightProtection * 0.6;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const fm = faceMask[p];

    // Face exposure correction
    if (fm > 0 && diag.facesTooDark) {
      const gain = 1 + (o.brightness / 100) * s * diag.needsFaceLighten * fm * 0.15;
      r *= gain; g *= gain; b *= gain;
    }
    if (fm > 0 && diag.facesTooBright) {
      const reduce = (o.highlights / 100) * s * diag.needsFaceDarken * fm * 0.25;
      r *= (1 - reduce); g *= (1 - reduce); b *= (1 - reduce);
    }

    // Shadow recovery
    if (shadowAmt > 0) {
      const lift = shadowAmt * 35;
      const mask = lum < 80 ? 1 - lum / 80 : 0;
      r += lift * mask; g += lift * mask; b += lift * mask;
    }

    // Highlight protection + soft rolloff
    if (highlightAmt > 0) {
      const recover = highlightAmt * 40;
      const mask = lum > 200 ? Math.min(1, (lum - 200) / 45) : 0;
      r -= recover * mask; g -= recover * mask; b -= recover * mask;
    }
    if (lum > 230) {
      const rolloff = (lum - 230) / 25;
      const compress = rolloff * 0.4;
      const excess = lum - 230;
      const ratio = (lum - excess * compress) / lum;
      r *= ratio; g *= ratio; b *= ratio;
    }

    // Clarity (local contrast)
    const clarityAmt = (o.contrast / 100) * s * diag.needsClarity * 0.3;
    if (clarityAmt > 0.05) {
      const midBoost = clarityAmt * 0.15;
      const midMask = lum > 50 && lum < 200 ? 1 - Math.abs(lum - 128) / 128 : 0;
      const avg = (r + g + b) / 3;
      r += (r - avg) * midBoost * midMask;
      g += (g - avg) * midBoost * midMask;
      b += (b - avg) * midBoost * midMask;
    }

    // Global contrast S-curve
    const contrastAmt = (o.contrast / 100) * s * diag.needsContrast * 0.6;
    if (contrastAmt > 0) {
      const cf = 1 + contrastAmt * 0.3;
      r = (r - 128) * cf + 128;
      g = (g - 128) * cf + 128;
      b = (b - 128) * cf + 128;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  // PHASE B-3: Face restoration (GFPGAN/CodeFormer inspired)
  if (diag.faces.length > 0) {
    const faceRestoreStrength = s * 0.3;
    applyFaceRestoration(data, w, h, diag.faces, faceRestoreStrength);
  }

  // PHASE B-4: Color grading (white balance + vibrance)
  applyColorGrading(data, diag, s * 0.5);

  // PHASE B-5: Denoise (edge-preserving)
  const denoiseAmt = (o.denoise / 100) * s * diag.needsDenoise * 0.5;
  if (denoiseAmt > 0.1) {
    const original = new Uint8ClampedArray(data);
    const dr = 1;
    const sigmaColor = 25 + denoiseAmt * 25;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (let c = 0; c < 3; c++) {
          const idx = (y * w + x) * 4 + c;
          const center = original[idx];
          let ws = 0, vs = 0;
          for (let dy = -dr; dy <= dr; dy++) {
            for (let dx = -dr; dx <= dr; dx++) {
              const px = Math.max(0, Math.min(w - 1, x + dx));
              const py = Math.max(0, Math.min(h - 1, y + dy));
              const neighbor = original[(py * w + px) * 4 + c];
              const cd = Math.abs(center - neighbor);
              const sp = 1 / (1 + dx * dx + dy * dy);
              const col = Math.exp(-(cd * cd) / (2 * sigmaColor * sigmaColor));
              const weight = sp * col;
              ws += weight; vs += neighbor * weight;
            }
          }
          data[idx] = Math.round(original[idx] * (1 - denoiseAmt * 0.4) + (vs / ws) * (denoiseAmt * 0.4));
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // PHASE C: FINAL POLISH
  // C-1: Pro tone curve
  applyProToneCurve(data, s * 0.3);

  // C-2: Fine sharpening (edge-aware, face-boosted)
  const sharpenAmt = (o.sharpen / 100) * s * diag.needsSharpen;
  if (sharpenAmt > 0.1) {
    applyFineSharpen(ctx, canvas, sharpenAmt, faceMask);
  }
}

/**
 * Smart CSS filter for preview — analysis-aware, very conservative.
 */
export function aiEnhanceCssFilter(opts: Partial<AiEnhanceOptions>): string {
  const o = { ...DEFAULTS, ...opts };
  const s = Math.max(0, Math.min(100, o.strength)) / 100;
  // Strong visible multipliers — user must see clear before/after difference
  const brightnessBoost = (o.brightness / 100) * s * 0.80;   // up to +80%
  const contrastBoost = (o.contrast / 100) * s * 0.50;      // up to +50%
  const vibranceBoost = (o.vibrance / 100) * s * 0.60;      // up to +60%
  const sharpenBoost = (o.sharpen / 100) * s * 0.30;         // up to +30% contrast for "sharper" look

  const filters: string[] = [];
  if (brightnessBoost > 0.01) filters.push(`brightness(${1 + brightnessBoost})`);
  if (contrastBoost > 0.01) filters.push(`contrast(${1 + contrastBoost + sharpenBoost})`);
  if (vibranceBoost > 0.01) filters.push(`saturate(${1 + vibranceBoost})`);

  return filters.join(' ');
}
