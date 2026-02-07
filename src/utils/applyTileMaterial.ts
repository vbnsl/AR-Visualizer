import * as THREE from 'three';
import { TileDefinition } from '../data/tileCatalog';

export type WallBoundingBoxPx = {
  width: number;
  height: number;
};

export type TileMaterialOptions = {
  wallBoundingBoxPx: WallBoundingBoxPx;
  wallSizeMm?: { width: number; height: number };
  tileSizeCm?: { width: number; height: number };
};

export type TileMaterialHandle = {
  material: THREE.MeshStandardMaterial;
  updateTile: (tile: TileDefinition, options?: TileMaterialOptions) => void;
  dispose: () => void;
};

const MM_PER_CM = 10;
const DEFAULT_WALL_SIZE_MM = { width: 2400, height: 2100 };
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
  const boundingBox = options.wallBoundingBoxPx;
  if (boundingBox.width <= 0 || boundingBox.height <= 0) {
    return;
  }

  const wallSize = options.wallSizeMm ?? DEFAULT_WALL_SIZE_MM;
  if (wallSize.width <= 0) {
    return;
  }
  const tileSizeCm = options.tileSizeCm ?? tile.realWorldSizeCm;
  const tileWidthMm = tileSizeCm.width * MM_PER_CM;
  const tileHeightMm = tileSizeCm.height * MM_PER_CM;

  if (tileWidthMm <= 0 || tileHeightMm <= 0) {
    return;
  }

  const tilesAcross = wallSize.width / tileWidthMm;
  if (!isFinite(tilesAcross) || tilesAcross <= 0) {
    return;
  }

  const tilePixelWidth = boundingBox.width / tilesAcross;
  if (!isFinite(tilePixelWidth) || tilePixelWidth <= 0) {
    return;
  }

  const tilePixelHeight = tilePixelWidth * (tileHeightMm / tileWidthMm);
  if (!isFinite(tilePixelHeight) || tilePixelHeight <= 0) {
    return;
  }

  const tilesDown = boundingBox.height / tilePixelHeight;

  texture.repeat.set(tilesAcross, tilesDown);
  if (texture.image) {
    texture.needsUpdate = true;
  }
}
