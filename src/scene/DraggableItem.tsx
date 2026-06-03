import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { PlacedItem, Footprint } from '../types';
import { FurnitureModel } from './FurnitureModel';
import { useLayout } from '../context/LayoutContext';
import { isValidPlacement } from '../logic/collision';
import { snapXZ } from '../logic/grid';

// Footprint tint for the selected item (matches the default UI accent).
const SELECT_COLOR = '#ffae00';

// ---------------------------------------------------------------------------
// A single placed furniture item that can be selected and dragged across the
// floor. Dragging raycasts the pointer onto the y=0 plane, snaps to the 10cm
// grid, live-validates against walls + other items (green/red footprint tint),
// and reverts to the last valid spot if the drop is invalid.
//
// IMPORTANT (freeze-bug fix): the drag effect is keyed ONLY on `dragging`.
// Live values (items/room/item) are read through refs so the effect never
// re-subscribes mid-drag. OrbitControls is disabled once on pointer-down and
// restored to its captured prior state on pointer-up — previously the effect
// re-ran on every move and re-captured `enabled` as already-false, leaving the
// camera/controls stuck until a 2D/3D toggle rebuilt them.
// ---------------------------------------------------------------------------

interface Props {
  item: PlacedItem;
}

const deg2rad = (d: number) => (d * Math.PI) / 180;

export function DraggableItem({ item }: Props) {
  const { camera, gl, controls } = useThree();
  const { items, room, moveItem, select, setFootprint, selectedId } = useLayout();

  const [dragging, setDragging] = useState(false);
  const [valid, setValid] = useState(true);
  const validRef = useRef(true);
  const lastValid = useRef<[number, number]>(item.position);
  const grabOffset = useRef<[number, number]>([0, 0]);
  const controlsWasEnabled = useRef(true);

  // Live refs so the drag listeners always see current state without the effect
  // having to re-subscribe (which caused the freeze bug).
  const itemsRef = useRef(items);
  const roomRef = useRef(room);
  const itemRef = useRef(item);
  itemsRef.current = items;
  roomRef.current = room;
  itemRef.current = item;

  const isSelected = selectedId === item.id;

  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const raycaster = useMemo(() => new Raycaster(), []);
  const ndc = useMemo(() => new Vector2(), []);

  const pointerToFloor = useCallback(
    (clientX: number, clientY: number): Vector3 => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const pt = new Vector3();
      raycaster.ray.intersectPlane(plane, pt);
      return pt;
    },
    [camera, gl, ndc, plane, raycaster],
  );

  const onMeasured = useCallback(
    (variantId: string, fp: Footprint) => setFootprint(variantId, fp),
    [setFootprint],
  );

  const handlePointerDown = (e: { stopPropagation: () => void; clientX: number; clientY: number }) => {
    e.stopPropagation();
    select(item.id);
    const fp = pointerToFloor(e.clientX, e.clientY);
    grabOffset.current = [item.position[0] - fp.x, item.position[1] - fp.z];
    lastValid.current = item.position;
    validRef.current = true;
    setValid(true);
    // Capture + disable controls ONCE, here (not in the effect).
    const ctrl = controls as { enabled?: boolean } | null;
    controlsWasEnabled.current = ctrl?.enabled ?? true;
    if (ctrl) ctrl.enabled = false;
    gl.domElement.style.cursor = 'grabbing';
    setDragging(true);
  };

  // Subscribe to window pointer events exactly once per drag.
  useEffect(() => {
    if (!dragging) return;
    const ctrl = controls as { enabled?: boolean } | null;

    const onMove = (ev: PointerEvent) => {
      const fp = pointerToFloor(ev.clientX, ev.clientY);
      const next = snapXZ([fp.x + grabOffset.current[0], fp.z + grabOffset.current[1]]);
      const candidate: PlacedItem = { ...itemRef.current, position: next };
      const ok = isValidPlacement(candidate, itemsRef.current, roomRef.current, 0);
      validRef.current = ok;
      setValid(ok);
      if (ok) lastValid.current = next;
      moveItem(itemRef.current.id, next); // live preview (red if invalid)
    };

    const onUp = () => {
      if (!validRef.current) moveItem(itemRef.current.id, lastValid.current); // revert invalid
      setDragging(false);
      setValid(true);
      if (ctrl) ctrl.enabled = controlsWasEnabled.current; // restore (fixes freeze)
      gl.domElement.style.cursor = 'auto';
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const [x, z] = item.position;

  // Footprint indicator: drag → green/red; selected → accent.
  const indicatorColor = dragging ? (valid ? '#37d67a' : '#ff5a4d') : SELECT_COLOR;
  const showIndicator = dragging || isSelected;

  return (
    <group
      position={[x, 0, z]}
      rotation={[0, deg2rad(item.rotationY), 0]}
      onPointerDown={handlePointerDown}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!dragging) gl.domElement.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        if (!dragging) gl.domElement.style.cursor = 'auto';
      }}
    >
      <FurnitureModel variantId={item.variantId} type={item.type} onMeasured={onMeasured} />

      {showIndicator && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[item.footprint.w, item.footprint.d]} />
          <meshBasicMaterial color={indicatorColor} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
