import { useMemo, useState } from 'react';
import { useLayout } from '../context/LayoutContext';
import {
  PALETTE_ORDER,
  CATEGORY_ORDER,
  getDef,
  getDefaultVariant,
  type Category,
} from '../data/catalog';
import { snapXZ } from '../logic/grid';
import { isValidPlacement } from '../logic/collision';
import type { FurnitureType, PlacedItem } from '../types';
import { newId } from '../logic/id';

// ---------------------------------------------------------------------------
// Left sidebar: searchable, category-grouped palette + the placed-items list.
// Clicking a palette entry drops it at the first free spot near the room centre
// and selects it for immediate dragging.
// ---------------------------------------------------------------------------

interface Props {
  /** Called after adding/selecting — used to auto-close the mobile drawer. */
  onAction?: () => void;
}

export function Sidebar({ onAction }: Props) {
  const { items, room, addItem, getFootprint, select, selectedId, removeItem, rotateItem } =
    useLayout();
  const [query, setQuery] = useState('');

  // Find a free position for a newly added item, scanning outward from centre.
  const findSpot = (type: FurnitureType): [number, number] => {
    const fp = getFootprint(getDefaultVariant(type).id);
    const cx = room.length / 2;
    const cz = room.width / 2;
    const step = 0.4;
    for (let r = 0; r < Math.max(room.length, room.width); r += step) {
      for (const [dx, dz] of [
        [0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r],
      ]) {
        const pos = snapXZ([cx + dx, cz + dz]);
        const candidate: PlacedItem = {
          id: newId(type),
          type,
          variantId: getDefaultVariant(type).id,
          position: pos,
          rotationY: 0,
          footprint: fp,
        };
        if (isValidPlacement(candidate, items, room, 0)) return pos;
      }
    }
    return snapXZ([cx, cz]);
  };

  const add = (type: FurnitureType) => {
    addItem(type, findSpot(type));
    onAction?.();
  };

  // Filter + group palette by category.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (type: FurnitureType) => {
      const def = getDef(type);
      return !q || def.label.toLowerCase().includes(q) || def.category.toLowerCase().includes(q);
    };
    const visible = PALETTE_ORDER.filter(match);
    const byCat = new Map<Category, FurnitureType[]>();
    for (const type of visible) {
      const cat = getDef(type).category;
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(type);
    }
    return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({ cat: c, types: byCat.get(c)! }));
  }, [query]);

  return (
    <div className="sidebar">
      <div className="panel palette-panel">
        <h3 className="panel-title">Add furniture</h3>
        <input
          className="search"
          type="search"
          placeholder="Search items…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="palette-scroll">
          {grouped.length === 0 && <div className="empty">No items match “{query}”.</div>}
          {grouped.map(({ cat, types }) => (
            <div className="palette-group" key={cat}>
              <div className="palette-cat">{cat}</div>
              <div className="palette">
                {types.map((type) => (
                  <button
                    key={type}
                    className="palette-item"
                    onClick={() => add(type)}
                    title={`Add ${getDef(type).label}`}
                  >
                    {getDef(type).label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel grow">
        <h3 className="panel-title">Placed items ({items.length})</h3>
        <ul className="item-list">
          {items.length === 0 && <li className="empty">Nothing placed yet.</li>}
          {items.map((it) => (
            <li
              key={it.id}
              className={`item-row ${selectedId === it.id ? 'selected' : ''}`}
              onClick={() => {
                select(it.id);
                onAction?.();
              }}
            >
              <span className="item-name">{getDef(it.type).label}</span>
              <span className="item-actions">
                <button title="Rotate 90°" onClick={(e) => { e.stopPropagation(); rotateItem(it.id, 1); }}>⟳</button>
                <button title="Delete" onClick={(e) => { e.stopPropagation(); removeItem(it.id); }}>✕</button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
