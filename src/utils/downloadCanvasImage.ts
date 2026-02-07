import * as THREE from 'three';

const DEFAULT_FILENAME = 'ar-wall-visualizer.png';

/**
 * Captures a Three.js renderer canvas and triggers a PNG download in the browser.
 * Requires the renderer to be created with `preserveDrawingBuffer: true` if you
 * need to capture frames after rendering.
 */
export async function downloadRendererImage(
  renderer: THREE.WebGLRenderer,
  filename = DEFAULT_FILENAME,
): Promise<void> {
  const canvas = renderer.domElement;
  await downloadCanvasImage(canvas, filename);
}

export async function downloadCanvasImage(
  canvas: HTMLCanvasElement,
  filename = DEFAULT_FILENAME,
): Promise<void> {
  const blob = await canvasToBlob(canvas);
  triggerDownload(blob, filename);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas export failed.'));
        }
      }, 'image/png');
      return;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i += 1) {
        ia[i] = byteString.charCodeAt(i);
      }
      resolve(new Blob([ab], { type: mimeString }));
    } catch (error) {
      reject(error);
    }
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;

  // iOS Safari does not support `download`, so fall back to opening the image.
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  if (isIos) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
