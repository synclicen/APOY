/**
 * Background removal utility (client-side, canvas-based).
 *
 * Uses a chroma-key approach: samples the dominant edge/corner color of the
 * image and removes pixels that are within a tolerance of that color, with
 * smooth alpha feathering at the edges. Best for photos with strong/bright
 * colored or relatively uniform backgrounds.
 *
 * Output is a transparent PNG (Blob URL) with smoothed edges.
 */

export interface BgRemovalOptions {
  /** 0-100, how aggressively to remove similar colors (higher = remove more) */
  tolerance: number;
  /** 0-100, width of the feathered alpha band at edges (higher = softer edges) */
  smoothness: number;
  /**
   * Optional target color to remove as [R, G, B] (0-255 each).
   * When provided, this color is used directly instead of auto-sampling
   * the corners/edges. Pass null/undefined for auto-sampling mode.
   */
  targetColor?: [number, number, number] | null;
}

/**
 * Remove the background from an image and return a transparent PNG blob URL.
 * Returns null if processing fails (e.g. cross-origin image can't be read).
 */
export async function removeBackground(
  imageUrl: string,
  options: BgRemovalOptions
): Promise<string | null> {
  try {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Determine the target background color.
    // If a targetColor was supplied (preset or eyedropper), use it directly.
    // Otherwise, auto-sample from the 4 corners + edge midpoints.
    let bg: [number, number, number];
    if (options.targetColor && options.targetColor.length === 3) {
      bg = options.targetColor;
    } else {
      const samples: Array<[number, number, number]> = [];
      const samplePoints = [
        [0, 0],
        [w - 1, 0],
        [0, h - 1],
        [w - 1, h - 1],
        [Math.floor(w / 2), 0],
        [Math.floor(w / 2), h - 1],
        [0, Math.floor(h / 2)],
        [w - 1, Math.floor(h / 2)],
      ];
      for (const [x, y] of samplePoints) {
        const idx = (y * w + x) * 4;
        samples.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
      // Cluster samples: pick the median of each channel for robustness.
      bg = medianColor(samples);
    }

    // 3. Map tolerance (0-100) to a color-distance threshold.
    // Max possible squared distance in RGB is 3*255^2 ≈ 195075.
    // tolerance=100 → ~very aggressive; tolerance=0 → only exact matches.
    const tolNormalized = Math.max(0, Math.min(100, options.tolerance)) / 100;
    const threshold = Math.pow(tolNormalized * 180, 2); // squared distance threshold

    // smoothness controls the feather band width (in distance units).
    const smoothNormalized = Math.max(0, Math.min(100, options.smoothness)) / 100;
    const featherWidth = smoothNormalized * 120; // distance units over which to fade alpha
    const featherWidthSq = featherWidth * featherWidth;

    // 4. Walk every pixel and compute alpha based on color distance to bg.
    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - bg[0];
      const dg = data[i + 1] - bg[1];
      const db = data[i + 2] - bg[2];
      const distSq = dr * dr + dg * dg + db * db;

      if (distSq <= threshold) {
        // Fully background → transparent
        data[i + 3] = 0;
      } else if (featherWidth > 0 && distSq <= threshold + featherWidthSq) {
        // Edge band → feather the alpha for smooth transitions
        const t = (distSq - threshold) / featherWidthSq; // 0..1
        data[i + 3] = Math.round(Math.sqrt(Math.max(0, Math.min(1, t))) * 255);
      }
      // else: keep full alpha (foreground)
    }

    // 5. Optional: light edge de-fringing — reduce color bleed by desaturating
    // semi-transparent edge pixels slightly so halo artifacts are less visible.
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > 0 && a < 255) {
        // Pull edge pixel colors toward neutral to reduce color bleed
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = Math.round(data[i] * 0.7 + gray * 0.3);
        data[i + 1] = Math.round(data[i + 1] * 0.7 + gray * 0.3);
        data[i + 2] = Math.round(data[i + 2] * 0.7 + gray * 0.3);
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 6. Export as PNG (preserves alpha channel)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) return null;
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Background removal failed:', e);
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function medianColor(samples: Array<[number, number, number]>): [number, number, number] {
  const rs = samples.map((s) => s[0]).sort((a, b) => a - b);
  const gs = samples.map((s) => s[1]).sort((a, b) => a - b);
  const bs = samples.map((s) => s[2]).sort((a, b) => a - b);
  const mid = Math.floor(samples.length / 2);
  return [rs[mid], gs[mid], bs[mid]];
}

/**
 * Eyedropper: pick the average color of a small region around (x, y) in the
 * source image. Returns an [R, G, B] tuple (0-255) and a hex string.
 *
 * @param imageUrl  source image URL
 * @param x         click X in source-image pixel coordinates
 * @param y         click Y in source-image pixel coordinates
 * @param radius    sample a (2*radius+1)² neighborhood and average it
 */
export async function pickColorAt(
  imageUrl: string,
  x: number,
  y: number,
  radius = 3
): Promise<{ rgb: [number, number, number]; hex: string } | null> {
  try {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);
    const cx = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
    const cy = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));

    // Single getImageData for the whole neighborhood (efficient + CORS-safe
    // because loadImage sets crossOrigin='anonymous').
    const sx = Math.max(0, cx - radius);
    const sy = Math.max(0, cy - radius);
    const sw = Math.min(canvas.width - sx, radius * 2 + 1);
    const sh = Math.min(canvas.height - sy, radius * 2 + 1);
    const block = ctx.getImageData(sx, sy, sw, sh).data;
    let r = 0,
      g = 0,
      b = 0,
      count = 0;
    for (let i = 0; i < block.length; i += 4) {
      r += block[i];
      g += block[i + 1];
      b += block[i + 2];
      count++;
    }
    if (count === 0) return null;
    const avg: [number, number, number] = [
      Math.round(r / count),
      Math.round(g / count),
      Math.round(b / count),
    ];
    const hex =
      '#' +
      avg
        .map((c) => c.toString(16).padStart(2, '0'))
        .join('');
    return { rgb: avg, hex };
  } catch (e) {
    console.error('pickColorAt failed:', e);
    return null;
  }
}

/** Convert a hex color string (#rrggbb) to an [R, G, B] tuple. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
