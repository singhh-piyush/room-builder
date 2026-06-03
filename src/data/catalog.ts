import type { FurnitureType, Placement, Footprint } from '../types';

// ---------------------------------------------------------------------------
// FURNITURE CATALOG — single source of truth for asset paths, placement rules,
// categories, and per-type model VARIANTS.
// ---------------------------------------------------------------------------
//
// Assets come from KayKit's "Furniture Bits" low-poly pack (./Assets/gltf,
// copied to public/assets/furniture-bits/ by scripts/copy-assets.mjs).
//
// Scale normalization: the pack is authored at inconsistent units (a "double
// bed" mesh is ~3.1m wide). Each VARIANT declares a believable `targetWidth`;
// FurnitureModel measures the native Box3, applies a uniform scale =
// targetWidth/nativeWidth, and re-measures the true footprint. The `fallback`
// here is the pre-computed post-scale footprint, used until the model loads.
//
// Variant ids are composite (`type:model`) because the same model file is reused
// across types at different scales (e.g. table_medium as a desk vs a dining
// table) — composite ids keep the footprint cache keys unique.

export const ASSET_BASE = '/assets/furniture-bits';
const B = ASSET_BASE;

export type Category = 'Beds' | 'Seating' | 'Tables' | 'Storage' | 'Lighting' | 'Decor' | 'Rugs';

export interface FurnitureVariant {
  id: string; // composite `${type}:${model}`
  url: string;
  targetWidth: number;
  fallback: Footprint;
}

export interface FurnitureDef {
  type: FurnitureType;
  label: string;
  category: Category;
  placement: Placement;
  againstWall: boolean;
  variants: FurnitureVariant[]; // variants[0] is the default
}

