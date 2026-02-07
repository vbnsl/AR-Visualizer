import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useVisualizer, WallPoint } from '../contexts/VisualizerContext';
import { useThreeRenderer } from '../hooks/useThreeRenderer';
import {
  createPhotoBackground,
  getPhotoQuadDimensions,
  type PhotoBackgroundHandle,
} from '../utils/createPhotoBackground';
import { createWallMeshFromQuad } from '../utils/createWallMeshFromQuad';
import { createTileMaterial } from '../utils/applyTileMaterial';
import { tileCatalog } from '../data/tileCatalog';
import type { TileMaterialHandle } from '../utils/applyTileMaterial';
import { createTileLighting } from '../utils/createTileLighting';
import { buildOcclusionMask } from '../utils/buildOcclusionMask';

const DEFAULT_CAMERA_Z = 1.6;
const OCCLUSION_DISTANCE = 0.006;
const DEBUG_SHOW_OCCLUSION_MASK = false;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

type WallBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function clientToImagePoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  imageDimensions: { width: number; height: number },
): WallPoint {
  const xRatio = clamp((clientX - rect.left) / rect.width, 0, 1);
  const yRatio = clamp((clientY - rect.top) / rect.height, 0, 1);
  return {
    x: xRatio * imageDimensions.width,
    y: yRatio * imageDimensions.height,
  };
}

function normalizeWallPoints(points: WallPoint[]): WallPoint[] {
  if (points.length < 4) return points;
  const trimmed = points.slice(0, 4);
  const sortedByY = [...trimmed].sort((a, b) => a.y - b.y);
  const top = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sortedByY.slice(2).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]];
}

