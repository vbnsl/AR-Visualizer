const MAX_IMAGE_DIMENSION = 1600;

export type ProcessedImageResult = {
  image: HTMLImageElement;
  dataUrl: string;
};

export async function processUploadedImage(file: File): Promise<ProcessedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image uploads are supported.');
  }

  const [arrayBuffer, dataUrl] = await Promise.all([
    readFileAsArrayBuffer(file),
    readFileAsDataURL(file),
  ]);

  const orientation = file.type === 'image/jpeg' ? getExifOrientation(arrayBuffer) : 1;
  const loadedImage = await loadImage(dataUrl);
  const { width, height } = getScaledDimensions(loadedImage, MAX_IMAGE_DIMENSION);

  const canvas = drawImageToCanvas(loadedImage, orientation, width, height);

  const outputType = selectOutputType(file.type);
  const processedDataUrl =
    outputType === 'image/jpeg'
      ? canvas.toDataURL(outputType, 0.9)
      : canvas.toDataURL(outputType);

  const processedImage = await loadImage(processedDataUrl);

  return {
    image: processedImage,
    dataUrl: processedDataUrl,
  };
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to load image.'));
    img.src = src;
  });
}

function getScaledDimensions(image: HTMLImageElement, maxDimension: number) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const largestSide = Math.max(width, height);

  if (largestSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / largestSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function drawImageToCanvas(
  image: HTMLImageElement,
  orientation: number,
  width: number,
  height: number,
) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available.');
  }

  const sideSwap = orientation >= 5 && orientation <= 8;
  canvas.width = sideSwap ? height : width;
  canvas.height = sideSwap ? width : height;

  applyOrientationTransform(ctx, orientation, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return canvas;
}

function applyOrientationTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number,
) {
  switch (orientation) {
    case 2:
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -height);
      break;
    case 7:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(width, -height);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-width, 0);
      break;
    default:
      break;
  }
}

function selectOutputType(sourceType: string) {
  if (sourceType === 'image/png' || sourceType === 'image/webp') {
    return sourceType;
  }
  return 'image/jpeg';
}

function getExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  if (view.byteLength < 2 || view.getUint16(0, false) !== 0xffd8) {
    return 1;
  }

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;

    if (marker === 0xffda || marker === 0xffd9) {
      break;
    }

    if ((marker & 0xff00) !== 0xff00) {
      break;
    }

    const segmentLength = view.getUint16(offset, false);
    if (segmentLength < 2) {
      break;
    }

    const segmentStart = offset + 2;

    if (marker === 0xffe1 && segmentStart + 10 <= view.byteLength) {
      if (view.getUint32(segmentStart, false) === 0x45786966) {
        const tiffOffset = segmentStart + 6;
        const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
        const firstIFDOffset = view.getUint32(tiffOffset + 4, littleEndian);
        const dirOffset = tiffOffset + firstIFDOffset;
        if (dirOffset >= view.byteLength) {
          return 1;
        }

        const entries = view.getUint16(dirOffset, littleEndian);
        for (let i = 0; i < entries; i += 1) {
          const entryOffset = dirOffset + 2 + i * 12;
          if (entryOffset + 10 > view.byteLength) {
            continue;
          }
          if (view.getUint16(entryOffset, littleEndian) === 0x0112) {
            return view.getUint16(entryOffset + 8, littleEndian);
          }
        }
      }
    }

    offset += segmentLength + 2;
  }

  return 1;
}
