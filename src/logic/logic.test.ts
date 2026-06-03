import { describe, it, expect } from 'vitest';
import { snap, snapXZ } from './grid';
import { itemAABB, aabbOverlap, withinRoom, isValidPlacement, orientedFootprint } from './collision';
import { autoLayout, DOOR_W, DOOR_DEPTH } from './autoLayout';
import { mulberry32, shuffle } from './rng';
import { getDef, getDefaultVariant, getVariant, CATALOG } from '../data/catalog';
import type { PlacedItem, RoomDimensions, FurnitureType, Footprint } from '../types';

const fpOf = (variantId: string): Footprint =>
  getVariant(variantId)?.fallback ?? { w: 0.5, d: 0.5, h: 0.5 };

let mkCounter = 0;
const mk = (
  type: FurnitureType,
  position: [number, number],
  rotationY: 0 | 90 | 180 | 270 = 0,
): PlacedItem => {
  const v = getDefaultVariant(type);
  return { id: `${type}-${++mkCounter}`, type, variantId: v.id, position, rotationY, footprint: v.fallback };
};

describe('grid snapping', () => {
  it('snaps to the nearest 10cm', () => {
    expect(snap(0.04)).toBeCloseTo(0);
    expect(snap(0.06)).toBeCloseTo(0.1);
    expect(snap(1.23)).toBeCloseTo(1.2);
    expect(snapXZ([1.04, 2.07])).toEqual([expect.closeTo(1.0), expect.closeTo(2.1)]);
  });
});

describe('rotation-aware footprint', () => {
  it('swaps w/d for 90 and 270 only', () => {
    const fp: Footprint = { w: 2, d: 1, h: 1 };
    expect(orientedFootprint(fp, 0)).toEqual({ w: 2, d: 1 });
    expect(orientedFootprint(fp, 180)).toEqual({ w: 2, d: 1 });
    expect(orientedFootprint(fp, 90)).toEqual({ w: 1, d: 2 });
    expect(orientedFootprint(fp, 270)).toEqual({ w: 1, d: 2 });
  });
});

describe('collision', () => {
  it('detects overlapping AABBs and ignores flush ones', () => {
    const a = itemAABB(mk('wardrobe', [1, 1]));
    const overlapping = itemAABB(mk('wardrobe', [1.2, 1]));
    const farAway = itemAABB(mk('wardrobe', [5, 5]));
    expect(aabbOverlap(a, overlapping)).toBe(true);
    expect(aabbOverlap(a, farAway)).toBe(false);
  });

  it('withinRoom rejects items poking through a wall', () => {
    const room: RoomDimensions = { length: 5, width: 4, height: 2.6 };
    expect(withinRoom(mk('bed', [2.5, 2]), room)).toBe(true);
    expect(withinRoom(mk('bed', [0, 2]), room)).toBe(false);
  });

  it('rugs never block other furniture', () => {
    const room: RoomDimensions = { length: 5, width: 4, height: 2.6 };
    const rug = mk('rug', [2.5, 2]);
    const chairOnRug = mk('chair', [2.5, 2]);
    expect(isValidPlacement(chairOnRug, [rug], room)).toBe(true);
  });

  it('flags overlap between two collidable items', () => {
    const room: RoomDimensions = { length: 5, width: 4, height: 2.6 };
    const a = mk('dresser', [2.5, 2]);
    const b = mk('dresser', [2.6, 2]);
    expect(isValidPlacement(b, [a], room)).toBe(false);
  });
});

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA[0]).not.toEqual(seqA[1]);
  });
  it('shuffle preserves elements', () => {
    const out = shuffle(mulberry32(7), [1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('catalog variants', () => {
  it('default variant resolves and getVariant round-trips', () => {
    const v = getDefaultVariant('bed');
    expect(v.id).toBe(CATALOG.bed.variants[0].id);
    expect(getVariant(v.id)).toBe(v);
    expect(getVariant('nope:nope')).toBeUndefined();
  });
});

describe('auto-layout (randomized)', () => {
  const room: RoomDimensions = { length: 5, width: 4, height: 2.6 };

  it('places a collision-free, in-room layout including a bed', () => {
    const items = autoLayout(room, fpOf, mulberry32(42));
    expect(items.length).toBeGreaterThan(3);
    expect(items.some((i) => i.type === 'bed')).toBe(true);
    for (const it of items) expect(withinRoom(it, room, 0)).toBe(true);
    const solid = items.filter((i) => getDef(i.type).placement !== 'rug');
    for (let i = 0; i < solid.length; i++)
      for (let j = i + 1; j < solid.length; j++)
        expect(aabbOverlap(itemAABB(solid[i]), itemAABB(solid[j]))).toBe(false);
  });

  it('keeps the reserved door zone clear of solid furniture', () => {
    const items = autoLayout(room, fpOf, mulberry32(7));
    const doorZone = { minX: room.length - DOOR_W, maxX: room.length, minZ: 0, maxZ: DOOR_DEPTH };
    for (const it of items.filter((i) => getDef(i.type).placement !== 'rug'))
      expect(aabbOverlap(itemAABB(it), doorZone)).toBe(false);
  });

  it('puts the bed against one of the longest walls (z≈0 or z≈W when L≥W)', () => {
    const bed = autoLayout(room, fpOf, mulberry32(99)).find((i) => i.type === 'bed')!;
    const box = itemAABB(bed);
    expect(box.minZ < 0.25 || box.maxZ > room.width - 0.25).toBe(true);
  });

  it('produces different arrangements for different seeds', () => {
    const sig = (items: PlacedItem[]) =>
      items.map((i) => `${i.type}:${i.variantId}@${i.position[0]},${i.position[1]},${i.rotationY}`).join('|');
    const a = sig(autoLayout(room, fpOf, mulberry32(1)));
    const b = sig(autoLayout(room, fpOf, mulberry32(2)));
    expect(a).not.toEqual(b);
  });
});
