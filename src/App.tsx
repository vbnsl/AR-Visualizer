import { NavLink, Outlet } from 'react-router-dom';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AR Preview</p>
          <h1>AR Wall Tile Visualizer</h1>
          <p className="tagline">
            Plan wall tile layouts and prepare for upcoming 3D previews.
          </p>
        </div>
        <nav>
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <NavLink to="/try" className={navLinkClass}>
            Try Tiles
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <small>Three.js integration ready — hook into the Try Tiles route when ready.</small>
      </footer>
    </div>
  );
}

export default App;
