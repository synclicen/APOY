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

    // 1. Sample background color from the 4 corners + edge midpoints.
    // These are the most likely background regions.
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

    // 2. Cluster samples: pick the most common-ish color as the bg candidate.
    // Use the median of each channel for robustness against noise.
    const bg = medianColor(samples);

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
