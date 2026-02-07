import * as THREE from 'three';

export type QuadPoint = {
  x: number;
  y: number;
};

export type PhotoQuadDimensions = {
  quadWidth: number;
  quadHeight: number;
  distance: number;
};

const DEFAULT_PLANE_DISTANCE = 1;

/**
 * Builds a quad mesh that aligns with the photo so the tile stays within the user's selection.
 * When photoQuad is provided, the mesh is built in camera local space (same as the photo);
 * add it to the camera so it aligns exactly. Otherwise uses ray-plane in scene space.
 */
export function createWallMeshFromQuad(
  points: QuadPoint[],
  imageWidth: number,
  imageHeight: number,
  camera: THREE.PerspectiveCamera,
  photoQuad?: PhotoQuadDimensions,
): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  if (points.length !== 4) {
    throw new Error('createWallMeshFromQuad requires exactly four ordered points.');
  }

  if (photoQuad) {
    return createWallMeshInPhotoSpace(points, imageWidth, imageHeight, photoQuad);
  }

  return createWallMeshInSceneSpace(points, imageWidth, imageHeight, camera);
}

/** Mesh in camera local space: same coordinate system as the photo quad so the tile stays inside it. */
function createWallMeshInPhotoSpace(
  points: QuadPoint[],
  imageWidth: number,
  imageHeight: number,
  photoQuad: PhotoQuadDimensions,
): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  const { quadWidth, quadHeight, distance } = photoQuad;
  const inFront = 0.002;

  const positions: number[] = [];
  for (const point of points) {
    const u = point.x / imageWidth;
    const v = point.y / imageHeight;
    const x = (u - 0.5) * quadWidth;
    const y = (0.5 - v) * quadHeight;
    positions.push(x, y, -distance + inFront);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'wall-mesh';
  return mesh;
}

function createWallMeshInSceneSpace(
  points: QuadPoint[],
  imageWidth: number,
  imageHeight: number,
  camera: THREE.PerspectiveCamera,
): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  const cameraPosition = new THREE.Vector3();
  camera.getWorldPosition(cameraPosition);
  const cameraNormal = new THREE.Vector3();
  camera.getWorldDirection(cameraNormal).normalize();

  const planeOffset = camera.near + DEFAULT_PLANE_DISTANCE;

  const worldVertices = points.map((point) =>
    screenPointToPlaneIntersection(
      point,
      imageWidth,
      imageHeight,
      camera,
      cameraPosition,
      cameraNormal,
      planeOffset,
    ),
  );

  const positions = new Float32Array(worldVertices.flatMap((v) => v.toArray()));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
  });

  return new THREE.Mesh(geometry, material);
}

function screenPointToPlaneIntersection(
  point: QuadPoint,
  imageWidth: number,
  imageHeight: number,
  camera: THREE.PerspectiveCamera,
  cameraPosition: THREE.Vector3,
  planeNormal: THREE.Vector3,
  planeOffset: number,
): THREE.Vector3 {
  const ndcX = (point.x / imageWidth) * 2 - 1;
  const ndcY = -(point.y / imageHeight) * 2 + 1;
  const ndc = new THREE.Vector3(ndcX, ndcY, 0);
  ndc.unproject(camera);

  const rayDirection = ndc.sub(cameraPosition).normalize();
  const denom = planeNormal.dot(rayDirection);
  const epsilon = 1e-6;
  if (Math.abs(denom) < epsilon) {
    return cameraPosition.clone().add(rayDirection.multiplyScalar(camera.near + DEFAULT_PLANE_DISTANCE));
  }

  const t = planeOffset / denom;
  return cameraPosition.clone().add(rayDirection.multiplyScalar(t));
}
