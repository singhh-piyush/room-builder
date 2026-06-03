import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  PlacedItem,
  RoomDimensions,
  RoomLayout,
  RotationY,
  FurnitureType,
  Footprint,
} from '../types';
import { CATALOG, getDefaultVariant, getVariant } from '../data/catalog';
import { newId } from '../logic/id';

const GENERIC_FOOTPRINT: Footprint = { w: 0.5, d: 0.5, h: 0.5 };

/** Coerce loaded/imported items to the current schema (back-compat). */
function normalizeItems(items: PlacedItem[]): PlacedItem[] {
  return items
    .filter((it) => it && (it.type in CATALOG))
    .map((it) => {
      const known = it.variantId && getVariant(it.variantId);
      const variant = known || getDefaultVariant(it.type);
      return {
        ...it,
        variantId: variant.id,
        footprint: it.footprint ?? variant.fallback,
        rotationY: (it.rotationY ?? 0) as RotationY,
      };
    });
}

// ---------------------------------------------------------------------------
// Global layout state via Context + reducer (per spec: plain React state, no
// external store). Holds the room dimensions and the list of placed items.
// ---------------------------------------------------------------------------

export const DEFAULT_ROOM: RoomDimensions = { length: 5, width: 4, height: 2.6 };

interface State {
  room: RoomDimensions;
  items: PlacedItem[];
  /** id of the currently selected item (for highlight / rotate / delete). */
  selectedId: string | null;
  /** Cache of measured footprints keyed by variant id, so auto-layout can size
   *  items even when none are currently placed. */
  footprints: Record<string, Footprint>;
}

type Action =
  | { type: 'setRoom'; room: RoomDimensions }
  | { type: 'add'; item: PlacedItem }
  | { type: 'move'; id: string; position: [number, number] }
  | { type: 'rotate'; id: string; dir: 1 | -1 }
  | { type: 'remove'; id: string }
  | { type: 'select'; id: string | null }
  | { type: 'setFootprint'; variantId: string; footprint: Footprint }
  | { type: 'replaceAll'; items: PlacedItem[] }
  | { type: 'load'; layout: RoomLayout }
  | { type: 'reset' };

const initialState: State = {
  room: DEFAULT_ROOM,
  items: [],
  selectedId: null,
  footprints: {},
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setRoom':
      return { ...state, room: action.room };
    case 'add':
      return { ...state, items: [...state.items, action.item], selectedId: action.item.id };
    case 'move':
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === action.id ? { ...it, position: action.position } : it,
        ),
      };
    case 'rotate':
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === action.id
            ? { ...it, rotationY: rotate90(it.rotationY, action.dir) }
            : it,
        ),
      };
    case 'remove':
      return {
        ...state,
        items: state.items.filter((it) => it.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'setFootprint': {
      // Apply a freshly measured footprint to every item using this variant.
      const prev = state.footprints[action.variantId];
      if (prev && prev.w === action.footprint.w && prev.d === action.footprint.d) return state;
      return {
        ...state,
        footprints: { ...state.footprints, [action.variantId]: action.footprint },
        items: state.items.map((it) =>
          it.variantId === action.variantId ? { ...it, footprint: action.footprint } : it,
        ),
      };
    }
    case 'replaceAll':
      return { ...state, items: action.items, selectedId: null };
    case 'load':
      return {
        ...state,
        room: action.layout.room,
        items: normalizeItems(action.layout.items),
        selectedId: null,
      };
    case 'reset':
      return { ...state, items: [], selectedId: null };
    default:
      return state;
  }
}

function rotate90(r: RotationY, dir: 1 | -1): RotationY {
  return (((r + dir * 90) % 360) + 360) % 360 as RotationY;
}

interface LayoutContextValue {
  room: RoomDimensions;
  items: PlacedItem[];
  selectedId: string | null;
  setRoom: (room: RoomDimensions) => void;
  addItem: (type: FurnitureType, position: [number, number], rotationY?: RotationY) => void;
  moveItem: (id: string, position: [number, number]) => void;
  rotateItem: (id: string, dir: 1 | -1) => void;
  removeItem: (id: string) => void;
  select: (id: string | null) => void;
  setFootprint: (variantId: string, footprint: Footprint) => void;
  /** Best-known footprint for a variant (measured if available, else catalog fallback). */
  getFootprint: (variantId: string) => Footprint;
  replaceAll: (items: PlacedItem[]) => void;
  loadLayout: (layout: RoomLayout) => void;
  reset: () => void;
  layout: RoomLayout;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setRoom = useCallback((room: RoomDimensions) => dispatch({ type: 'setRoom', room }), []);

  const addItem = useCallback(
    (type: FurnitureType, position: [number, number], rotationY: RotationY = 0) => {
      const variant = getDefaultVariant(type);
      dispatch({
        type: 'add',
        item: {
          id: newId(type),
          type,
          variantId: variant.id,
          position,
          rotationY,
          footprint: state.footprints[variant.id] ?? variant.fallback,
        },
      });
    },
    [state.footprints],
  );

  const moveItem = useCallback(
    (id: string, position: [number, number]) => dispatch({ type: 'move', id, position }),
    [],
  );
  const rotateItem = useCallback(
    (id: string, dir: 1 | -1) => dispatch({ type: 'rotate', id, dir }),
    [],
  );
  const removeItem = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const select = useCallback((id: string | null) => dispatch({ type: 'select', id }), []);
  const setFootprint = useCallback(
    (variantId: string, footprint: Footprint) =>
      dispatch({ type: 'setFootprint', variantId, footprint }),
    [],
  );
  const getFootprint = useCallback(
    (variantId: string): Footprint =>
      state.footprints[variantId] ?? getVariant(variantId)?.fallback ?? GENERIC_FOOTPRINT,
    [state.footprints],
  );
  const replaceAll = useCallback((items: PlacedItem[]) => dispatch({ type: 'replaceAll', items }), []);
  const loadLayout = useCallback((layout: RoomLayout) => dispatch({ type: 'load', layout }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const value = useMemo<LayoutContextValue>(
    () => ({
      room: state.room,
      items: state.items,
      selectedId: state.selectedId,
      setRoom,
      addItem,
      moveItem,
      rotateItem,
      removeItem,
      select,
      setFootprint,
      getFootprint,
      replaceAll,
      loadLayout,
      reset,
      layout: { room: state.room, items: state.items },
    }),
    [state, setRoom, addItem, moveItem, rotateItem, removeItem, select, setFootprint, getFootprint, replaceAll, loadLayout, reset],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within a LayoutProvider');
  return ctx;
}
