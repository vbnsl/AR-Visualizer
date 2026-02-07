import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useVisualizer } from '../contexts/VisualizerContext';
import { useThreeRenderer } from '../hooks/useThreeRenderer';
import { createPhotoBackground } from '../utils/createPhotoBackground';
import { createWallMeshFromQuad } from '../utils/createWallMeshFromQuad';
import { createTileMaterial } from '../utils/applyTileMaterial';
import { tileCatalog } from '../data/tileCatalog';
import type { TileMaterialHandle } from '../utils/applyTileMaterial';
import { createTileLighting } from '../utils/createTileLighting';

const DEFAULT_CAMERA_Z = 1.6;

function TilePreview() {
  const { uploadedImage, wallPoints, selectedTileId, setWallPoints } = useVisualizer();
  const stageRef = useRef<HTMLDivElement>(null);
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
  const [wallSize, setWallSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  // Default to full-image wall if user hasn't set corners yet
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

  // Create or update the wall mesh whenever wall points change
  useEffect(() => {
    if (!scene || !camera || !uploadedImage || !wallPoints || wallPoints.length !== 4) {
      setWallSize(null);
      return undefined;
    }

    const imageWidth = uploadedImage.naturalWidth || uploadedImage.width || 1;
    const imageHeight = uploadedImage.naturalHeight || uploadedImage.height || 1;

    const mesh = createWallMeshFromQuad(wallPoints, imageWidth, imageHeight, camera);
    mesh.name = 'wall-mesh';
    scene.add(mesh);
    wallMeshRef.current = mesh;

    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(mesh).getSize(size);
    setWallSize({ width: size.x || 1, height: size.y || 1 });

    return () => {
      tileHandleRef.current?.dispose();
      tileHandleRef.current = null;
      scene.remove(mesh);
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

  // Apply tile material whenever the selection or wall dimensions change
  useEffect(() => {
    const mesh = wallMeshRef.current;
    if (!mesh || !wallSize) {
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
      wallWidthMeters: Math.max(wallSize.width, 0.1),
      wallHeightMeters: Math.max(wallSize.height, 0.1),
    };

    if (!materialHandle) {
      tileHandleRef.current = createTileMaterial(selectedTile, baseOptions);
      mesh.material = tileHandleRef.current.material;
      return;
    }

    materialHandle.updateTile(selectedTile, baseOptions);
  }, [selectedTile, wallSize]);

  const hasImage = Boolean(uploadedImage);
  const hasTile = Boolean(selectedTile);

  return (
    <div className="preview-stage" ref={stageRef}>
      <div ref={mountRef} className="preview-stage__canvas" />
      {!hasImage && (
        <div className="preview-stage__message">
          <p>Upload a wall photo to start the preview.</p>
        </div>
      )}
      {hasImage && !hasTile && (
        <div className="preview-stage__message">
          <p>Select a tile from the catalog to overlay it on the wall.</p>
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
