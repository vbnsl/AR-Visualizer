const SOBEL_X_KERNEL = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
const SOBEL_Y_KERNEL = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
const EDGE_DILATION_RADIUS = 2;
const REGION_FILL_DILATION_RADIUS = 3;
const BLUR_RADIUS = 3;
const GAUSSIAN_SIGMA = 2;
const MASK_GAMMA = 0.7;

/** Color distance threshold: pixels this far from "wall" color (0–255 scale) are treated as objects. Higher = less patchiness on wall, only clear objects occluded. */
const COLOR_DISTANCE_THRESHOLD = 58;
/** Sample border to estimate wall color (avoid objects in center). */
const WALL_SAMPLE_BORDER = 0.08;

/**
 * Estimates a representative "wall" color by sampling the border of the image (where wall is likely).
 */
function estimateWallColor(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const border = Math.max(1, Math.floor(Math.min(width, height) * WALL_SAMPLE_BORDER));
  const samples: [number, number, number][] = [];
  for (let y = border; y < height - border; y += Math.max(1, (height - 2 * border) >> 4)) {
    for (let side = 0; side < 2; side++) {
      const x = side === 0 ? border : width - 1 - border;
      const i = (y * width + x) * 4;
      samples.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  for (let x = border; x < width - border; x += Math.max(1, (width - 2 * border) >> 4)) {
    for (let side = 0; side < 2; side++) {
      const y = side === 0 ? border : height - 1 - border;
      const i = (y * width + x) * 4;
      samples.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  if (samples.length === 0) return [128, 128, 128];
  const mid = samples.length >> 1;
  samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const m = samples[mid];
  return [m[0], m[1], m[2]];
}

/**
 * Builds a mask from color distance: pixels that differ from the estimated wall color become "object".
 * Good for soft edges and colored details (e.g. chair trim) that edge detection misses.
 */
function buildColorDistanceMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pixelCount: number,
): Uint8ClampedArray {
  const [wr, wg, wb] = estimateWallColor(data, width, height);
  const out = new Uint8ClampedArray(pixelCount);
  for (let i = 0, j = 0; i < pixelCount; i += 1, j += 4) {
    const dr = data[j] - wr;
    const dg = data[j + 1] - wg;
    const db = data[j + 2] - wb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    out[i] = dist >= COLOR_DISTANCE_THRESHOLD ? 255 : 0;
  }
  return out;
}

/**
 * Builds a soft occlusion mask by combining:
 * 1. Edge-based mask (Sobel + fill + dilate + blur) – sharp boundaries, TV/outlets.
 * 2. Color-distance mask – pixels far from wall color (chair, trim, dark/white objects).
 * Takes the max of both so we keep edges and add color-based regions.
 */
export function buildOcclusionMask(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  if (!width || !height) {
    return new ImageData(width || 1, height || 1);
  }

  const pixelCount = width * height;

  // 1) Color-distance mask (catches chair, green trim, TV, outlets without needing sharp edges)
  const colorMask = buildColorDistanceMask(data, width, height, pixelCount);
  const colorDilated = dilate(colorMask, width, height, 2);
  const colorBlurred = gaussianBlur(colorDilated, width, height, 2, 1.2);

  // 2) Edge-based mask (existing pipeline)
  const grayscale = new Float32Array(pixelCount);
  for (let i = 0, j = 0; i < pixelCount; i += 1, j += 4) {
    const r = data[j];
    const g = data[j + 1];
    const b = data[j + 2];
    grayscale[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const sobelMagnitude = new Float32Array(pixelCount);
  let maxMagnitude = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let gx = 0;
      let gy = 0;
      let kernelIndex = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        const sampleY = y + ky;
        for (let kx = -1; kx <= 1; kx += 1) {
          const sampleX = x + kx;
          const sample = grayscale[sampleY * width + sampleX];
          gx += sample * SOBEL_X_KERNEL[kernelIndex];
          gy += sample * SOBEL_Y_KERNEL[kernelIndex];
          kernelIndex += 1;
        }
      }
      const magnitude = Math.hypot(gx, gy);
      const index = y * width + x;
      sobelMagnitude[index] = magnitude;
      if (magnitude > maxMagnitude) {
        maxMagnitude = magnitude;
      }
    }
  }

  const normalizedEdges = new Float32Array(pixelCount);
  const inverseMax = maxMagnitude > 0 ? 1 / maxMagnitude : 0;
  let sum = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    const value = sobelMagnitude[i] * inverseMax * 255;
    normalizedEdges[i] = value;
    sum += value;
  }
  const mean = sum / pixelCount;
  let variance = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    const diff = normalizedEdges[i] - mean;
    variance += diff * diff;
  }
  const stdDev = Math.sqrt(variance / pixelCount);
  const threshold = clamp(mean + stdDev, 35, 180);

  const binaryEdges = new Uint8ClampedArray(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    binaryEdges[i] = normalizedEdges[i] >= threshold ? 255 : 0;
  }

  const sealedEdges = dilate(binaryEdges, width, height, REGION_FILL_DILATION_RADIUS);
  const filledRegions = fillClosedRegions(sealedEdges, width, height);

  const maskSource = new Uint8ClampedArray(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    maskSource[i] = Math.max(sealedEdges[i], filledRegions[i]);
  }

  const edgeDilated = dilate(maskSource, width, height, EDGE_DILATION_RADIUS);
  const edgeBlurred = gaussianBlur(edgeDilated, width, height, BLUR_RADIUS, GAUSSIAN_SIGMA);

  // 3) Object region: where edge pipeline found objects (dilate so interiors + trim are included), blurred to soft 0–1
  const objectRegionDilated = dilate(maskSource, width, height, 10);
  const objectRegionSoft = gaussianBlur(objectRegionDilated, width, height, 8, 4);

  // 4) Combine: edge mask everywhere; color mask only *inside/near* objects so we don't occlude plain wall (no patchiness)
  const combined = new Uint8ClampedArray(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    const colorInRegion = (colorBlurred[i] * objectRegionSoft[i]) / 255;
    combined[i] = Math.max(edgeBlurred[i], Math.round(colorInRegion));
  }

  const output = new Uint8ClampedArray(pixelCount * 4);
  for (let i = 0; i < pixelCount; i += 1) {
    const normalized = combined[i] / 255;
    const boosted = Math.pow(normalized, MASK_GAMMA);
    const value = Math.max(0, Math.min(255, Math.round(boosted * 255)));
    const base = i * 4;
    output[base] = value;
    output[base + 1] = value;
    output[base + 2] = value;
    output[base + 3] = value;
  }

  return new ImageData(output, width, height);
}

