import * as THREE from 'three';

export type QuadPoint = {
  x: number;
  y: number;
};

const DEFAULT_PLANE_DISTANCE = 1;

/**
 * Converts a quadrilateral defined in 2D pixel space (top-left ordering) into a
 * planar mesh that lives in the same perspective camera frustum. The mesh uses
 * a ray-plane intersection so that, when rendered, the vertices line up with
 * the original 2D points without needing actual depth reconstruction.
 */
export function createWallMeshFromQuad(
  points: QuadPoint[],
  imageWidth: number,
  imageHeight: number,
  camera: THREE.PerspectiveCamera,
): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  if (points.length !== 4) {
    throw new Error('createWallMeshFromQuad requires exactly four ordered points.');
  }

  const cameraPosition = new THREE.Vector3();
  camera.getWorldPosition(cameraPosition);
  const cameraNormal = new THREE.Vector3();
  camera.getWorldDirection(cameraNormal).normalize();

  const planeDistance = camera.near + DEFAULT_PLANE_DISTANCE;
  const planeOffset = planeDistance;

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

  const positions = new Float32Array(worldVertices.flatMap((vertex) => vertex.toArray()));
  const uvs = new Float32Array(
    points.flatMap((point) => [point.x / imageWidth, 1 - point.y / imageHeight]),
  );

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
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
