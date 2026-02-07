import { useMemo } from 'react';
import { tileCatalog } from '../data/tileCatalog';
import { useVisualizer } from '../contexts/VisualizerContext';

function TilePicker() {
  const { selectedTileId, setSelectedTileId } = useVisualizer();
  const selectedTile = useMemo(
    () => tileCatalog.find((tile) => tile.id === selectedTileId) ?? null,
    [selectedTileId],
  );

  return (
    <div className="tile-picker">
      <div className="tile-picker__header">
        <h3>Select a tile</h3>
        <p>Preview options pulled from the catalog.</p>
        {selectedTile && (
          <div className="tile-picker__active">
            <span>Active:</span>
            <strong>{selectedTile.name}</strong>
            <button
              type="button"
              className="tile-picker__clear"
              onClick={() => setSelectedTileId(null)}
            >
              Show original wall
            </button>
          </div>
        )}
      </div>
      <div className="tile-picker__grid">
        {tileCatalog.map((tile) => {
          const isActive = tile.id === selectedTileId;
          return (
            <button
              key={tile.id}
              type="button"
              className={isActive ? 'tile-card tile-card--active' : 'tile-card'}
              onClick={() => setSelectedTileId(tile.id)}
              aria-pressed={isActive}
            >
              <div className="tile-card__preview">
                <img src={tile.textureUrl} alt={tile.name} loading="lazy" />
              </div>
              <div className="tile-card__meta">
                <span className="tile-card__name">{tile.name}</span>
                <span className="tile-card__size">
                  {tile.realWorldSizeCm.width}×{tile.realWorldSizeCm.height} cm
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TilePicker;
