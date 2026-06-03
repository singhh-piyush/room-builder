import type {
  PlacedItem,
  RoomDimensions,
  Footprint,
  FurnitureType,
  RotationY,
} from '../types';
import { getDef, pickVariant, type FurnitureVariant } from '../data/catalog';
import { newId } from './id';
import { snapXZ } from './grid';
import { itemAABB, aabbOverlap, orientedFootprint, type AABB } from './collision';
import { mulberry32, pick, chance, shuffle, type Rng } from './rng';

// ---------------------------------------------------------------------------
// Rule-based "AI" auto-layout — now RANDOMIZED so every run differs.
//
// A greedy placer proposes candidate poses per item (best-first, shuffled where
// it shouldn't matter) and commits the first that fits: inside the room, clear
// of the reserved door zone, no overlap with placed furniture. Items that don't
// fit are skipped, so results stay collision-free. Each item also gets a random
// model VARIANT, and the bed picks a random "long wall", nightstand count,
// storage/desk/seating placement, rug style/rotation, and plant corners.
// ---------------------------------------------------------------------------

const WALL_MARGIN = 0.05;
const GAP = 0.15; // > one grid cell, so snapping can't create micro-overlaps
const BED_FRONT_CLEARANCE = 0.7;
const DOOR_W = 0.9;
const DOOR_DEPTH = 0.8;

type GetFootprint = (variantId: string) => Footprint;
type Wall = 'N' | 'S' | 'E' | 'W';

interface Pose {
  position: [number, number];
  rotationY: RotationY;
}

const WALL_ROT: Record<Wall, RotationY> = { N: 0, S: 180, W: 90, E: 270 };

function makeItem(
  type: FurnitureType,
  variantId: string,
  position: [number, number],
  rotationY: RotationY,
  fp: Footprint,
): PlacedItem {
  return { id: newId(type), type, variantId, position: snapXZ(position), rotationY, footprint: fp };
}

