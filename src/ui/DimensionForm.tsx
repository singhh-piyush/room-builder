import { useState, useEffect } from 'react';
import { useLayout } from '../context/LayoutContext';
import type { RoomDimensions } from '../types';

// Room dimension inputs (L × W × H in metres). Commits on change, clamped to a
// sane range so the scene/camera stay usable.
const clampDim = (v: number, minVal = 1.5) => Math.min(20, Math.max(minVal, v || 0));

export function DimensionForm() {
  const { room, setRoom } = useLayout();
  const [draft, setDraft] = useState<RoomDimensions>(room);

  useEffect(() => setDraft(room), [room]);

  const commit = (key: keyof RoomDimensions, value: string) => {
    const minVal = key === 'height' ? 0 : 1.5;
    const next = { ...draft, [key]: clampDim(parseFloat(value), minVal) };
    setDraft(next);
    setRoom(next);
  };

  const fields: { key: keyof RoomDimensions; label: string; min: number }[] = [
    { key: 'length', label: 'Length (X)', min: 1.5 },
    { key: 'width', label: 'Width (Z)', min: 1.5 },
    { key: 'height', label: 'Height (Y)', min: 0 },
  ];

  return (
    <div className="panel">
      <h3 className="panel-title">Room dimensions (m)</h3>
      <div className="dim-grid">
        {fields.map((f) => (
          <label key={f.key} className="dim-field">
            <span>{f.label}</span>
            <input
              type="number"
              min={f.min}
              max={20}
              step={0.1}
              value={draft[f.key]}
              onChange={(e) => setDraft({ ...draft, [f.key]: parseFloat(e.target.value) })}
              onBlur={(e) => commit(f.key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