function TilePreview() {
  const { uploadedImage, wallPoints, selectedTileId, setWallPoints } = useVisualizer();
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { mountRef, scene, camera } = useThreeRenderer({
    clearColor: '#0b1120',
    cameraZ: DEFAULT_CAMERA_Z,
    preserveDrawingBuffer: true,
  });

  const selectedTile = useMemo(
    () => tileCatalog.find((tile) => tile.id === selectedTileId) ?? null,
    [selectedTileId],
  );

  const wallMeshRef = useRef<THREE.Mesh | null>(null);
  const tileHandleRef = useRef<TileMaterialHandle | null>(null);
  const [occlusionTexture, setOcclusionTexture] = useState<THREE.Texture | null>(null);
  const occlusionHandleRef = useRef<PhotoBackgroundHandle | null>(null);
  const [zoom, setZoom] = useState(1);

  const imageDimensions = useMemo(() => {
    if (!uploadedImage) return { width: 0, height: 0 };
    const w = uploadedImage.naturalWidth || uploadedImage.width || 0;
    const h = uploadedImage.naturalHeight || uploadedImage.height || 0;
    return { width: w, height: h };
  }, [uploadedImage]);

  const normalizedHandles = useMemo(() => {
    if (!wallPoints || imageDimensions.width === 0 || imageDimensions.height === 0) return [];
    return wallPoints.map((p) => ({
      left: (p.x / imageDimensions.width) * 100,
      top: (p.y / imageDimensions.height) * 100,
    }));
  }, [wallPoints, imageDimensions]);

  const polygonPath = useMemo(() => {
    if (!wallPoints || wallPoints.length < 2) return '';
    const commands = wallPoints.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`);
    if (wallPoints.length === 4) commands.push('Z');
    return commands.join(' ');
  }, [wallPoints]);

  const wallBoundingBoxPx = useMemo(() => {
    if (!wallPoints || wallPoints.length !== 4) {
      return null;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const point of wallPoints) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    return {
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
    };
  }, [wallPoints]);
  const wallBoundingBox = useMemo<WallBoundingBox | null>(() => {
    if (!wallPoints || wallPoints.length !== 4 || imageDimensions.width === 0 || imageDimensions.height === 0) {
      return null;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of wallPoints) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return null;
    }
    const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const x = clampValue(Math.floor(minX), 0, imageDimensions.width - 1);
    const y = clampValue(Math.floor(minY), 0, imageDimensions.height - 1);
    const clampedMaxX = clampValue(Math.ceil(maxX), x + 1, imageDimensions.width);
    const clampedMaxY = clampValue(Math.ceil(maxY), y + 1, imageDimensions.height);
    return {
      x,
      y,
      width: Math.max(clampedMaxX - x, 1),
      height: Math.max(clampedMaxY - y, 1),
    };
  }, [wallPoints, imageDimensions]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    if (!overlayRef.current || !imageDimensions.width || !imageDimensions.height) return;
    const target = event.currentTarget;
    const rect = overlayRef.current.getBoundingClientRect();
    target.setPointerCapture?.(event.pointerId);

    const handleMove = (e: PointerEvent) => {
      const next = clientToImagePoint(e.clientX, e.clientY, rect, imageDimensions);
      setWallPoints((prev) => {
        if (!prev) return prev;
        const nextPoints = [...prev];
        nextPoints[index] = next;
        return nextPoints.length === 4 ? normalizeWallPoints(nextPoints) : nextPoints;
      });
    };
    const handleUp = () => {
      target.releasePointerCapture?.(event.pointerId);
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('pointercancel', handleUp);
    };
    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('pointercancel', handleUp);
  };

  // Default to full-image quad so user can drag corners to select the wall manually
  useEffect(() => {
    if (!uploadedImage || wallPoints) {
      return;
    }
    const width = uploadedImage.naturalWidth || uploadedImage.width;
    const height = uploadedImage.naturalHeight || uploadedImage.height;
    if (!width || !height) {
      return;
    }
    setWallPoints([
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ]);
  }, [uploadedImage, wallPoints, setWallPoints]);

  // Basic lighting rig
  useEffect(() => {
    if (!scene) {
      return undefined;
    }
    const lighting = createTileLighting(scene, {
      ambientIntensity: 0.6,
      directionalIntensity: 0.85,
      directionalPosition: new THREE.Vector3(-2, 3, 4),
    });
    return () => lighting.dispose();
  }, [scene]);

  // Apply zoom to the perspective camera
  useEffect(() => {
    if (!camera) {
      return;
    }
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }, [camera, zoom]);

  const clampZoom = (value: number) => Math.min(2.5, Math.max(0.5, value));

  useEffect(() => {
    const element = stageRef.current;
    if (!element) {
      return;
    }
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault();
      setZoom((prev) => clampZoom(prev - event.deltaY * 0.0015));
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  const handleZoomButton = (delta: number) => {
    setZoom((prev) => clampZoom(prev + delta));
  };

  // Sync background photo with uploaded image
  useEffect(() => {
    if (!scene || !camera || !uploadedImage) {
      return undefined;
    }
    const handle = createPhotoBackground(scene, camera, uploadedImage);
    return () => handle.dispose();
  }, [scene, camera, uploadedImage]);

  // Create or update the wall mesh whenever wall points change.
  // Build mesh in camera space (same as photo) so the tile stays exactly within the quad.
  useEffect(() => {
    if (!scene || !camera || !uploadedImage || !wallPoints || wallPoints.length !== 4) {
      return undefined;
    }

    const imageWidth = uploadedImage.naturalWidth || uploadedImage.width || 1;
    const imageHeight = uploadedImage.naturalHeight || uploadedImage.height || 1;

    const photoQuad = getPhotoQuadDimensions(camera, imageWidth, imageHeight);
    const mesh = createWallMeshFromQuad(wallPoints, imageWidth, imageHeight, camera, photoQuad);
    wallMeshRef.current = mesh;
    camera.add(mesh);

    return () => {
      tileHandleRef.current?.dispose();
      tileHandleRef.current = null;
      camera.remove(mesh);
      mesh.geometry.dispose();
      const meshMaterial = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(meshMaterial)) {
        meshMaterial.forEach((mat) => mat.dispose());
      } else {
        meshMaterial.dispose();
      }
      wallMeshRef.current = null;
    };
  }, [scene, camera, uploadedImage, wallPoints]);

  // Build an occlusion texture from the original photo crop covering the selected wall.
  useEffect(() => {
    if (!uploadedImage || !wallBoundingBox || imageDimensions.width === 0 || imageDimensions.height === 0) {
      setOcclusionTexture((prev) => {
        prev?.dispose();
        return null;
      });
      return;
    }

    let cancelled = false;
    const width = imageDimensions.width;
    const height = imageDimensions.height;
    const cropX = Math.min(Math.max(Math.round(wallBoundingBox.x), 0), width - 1);
    const cropY = Math.min(Math.max(Math.round(wallBoundingBox.y), 0), height - 1);
    const cropWidth = Math.min(Math.max(Math.round(wallBoundingBox.width), 1), width - cropX);
    const cropHeight = Math.min(Math.max(Math.round(wallBoundingBox.height), 1), height - cropY);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      setOcclusionTexture((prev) => {
        prev?.dispose();
        return null;
      });
      return;
    }
    ctx.drawImage(uploadedImage, 0, 0, width, height);

    try {
      // Full-color photo pixels (we only use these for RGB; mask drives alpha only).
      const photoPixels = ctx.getImageData(0, 0, width, height);
      const originalCrop = ctx.getImageData(cropX, cropY, cropWidth, cropHeight);
      const maskData = buildOcclusionMask(
        new ImageData(new Uint8ClampedArray(originalCrop.data), cropWidth, cropHeight),
      );
      const dest = photoPixels.data;
      const mask = maskData.data;
      // Zero alpha everywhere; we will set it from the mask in the crop region only.
      for (let i = 3; i < dest.length; i += 4) {
        dest[i] = 0;
      }
      // In the crop region: keep original photo RGB, set alpha from mask so occluded objects show full color.
      for (let y = 0; y < cropHeight; y += 1) {
        for (let x = 0; x < cropWidth; x += 1) {
          const srcIndex = (y * cropWidth + x) * 4;
          const maskValue = mask[srcIndex];
          if (maskValue === 0) {
            continue;
          }
          const destX = cropX + x;
          const destY = cropY + y;
          const destIndex = (destY * width + destX) * 4;
          if (DEBUG_SHOW_OCCLUSION_MASK) {
            dest[destIndex] = maskValue;
            dest[destIndex + 1] = maskValue;
            dest[destIndex + 2] = maskValue;
          }
          dest[destIndex + 3] = maskValue;
        }
      }
      ctx.putImageData(photoPixels, 0, 0);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.premultiplyAlpha = false;
      texture.needsUpdate = true;
      if (cancelled) {
        texture.dispose();
        return;
      }
      setOcclusionTexture((prev) => {
        prev?.dispose();
        return texture;
      });
    } catch (error) {
      console.error('Failed to build occlusion mask', error);
      setOcclusionTexture((prev) => {
        prev?.dispose();
        return null;
      });
    }

    return () => {
      cancelled = true;
    };
  }, [uploadedImage, wallBoundingBox, imageDimensions]);

  // Apply tile material whenever the selection or wall bounding box changes
  useEffect(() => {
    const mesh = wallMeshRef.current;
    if (!mesh || !wallBoundingBoxPx) {
      return;
    }

    if (!selectedTile) {
      mesh.visible = false;
      tileHandleRef.current?.dispose();
      tileHandleRef.current = null;
      return;
    }

    mesh.visible = true;
    const materialHandle = tileHandleRef.current;
    const baseOptions = {
      wallBoundingBoxPx,
    };

    if (!materialHandle) {
      tileHandleRef.current = createTileMaterial(selectedTile, baseOptions);
      mesh.material = tileHandleRef.current.material;
      return;
    }

    materialHandle.updateTile(selectedTile, baseOptions);
  }, [selectedTile, wallBoundingBoxPx]);

  // Apply occlusion as a final compositing pass so foreground objects remain on top of the tiles.
  useEffect(() => {
    const currentHandle = occlusionHandleRef.current;
    if (!scene || !camera || !uploadedImage || !occlusionTexture || !selectedTile) {
      if (currentHandle) {
        currentHandle.dispose();
        occlusionHandleRef.current = null;
      }
      return;
    }

    const overlayDistance = Math.max(camera.near + OCCLUSION_DISTANCE, camera.near + 0.001);
    occlusionTexture.needsUpdate = true;

    if (currentHandle) {
      currentHandle.dispose();
      occlusionHandleRef.current = null;
    }
    const handle = createPhotoBackground(scene, camera, occlusionTexture, {
      distance: overlayDistance,
      colorSpace: THREE.SRGBColorSpace,
    });
    handle.mesh.name = 'occlusion-overlay';
    handle.mesh.renderOrder = 20;
    const material = handle.mesh.material as THREE.MeshBasicMaterial;
    material.transparent = true;
    material.depthTest = false;
    material.depthWrite = false;
    material.opacity = 1;
    material.premultipliedAlpha = false;

    occlusionHandleRef.current = handle;

    return () => {
      if (occlusionHandleRef.current === handle) {
        handle.dispose();
        occlusionHandleRef.current = null;
      }
    };
  }, [scene, camera, uploadedImage, occlusionTexture, selectedTile]);

  const hasImage = Boolean(uploadedImage);
  const hasTile = Boolean(selectedTile);

  return (
    <div className="preview-stage" ref={stageRef}>
      <div ref={mountRef} className="preview-stage__canvas" />
      {hasImage && imageDimensions.width > 0 && imageDimensions.height > 0 && wallPoints && wallPoints.length === 4 && (
        <div
          ref={overlayRef}
          className="preview-stage__corner-overlay"
          style={{
            aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
            transform: `scale(${zoom})`,
          }}
        >
          <svg
            className="preview-stage__overlay-svg"
            viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
            preserveAspectRatio="none"
          >
            {polygonPath && <path d={polygonPath} className="preview-stage__overlay-polygon" />}
          </svg>
          {normalizedHandles.map((handle, i) => (
            <button
              key={i}
              type="button"
              className="preview-stage__handle"
              style={{ left: `${handle.left}%`, top: `${handle.top}%` }}
              onPointerDown={(e) => handlePointerDown(e, i)}
              aria-label={`Corner ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
      {!hasImage && (
        <div className="preview-stage__message">
          <p>Upload a wall photo to start the preview.</p>
        </div>
      )}
      {hasImage && wallPoints?.length === 4 && !hasTile && (
        <div className="preview-stage__message preview-stage__message--hint">
          <p>Drag the blue corners to outline the wall, then select a tile. The tile stays inside your selection.</p>
        </div>
      )}
      <div className="preview-zoom">
        <button type="button" onClick={() => handleZoomButton(-0.1)}>-</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => handleZoomButton(0.1)}>+</button>
      </div>
    </div>
  );
}

export default TilePreview;
