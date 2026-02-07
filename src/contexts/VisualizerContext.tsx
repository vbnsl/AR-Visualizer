import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

export type WallPoint = { x: number; y: number };

export type TileSize = {
  width: number;
  height: number;
};

export interface VisualizerContextValue {
  uploadedImage: HTMLImageElement | null;
  setUploadedImage: Dispatch<SetStateAction<HTMLImageElement | null>>;
  imageUrl: string | null;
  setImageUrl: Dispatch<SetStateAction<string | null>>;
  wallPoints: WallPoint[] | null;
  setWallPoints: Dispatch<SetStateAction<WallPoint[] | null>>;
  selectedTileId: string | null;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  tileSizeCm: TileSize;
  setTileSizeCm: Dispatch<SetStateAction<TileSize>>;
}

const VisualizerContext = createContext<VisualizerContextValue | undefined>(
  undefined,
);

export function VisualizerProvider({ children }: PropsWithChildren) {
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [wallPoints, setWallPoints] = useState<WallPoint[] | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [tileSizeCm, setTileSizeCm] = useState<TileSize>({ width: 30, height: 30 });

  const value = useMemo(
    () => ({
      uploadedImage,
      setUploadedImage,
      imageUrl,
      setImageUrl,
      wallPoints,
      setWallPoints,
      selectedTileId,
      setSelectedTileId,
      tileSizeCm,
      setTileSizeCm,
    }),
    [
      uploadedImage,
      imageUrl,
      wallPoints,
      selectedTileId,
      tileSizeCm,
    ],
  );

  return (
    <VisualizerContext.Provider value={value}>
      {children}
    </VisualizerContext.Provider>
  );
}

export function useVisualizer() {
  const context = useContext(VisualizerContext);
  if (context === undefined) {
    throw new Error('useVisualizer must be used within a VisualizerProvider');
  }
  return context;
}
