export interface OptimizedImage {
  dataUrl: string;
  blob: Blob;
  format: string;
  width: number;
  height: number;
  bytes: number;
  originalBytes: number;
  skipped: boolean;
}

const DEFAULT_MAX_DIMENSION = 1200;
const DEFAULT_QUALITY = 0.8;
const DEFAULT_MIN_SKIP_BYTES = 150 * 1024;

export async function optimizeImage(
  file: File,
  opts?: { maxDimension?: number; quality?: number; minSkipBytes?: number }
): Promise<OptimizedImage> {
  const maxDimension = opts?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = opts?.quality ?? DEFAULT_QUALITY;
  const minSkipBytes = opts?.minSkipBytes ?? DEFAULT_MIN_SKIP_BYTES;

  const originalDataUrl = await readFileAsDataURL(file);
  const originalBytes = file.size;

  if (originalBytes < minSkipBytes) {
    return {
      dataUrl: originalDataUrl,
      blob: file,
      format: "original",
      width: 0,
      height: 0,
      bytes: originalBytes,
      originalBytes,
      skipped: true,
    };
  }

  const img = await loadImage(originalDataUrl);

  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      dataUrl: originalDataUrl,
      blob: file,
      format: "original",
      width: img.naturalWidth,
      height: img.naturalHeight,
      bytes: originalBytes,
      originalBytes,
      skipped: true,
    };
  }
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/webp", quality);
  });

  if (!blob || blob.size >= originalBytes) {
    return {
      dataUrl: originalDataUrl,
      blob: file,
      format: "original",
      width: img.naturalWidth,
      height: img.naturalHeight,
      bytes: originalBytes,
      originalBytes,
      skipped: true,
    };
  }

  const dataUrl = await blobToDataURL(blob);
  return {
    dataUrl,
    blob,
    format: "webp",
    width,
    height,
    bytes: blob.size,
    originalBytes,
    skipped: false,
  };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen."));
    img.src = src;
  });
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
