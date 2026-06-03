import { useEffect, useRef } from 'react';
import type { RoomLayout } from '../types';

// ---------------------------------------------------------------------------
// localStorage autosave/restore + JSON file export/import for layouts.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'bedroom-layout-v1';

/** Read the last saved layout (or null). Used once on app mount. */
export function loadSavedLayout(): RoomLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoomLayout;
    if (!parsed?.room || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Debounced autosave whenever the layout changes. */
export function useAutosave(layout: RoomLayout) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      } catch {
        /* storage full / unavailable — ignore for a prototype */
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [layout]);
}

/** Trigger a download of the layout as a JSON file. */
export function exportLayout(layout: RoomLayout) {
  const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bedroom-layout-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse an uploaded JSON file into a RoomLayout (throws on bad data). */
export function parseLayoutFile(text: string): RoomLayout {
  const parsed = JSON.parse(text) as RoomLayout;
  if (!parsed?.room || !Array.isArray(parsed.items)) {
    throw new Error('Invalid layout file');
  }
  return parsed;
}