function dilate(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): Uint8ClampedArray {
  if (radius <= 0) {
    return source.slice();
  }
  const result = new Uint8ClampedArray(source.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let maxValue = 0;
      for (let ky = -radius; ky <= radius; ky += 1) {
        const sampleY = clamp(y + ky, 0, height - 1);
        for (let kx = -radius; kx <= radius; kx += 1) {
          const sampleX = clamp(x + kx, 0, width - 1);
          const value = source[sampleY * width + sampleX];
          if (value > maxValue) {
            maxValue = value;
            if (maxValue === 255) {
              break;
            }
          }
        }
        if (maxValue === 255) {
          break;
        }
      }
      result[y * width + x] = maxValue;
    }
  }
  return result;
}

function gaussianBlur(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  sigma: number,
): Uint8ClampedArray {
  if (radius <= 0) {
    return source.slice();
  }
  const kernel = buildGaussianKernel(radius, sigma);
  const temp = new Float32Array(source.length);
  const result = new Uint8ClampedArray(source.length);

  // Horizontal pass
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const sampleX = clamp(x + k, 0, width - 1);
        sum += source[y * width + sampleX] * kernel[k + radius];
      }
      temp[y * width + x] = sum;
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const sampleY = clamp(y + k, 0, height - 1);
        sum += temp[sampleY * width + x] * kernel[k + radius];
      }
      result[y * width + x] = Math.round(sum);
    }
  }

  return result;
}

function buildGaussianKernel(radius: number, sigma: number): number[] {
  const kernelSize = radius * 2 + 1;
  const kernel: number[] = new Array(kernelSize);
  const sigmaSq = 2 * sigma * sigma;
  let total = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const value = Math.exp(-(i * i) / sigmaSq);
    kernel[i + radius] = value;
    total += value;
  }
  for (let i = 0; i < kernel.length; i += 1) {
    kernel[i] /= total;
  }
  return kernel;
}

function fillClosedRegions(
  source: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;

  const enqueue = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }
    const idx = y * width + x;
    if (visited[idx] || source[idx] !== 0) {
      return;
    }
    visited[idx] = 1;
    queue[tail] = idx;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const idx = queue[head];
    head += 1;
    const x = idx % width;
    const y = (idx / width) | 0;

    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  const output = new Uint8ClampedArray(total);
  for (let i = 0; i < total; i += 1) {
    output[i] = visited[i] ? 0 : 255;
  }
  return output;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
