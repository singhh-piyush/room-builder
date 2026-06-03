import { useEffect, useState, Suspense } from 'react';
import { LayoutProvider, useLayout } from './context/LayoutContext';
import { SceneCanvas, type ViewMode } from './scene/SceneCanvas';
import { Toolbar } from './ui/Toolbar';
import { Sidebar } from './ui/Sidebar';
import { DimensionForm } from './ui/DimensionForm';
import { loadSavedLayout, useAutosave } from './hooks/usePersistence';
import { autoLayout } from './logic/autoLayout';
import './styles.css';

// Inner app — lives inside the providers so it can use the stores.
function Workspace() {
  const { layout, loadLayout, selectedId, rotateItem, room, getFootprint, replaceAll } = useLayout();
  const [view, setView] = useState<ViewMode>('3d');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Restore the autosaved layout once on mount. `?demo` seeds a fresh layout.
  useEffect(() => {
    if (new URLSearchParams(location.search).has('demo')) {
      replaceAll(autoLayout(room, getFootprint));
      return;
    }
    const saved = loadSavedLayout();
    if (saved) loadLayout(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutosave(layout);

  return (
    <div className="app">
      <Toolbar view={view} setView={setView} onMenuToggle={() => setDrawerOpen((o) => !o)} />
      <div className="body">
        <aside className={`left ${drawerOpen ? 'open' : ''}`}>
          <DimensionForm />
          <Sidebar onAction={() => setDrawerOpen(false)} />
        </aside>
        {drawerOpen && <div className="backdrop" onClick={() => setDrawerOpen(false)} />}
        <main className="canvas-wrap">
          <Suspense fallback={<div className="loading">Loading furniture…</div>}>
            <SceneCanvas view={view} />
          </Suspense>
          <div className="hint">
            <span className="hint-text">
              Drag to move · Click to select · <kbd>R</kbd> rotate · <kbd>Del</kbd> remove
            </span>
            {selectedId && (
              <button className="rotate-fab" onClick={() => rotateItem(selectedId, 1)}>
                ⟳ Rotate 90°
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LayoutProvider>
      <Workspace />
    </LayoutProvider>
  );
}
