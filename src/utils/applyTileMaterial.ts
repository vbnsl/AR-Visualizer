import * as THREE from 'three';
import { TileDefinition } from '../data/tileCatalog';

export type TileMaterialOptions = {
  wallWidthMeters: number;
  wallHeightMeters: number;
  tileSizeCm?: { width: number; height: number };
  repeatScale?: number;
};

export type TileMaterialHandle = {
  material: THREE.MeshStandardMaterial;
  updateTile: (tile: TileDefinition, options?: TileMaterialOptions) => void;
  dispose: () => void;
};

const loader = new THREE.TextureLoader();

export function createTileMaterial(
  initialTile: TileDefinition,
  options: TileMaterialOptions,
): TileMaterialHandle {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: initialTile.roughness ?? 0.4,
    side: THREE.DoubleSide,
  });

  let activeTexture: THREE.Texture | null = null;

  const applyTexture = (tile: TileDefinition, nextOptions: TileMaterialOptions) => {
    activeTexture?.dispose();
    const texture = loader.load(tile.textureUrl, () => {
      configureTextureRepeat(texture, tile, nextOptions);
    });
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0, 0);
    texture.colorSpace = THREE.SRGBColorSpace;

    activeTexture = texture;
    material.map = texture;
    material.roughness = tile.roughness ?? material.roughness;
    material.needsUpdate = true;
  };

  const updateTile = (tile: TileDefinition, nextOptions?: TileMaterialOptions) => {
    const mergedOptions: TileMaterialOptions = {
      ...options,
      ...nextOptions,
    };
    applyTexture(tile, mergedOptions);
  };

  updateTile(initialTile, options);

  return {
    material,
    updateTile,
    dispose: () => {
      activeTexture?.dispose();
      material.dispose();
    },
  };
}

function configureTextureRepeat(
  texture: THREE.Texture,
  tile: TileDefinition,
  options: TileMaterialOptions,
) {
  const tileWidthMeters = (options.tileSizeCm?.width ?? tile.realWorldSizeCm.width) / 100;
  const tileHeightMeters = (options.tileSizeCm?.height ?? tile.realWorldSizeCm.height) / 100;

  const repeatX = options.wallWidthMeters / tileWidthMeters;
  const repeatY = options.wallHeightMeters / tileHeightMeters;

  texture.repeat.set(repeatX, repeatY);
  if (texture.image) {
    texture.needsUpdate = true;
  }
}
