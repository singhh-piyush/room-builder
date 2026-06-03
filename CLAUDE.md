# CLAUDE.md

Working notes for this project. Read this first when returning to the codebase.

## What this is

Room Builder: a browser-based 3D room layout tool. The user sets room
dimensions, places low-poly furniture, drags/rotates/snaps it with collision
detection, can auto-generate a randomized layout, toggles 3D vs 2D top-down
views, recolors the UI accent, and exports/imports the layout as JSON.

Stack: React 19 + TypeScript + Vite, Three.js via @react-three/fiber and
@react-three/drei. Tests with Vitest. No backend.

## Commands

- `npm run dev` then open http://localhost:5173 (use `?demo=1` to seed a layout).
- `npm run build` (runs `tsc -b` then `vite build`).
- `npm run test` (Vitest, file `src/logic/logic.test.ts`).
- `npm run copy-assets` copies the glTF pack into `public/`. It runs
  automatically via the `predev` and `prebuild` npm scripts.

## Assets

- Source pack lives in `Assets/gltf/` as `.gltf` + `.bin` pairs plus one shared
  `furniturebits_texture.png`. NOT `.glb`.
- `scripts/copy-assets.mjs` copies those into
  `public/assets/furniture-bits/` so Vite serves them and GLTFLoader can resolve
  the relative `.bin` and texture URIs. That public folder is generated, so it is
  gitignored and rebuilt by `predev`/`prebuild`. `Assets/gltf/` must stay tracked
  because it is the source of that copy.
- The `Assets/fbx`, `Assets/fbx (unity)`, `Assets/obj`, and `Assets/texture`
  folders are not used by the web app and are gitignored.

## Code map

```
src/
  types.ts                  RoomLayout / PlacedItem (has variantId) = the JSON export shape
  data/catalog.ts           furniture defs: categories, placement rules, model VARIANTS
  context/LayoutContext.tsx reducer store (room, items, selection); footprint cache keyed by variantId; import normalize
  context/ThemeContext.tsx  accent state -> --accent CSS var + localStorage
  logic/rng.ts              seeded PRNG (mulberry32) + pick/chance/shuffle
  logic/grid.ts             10 cm snap helpers
  logic/collision.ts        rotation-aware AABB overlap + room-bounds checks
  logic/autoLayout.ts       randomized rule-based placement
  logic/id.ts               id generator (no React dep, shared by store + autoLayout)
  scene/SceneCanvas.tsx     Canvas, lights, 3D/2D camera rig, keyboard shortcuts
  scene/RoomShell.tsx       floor + 3 walls (far wall omitted) + grid + door marker
  scene/FurnitureModel.tsx  loads a variant glTF, scale-normalizes, measures Box3 footprint
  scene/DraggableItem.tsx   pointer drag on the floor plane, snap, validity tint, revert
  ui/Toolbar.tsx            hamburger, wordmark, auto-layout, 3D/2D, accent, export/import/clear
  ui/Sidebar.tsx            searchable category-grouped palette + placed-items list
  ui/DimensionForm.tsx      room L/W/H inputs
  ui/AccentPicker.tsx       accent swatch popover
  hooks/usePersistence.ts   localStorage autosave/restore + JSON export/import
```

## Key design decisions

- Model variants: each furniture `type` has several model `variants`. Variant
  ids are composite (`type:model`) because the same model file is reused across
  types at different scales, and the footprint cache keys must be unique.
  `PlacedItem.variantId` records which one. `getVariant`, `getDefaultVariant`,
  `pickVariant` live in `catalog.ts`.
- Scale normalization: the pack is authored at inconsistent/oversized units (a
  double-bed mesh is about 3.1 m wide). Each variant declares a `targetWidth`;
  `FurnitureModel` measures the native Box3, applies a uniform scale, and
  re-measures the true footprint. Footprints are never hardcoded. Fallback
  footprints in the catalog are precomputed (scale to targetWidth) and used until
  a model finishes loading.
- Coordinates: floor is the X-Z plane in metres; the room is `[0,length] x
  [0,width]` so positions are positive. Rotation is restricted to 90 degree
  steps, so a rotated footprint stays axis-aligned (width/depth swap for 90/270).
- Auto-layout: greedy placer that proposes candidate poses and commits the first
  that fits (inside room, clear of the fixed door zone, no overlap). It is seeded
  by `Date.now()` per click so each run differs, and accepts an optional `rng`
  arg so tests can pass a fixed seed. Items that do not fit are skipped, so output
  is always collision-free.
- Persistence/back-compat: `LayoutContext` normalizes imported items, backfilling
  a default `variantId` and footprint for old JSON that predates variants.

## History / fixed bugs (do not regress)

- Auto-layout once placed only the rug because grid-snapping pushed wall-flush
  items past the wall margin. Fixed by checking the real room interior with a
  small tolerance in `autoLayout.fits`, not the margin.
- "3D view freezes after dragging an item" bug: the drag `useEffect` in
  `DraggableItem` depended on `items`/`room`/`item`, so it re-ran on every move
  during a drag and re-captured `controls.enabled` as already-false, leaving
  OrbitControls disabled until a 2D/3D toggle rebuilt them. Fixed: the effect is
  keyed only on `[dragging]`, live state is read through refs, and
  `controls.enabled` is captured once in `handlePointerDown` and restored in the
  pointer-up handler. Keep it that way.

## Verification

- `npm run test` and `npm run build` should both pass.
- Visual checks were done with one-shot headless Chrome screenshots
  (`google-chrome-stable --headless=new --screenshot=... <url>`).
- NOTE: in this sandbox Chrome cannot open a remote debugging socket
  (`--remote-debugging-port` makes it exit), so interactive CDP automation does
  not work. Use `--screenshot` one-shots, and reload `?demo=1` to compare
  auto-layout variety.

## Conventions / preferences

- Do NOT push to GitHub. Provide the git commands and let the user push.
