import TilePicker from '../components/TilePicker';
import TilePreview from '../components/TilePreview';

function TryTiles() {
  return (
    <section className="card try-layout">
      <div className="try-pane try-pane--left">
        <h2>Tile catalog</h2>
        <p className="try-pane__lead">
          Select a tile swatch to apply it to your wall. Upload new photos from the Home
          page whenever you want to start fresh.
        </p>
        <TilePicker />
      </div>
      <div className="try-pane try-pane--right">
        <div className="preview-panel preview-panel--large">
          <p className="panel-label">Preview</p>
          <TilePreview />
        </div>
      </div>
    </section>
  );
}

export default TryTiles;
