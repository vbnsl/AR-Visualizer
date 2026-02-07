declare interface XRSystem {
  isSessionSupported: (mode: XRSessionMode) => Promise<boolean>;
}

declare type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';
