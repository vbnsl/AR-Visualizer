# AR Wall Tile Visualizer

A Vite + React + TypeScript starter focused on an AR wall tile planning experience.
It ships with React Router, a minimal layout, and placeholder UI ready for a future
Three.js canvas.

## Requirements

- Node.js 18+ recommended
- npm 9+

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to `http://localhost:5173`).

## Folder structure

```
AR-Visualizer/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── router.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   └── TryTiles.tsx
│   ├── index.css
│   └── vite-env.d.ts
└── README.md
```

## Key files

- `src/main.tsx`: Boots the app and wires the React Router provider.
- `src/router.tsx`: Declares the `/` (Home) and `/try` (Try Tiles) routes.
- `src/App.tsx`: Minimal layout with navigation and an `Outlet` for child routes.
- `src/pages/Home.tsx`: Marketing copy and CTA linking to the canvas.
- `src/pages/TryTiles.tsx`: Simple controls + placeholder preview surface for future Three.js work.

## Next steps

- Swap the placeholder preview in `TryTiles` with a `<canvas>` powered by Three.js.
- Add shared state (Zustand, Redux, etc.) as tile configuration grows.
- Layer on UI primitives or design system components when needed.

## Phase summaries

### Phase 1 – Vite/React foundation
- `package.json`, `tsconfig*.json`, `vite.config.ts`: baseline tooling, strict TS/ESM config, and Vite scripts for dev/build/preview.
- `src/main.tsx`, `src/router.tsx`, `src/App.tsx`: root render, route declarations (`/`, `/try`), and shell layout + navigation.
- `src/pages/Home.tsx`, `src/pages/TryTiles.tsx`, `src/index.css`: placeholder informational copy, future-canvas CTA, and cohesive styling.
- `README.md`: project overview, setup instructions, folder map, and this changelog so far.

### Phase 2 – Visualization primitives
- `src/contexts/VisualizerContext.tsx`: shared state for uploads, wall points, tile selection, and tile sizing with provider + hook.
- `src/data/tileCatalog.ts`: typed tile catalog definitions and sample entries for mocking controls/materials.
- `src/utils/imageProcessing.ts`: client-side upload helper (EXIF fix + resize) returning normalized `HTMLImageElement` + data URL.
- `src/components/WallSelector.tsx`: image overlay UI to click/drag four points, normalizes order, and writes to context; related styles live in `src/index.css`.
- Three.js utilities:
  - `src/hooks/useThreeRenderer.ts`: reusable renderer/camera/scene hook with resize + cleanup handling.
  - `src/utils/createPhotoBackground.ts`: camera-attached quad that renders the uploaded photo as the scene background.
  - `src/utils/createWallMeshFromQuad.ts`: maps wall quadrilateral pixels into a planar mesh aligned with the camera frustum.
  - `src/utils/applyTileMaterial.ts`: loads tile textures with proper repeat UV scaling based on wall/tile dimensions (cm → meters).
- Documentation updated to capture these phases; UI hooks (e.g., uploader, actual Three canvas mount) remain TODO for Phase 3.

### Phase 3 – Output + AR readiness (in progress)
- `src/utils/createTileLighting.ts`: drop-in ambient + directional lights for readable tile previews.
- `src/utils/downloadCanvasImage.ts`: capture the Three.js canvas (requires `preserveDrawingBuffer`) and trigger PNG downloads on desktop/mobile.
- `src/utils/isImmersiveArSupported.ts`: safe WebXR feature-detect for toggling AR UI affordances.
- `src/hooks/useThreeRenderer.ts`: now accepts `preserveDrawingBuffer` so screenshots work when needed.
- `src/types/global.d.ts`: minimal XR typings to keep TypeScript happy without full DOM WebXR lib.

### Phase 4 – Catalog UI + live preview
- `public/textures/tiles/*`: scaffold of local SVG textures so the catalog has immediate assets without manual uploads.
- `src/components/TilePicker.tsx` + `src/index.css`: responsive catalog grid that drives `VisualizerContext.selectedTileId`.
- `src/components/TilePreview.tsx`: hooks Three.js into the context (photo background, wall mesh, and tile materials) and surfaces state in the preview panel.
- `src/components/WallSelector.tsx` now mounted on the Try Tiles page so users can capture wall corners once uploads exist.
- `src/components/ImageUploader.tsx`: file picker using `processUploadedImage` so wall photos feed the context.
- `src/pages/TryTiles.tsx`, `src/main.tsx`: wires everything together by wrapping the router in `VisualizerProvider` and composing uploader + picker + preview inside the workspace card.
- `scripts/generateTileCatalog.mjs`, `tile-metadata.json`, `npm run generate:tiles`: build-time generator that syncs `/public/textures/tiles` into `src/data/tileCatalog.ts` with friendly metadata.
- `src/index.css` updates: scrollable tile grid and active-tile indicator so large catalogs remain usable.
- `src/utils/applyTileMaterial.ts`: two-sided MeshStandard material to keep tiles visible regardless of wall orientation.
- `src/pages/Home.tsx`, `src/index.css`: redesigned hero with built-in uploader + image preview before navigating to Try Tiles.
- `src/components/TilePreview.tsx`: falls back to using the full image as the wall plane so users see tiles immediately (wall detection can come later).
- `src/components/TilePreview.tsx`, `src/index.css`: zoom controls (buttons + pinch support) and a larger preview canvas so users can inspect details.
- `src/index.css`: expanded Try Tiles layout so the preview canvas dominates the screen while the catalog stays narrow.
