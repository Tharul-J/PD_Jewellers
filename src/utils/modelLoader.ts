import { useGLTF } from '@react-three/drei';
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

// Cache for pre-fetched URLs
const prefetchedUrls = new Set<string>();

/**
 * Pre-fetches a .glb/.gltf model from the network/local directory
 * without blocking the main UI thread.
 */
export const prefetchModel = (url: string) => {
  if (!url) return;
  if (!prefetchedUrls.has(url)) {
    // Drei's useGLTF.preload handles the asynchronous downloading and caching
    useGLTF.preload(url);
    prefetchedUrls.add(url);
  }
};

/**
 * A hook to load and memoize a GLB model efficiently.
 * It clones the scene just once per URL and memoizes its bounding box metrics.
 */
export const useLoadedModel = (url: string) => {
  // Pre-fetch the model if not already done
  useEffect(() => {
    if (url) {
      prefetchModel(url);
    }
  }, [url]);

  // Load the model. This will suspend if not already loaded.
  const { scene } = useGLTF(url || '/glb-models/rings/ring1.glb');

  // Clone and index the scene so that dynamic materials don't pollute the cached original.
  const { clonedScene, zSize, boundingRadius, boundingCenter } = useMemo(() => {
    const clone = scene.clone(true);
    let calculatedZSize = 0;

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Compute bounding box for identifying stones vs band automatically
        mesh.geometry.computeBoundingBox();
        const bbox = mesh.geometry.boundingBox;

        if (bbox) {
          const zDepth = bbox.max.z - bbox.min.z;
          if (zDepth > calculatedZSize) {
             calculatedZSize = zDepth;
          }
        }
      }
    });

    // Compute overall bounding sphere so callers can auto-fit scale.
    // Wrapped in try-catch: corrupted GLB headers can produce degenerate
    // geometry that causes setFromObject to behave unexpectedly.
    let boundingRadius = 1;
    let boundingCenter = new THREE.Vector3();
    try {
      clone.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(clone);
      if (!box.isEmpty()) {
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        if (sphere.radius > 0) {
          boundingRadius = sphere.radius;
          boundingCenter = sphere.center.clone();
        }
      }
    } catch {
      // Fall through with defaults (radius=1, center=origin)
    }

    return {
      clonedScene: clone,
      zSize: calculatedZSize,
      boundingRadius,
      boundingCenter,
    };
  }, [scene]);

  return { scene: clonedScene, maxZSize: zSize, boundingRadius, boundingCenter };
};
