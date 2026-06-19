import { useState, useMemo } from 'react';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { XRHitTest } from '@react-three/xr';
import { METALS, STONES } from '../constants';
import { CustomGLBRingModel } from './RingModels';
import { PendantModel } from './PendantModel';

export function ARViewContent({ modelType, ringStyle, metal, stone, customText, fontStyle }: any) {
  const [placement, setPlacement] = useState<THREE.Matrix4 | null>(null);
  const [locked, setLocked] = useState(false);
  const matrixHelper = useMemo(() => new THREE.Matrix4(), []);

  return (
    <>
      <ambientLight intensity={0.8} />
      <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={2} />
      <Environment preset="city" background={false} blur={0.5} />
      
      {!locked && (
        <XRHitTest 
          onResults={(results, getWorldMatrix) => {
            if (results.length > 0) {
              getWorldMatrix(matrixHelper, results[0]);
              setPlacement(matrixHelper.clone());
            }
          }} 
        />
      )}

      {placement && (
        <group 
          matrix={placement} 
          matrixAutoUpdate={false} 
          onPointerDown={() => setLocked(true)}
        >
          {/* Show a reticle overlay if not locked */}
          {!locked && (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.2, 0.25, 32]} />
              <meshBasicMaterial color="#d4af37" transparent opacity={0.6} />
            </mesh>
          )}
          
          <group position={[0, 0.2, 0]}>
            {modelType === 'ring' ? (
              <CustomGLBRingModel style={ringStyle} text={customText} metalMaterial={METALS[metal]} stoneMaterial={STONES[stone]} fontStyle={fontStyle} />
            ) : (
              <PendantModel text={customText} metalMaterial={METALS[metal]} />
            )}
          </group>
        </group>
      )}
    </>
  );
}
