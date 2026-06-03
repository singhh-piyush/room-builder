// Core data model for the bedroom layout generator.
// Coordinate convention: the floor is the X–Z plane (metres). +Y is up.
// The room occupies [0, length] on X and [0, width] on Z; its origin (0,0) is a
// floor corner so all positions are positive — simplifies bounds math.

export type FurnitureType =
  | 'bed'
  | 'nightstand'
  | 'wardrobe'
  | 'dresser'
  | 'shelf'
  | 'desk'
  | 'coffeeTable'
  | 'diningTable'
  | 'sofa'
  | 'armchair'
  | 'chair'
  | 'stool'
  | 'floorLamp'
  | 'tableLamp'
  | 'rug'
  | 'plant'
  | 'books'
  | 'pictureFrame'
  | 'pillow';

/** How an item participates in layout + collision. */
export type Placement = 'floor' | 'wall' | 'rug';

/** Rotation about the vertical (Y) axis, restricted to 90° increments. */
export type RotationY = 0 | 90 | 180 | 270;

/** Measured (or fallback) bounding-box size in metres. */
export interface Footprint {
  w: number; // size along local X
  d: number; // size along local Z (depth)
  h: number; // size along Y (height)
}

/** A furniture instance placed in the room. */
export interface PlacedItem {
  id: string;
  type: FurnitureType;
  /** Which catalog model variant this item uses (composite `type:model` id). */
  variantId: string;
  /** Centre position on the floor plane, in metres: [x, z]. */
  position: [number, number];
  rotationY: RotationY;
  /** Measured footprint from the loaded model (filled in once loaded). */
  footprint: Footprint;
}

export interface RoomDimensions {
  length: number; // X, metres
  width: number; // Z, metres
  height: number; // Y, metres
}

/** The full, serializable layout. This is exactly what export/JSON contains. */
export interface RoomLayout {
  room: RoomDimensions;
  items: PlacedItem[];
}
