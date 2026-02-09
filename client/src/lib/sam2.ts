// @ts-nocheck
/**
 * SAM2 Browser Inference — Segment Anything Model 2 via ONNX Runtime WebGPU
 *
 * Architecture:
 * - Encoder: Processes image → high-dimensional embeddings (runs once per image)
 * - Decoder: Takes embeddings + click points → segmentation masks (runs per interaction)
 *
 * SAM2 accepts 1024x1024 images and generates 256x256 masks.
 * Models are loaded lazily on first use and cached in the browser.
 */

import * as ort from 'onnxruntime-web';

// SAM2 hiera-tiny ONNX models (smallest variant, best for browser)
// In production, self-host these on your CDN
const ENCODER_URL = 'https://storage.googleapis.com/lb-artifacts-testing-public/sam2/sam2_hiera_tiny.encoder.ort';
const DECODER_URL = 'https://storage.googleapis.com/lb-artifacts-testing-public/sam2/sam2_hiera_tiny.decoder.onnx';

const SAM_INPUT_SIZE = 1024;
const MASK_SIZE = 256;

export interface ClickPoint {
  /** x in original image coordinates */
  x: number;
  /** y in original image coordinates */
  y: number;
  /** 1 = positive (include), 0 = negative (exclude) */
  label: 0 | 1;
}

export interface SAM2Result {
  /** Raw mask data at 256x256 */
  maskData: Float32Array;
  /** Mask as ImageData at original image dimensions */
  maskImageData: ImageData;
  /** IoU prediction score */
  score: number;
}

interface EncoderOutputs {
  imageEmbed: ort.Tensor;
  highResFeats0: ort.Tensor;
  highResFeats1: ort.Tensor;
}

let encoderSession: ort.InferenceSession | null = null;
let decoderSession: ort.InferenceSession | null = null;
let currentEmbeddings: EncoderOutputs | null = null;
let isLoading = false;
let loadError: string | null = null;

/**
 * Check if WebGPU is available, fall back to WASM
 */
function getExecutionProvider(): string {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    return 'webgpu';
  }
  return 'wasm';
}

/**
 * Initialize SAM2 models. Call once — models are cached after first load.
 */
export async function initSAM2(onProgress?: (stage: string, pct: number) => void): Promise<void> {
  if (encoderSession && decoderSession) return;
  if (isLoading) return;

  isLoading = true;
  loadError = null;

  try {
    const ep = getExecutionProvider();
    onProgress?.('Loading encoder model...', 10);

    encoderSession = await ort.InferenceSession.create(ENCODER_URL, {
      executionProviders: [ep],
    });
    onProgress?.('Loading decoder model...', 60);

    decoderSession = await ort.InferenceSession.create(DECODER_URL, {
      executionProviders: [ep],
    });
    onProgress?.('Models ready', 100);
  } catch (err: any) {
    loadError = err.message || 'Failed to load SAM2 models';
    encoderSession = null;
    decoderSession = null;
    throw err;
  } finally {
    isLoading = false;
  }
}

/**
 * Encode an image — generates embeddings for subsequent mask predictions.
 * Only needs to run once per image.
 */
export async function encodeImage(image: HTMLImageElement | HTMLCanvasElement): Promise<void> {
  if (!encoderSession) {
    throw new Error('SAM2 not initialized. Call initSAM2() first.');
  }

  // Resize to 1024x1024 and normalize to [-1, 1]
  const canvas = document.createElement('canvas');
  canvas.width = SAM_INPUT_SIZE;
  canvas.height = SAM_INPUT_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, SAM_INPUT_SIZE, SAM_INPUT_SIZE);

  const imageData = ctx.getImageData(0, 0, SAM_INPUT_SIZE, SAM_INPUT_SIZE).data;
  const pixels = SAM_INPUT_SIZE * SAM_INPUT_SIZE;
  const inputArray = new Float32Array(3 * pixels);

  for (let i = 0; i < pixels; i++) {
    inputArray[i] = (imageData[i * 4]! / 255.0) * 2 - 1; // R
    inputArray[i + pixels] = (imageData[i * 4 + 1]! / 255.0) * 2 - 1; // G
    inputArray[i + 2 * pixels] = (imageData[i * 4 + 2]! / 255.0) * 2 - 1; // B
  }

  const inputTensor = new ort.Tensor('float32', inputArray, [1, 3, SAM_INPUT_SIZE, SAM_INPUT_SIZE]);

  const results = await encoderSession.run({ image: inputTensor });

  currentEmbeddings = {
    imageEmbed: results.image_embed!,
    highResFeats0: results.high_res_feats_0!,
    highResFeats1: results.high_res_feats_1!,
  };
}

