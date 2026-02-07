import * as THREE from 'three';

export type PhotoBackgroundSource = HTMLImageElement | THREE.Texture;

export type PhotoBackgroundHandle = {
  mesh: THREE.Mesh;
  texture: THREE.Texture;
  update: () => void;
  dispose: () => void;
};

export type CreatePhotoBackgroundOptions = {
  distance?: number;
  colorSpace?: THREE.ColorSpace;
};

const PHOTO_DISTANCE = 0.01;

/**
 * Returns the quad dimensions used to display the image on the camera-attached photo plane.
 * Use this to build overlays (e.g. wall quad) in the same coordinate system so they align.
 */
export function getPhotoQuadDimensions(
  camera: THREE.PerspectiveCamera,
  imageWidth: number,
  imageHeight: number,
  distance: number = camera.near + PHOTO_DISTANCE,
): { quadWidth: number; quadHeight: number; distance: number } {
  const imageAspect = imageWidth / imageHeight;
  const viewHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const viewWidth = viewHeight * camera.aspect;

  let quadWidth = viewWidth;
  let quadHeight = quadWidth / imageAspect;
  if (quadHeight < viewHeight) {
    quadHeight = viewHeight;
    quadWidth = quadHeight * imageAspect;
  }
  return { quadWidth, quadHeight, distance };
}

/**
 * Creates a camera-attached quad that renders a photo while preserving aspect ratio.
 * The quad sits just in front of the near plane so any additional meshes render on top
 * using the same PerspectiveCamera, which keeps overlays aligned with the uploaded photo.
 */
export function createPhotoBackground(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  source: PhotoBackgroundSource,
  options: CreatePhotoBackgroundOptions = {},
): PhotoBackgroundHandle {
  const ownsTexture = !(source instanceof THREE.Texture);
  const texture = ownsTexture ? new THREE.Texture(source) : source;
  if (ownsTexture) {
    texture.needsUpdate = true;
  }
  texture.colorSpace = options.colorSpace ?? THREE.SRGBColorSpace;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(1, 1);
  const quad = new THREE.Mesh(geometry, material);
  quad.name = 'PhotoBackgroundQuad';
  quad.renderOrder = -1;
  quad.frustumCulled = false;

  const distance = options.distance ?? camera.near + PHOTO_DISTANCE;
  quad.position.set(0, 0, -distance);

  const ensureCameraInScene = () => {
    if (!camera.parent) {
      scene.add(camera);
    }
  };
  ensureCameraInScene();
  camera.add(quad);

  const getImageAspect = () => {
    const image = texture.image as
      | HTMLImageElement
      | HTMLCanvasElement
      | ImageBitmap
      | undefined;
    if (!image || !image.width || !image.height) {
      return 1;
    }
    return image.width / image.height;
  };

  const updateScale = () => {
    const imageAspect = getImageAspect();
    const viewHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const viewWidth = viewHeight * camera.aspect;

    let quadWidth = viewWidth;
    let quadHeight = quadWidth / imageAspect;

    if (quadHeight < viewHeight) {
      quadHeight = viewHeight;
      quadWidth = quadHeight * imageAspect;
    }

    quad.scale.set(quadWidth, quadHeight, 1);
  };

  const update = () => {
    updateScale();
  };

  const maybeAttachLoadListener = () => {
    const image = texture.image as HTMLImageElement | undefined;
    if (image && image instanceof HTMLImageElement && !image.complete) {
      const onLoad = () => {
        updateScale();
        image.removeEventListener('load', onLoad);
      };
      image.addEventListener('load', onLoad);
    } else {
      updateScale();
    }
  };

  maybeAttachLoadListener();

  const dispose = () => {
    camera.remove(quad);
    geometry.dispose();
    material.dispose();
    if (ownsTexture) {
      texture.dispose();
    }
  };

  return {
    mesh: quad,
    texture,
    update,
    dispose,
  };
}