export function autoLayout(
  room: RoomDimensions,
  getFootprint: GetFootprint,
  rng: Rng = mulberry32(Date.now()),
): PlacedItem[] {
  const L = room.length;
  const W = room.width;
  const longestAlongX = L >= W;
  const area = L * W;

  const placed: PlacedItem[] = [];
  const blockers: AABB[] = [];

  // Fixed door/walkway zone (kept in sync with RoomShell's door marker).
  const doorZone: AABB = longestAlongX
    ? { minX: L - DOOR_W, maxX: L, minZ: 0, maxZ: DOOR_DEPTH }
    : { minX: 0, maxX: DOOR_DEPTH, minZ: W - DOOR_W, maxZ: W };
  blockers.push(doorZone);

  const fits = (item: PlacedItem): boolean => {
    const box = itemAABB(item);
    const tol = 1e-3;
    if (box.minX < -tol || box.minZ < -tol || box.maxX > L + tol || box.maxZ > W + tol) return false;
    const isRug = getDef(item.type).placement === 'rug';
    for (const b of blockers) if (aabbOverlap(box, b)) return false;
    if (isRug) return true;
    for (const other of placed) {
      if (getDef(other.type).placement === 'rug') continue;
      if (aabbOverlap(box, itemAABB(other))) return false;
    }
    return true;
  };

  /** Compute a flush-against-wall pose for a footprint at `frac` along the wall. */
  const wallPose = (wall: Wall, fp: Footprint, frac: number): Pose => {
    const rot = WALL_ROT[wall];
    const o = orientedFootprint(fp, rot);
    if (wall === 'N' || wall === 'S') {
      const x = clamp(frac * L, o.w / 2 + WALL_MARGIN, L - o.w / 2 - WALL_MARGIN);
      const z = wall === 'N' ? WALL_MARGIN + o.d / 2 : W - WALL_MARGIN - o.d / 2;
      return { position: [x, z], rotationY: rot };
    }
    const z = clamp(frac * W, o.d / 2 + WALL_MARGIN, W - o.d / 2 - WALL_MARGIN);
    const x = wall === 'W' ? WALL_MARGIN + o.w / 2 : L - WALL_MARGIN - o.w / 2;
    return { position: [x, z], rotationY: rot };
  };

  /** Try poses in order; commit + register the first that fits. */
  const place = (type: FurnitureType, variant: FurnitureVariant, poses: Pose[]): PlacedItem | null => {
    const fp = getFootprint(variant.id);
    for (const p of poses) {
      const item = makeItem(type, variant.id, p.position, p.rotationY, fp);
      if (fits(item)) {
        placed.push(item);
        if (getDef(type).placement !== 'rug') blockers.push(itemAABB(item));
        return item;
      }
    }
    return null;
  };

  /** Place a type against random walls/fractions (best-effort). */
  const placeOnWalls = (type: FurnitureType, walls: Wall[], fracs: number[]): PlacedItem | null => {
    const variant = pickVariant(type, rng);
    const fp = getFootprint(variant.id);
    const poses: Pose[] = [];
    for (const wall of walls) for (const f of fracs) poses.push(wallPose(wall, fp, f));
    return place(type, variant, poses);
  };

  const longWalls: Wall[] = longestAlongX ? ['N', 'S'] : ['E', 'W'];
  const shortWalls: Wall[] = longestAlongX ? ['E', 'W'] : ['N', 'S'];

  // --- 1. Bed against a random long wall ------------------------------------
  const bedWall = pick(rng, longWalls);
  const bedVariant = pickVariant('bed', rng);
  const bedFp = getFootprint(bedVariant.id);
  const bedFrac = 0.5 + (rng() - 0.5) * 0.2; // mostly centered
  const bed = place('bed', bedVariant, [wallPose(bedWall, bedFp, bedFrac)]);

  // --- 2. Nightstands flanking the bed --------------------------------------
  if (bed) {
    const sides = chance(rng, 0.7) ? 2 : 1;
    const bedRot = WALL_ROT[bedWall];
    const bedO = orientedFootprint(bed.footprint, bedRot);
    const nsVariant = pickVariant('nightstand', rng);
    const nsFp = getFootprint(nsVariant.id);
    const along = bedWall === 'N' || bedWall === 'S' ? 'x' : 'z';
    const offsets = shuffle(rng, [-1, 1]).slice(0, sides);
    for (const sgn of offsets) {
      if (along === 'x') {
        const nsO = orientedFootprint(nsFp, 0);
        const x = bed.position[0] + sgn * (bedO.w / 2 + nsO.w / 2 + GAP);
        const z = bedWall === 'N' ? WALL_MARGIN + nsO.d / 2 : W - WALL_MARGIN - nsO.d / 2;
        place('nightstand', nsVariant, [{ position: [x, z], rotationY: 0 }]);
      } else {
        const nsO = orientedFootprint(nsFp, 90);
        const z = bed.position[1] + sgn * (bedO.d / 2 + nsO.d / 2 + GAP);
        const x = bedWall === 'W' ? WALL_MARGIN + nsO.w / 2 : L - WALL_MARGIN - nsO.w / 2;
        place('nightstand', nsVariant, [{ position: [x, z], rotationY: WALL_ROT[bedWall] }]);
      }
    }
  }

  // --- 3. Storage on remaining walls (wardrobe + dresser, sometimes shelf) ---
  const storageWalls = shuffle(rng, [...shortWalls, ...longWalls.filter((w) => w !== bedWall)]);
  const fracs = shuffle(rng, [0.2, 0.5, 0.8, 0.35, 0.65]);
  placeOnWalls('wardrobe', storageWalls, fracs);
  placeOnWalls('dresser', shuffle(rng, storageWalls), shuffle(rng, fracs));
  if (chance(rng, 0.5)) placeOnWalls('shelf', shuffle(rng, storageWalls), shuffle(rng, fracs));

  // --- 4. Desk + chair (≈60%) -----------------------------------------------
  if (chance(rng, 0.6)) {
    const deskVariant = pickVariant('desk', rng);
    const deskFp = getFootprint(deskVariant.id);
    const deskWall = pick(rng, shuffle(rng, [...shortWalls, ...longWalls.filter((w) => w !== bedWall)]));
    const desk = place('desk', deskVariant, shuffle(rng, [0.25, 0.5, 0.75]).map((f) => wallPose(deskWall, deskFp, f)));
    if (desk) {
      const chairVariant = pickVariant('chair', rng);
      const cFp = getFootprint(chairVariant.id);
      const dO = orientedFootprint(desk.footprint, desk.rotationY);
      const cO = orientedFootprint(cFp, 0);
      // Chair just in front of the desk (toward room interior).
      const dir = desk.rotationY === 0 ? 1 : desk.rotationY === 180 ? -1 : 0;
      const dirX = desk.rotationY === 90 ? 1 : desk.rotationY === 270 ? -1 : 0;
      place('chair', chairVariant, [
        {
          position: [desk.position[0] + dirX * (dO.w / 2 + cO.w / 2 + GAP), desk.position[1] + dir * (dO.d / 2 + cO.d / 2 + GAP)],
          rotationY: ((desk.rotationY + 180) % 360) as RotationY,
        },
      ]);
    }
  }

  // --- 5. Sofa / armchair in bigger rooms -----------------------------------
  if (area >= 18 && chance(rng, 0.6)) {
    placeOnWalls('sofa', shuffle(rng, [...longWalls.filter((w) => w !== bedWall), ...shortWalls]), shuffle(rng, fracs));
  }
  if (area >= 14 && chance(rng, 0.5)) {
    // Armchair angled in a corner-ish position.
    const v = pickVariant('armchair', rng);
    const fp = getFootprint(v.id);
    const o = orientedFootprint(fp, 0);
    const corners: Pose[] = shuffle(rng, [
      { position: [L - WALL_MARGIN - o.w / 2 - 0.3, W - WALL_MARGIN - o.d / 2 - 0.3] as [number, number], rotationY: 180 as RotationY },
      { position: [WALL_MARGIN + o.w / 2 + 0.3, W - WALL_MARGIN - o.d / 2 - 0.3] as [number, number], rotationY: 180 as RotationY },
    ]);
    place('armchair', v, corners);
  }

  // --- 6. Rug centred in the open floor (random style + orientation) --------
  {
    const v = pickVariant('rug', rng);
    const cx = L / 2 + (rng() - 0.5) * 0.6;
    const cz = bed ? lerp(bed.position[1], W / 2, 0.7) : W / 2;
    const rot: RotationY = chance(rng, 0.3) ? 90 : 0;
    place('rug', v, [
      { position: [cx, clamp(cz, 0, W)], rotationY: rot },
      { position: [L / 2, W / 2], rotationY: 0 },
    ]);
  }

  // --- 7. Plants (1–2) + maybe a floor lamp in free corners -----------------
  const cornerPoses = (fp: Footprint): Pose[] => {
    const o = orientedFootprint(fp, 0);
    const inset = 0.12;
    return shuffle(rng, [
      [L - WALL_MARGIN - o.w / 2 - inset, WALL_MARGIN + o.d / 2 + inset],
      [WALL_MARGIN + o.w / 2 + inset, W - WALL_MARGIN - o.d / 2 - inset],
      [WALL_MARGIN + o.w / 2 + inset, WALL_MARGIN + o.d / 2 + inset],
      [L - WALL_MARGIN - o.w / 2 - inset, W - WALL_MARGIN - o.d / 2 - inset],
    ] as [number, number][]).map((position) => ({ position, rotationY: 0 as RotationY }));
  };
  const nPlants = chance(rng, 0.5) ? 2 : 1;
  for (let i = 0; i < nPlants; i++) {
    const v = pickVariant('plant', rng);
    place('plant', v, cornerPoses(getFootprint(v.id)));
  }
  if (chance(rng, 0.5)) {
    const v = pickVariant('floorLamp', rng);
    place('floorLamp', v, cornerPoses(getFootprint(v.id)));
  }

  return placed;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export { BED_FRONT_CLEARANCE, DOOR_W, DOOR_DEPTH };
