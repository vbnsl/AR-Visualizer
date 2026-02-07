import { MutableRefObject, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type UseThreeRendererOptions = {
  fov?: number;
  near?: number;
  far?: number;
  cameraZ?: number;
  clearColor?: THREE.ColorRepresentation;
  preserveDrawingBuffer?: boolean;
  renderCallback?: (state: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    delta: number;
    elapsed: number;
  }) => void;
};

export type UseThreeRendererResult = {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  ready: boolean;
  mountRef: MutableRefObject<HTMLDivElement | null>;
};

export function useThreeRenderer(
  options: UseThreeRendererOptions = {},
): UseThreeRendererResult {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const renderCallbackRef = useRef<UseThreeRendererOptions['renderCallback']>(
    options.renderCallback,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    renderCallbackRef.current = options.renderCallback;
  }, [options.renderCallback]);

  const fov = options.fov ?? 50;
  const near = options.near ?? 0.1;
  const far = options.far ?? 1000;
  const cameraZ = options.cameraZ ?? 5;
  const clearColor = options.clearColor;
  const preserveDrawingBuffer = options.preserveDrawingBuffer ?? false;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    const aspect =
      container.clientWidth && container.clientHeight
        ? container.clientWidth / container.clientHeight
        : 1;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, cameraZ);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
    if (clearColor !== undefined) {
      renderer.setClearColor(clearColor, 1);
    }
    container.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    setReady(true);

    const clock = new THREE.Clock();
    let frameId = 0;

    const renderLoop = () => {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      if (renderCallbackRef.current) {
        renderCallbackRef.current({ scene, camera, renderer, delta, elapsed });
      }
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderLoop);
    };

    renderLoop();

    const handleResize = () => {
      if (!mountRef.current) {
        return;
      }
      const { clientWidth, clientHeight } = mountRef.current;
      const width = clientWidth || 1;
      const height = clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(handleResize)
        : null;

    if (resizeObserver) {
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      setReady(false);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      window.cancelAnimationFrame(frameId);
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();

      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((mat) => mat.dispose());
          } else if (material) {
            material.dispose();
          }
        }
      });
      scene.clear();

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, [fov, near, far, cameraZ, clearColor, preserveDrawingBuffer]);

  return {
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    ready,
    mountRef,
  };
}
