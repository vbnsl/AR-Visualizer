export async function isImmersiveArSupported(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('xr' in navigator)) {
    return false;
  }

  try {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr || typeof xr.isSessionSupported !== 'function') {
      return false;
    }
    return await xr.isSessionSupported('immersive-ar');
  } catch (error) {
    console.warn('WebXR support check failed', error);
    return false;
  }
}
