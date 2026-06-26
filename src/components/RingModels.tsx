import { useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
import { FONTS } from '../constants';
import { useLoadedModel } from '../utils/modelLoader';

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
};

// Manual overrides — only entries that need a non-default cut shape or precisely
// hand-tuned placement that auto-detection cannot infer from geometry alone.
// Ring3 must stay here: its square bezel needs the princess-cut two-cone profile.
// Rings 1, 2, 4, 5 are omitted — they fall through to runtime auto-detection.
const GEM_FIT_OVERRIDES: Record<string, GemFit> = {
  '/glb-models/rings/ring3.glb': { cut: 'square', centerX: -0.36, centerZ: -0.27, yNorm: 1.05, sizeNorm: 0.34 },
};

const DEFAULT_GEM_FIT: GemFit = { cut: 'round', centerX: 0, centerZ: 0, yNorm: 0.75, sizeNorm: 0.28 };

function ActualGLBRingModel({ metalMaterial, stoneMaterial, syntheticStone = false, text, fontStyle, fontBold = false, fontItalic = false, noSpin = false, fileUrl }: any) {
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

    console.log(
      `[GemFit auto] ${fileUrl.split('/').pop()} →`,
      `yNorm=${detected.yNorm.toFixed(3)}`,
      `cx=${detected.centerX.toFixed(3)}`,
      `cz=${detected.centerZ.toFixed(3)}`,
      `size=${detected.sizeNorm.toFixed(3)}`,
      `(${count} top vertices)`,
    );

    return detected;
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

  useFrame((state) => {
    if (groupRef.current && !noSpin) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  const fontDef = FONTS[fontStyle as keyof typeof FONTS] ?? FONTS.helvetiker;
  const fontUrl = fontBold ? fontDef.boldUrl : fontDef.url;

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
        </group>

        {/* Inner Engraving — Float space (outside autoScale), at bottom of ring */}
        {text && text.trim().length > 0 && (
          <group position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, fontItalic ? -0.5 : 0]}>
             <Center position={[0, 0, 0]}>
                <Text3D
                  font={fontUrl}
                  size={0.12}
                  height={0.01}
                  curveSegments={12}
                  bevelEnabled
                  bevelThickness={0.005}
                  bevelSize={0.005}
                  bevelOffset={0}
                  bevelSegments={2}
                >
                  {text}
                  <meshPhysicalMaterial {...metalMaterial} envMapIntensity={2} color="#888" roughness={0.3} metalness={1} />
                </Text3D>
             </Center>
          </group>
        )}
      </Float>
    </group>
  );
}

export function CustomGLBRingModel({ metalMaterial, stoneMaterial, syntheticStone = false, text, fontStyle, fontBold = false, fontItalic = false, noSpin = false, fileUrl = '/glb-models/rings/ring1.glb' }: any) {
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
          fontBold={fontBold}
          fontItalic={fontItalic}
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
        fontBold={fontBold}
        fontItalic={fontItalic}
        noSpin={noSpin}
        fileUrl={safeFileUrl}
      />
    </ModelErrorBoundary>
  );
}
