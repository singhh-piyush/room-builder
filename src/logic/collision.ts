import type { PlacedItem, RoomDimensions, Footprint, RotationY } from '../types';
import { getDef } from '../data/catalog';

// ---------------------------------------------------------------------------
// Collision & bounds checks, all in the floor (X–Z) plane using axis-aligned
// bounding boxes. Because rotation is restricted to 90° increments, a rotated
// item's footprint is still axis-aligned — we just swap width/depth for 90/270.
// ---------------------------------------------------------------------------

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Footprint as seen on the floor after applying a 90°-increment rotation. */
export function orientedFootprint(footprint: Footprint, rotationY: RotationY): {
  w: number;
  d: number;
} {
  const swapped = rotationY === 90 || rotationY === 270;
  return swapped ? { w: footprint.d, d: footprint.w } : { w: footprint.w, d: footprint.d };
}

/** Axis-aligned bounding box (floor plane) for an item, centred on its position. */
export function itemAABB(item: PlacedItem): AABB {
  const { w, d } = orientedFootprint(item.footprint, item.rotationY);
  const [x, z] = item.position;
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

/** Do two AABBs overlap? A small epsilon lets items sit flush without "touching". */
export function aabbOverlap(a: AABB, b: AABB, eps = 1e-3): boolean {
  return (
    a.minX < b.maxX - eps &&
    a.maxX > b.minX + eps &&
    a.minZ < b.maxZ - eps &&
    a.maxZ > b.minZ + eps
  );
}

/** Is the item fully inside the room (minus an optional wall margin)? */
export function withinRoom(item: PlacedItem, room: RoomDimensions, margin = 0): boolean {
  const box = itemAABB(item);
  return (
    box.minX >= margin &&
    box.minZ >= margin &&
    box.maxX <= room.length - margin &&
    box.maxZ <= room.width - margin
  );
}

/** Rugs lie flat on the floor and never block other furniture. */
export const blocksOthers = (item: PlacedItem): boolean => getDef(item.type).placement !== 'rug';

/**
 * Is `candidate` a valid placement? Valid means: inside the room AND not
 * overlapping any other collidable item. Rugs are skipped on both sides.
 */
export function isValidPlacement(
  candidate: PlacedItem,
  others: PlacedItem[],
  room: RoomDimensions,
  margin = 0,
): boolean {
  if (!withinRoom(candidate, room, margin)) return false;
  if (!blocksOthers(candidate)) return true; // a rug only needs to be in-room
  const cBox = itemAABB(candidate);
  for (const other of others) {
    if (other.id === candidate.id) continue;
    if (!blocksOthers(other)) continue;
    if (aabbOverlap(cBox, itemAABB(other))) return false;
  }
  return true;
}
