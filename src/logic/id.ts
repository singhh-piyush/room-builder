import type { FurnitureType } from '../types';

// Unique id generator for placed items. Kept in the logic layer (no React
// dependency) so auto-layout and the store can both use it.
let idCounter = 0;
export function newId(type: FurnitureType): string {
  idCounter += 1;
  return `${type}-${Date.now().toString(36)}-${idCounter}`;
}