export const CATALOG: Record<FurnitureType, FurnitureDef> = {
  bed: {
    type: 'bed', label: 'Bed', category: 'Beds', placement: 'floor', againstWall: true,
    variants: [
      { id: 'bed:bed_double_A', url: `${B}/bed_double_A.gltf`, targetWidth: 1.6, fallback: { w: 1.6, d: 1.548, h: 0.516 } },
      { id: 'bed:bed_double_B', url: `${B}/bed_double_B.gltf`, targetWidth: 1.6, fallback: { w: 1.6, d: 1.548, h: 0.516 } },
      { id: 'bed:bed_single_A', url: `${B}/bed_single_A.gltf`, targetWidth: 1.0, fallback: { w: 1.0, d: 1.875, h: 0.625 } },
      { id: 'bed:bed_single_B', url: `${B}/bed_single_B.gltf`, targetWidth: 1.0, fallback: { w: 1.0, d: 1.875, h: 0.625 } },
    ],
  },
  sofa: {
    type: 'sofa', label: 'Sofa', category: 'Seating', placement: 'floor', againstWall: true,
    variants: [
      { id: 'sofa:couch', url: `${B}/couch.gltf`, targetWidth: 2.0, fallback: { w: 2.0, d: 1.067, h: 0.813 } },
      { id: 'sofa:couch_pillows', url: `${B}/couch_pillows.gltf`, targetWidth: 2.0, fallback: { w: 2.0, d: 1.067, h: 0.813 } },
    ],
  },
  armchair: {
    type: 'armchair', label: 'Armchair', category: 'Seating', placement: 'floor', againstWall: false,
    variants: [
      { id: 'armchair:armchair', url: `${B}/armchair.gltf`, targetWidth: 1.0, fallback: { w: 1.0, d: 0.889, h: 0.678 } },
      { id: 'armchair:armchair_pillows', url: `${B}/armchair_pillows.gltf`, targetWidth: 1.0, fallback: { w: 1.0, d: 0.889, h: 0.678 } },
    ],
  },
  chair: {
    type: 'chair', label: 'Chair', category: 'Seating', placement: 'floor', againstWall: false,
    variants: [
      { id: 'chair:chair_A', url: `${B}/chair_A.gltf`, targetWidth: 0.5, fallback: { w: 0.5, d: 0.567, h: 0.84 } },
      { id: 'chair:chair_B', url: `${B}/chair_B.gltf`, targetWidth: 0.5, fallback: { w: 0.5, d: 0.567, h: 0.84 } },
      { id: 'chair:chair_C', url: `${B}/chair_C.gltf`, targetWidth: 0.5, fallback: { w: 0.5, d: 0.627, h: 0.8 } },
    ],
  },
  stool: {
    type: 'stool', label: 'Stool', category: 'Seating', placement: 'floor', againstWall: false,
    variants: [
      { id: 'stool:chair_stool', url: `${B}/chair_stool.gltf`, targetWidth: 0.45, fallback: { w: 0.45, d: 0.45, h: 0.3 } },
      { id: 'stool:chair_stool_wood', url: `${B}/chair_stool_wood.gltf`, targetWidth: 0.45, fallback: { w: 0.45, d: 0.45, h: 0.3 } },
    ],
  },
  desk: {
    type: 'desk', label: 'Desk', category: 'Tables', placement: 'floor', againstWall: true,
    variants: [
      { id: 'desk:table_medium_long', url: `${B}/table_medium_long.gltf`, targetWidth: 1.4, fallback: { w: 1.4, d: 0.933, h: 0.467 } },
      { id: 'desk:table_medium', url: `${B}/table_medium.gltf`, targetWidth: 1.4, fallback: { w: 1.4, d: 1.4, h: 0.7 } },
    ],
  },
  coffeeTable: {
    type: 'coffeeTable', label: 'Coffee Table', category: 'Tables', placement: 'floor', againstWall: false,
    variants: [
      { id: 'coffeeTable:table_low', url: `${B}/table_low.gltf`, targetWidth: 1.1, fallback: { w: 1.1, d: 0.688, h: 0.229 } },
      { id: 'coffeeTable:table_small', url: `${B}/table_small.gltf`, targetWidth: 0.6, fallback: { w: 0.6, d: 0.6, h: 0.6 } },
    ],
  },
  diningTable: {
    type: 'diningTable', label: 'Dining Table', category: 'Tables', placement: 'floor', againstWall: false,
    variants: [
      { id: 'diningTable:table_medium', url: `${B}/table_medium.gltf`, targetWidth: 1.6, fallback: { w: 1.6, d: 1.6, h: 0.8 } },
      { id: 'diningTable:table_medium_long', url: `${B}/table_medium_long.gltf`, targetWidth: 1.6, fallback: { w: 1.6, d: 1.067, h: 0.533 } },
    ],
  },
  nightstand: {
    type: 'nightstand', label: 'Nightstand', category: 'Storage', placement: 'floor', againstWall: true,
    variants: [
      { id: 'nightstand:cabinet_small', url: `${B}/cabinet_small.gltf`, targetWidth: 0.45, fallback: { w: 0.45, d: 0.45, h: 0.45 } },
      { id: 'nightstand:cabinet_small_decorated', url: `${B}/cabinet_small_decorated.gltf`, targetWidth: 0.45, fallback: { w: 0.45, d: 0.471, h: 0.694 } },
    ],
  },
  dresser: {
    type: 'dresser', label: 'Dresser', category: 'Storage', placement: 'floor', againstWall: true,
    variants: [
      { id: 'dresser:cabinet_medium_decorated', url: `${B}/cabinet_medium_decorated.gltf`, targetWidth: 1.1, fallback: { w: 1.1, d: 0.539, h: 0.987 } },
      { id: 'dresser:cabinet_medium', url: `${B}/cabinet_medium.gltf`, targetWidth: 1.1, fallback: { w: 1.1, d: 0.55, h: 0.55 } },
    ],
  },
  wardrobe: {
    type: 'wardrobe', label: 'Wardrobe', category: 'Storage', placement: 'floor', againstWall: true,
    variants: [
      { id: 'wardrobe:cabinet_medium', url: `${B}/cabinet_medium.gltf`, targetWidth: 1.2, fallback: { w: 1.2, d: 0.6, h: 0.6 } },
      { id: 'wardrobe:shelf_B_large', url: `${B}/shelf_B_large.gltf`, targetWidth: 1.2, fallback: { w: 1.2, d: 0.3, h: 0.24 } },
    ],
  },
  shelf: {
    type: 'shelf', label: 'Shelf', category: 'Storage', placement: 'floor', againstWall: true,
    variants: [
      { id: 'shelf:shelf_A_small', url: `${B}/shelf_A_small.gltf`, targetWidth: 1.0, fallback: { w: 1.0, d: 0.5, h: 0.4 } },
      { id: 'shelf:shelf_A_big', url: `${B}/shelf_A_big.gltf`, targetWidth: 1.0, fallback: { w: 1.0, d: 0.25, h: 0.2 } },
      { id: 'shelf:shelf_B_small_decorated', url: `${B}/shelf_B_small_decorated.gltf`, targetWidth: 1.0, fallback: { w: 1.0, d: 0.57, h: 1.01 } },
      { id: 'shelf:shelf_B_large_decorated', url: `${B}/shelf_B_large_decorated.gltf`, targetWidth: 1.0, fallback: { w: 1.0, d: 0.25, h: 0.41 } },
    ],
  },
  floorLamp: {
    type: 'floorLamp', label: 'Floor Lamp', category: 'Lighting', placement: 'floor', againstWall: false,
    variants: [
      { id: 'floorLamp:lamp_standing', url: `${B}/lamp_standing.gltf`, targetWidth: 0.4, fallback: { w: 0.4, d: 0.4, h: 1.008 } },
    ],
  },
  tableLamp: {
    type: 'tableLamp', label: 'Table Lamp', category: 'Lighting', placement: 'floor', againstWall: false,
    variants: [
      { id: 'tableLamp:lamp_table', url: `${B}/lamp_table.gltf`, targetWidth: 0.3, fallback: { w: 0.3, d: 0.3, h: 0.306 } },
    ],
  },
  plant: {
    type: 'plant', label: 'Plant', category: 'Decor', placement: 'floor', againstWall: false,
    variants: [
      { id: 'plant:cactus_medium_A', url: `${B}/cactus_medium_A.gltf`, targetWidth: 0.4, fallback: { w: 0.4, d: 0.382, h: 0.377 } },
      { id: 'plant:cactus_medium_B', url: `${B}/cactus_medium_B.gltf`, targetWidth: 0.4, fallback: { w: 0.4, d: 0.382, h: 0.377 } },
      { id: 'plant:cactus_small_A', url: `${B}/cactus_small_A.gltf`, targetWidth: 0.35, fallback: { w: 0.35, d: 0.35, h: 0.385 } },
      { id: 'plant:cactus_small_B', url: `${B}/cactus_small_B.gltf`, targetWidth: 0.35, fallback: { w: 0.35, d: 0.35, h: 0.385 } },
    ],
  },
  books: {
    type: 'books', label: 'Books', category: 'Decor', placement: 'floor', againstWall: false,
    variants: [
      { id: 'books:book_set', url: `${B}/book_set.gltf`, targetWidth: 0.4, fallback: { w: 0.4, d: 0.185, h: 0.256 } },
      { id: 'books:book_single', url: `${B}/book_single.gltf`, targetWidth: 0.15, fallback: { w: 0.15, d: 0.208, h: 0.288 } },
    ],
  },
  pictureFrame: {
    type: 'pictureFrame', label: 'Picture Frame', category: 'Decor', placement: 'floor', againstWall: true,
    variants: [
      { id: 'pictureFrame:pictureframe_standing_A', url: `${B}/pictureframe_standing_A.gltf`, targetWidth: 0.5, fallback: { w: 0.5, d: 0.38, h: 0.62 } },
      { id: 'pictureFrame:pictureframe_standing_B', url: `${B}/pictureframe_standing_B.gltf`, targetWidth: 0.5, fallback: { w: 0.5, d: 0.257, h: 0.336 } },
      { id: 'pictureFrame:pictureframe_medium', url: `${B}/pictureframe_medium.gltf`, targetWidth: 0.5, fallback: { w: 0.5, d: 0.143, h: 0.643 } },
    ],
  },
  pillow: {
    type: 'pillow', label: 'Pillow', category: 'Decor', placement: 'floor', againstWall: false,
    variants: [
      { id: 'pillow:pillow_A', url: `${B}/pillow_A.gltf`, targetWidth: 0.5, fallback: { w: 0.5, d: 0.385, h: 0.154 } },
      { id: 'pillow:pillow_B', url: `${B}/pillow_B.gltf`, targetWidth: 0.5, fallback: { w: 0.5, d: 0.385, h: 0.154 } },
    ],
  },
  rug: {
    type: 'rug', label: 'Rug', category: 'Rugs', placement: 'rug', againstWall: false,
    variants: [
      { id: 'rug:rug_rectangle_A', url: `${B}/rug_rectangle_A.gltf`, targetWidth: 2.0, fallback: { w: 2.0, d: 1.333, h: 0.067 } },
      { id: 'rug:rug_rectangle_B', url: `${B}/rug_rectangle_B.gltf`, targetWidth: 2.0, fallback: { w: 2.0, d: 1.333, h: 0.067 } },
      { id: 'rug:rug_oval_A', url: `${B}/rug_oval_A.gltf`, targetWidth: 2.0, fallback: { w: 2.0, d: 1.333, h: 0.067 } },
      { id: 'rug:rug_oval_B', url: `${B}/rug_oval_B.gltf`, targetWidth: 2.0, fallback: { w: 2.0, d: 1.333, h: 0.067 } },
      { id: 'rug:rug_rectangle_stripes_A', url: `${B}/rug_rectangle_stripes_A.gltf`, targetWidth: 2.0, fallback: { w: 2.0, d: 1.333, h: 0.067 } },
      { id: 'rug:rug_rectangle_stripes_B', url: `${B}/rug_rectangle_stripes_B.gltf`, targetWidth: 2.0, fallback: { w: 2.0, d: 1.333, h: 0.067 } },
    ],
  },
};

