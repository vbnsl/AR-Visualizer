import {
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useVisualizer, WallPoint } from '../contexts/VisualizerContext';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const defaultDimensions = { width: 0, height: 0 };

function WallSelector() {
  const { uploadedImage, imageUrl, wallPoints, setWallPoints } = useVisualizer();
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState(defaultDimensions);

  const imageSrc = imageUrl ?? uploadedImage?.src ?? null;

  useEffect(() => {
    if (!uploadedImage) {
      return;
    }
    const width = uploadedImage.naturalWidth || uploadedImage.width;
    const height = uploadedImage.naturalHeight || uploadedImage.height;
    if (width && height) {
      setImageDimensions({ width, height });
    }
  }, [uploadedImage]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) {
      return;
    }
    const handleLoad = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    if (img.complete) {
      handleLoad();
      return;
    }
    img.addEventListener('load', handleLoad);
    return () => img.removeEventListener('load', handleLoad);
  }, [imageSrc]);

  const normalizedHandles = useMemo(() => {
    if (!wallPoints || imageDimensions.width === 0 || imageDimensions.height === 0) {
      return [];
    }
    return wallPoints.map((point) => ({
      left: (point.x / imageDimensions.width) * 100,
      top: (point.y / imageDimensions.height) * 100,
    }));
  }, [wallPoints, imageDimensions]);

  const polygonPath = useMemo(() => {
    if (!wallPoints || wallPoints.length < 2) {
      return '';
    }
    const commands = wallPoints.map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
    );
    if (wallPoints.length === 4) {
      commands.push('Z');
    }
    return commands.join(' ');
  }, [wallPoints]);

  const handleStageClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!imageSrc || !stageRef.current) {
      return;
    }
    if (wallPoints && wallPoints.length >= 4) {
      return;
    }
    if (!imageDimensions.width || !imageDimensions.height) {
      return;
    }
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    const newPoint = clientToImagePoint(
      event.clientX,
      event.clientY,
      rect,
      imageDimensions,
    );
    setWallPoints((prev) => {
      const next = prev ? [...prev] : [];
      if (next.length >= 4) {
        return next;
      }
      next.push(newPoint);
      return next.length === 4 ? normalizeWallPoints(next) : next;
    });
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!stageRef.current || !imageDimensions.width || !imageDimensions.height) {
      return;
    }
    const target = event.currentTarget;
    const rect = stageRef.current.getBoundingClientRect();
    const pointerId = event.pointerId;
    target.setPointerCapture?.(pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      const nextPoint = clientToImagePoint(
        moveEvent.clientX,
        moveEvent.clientY,
        rect,
        imageDimensions,
      );
      setWallPoints((prev) => {
        if (!prev) {
          return prev;
        }
        const next = [...prev];
        next[index] = nextPoint;
        return next.length === 4 ? normalizeWallPoints(next) : next;
      });
    };

    const cleanup = () => {
      target.releasePointerCapture?.(pointerId);
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('pointercancel', handleCancel);
    };

    const handleUp = () => {
      cleanup();
    };

    const handleCancel = () => {
      cleanup();
    };

    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('pointercancel', handleCancel);
  };

  if (!imageSrc) {
    return (
      <div className="wall-selector">
        <p className="wall-selector__placeholder">Upload an image to mark the wall.</p>
      </div>
    );
  }

  return (
    <div className="wall-selector">
      <div className="wall-selector__stage" ref={stageRef} onClick={handleStageClick}>
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Uploaded wall"
          className="wall-selector__image"
        />
        {imageDimensions.width > 0 && imageDimensions.height > 0 && (
          <svg
            className="wall-selector__overlay"
            viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
            preserveAspectRatio="none"
          >
            {polygonPath && (
              <path d={polygonPath} className="wall-selector__polygon" />
            )}
          </svg>
        )}
        {normalizedHandles.map((handle, index) => (
          <button
            key={index}
            type="button"
            className="wall-selector__handle"
            style={{ left: `${handle.left}%`, top: `${handle.top}%` }}
            onPointerDown={(event) => handlePointerDown(event, index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <p className="wall-selector__hint">
        Click four corners in order (top-left → top-right → bottom-right → bottom-left). Drag
        handles to refine positions.
      </p>
    </div>
  );
}

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
  if (points.length < 4) {
    return points;
  }
  const trimmed = points.slice(0, 4);
  const sortedByY = [...trimmed].sort((a, b) => a.y - b.y);
  const top = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sortedByY.slice(2).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]];
}

export default WallSelector;
