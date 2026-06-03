import { useRef } from 'react';
import { useLayout } from '../context/LayoutContext';
import { autoLayout } from '../logic/autoLayout';
import { exportLayout, parseLayoutFile } from '../hooks/usePersistence';
import type { ViewMode } from '../scene/SceneCanvas';

// ---------------------------------------------------------------------------
// Top toolbar: hamburger (mobile), wordmark, Auto-Layout, 2D/3D toggle,
// accent picker, Export/Import JSON, Clear.
// ---------------------------------------------------------------------------

interface Props {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  onMenuToggle: () => void;
}

export function Toolbar({ view, setView, onMenuToggle }: Props) {
  const { room, layout, getFootprint, replaceAll, reset, loadLayout } = useLayout();
  const fileInput = useRef<HTMLInputElement>(null);

  // Fresh random seed each click → a different layout every time.
  const onAutoLayout = () => replaceAll(autoLayout(room, getFootprint));

  const onImport = async (file: File) => {
    try {
      loadLayout(parseLayoutFile(await file.text()));
    } catch {
      alert('Could not read that layout file.');
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="icon-btn menu-btn" onClick={onMenuToggle} aria-label="Toggle panel">☰</button>
        <div className="brand">
          <span className="brand-name">Room Builder</span>
        </div>
      </div>

      <div className="toolbar-actions">
        <button className="btn primary" onClick={onAutoLayout}>
          <span className="btn-ico">✦</span><span className="btn-label">Auto-Layout</span>
        </button>

        <div className="seg">
          <button className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>3D</button>
          <button className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}>2D</button>
        </div>

        <button className="btn" onClick={() => exportLayout(layout)}>
          <span className="btn-ico">↓</span><span className="btn-label">Export</span>
        </button>
        <button className="btn" onClick={() => fileInput.current?.click()}>
          <span className="btn-ico">↑</span><span className="btn-label">Import</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = '';
          }}
        />
        <button className="btn danger" onClick={reset}>
          <span className="btn-ico">⟲</span><span className="btn-label">Clear</span>
        </button>
      </div>
    </div>
  );
}
