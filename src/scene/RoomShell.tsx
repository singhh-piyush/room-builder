import { DoubleSide } from 'three';
import type { RoomDimensions } from '../types';

// ---------------------------------------------------------------------------
// The room shell: floor + walls, laid out in world space at [0,L] × [0,W] so
// that furniture positions (which are stored in those same coordinates) need no
// conversion. The far wall (z = width) is OMITTED — a "dollhouse" convention so
// the perspective camera can always see inside the room.
// ---------------------------------------------------------------------------

const WALL_T = 0.08; // wall thickness (m)
const FLOOR_COLOR = '#3a3f4b';
const WALL_COLOR = '#4b5160';

interface Props {
  room: RoomDimensions;
  /** In 2D top-down mode we draw a flat floor and skip wall height. */
  flat?: boolean;
}

export function RoomShell({ room, flat = false }: Props) {
  const { length: L, width: W, height: H } = room;

  return (
    <group>
      {/* Floor */}
      <mesh
        position={[L / 2, 0, W / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={1} metalness={0} side={DoubleSide} />
      </mesh>

      {/* Grid overlay for the 10cm snap reference (shown coarser to stay readable). */}
      <gridHelper
        args={[Math.max(L, W), Math.max(L, W) * 2, '#5a6172', '#474d5b']}
        position={[L / 2, 0.005, W / 2]}
      />

      {!flat && H > 0 && (
        <>
          {/* Back wall (z = 0) — the "longest wall" the bed sits against. */}
          <mesh position={[L / 2, H / 2, -WALL_T / 2]} receiveShadow>
            <boxGeometry args={[L + WALL_T * 2, H, WALL_T]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={1} />
          </mesh>
          {/* Left wall (x = 0) */}
          <mesh position={[-WALL_T / 2, H / 2, W / 2]} receiveShadow>
            <boxGeometry args={[WALL_T, H, W]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={1} />
          </mesh>
          {/* Right wall (x = L) */}
          <mesh position={[L + WALL_T / 2, H / 2, W / 2]} receiveShadow>
            <boxGeometry args={[WALL_T, H, W]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={1} />
          </mesh>
          {/* Far wall (z = W) intentionally omitted for camera visibility. */}
        </>
      )}
    </group>
  );
}
