import { useRef, useMemo, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Decal } from '@react-three/drei';
import * as THREE from 'three';
import { useLoadedModel } from '../utils/modelLoader';
import { makeEngravingBump, engravingFontFamily } from '../lib/engravingBump';

// Bump depth for the engraving decal. Cut-in letters. If they read raised instead of
// recessed on device, flip this negative. TUNABLE — primary knob for emboss depth.
const ENGRAVE_BUMP_SCALE = 1.4;

class ModelErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("3D model load failed, falling back to default:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

type GemFit = {
  cut: 'round' | 'square';
  centerX: number;
  centerZ: number;
  yNorm: number;
  sizeNorm: number;
  // Additional gem overlays rendered after the primary — same normalization as the primary.
  // Used for multi-stone rings (e.g. ring5's two side prong settings).
  extraGems?: Array<Omit<GemFit, 'extraGems'>>;
};

type EngraveFit = {
  yNorm: number;
  radiusNorm: number;
};

// Manual overrides — only entries that need a non-default cut shape or precisely
// hand-tuned placement that auto-detection cannot infer from geometry alone.
// Ring3 must stay here: its square bezel needs the princess-cut two-cone profile.
// Ring5 must stay here: it has three stone settings (center + two side prong clusters)
// that auto-detection cannot distinguish — it would average them into one central gem.
// Rings 1, 2, 4 fall through to runtime auto-detection.
const GEM_FIT_OVERRIDES: Record<string, GemFit> = {
  '/glb-models/rings/ring3.glb': { cut: 'square', centerX: -0.36, centerZ: -0.27, yNorm: 1.05, sizeNorm: 0.34 },
  '/glb-models/rings/ring5.glb': {
    // Center stone — positioned at inner prong-tip mean (X=0 by symmetry, yNorm from
    // geometry analysis of the center stone aperture at the top of the prong cluster).
    cut: 'round', centerX: 0, centerZ: 0, yNorm: 0.8473, sizeNorm: 0.13,
    extraGems: [
      // Left side prong cluster — shifted outward from vertex midpoint toward the visible gap
      { cut: 'round', centerX: -0.24, centerZ: 0, yNorm: 0.8392, sizeNorm: 0.08 },
      // Right side prong cluster — perfectly symmetric
      { cut: 'round', centerX:  0.24, centerZ: 0, yNorm: 0.8392, sizeNorm: 0.08 },
    ],
  },
};

const DEFAULT_GEM_FIT: GemFit = { cut: 'round', centerX: 0, centerZ: 0, yNorm: 0.75, sizeNorm: 0.28 };
const DEFAULT_ENGRAVE_FIT: EngraveFit = { yNorm: -0.55, radiusNorm: 0.85 };

function ActualGLBRingModel({ metalMaterial, stoneMaterial, syntheticStone = false, text, fontStyle, noSpin = false, fileUrl, textSizeMult = 1 }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, boundingRadius, boundingCenter } = useLoadedModel(fileUrl);

  const styledScene = useMemo(() => {
    if (!scene) return new THREE.Group();
    const localClone = scene.clone(true);

    const metalMat = new THREE.MeshPhysicalMaterial({ ...metalMaterial, envMapIntensity: 3 });
    const stoneMat = new THREE.MeshPhysicalMaterial({ ...stoneMaterial, envMapIntensity: 2 });

    const meshes: { mesh: THREE.Mesh; vol: number }[] = [];
    localClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        const vol = bb
          ? (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z)
          : 0;
        meshes.push({ mesh, vol });
      }
    });

    if (meshes.length === 0) return localClone;

    if (meshes.length === 1) {
      meshes[0].mesh.material = metalMat;
    } else {
      meshes.sort((a, b) => b.vol - a.vol);
      meshes[0].mesh.material = metalMat;
      for (let i = 1; i < meshes.length; i++) {
        meshes[i].mesh.material = stoneMat;
      }
    }

    return localClone;
  }, [scene, metalMaterial, stoneMaterial]);

  // Runtime gem-fit detection — runs once per loaded model via memoization.
  // Finds the largest mesh (ring band), samples the top 7% of vertices by
  // world-space Y, and derives placement/size in normalised units
  // (boundingRadius = 1.0 reference). Used for all rings not in GEM_FIT_OVERRIDES.
  const autoDetectedGemFit = useMemo<GemFit>(() => {
    if (!scene || boundingRadius <= 0) return DEFAULT_GEM_FIT;

    // Find largest-volume mesh (same strategy as styledScene material assignment)
    let largestMesh: THREE.Mesh | null = null;
    let maxVol = -1;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        if (bb) {
          const vol = (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z);
          if (vol > maxVol) { maxVol = vol; largestMesh = mesh; }
        }
      }
    });
    if (!largestMesh) return DEFAULT_GEM_FIT;

    const mesh = largestMesh as THREE.Mesh;
    const posAttr = mesh.geometry.attributes.position;
    if (!posAttr) return DEFAULT_GEM_FIT;

    // World-space Y extents so the threshold is correct even when the mesh has
    // a non-identity local transform (rotation/scale from the GLB export).
    const worldBB = new THREE.Box3().setFromObject(mesh);
    if (worldBB.isEmpty()) return DEFAULT_GEM_FIT;
    const yWorldRange = worldBB.max.y - worldBB.min.y;
    const topThreshold = worldBB.max.y - yWorldRange * 0.07;

    let sumX = 0, sumY = 0, sumZ = 0;
    let minTopX = Infinity, maxTopX = -Infinity;
    let minTopZ = Infinity, maxTopZ = -Infinity;
    let count = 0;
    const v = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr as THREE.BufferAttribute, i).applyMatrix4(mesh.matrixWorld);
      if (v.y >= topThreshold) {
        sumX += v.x; sumY += v.y; sumZ += v.z;
        if (v.x < minTopX) minTopX = v.x;
        if (v.x > maxTopX) maxTopX = v.x;
        if (v.z < minTopZ) minTopZ = v.z;
        if (v.z > maxTopZ) maxTopZ = v.z;
        count++;
      }
    }

    if (count === 0) return DEFAULT_GEM_FIT;

    const meanX = sumX / count;
    const meanY = sumY / count;
    const meanZ = sumZ / count;

    // Use the smaller of X/Z span as the gem-aperture diameter — prong walls and
    // bezel rims can widen one axis while the opening itself is narrower.
    const xRange = maxTopX - minTopX;
    const zRange = maxTopZ - minTopZ;
    const diameter = Math.min(xRange, zRange);

    // Radius normalised to boundingRadius, then undersized 17% so gem sits
    // inside the setting with clearance rather than clipping prong walls.
    const sizeNorm = Math.max((diameter * 0.5 / boundingRadius) * 0.83, 0.10);

    const detected: GemFit = {
      cut: 'round', // cabochon is the safe default; square is a manual override only
      centerX: meanX / boundingRadius,
      centerZ: meanZ / boundingRadius,
      yNorm: meanY / boundingRadius,
      sizeNorm,
    };

    return detected;
  }, [scene, boundingRadius, fileUrl]);

  // Runtime engraving-fit detection — samples the bottom 18% of the band mesh by
  // world-space Y (inner band region) near the central X=0 plane, then returns
  // normalised Y and radial distance so the text can be placed flush on the inner surface.
  const autoDetectedEngraveFit = useMemo<EngraveFit>(() => {
    if (!scene || boundingRadius <= 0) return DEFAULT_ENGRAVE_FIT;

    let largestMesh: THREE.Mesh | null = null;
    let maxVol = -1;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        if (bb) {
          const vol = (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z);
          if (vol > maxVol) { maxVol = vol; largestMesh = mesh; }
        }
      }
    });
    if (!largestMesh) return DEFAULT_ENGRAVE_FIT;

    const mesh = largestMesh as THREE.Mesh;
    const posAttr = mesh.geometry.attributes.position;
    if (!posAttr) return DEFAULT_ENGRAVE_FIT;

    const worldBB = new THREE.Box3().setFromObject(mesh);
    if (worldBB.isEmpty()) return DEFAULT_ENGRAVE_FIT;
    const yWorldRange = worldBB.max.y - worldBB.min.y;
    const bottomThreshold = worldBB.min.y + yWorldRange * 0.18;
    const xFullRange = worldBB.max.x - worldBB.min.x;

    // First pass: find minimum |X| among bottom-region vertices (inner-facing surface)
    let minAbsX = Infinity;
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr as THREE.BufferAttribute, i).applyMatrix4(mesh.matrixWorld);
      if (v.y <= bottomThreshold && Math.abs(v.x) < minAbsX) minAbsX = Math.abs(v.x);
    }

    // Second pass: collect vertices near X=0 to represent the front inner-band surface
    const xTolerance = minAbsX + xFullRange * 0.15;
    let sumY = 0, sumR = 0, engraveCount = 0;
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr as THREE.BufferAttribute, i).applyMatrix4(mesh.matrixWorld);
      if (v.y <= bottomThreshold && Math.abs(v.x) <= xTolerance) {
        sumY += v.y;
        sumR += Math.sqrt(v.x * v.x + v.z * v.z);
        engraveCount++;
      }
    }

    if (engraveCount === 0) return DEFAULT_ENGRAVE_FIT;

    const fit: EngraveFit = {
      yNorm: (sumY / engraveCount) / boundingRadius,
      radiusNorm: (sumR / engraveCount) / boundingRadius,
    };

    return fit;
  }, [scene, boundingRadius, fileUrl]);

  const gemFit = GEM_FIT_OVERRIDES[fileUrl] ?? autoDetectedGemFit;

  // Auto-scale: normalize ring to radius=1 so the Configurator's outer scale={1.5}
  // gives a consistent ~1.5-unit world radius across all ring designs.
  const autoScale = boundingRadius > 0 ? 1.0 / boundingRadius : 0.4;
  const cx = boundingCenter.x, cy = boundingCenter.y, cz = boundingCenter.z;

  // Convert GEM_FIT values (in normalised units) → model-space coords inside
  // scale={autoScale}. autoScale cancels the *boundingRadius multiplication,
  // leaving the gem at the correct world position regardless of model size.
  const gemRadius = gemFit.sizeNorm * boundingRadius;
  const gemPos: [number, number, number] = [
    -cx + gemFit.centerX * boundingRadius,
    -cy + gemFit.yNorm   * boundingRadius,
    -cz + gemFit.centerZ * boundingRadius,
  ];

  // Engraving projector position — same normalisation pattern as gemPos, expressed in the
  // band-centred space the decal host mesh lives in (band centre at origin). Front-lower arc.
  const engravePos: [number, number, number] = [
    -cx,
    -cy + autoDetectedEngraveFit.yNorm     * boundingRadius,
    -cz + autoDetectedEngraveFit.radiusNorm * boundingRadius,
  ];
  // Decal projector box (band-centred units). 4:1 W:H matches the bump canvas aspect so
  // glyphs aren't stretched; depth spans the band wall so the projection captures the surface.
  const engraveDecalScale: [number, number, number] = [
    boundingRadius * 0.60,
    boundingRadius * 0.15,
    boundingRadius * 0.50,
  ];

  // Band mesh geometry, baked to band-centred space (matches the primitive's rendered band),
  // used purely as the projection surface for the engraving Decal. Independent of the model's
  // own UVs — 4/5 ring GLBs ship without any — because Decal projects along surface normals.
  const engraveBandGeom = useMemo<THREE.BufferGeometry | null>(() => {
    if (!scene || boundingRadius <= 0) return null;
    let largestMesh: THREE.Mesh | null = null;
    let maxVol = -1;
    scene.traverse((child) => {
      const m = child as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        if (bb) {
          const vol = (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z);
          if (vol > maxVol) { maxVol = vol; largestMesh = m; }
        }
      }
    });
    if (!largestMesh) return null;
    const band = largestMesh as THREE.Mesh;
    band.updateWorldMatrix(true, false);
    const geo = band.geometry.clone();
    geo.applyMatrix4(band.matrixWorld);                                         // → loaded-scene space (matches fit maths)
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(-cx, -cy, -cz));       // → band-centred (band centre at origin)
    if (!geo.attributes.normal) geo.computeVertexNormals();                     // Decal auto-orient needs normals
    return geo;
  }, [scene, boundingRadius, cx, cy, cz]);

  // Height-map texture from the engraving string, regenerated on text / size / font change.
  const engraveBump = useMemo(
    () => makeEngravingBump(text, { sizeMul: textSizeMult, fontFamily: engravingFontFamily(fontStyle) }),
    [text, textSizeMult, fontStyle]
  );
  useEffect(() => () => { engraveBump?.dispose(); }, [engraveBump]);
  useEffect(() => () => { engraveBandGeom?.dispose(); }, [engraveBandGeom]);

  const hasEngraving = !!engraveBump && !!engraveBandGeom;

  useFrame((state) => {
    if (groupRef.current && !noSpin) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  // envMapIntensity=6: smooth sphere surfaces show environment specular more
  // prominently than faceted shapes — bump intensity so the gem reads as glossy.
  const gemMatProps = { ...stoneMaterial, envMapIntensity: 6, metalness: 0, side: THREE.DoubleSide };

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        {/*
          Scale and centering in separate groups: the centering offset [-cx,-cy,-cz]
          lives INSIDE the scaled coordinate space so net position = scale*(p-center)=0.
          The synthetic gem is also inside this group so gemRadius/gemPos (in model
          space) are correctly normalized by autoScale to world units.
        */}
        <group scale={autoScale}>
          <primitive object={styledScene} position={[-cx, -cy, -cz]} />

          {/*
            Smooth cabochon gem for round settings (rings 1, 2, 4, 5 and any
            future upload). SphereGeometry with 24×16 segments gives a visually
            smooth surface that catches environment reflections cleanly.
            Y-scale 0.58 flattens it into a polished dome rather than a full ball.
          */}
          {syntheticStone && gemFit.cut === 'round' && (
            <mesh
              position={gemPos}
              scale={[1, 0.58, 1]}
              castShadow
            >
              <sphereGeometry args={[gemRadius, 24, 16]} />
              <meshPhysicalMaterial {...gemMatProps} />
            </mesh>
          )}

          {/* Extra gem overlays (e.g. ring5 side prong settings) — same cabochon
              geometry and material as the primary gem, each with its own position. */}
          {syntheticStone && gemFit.extraGems && gemFit.extraGems.map((eg, i) => {
            const egRadius = eg.sizeNorm * boundingRadius;
            const egPos: [number, number, number] = [
              -cx + eg.centerX * boundingRadius,
              -cy + eg.yNorm   * boundingRadius,
              -cz + eg.centerZ * boundingRadius,
            ];
            return eg.cut === 'round' ? (
              <mesh key={i} position={egPos} scale={[1, 0.58, 1]} castShadow>
                <sphereGeometry args={[egRadius, 24, 16]} />
                <meshPhysicalMaterial {...gemMatProps} />
              </mesh>
            ) : (
              <group key={i} position={egPos} rotation={[0, Math.PI / 4, 0]} scale={[1, 0.62, 1]}>
                <mesh position={[0, egRadius * 0.3, 0]} castShadow>
                  <coneGeometry args={[egRadius, egRadius * 0.6, 4]} />
                  <meshPhysicalMaterial {...gemMatProps} />
                </mesh>
                <mesh position={[0, -egRadius * 0.4, 0]} rotation={[Math.PI, 0, 0]} castShadow>
                  <coneGeometry args={[egRadius, egRadius * 0.8, 4]} />
                  <meshPhysicalMaterial {...gemMatProps} />
                </mesh>
              </group>
            );
          })}

          {/*
            Princess-cut gem for square bezels (ring3 only via GEM_FIT_OVERRIDES).
            Two 4-sided cones: crown (up) + pavilion (inverted), rotated 45° on Y
            so flat faces align with the axes for a square top silhouette.
          */}
          {syntheticStone && gemFit.cut === 'square' && (
            <group
              position={gemPos}
              rotation={[0, Math.PI / 4, 0]}
              scale={[1, 0.62, 1]}
            >
              <mesh position={[0, gemRadius * 0.3, 0]} castShadow>
                <coneGeometry args={[gemRadius, gemRadius * 0.6, 4]} />
                <meshPhysicalMaterial {...gemMatProps} />
              </mesh>
              <mesh position={[0, -gemRadius * 0.4, 0]} rotation={[Math.PI, 0, 0]} castShadow>
                <coneGeometry args={[gemRadius, gemRadius * 0.8, 4]} />
                <meshPhysicalMaterial {...gemMatProps} />
              </mesh>
            </group>
          )}

          {/*
            Engraving — a bump-map Decal projected onto the band's own surface, so the
            letters are the GOLD band lit as recessed grooves (not a separate grey text
            mesh floating on top, which is what made the old text read grey AND backwards).
            The host mesh is an invisible geometry carrier (colour/depth off): it exists
            only so <Decal> has a Mesh parent whose geometry it can project onto. rotation={0}
            makes Decal auto-orient to the nearest surface normal, wrapping the curved shank.
          */}
          {hasEngraving && (
            <mesh geometry={engraveBandGeom!}>
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              <Decal position={engravePos} rotation={0} scale={engraveDecalScale} depthTest>
                <meshPhysicalMaterial
                  {...metalMaterial}
                  envMapIntensity={3}
                  bumpMap={engraveBump!}
                  bumpScale={ENGRAVE_BUMP_SCALE}
                  polygonOffset
                  polygonOffsetFactor={-10}
                />
              </Decal>
            </mesh>
          )}
        </group>
      </Float>
    </group>
  );
}

export function CustomGLBRingModel({ metalMaterial, stoneMaterial, syntheticStone = false, text, fontStyle, noSpin = false, fileUrl = '/glb-models/rings/ring1.glb', textSizeMult = 1 }: any) {
  const safeFileUrl = fileUrl || '/glb-models/rings/ring1.glb';

  return (
    <ModelErrorBoundary
      key={safeFileUrl}
      fallback={
        <ActualGLBRingModel
          metalMaterial={metalMaterial}
          stoneMaterial={stoneMaterial}
          syntheticStone={syntheticStone}
          text={text}
          fontStyle={fontStyle}
          textSizeMult={textSizeMult}
          noSpin={noSpin}
          fileUrl="/glb-models/rings/ring1.glb"
        />
      }
    >
      <ActualGLBRingModel
        metalMaterial={metalMaterial}
        stoneMaterial={stoneMaterial}
        syntheticStone={syntheticStone}
        text={text}
        fontStyle={fontStyle}
        textSizeMult={textSizeMult}
        noSpin={noSpin}
        fileUrl={safeFileUrl}
      />
    </ModelErrorBoundary>
  );
}