/**
 * Predict a segmentation mask from click points.
 * Call encodeImage() first.
 *
 * @param points - Array of click points in ORIGINAL image coordinates
 * @param imageWidth - Original image width (for coordinate scaling)
 * @param imageHeight - Original image height (for coordinate scaling)
 */
export async function predictMask(points: ClickPoint[], imageWidth: number, imageHeight: number): Promise<SAM2Result> {
  if (!decoderSession || !currentEmbeddings) {
    throw new Error('No image encoded. Call encodeImage() first.');
  }

  if (points.length === 0) {
    throw new Error('At least one click point is required.');
  }

  const numPoints = points.length;

  // Scale points from original image coords → 1024x1024 SAM input coords
  const scaleX = SAM_INPUT_SIZE / imageWidth;
  const scaleY = SAM_INPUT_SIZE / imageHeight;

  const pointCoordsData = new Float32Array(numPoints * 2);
  const pointLabelsData = new Float32Array(numPoints);

  for (let i = 0; i < numPoints; i++) {
    const pt = points[i]!;
    pointCoordsData[i * 2] = pt.x * scaleX;
    pointCoordsData[i * 2 + 1] = pt.y * scaleY;
    pointLabelsData[i] = pt.label;
  }

  const feeds: Record<string, ort.Tensor> = {
    image_embed: currentEmbeddings.imageEmbed,
    high_res_feats_0: currentEmbeddings.highResFeats0,
    high_res_feats_1: currentEmbeddings.highResFeats1,
    point_coords: new ort.Tensor('float32', pointCoordsData, [1, numPoints, 2]),
    point_labels: new ort.Tensor('float32', pointLabelsData, [1, numPoints]),
    mask_input: new ort.Tensor('float32', new Float32Array(1 * 1 * MASK_SIZE * MASK_SIZE), [
      1,
      1,
      MASK_SIZE,
      MASK_SIZE,
    ]),
    has_mask_input: new ort.Tensor('float32', new Float32Array([0.0]), [1]),
  };

  const results = await decoderSession.run(feeds);

  const masks = results.masks!;
  const maskData = masks.data as Float32Array;
  const iouPredictions = results.iou_predictions!;
  const score = (iouPredictions.data as Float32Array)[0] ?? 0;

  // Convert 256x256 mask → original image size ImageData
  const maskImageData = scaleMaskToImageData(maskData, MASK_SIZE, MASK_SIZE, imageWidth, imageHeight);

  return { maskData, maskImageData, score };
}

/**
 * Scale a 256x256 binary mask to original image dimensions as ImageData.
 * Positive values → semi-transparent red overlay.
 */
function scaleMaskToImageData(
  maskData: Float32Array,
  maskW: number,
  maskH: number,
  targetW: number,
  targetH: number,
): ImageData {
  const imgData = new ImageData(targetW, targetH);
  const data = imgData.data;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      // Map target pixel → mask pixel (nearest neighbor)
      const mx = Math.floor((x / targetW) * maskW);
      const my = Math.floor((y / targetH) * maskH);
      const maskVal = maskData[my * maskW + mx] ?? 0;

      const idx = (y * targetW + x) * 4;

      if (maskVal > 0) {
        // Semi-transparent blue overlay for selected region
        data[idx] = 59; // R
        data[idx + 1] = 130; // G
        data[idx + 2] = 246; // B
        data[idx + 3] = 100; // A (semi-transparent)
      } else {
        data[idx + 3] = 0; // Fully transparent
      }
    }
  }

  return imgData;
}

/**
 * Convert the current mask to a black-and-white mask image (for sending to AI).
 * White = selected region, Black = background.
 */
export function maskToBase64(maskData: Float32Array, imageWidth: number, imageHeight: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(imageWidth, imageHeight);
  const data = imgData.data;

  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      const mx = Math.floor((x / imageWidth) * MASK_SIZE);
      const my = Math.floor((y / imageHeight) * MASK_SIZE);
      const val = (maskData[my * MASK_SIZE + mx] ?? 0) > 0 ? 255 : 0;

      const idx = (y * imageWidth + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png').split(',')[1] ?? '';
}

/**
 * Get current loading state.
 */
export function getSAM2Status(): {
  ready: boolean;
  loading: boolean;
  error: string | null;
  hasEmbeddings: boolean;
} {
  return {
    ready: !!encoderSession && !!decoderSession,
    loading: isLoading,
    error: loadError,
    hasEmbeddings: !!currentEmbeddings,
  };
}

/**
 * Clear cached embeddings (call when switching images).
 */
export function clearEmbeddings(): void {
  currentEmbeddings = null;
}
