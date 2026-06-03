import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import type { OrthographicCamera as ThreeOrthographicCamera } from 'three';
import type { RoomDimensions } from '../types';
import { useLayout } from '../context/LayoutContext';
import { RoomShell } from './RoomShell';
import { DraggableItem } from './DraggableItem';

export type ViewMode = '3d' | '2d';

// ---------------------------------------------------------------------------
// The R3F canvas: lighting, camera rig (perspective ⇄ top-down ortho), the room
// shell, and all draggable items.
// ---------------------------------------------------------------------------

function Lighting({ room }: { room: RoomDimensions }) {
  const span = Math.max(room.length, room.width);
  return (
    <>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#cfd6e6', '#2a2d36', 0.4]} />
      <directionalLight
        position={[room.length * 0.7, span * 1.6, -room.width * 0.4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={span * 4}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
      />
    </>
  );
}

/** Switches between a perspective camera and a locked top-down ortho camera. */
function CameraRig({ view, room }: { view: ViewMode; room: RoomDimensions }) {
  const { length: L, width: W } = room;
  const span = Math.max(L, W);
  const target: [number, number, number] = [L / 2, 0, W / 2];
  const { size } = useThree();
  const orthoRef = useRef<ThreeOrthographicCamera>(null);

  // Fit the room to the viewport in 2D, and fix the up-vector so looking
  // straight down isn't degenerate (north = -Z).
  const zoom = (Math.min(size.width, size.height) * 0.78) / span;
  useEffect(() => {
    const cam = orthoRef.current;
    if (view === '2d' && cam) {
      cam.up.set(0, 0, -1);
      cam.lookAt(L / 2, 0, W / 2);
      cam.updateProjectionMatrix();
    }
  }, [view, L, W]);

  return (
    <>
      {view === '3d' ? (
        <PerspectiveCamera
          makeDefault
          fov={50}
          position={[L * 1.05, span * 0.95, W + span * 0.65]}
        />
      ) : (
        <OrthographicCamera
          ref={orthoRef}
          makeDefault
          position={[L / 2, span * 3, W / 2]}
          zoom={zoom}
          near={0.1}
          far={span * 8}
        />
      )}
      <OrbitControls
        makeDefault
        target={target}
        enableRotate={view === '3d'}
        enablePan
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

interface Props {
  view: ViewMode;
}

export function SceneCanvas({ view }: Props) {
  const { items, room, selectedId, select, rotateItem, removeItem } = useLayout();

  // Keyboard: R / ] rotate the selected item +90°, [ rotates -90°,
  // Delete/Backspace removes it, Escape deselects.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!selectedId) {
        if (e.key === 'Escape') select(null);
        return;
      }
      if (e.key === 'r' || e.key === 'R' || e.key === ']') rotateItem(selectedId, 1);
      else if (e.key === '[') rotateItem(selectedId, -1);
      else if (e.key === 'Delete' || e.key === 'Backspace') removeItem(selectedId);
      else if (e.key === 'Escape') select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, select, rotateItem, removeItem]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ touchAction: 'none' }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#000000']} />
      <Lighting room={room} />
      <CameraRig view={view} room={room} />
      <RoomShell room={room} flat={view === '2d'} />
      {items.map((item) => (
        <DraggableItem key={item.id} item={item} />
      ))}
    </Canvas>
  );
}
