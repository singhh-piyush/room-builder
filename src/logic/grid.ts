// Snap-to-grid helpers. The layout grid is 10 cm (0.10 m) per the spec.

export const GRID = 0.1; // metres

/** Snap a single scalar to the nearest grid line. */
export const snap = (v: number): number => Math.round(v / GRID) * GRID;

/** Snap a floor position [x, z] to the grid. */
export const snapXZ = ([x, z]: [number, number]): [number, number] => [snap(x), snap(z)];

/** Clamp a value into [min, max]. */
export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));