/** Palette display order (grouped by category in the UI). */
export const PALETTE_ORDER: FurnitureType[] = [
  'bed', 'nightstand', 'wardrobe', 'dresser', 'shelf',
  'sofa', 'armchair', 'chair', 'stool',
  'desk', 'coffeeTable', 'diningTable',
  'floorLamp', 'tableLamp',
  'rug', 'plant', 'books', 'pictureFrame', 'pillow',
];

/** Category display order for grouped palettes. */
export const CATEGORY_ORDER: Category[] = [
  'Beds', 'Seating', 'Tables', 'Storage', 'Lighting', 'Decor', 'Rugs',
];

export const getDef = (type: FurnitureType): FurnitureDef => CATALOG[type];

export const getDefaultVariant = (type: FurnitureType): FurnitureVariant => CATALOG[type].variants[0];

/** Look up a variant by its composite id across the whole catalog. */
export function getVariant(variantId: string): FurnitureVariant | undefined {
  for (const def of Object.values(CATALOG)) {
    const v = def.variants.find((x) => x.id === variantId);
    if (v) return v;
  }
  return undefined;
}

/** Pick a random variant for a type using the provided rng. */
export function pickVariant(type: FurnitureType, rng: () => number): FurnitureVariant {
  const vs = CATALOG[type].variants;
  return vs[Math.floor(rng() * vs.length)] ?? vs[0];
}

/** All unique variant urls (for preloading). */
export const ALL_VARIANT_URLS: string[] = Array.from(
  new Set(Object.values(CATALOG).flatMap((d) => d.variants.map((v) => v.url))),
);
