import { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, Mesh, MeshStandardMaterial } from 'three';
import type { Footprint } from '../types';
import { getVariant, getDefaultVariant, ALL_VARIANT_URLS, type FurnitureVariant } from '../data/catalog';
import type { FurnitureType } from '../types';

// ---------------------------------------------------------------------------
// Loads a Furniture Bits glTF, normalizes its scale, and renders it centred on
// the floor at its local origin (so the parent group only has to position +
// rotate it). Reports the measured (post-scale) footprint upward exactly once.
//
// Scale handling (see catalog.ts): the model is uniformly scaled so its width
// matches the catalog `targetWidth`, then re-centred so X/Z centre sits at the
// origin and the lowest point rests on y = 0.
// ---------------------------------------------------------------------------

interface Props {
  /** Variant to render. Falls back to the type's default variant if unknown. */
  variantId?: string;
  type?: FurnitureType;
  onMeasured?: (variantId: string, footprint: Footprint) => void;
}

export function FurnitureModel({ variantId, type, onMeasured }: Props) {
  const variant: FurnitureVariant =
    (variantId ? getVariant(variantId) : undefined) ??
    (type ? getDefaultVariant(type) : undefined)!;
  const { scene } = useGLTF(variant.url);

  const { object, scale, footprint } = useMemo(() => {
    const clone = scene.clone(true);

    // Measure native bounds, derive uniform scale to hit the target width.
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const s = variant.targetWidth / (size.x || 1);

    // Recentre in native units (the parent group applies `scale`).
    clone.position.set(-center.x, -box.min.y, -center.z);

    // Low-poly flat-shaded look + shadows.
    clone.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
        const apply = (m: MeshStandardMaterial) => {
          if ('flatShading' in m) {
            m.flatShading = true;
            m.metalness = 0;
            m.roughness = 1;
            m.needsUpdate = true;
          }
        };
        Array.isArray(mat) ? mat.forEach(apply) : apply(mat);
      }
    });

    const fp: Footprint = { w: size.x * s, d: size.z * s, h: size.y * s };
    return { object: clone, scale: s, footprint: fp };
  }, [scene, variant.targetWidth]);

  // Report measured footprint to the layout store (one-shot per variant).
  useEffect(() => {
    onMeasured?.(variant.id, footprint);
  }, [variant.id, footprint, onMeasured]);

  return (
    <group scale={scale}>
      <primitive object={object} />
    </group>
  );
}

// Preload every variant model so the palette and auto-layout feel instant.
ALL_VARIANT_URLS.forEach((url) => useGLTF.preload(url));
