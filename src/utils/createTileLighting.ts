import * as THREE from 'three';

export type TileLightingOptions = {
  ambientColor?: THREE.ColorRepresentation;
  ambientIntensity?: number;
  directionalColor?: THREE.ColorRepresentation;
  directionalIntensity?: number;
  directionalPosition?: THREE.Vector3;
};

export type TileLightingHandle = {
  ambientLight: THREE.AmbientLight;
  keyLight: THREE.DirectionalLight;
  dispose: () => void;
};

/**
 * Adds a simple lighting rig (ambient + top-left directional) that keeps tiles readable
 * without requiring HDR or physical lights. Return value exposes both lights so callers
 * can tweak properties or remove them later.
 */
export function createTileLighting(
  scene: THREE.Scene,
  options: TileLightingOptions = {},
): TileLightingHandle {
  const ambientColor = options.ambientColor ?? 0xffffff;
  const ambientIntensity = options.ambientIntensity ?? 0.45;
  const directionalColor = options.directionalColor ?? 0xffffff;
  const directionalIntensity = options.directionalIntensity ?? 0.85;
  const directionalPosition = options.directionalPosition ?? new THREE.Vector3(-2, 4, 2);

  const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(directionalColor, directionalIntensity);
  keyLight.position.copy(directionalPosition);
  keyLight.target.position.set(0, 0, 0);
  scene.add(keyLight);
  scene.add(keyLight.target);

  const dispose = () => {
    scene.remove(ambientLight);
    scene.remove(keyLight);
    scene.remove(keyLight.target);
    ambientLight.dispose();
    keyLight.dispose();
  };

  return {
    ambientLight,
    keyLight,
    dispose,
  };
}
