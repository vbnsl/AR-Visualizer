import { Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import { useVisualizer } from '../contexts/VisualizerContext';

function Home() {
  const { imageUrl } = useVisualizer();

  return (
    <section className="card home-hero">
      <div className="home-hero__copy">
        <p className="eyebrow">Start here</p>
        <h2>Upload a wall photo and explore tiles instantly</h2>
        <p>
          Bring your own wall image, define its corners, and browse the tile catalog to
          preview combinations. It’s the fastest path to validating finishes before you
          step into AR.
        </p>
        <ul>
          <li>Use high-resolution, straight-on photos for best results</li>
          <li>Trace the wall once, then swap tiles in the Try Tiles workspace</li>
          <li>Download renders or send links to teammates and clients</li>
        </ul>
      </div>
      <div className="home-hero__actions">
        <div className="home-hero__uploader">
          <h3>Upload wall photo</h3>
          <p>We’ll resize and fix EXIF orientation automatically.</p>
          <ImageUploader />
          <div className="home-hero__preview">
            {imageUrl ? (
              <img src={imageUrl} alt="Uploaded wall" />
            ) : (
              <p>No wall uploaded yet.</p>
            )}
          </div>
          <Link to="/try" className="cta">
            Go to Try Tiles
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Home;
