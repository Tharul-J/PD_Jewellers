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

function ActualGLBRingModel({ metalMaterial, stoneMaterial, text, fontStyle, fontBold = false, fontItalic = false, noSpin = false, fileUrl }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, maxZSize, boundingRadius, boundingCenter } = useLoadedModel(fileUrl);

  const styledScene = useMemo(() => {
    if (!scene) return new THREE.Group();
    const localClone = scene.clone();

    const metalMat = new THREE.MeshPhysicalMaterial({ ...metalMaterial, envMapIntensity: 3 });
    const stoneMat = new THREE.MeshPhysicalMaterial({ ...stoneMaterial, envMapIntensity: 2 });

    localClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        let isRingBody = false;
        if (mesh.geometry.boundingBox) {
           const bbox = mesh.geometry.boundingBox;
           const zDepth = bbox.max.z - bbox.min.z;
           if (zDepth > (maxZSize * 0.8) || zDepth > 15) {
              isRingBody = true;
           }
        }

        if (isRingBody) {
          mesh.material = metalMat;
        } else {
          mesh.material = stoneMat;
        }
      }
    });

    return localClone;
  }, [scene, metalMaterial, stoneMaterial, maxZSize]);

  // Auto-scale: normalize ring to radius=1 so the Configurator's outer scale={1.5}
  // gives a consistent ~1.5-unit world radius across all ring designs.
  const autoScale = boundingRadius > 0 ? 1.0 / boundingRadius : 0.4;
  // Cancel out any off-centre pivot from the exporter
  const cx = boundingCenter.x, cy = boundingCenter.y, cz = boundingCenter.z;

  useFrame((state) => {
    if (groupRef.current && !noSpin) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  const fontDef = FONTS[fontStyle as keyof typeof FONTS] ?? FONTS.helvetiker;
  const fontUrl = fontBold ? fontDef.boldUrl : fontDef.url;

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <primitive object={styledScene} position={[-cx, -cy, -cz]} scale={autoScale} />
        {/* Inner Engraving */}
        {text && text.trim().length > 0 && (
          <group position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, fontItalic ? -0.3 : 0]}>
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

export function CustomGLBRingModel({ metalMaterial, stoneMaterial, text, fontStyle, fontBold = false, fontItalic = false, noSpin = false, fileUrl = '/glb-models/rings/RI0.glb' }: any) {
  const safeFileUrl = fileUrl || '/glb-models/rings/RI0.glb';

  return (
    <ModelErrorBoundary
      key={safeFileUrl}
      fallback={
        <ActualGLBRingModel
          metalMaterial={metalMaterial}
          stoneMaterial={stoneMaterial}
          text={text}
          fontStyle={fontStyle}
          fontBold={fontBold}
          fontItalic={fontItalic}
          noSpin={noSpin}
          fileUrl="/glb-models/rings/RI0.glb"
        />
      }
    >
      <ActualGLBRingModel
        metalMaterial={metalMaterial}
        stoneMaterial={stoneMaterial}
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
