export type TileDimensionsCm = {
  width: number;
  height: number;
};

export type TileDefinition = {
  id: string;
  name: string;
  textureUrl: string;
  realWorldSizeCm: TileDimensionsCm;
  groutColor?: string;
  groutWidthMm?: number;
  roughness?: number;
};

export const tileCatalog: TileDefinition[] = [
  {
    id: '5154',
    name: '5154',
    textureUrl: '/textures/tiles/5154.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: '5154A',
    name: '5154A',
    textureUrl: '/textures/tiles/5154A.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: '6021-Dark',
    name: '6021 Dark',
    textureUrl: '/textures/tiles/6021-Dark.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: '6021-Light',
    name: '6021 Light',
    textureUrl: '/textures/tiles/6021-Light.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: '6025-Highlighter',
    name: '6025 Highlighter',
    textureUrl: '/textures/tiles/6025-Highlighter.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: '6025-Light',
    name: '6025 Light',
    textureUrl: '/textures/tiles/6025-Light.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: '8173',
    name: '8173',
    textureUrl: '/textures/tiles/8173.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: '8174',
    name: '8174',
    textureUrl: '/textures/tiles/8174.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: 'Mosaic Brown Dark',
    name: 'Mosaic Brown Dark',
    textureUrl: '/textures/tiles/Mosaic Brown Dark.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: 'Pix Stone',
    name: 'Pix Stone',
    textureUrl: '/textures/tiles/Pix Stone.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: 'Squareform Grey B',
    name: 'Squareform Grey B',
    textureUrl: '/textures/tiles/Squareform Grey B.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: 'Sumdge Teracota Decor',
    name: 'Sumdge Teracota Decor',
    textureUrl: '/textures/tiles/Sumdge Teracota Decor.png',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: 'charcoal-slate-plank',
    name: 'Charcoal Slate Plank',
    textureUrl: '/textures/tiles/charcoal-slate.svg',
    realWorldSizeCm: { width: 60, height: 15 },
    groutColor: '#1f2933',
    groutWidthMm: 2,
    roughness: 0.65,
  },
  {
    id: 'matte-marble-square',
    name: 'Matte Marble Square',
    textureUrl: '/textures/tiles/matte-marble.svg',
    realWorldSizeCm: { width: 30, height: 30 },
    groutColor: '#f5f5f5',
    groutWidthMm: 3,
    roughness: 0.2,
  },
  {
    id: 'pearl-hex-mosaic',
    name: 'Pearl Hex Mosaic',
    textureUrl: '/textures/tiles/pearl-hex.svg',
    realWorldSizeCm: { width: 7, height: 7 },
    groutColor: '#ffffff',
    groutWidthMm: 2,
    roughness: 0.3,
  },
  {
    id: 'sandstone-chevron',
    name: 'Sandstone Chevron',
    textureUrl: '/textures/tiles/sandstone-chevron.svg',
    realWorldSizeCm: { width: 20, height: 10 },
    groutColor: '#a86c35',
    groutWidthMm: 3,
    roughness: 0.55,
  },
  {
    id: 'terra-herringbone',
    name: 'Terracotta Herringbone',
    textureUrl: '/textures/tiles/terra-herringbone.svg',
    realWorldSizeCm: { width: 10, height: 30 },
    groutColor: '#c47234',
    groutWidthMm: 4,
    roughness: 0.4,
  },
  {
    id: 'tile1',
    name: 'Tile1',
    textureUrl: '/textures/tiles/tile1.jpg',
    realWorldSizeCm: { width: 30, height: 30 },
  },
  {
    id: 'tile2',
    name: 'Tile2',
    textureUrl: '/textures/tiles/tile2.avif',
    realWorldSizeCm: { width: 30, height: 30 },
  }
];
