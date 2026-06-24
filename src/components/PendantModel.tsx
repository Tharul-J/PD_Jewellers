import { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
import { FONTS } from '../constants';

export function PendantModel({ text, metalMaterial, fontStyle, fontBold = false, shape = 'standard' }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const fontDef = FONTS[fontStyle as keyof typeof FONTS] ?? FONTS.helvetiker;
  const fontUrl = fontBold ? fontDef.boldUrl : fontDef.url;

  const [cachedWidth, setCachedWidth] = useState(text.length * 0.26);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  const { leftLinks, rightLinks } = useMemo(() => {
    const w = shape === 'standard' ? cachedWidth : cachedWidth + 0.5;
    const yStart = shape === 'standard' ? 0.25 : 0.6;

    const lCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-w / 2, yStart, 0),
      new THREE.Vector3(-w / 2 - 0.2, 1.0, -0.3),
      new THREE.Vector3(-1.0, 3.0, -1.0)
    ]);
    const rCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(w / 2, yStart, 0),
      new THREE.Vector3(w / 2 + 0.2, 1.0, -0.3),
      new THREE.Vector3(1.0, 3.0, -1.0)
    ]);

    const createLinks = (curve: THREE.CatmullRomCurve3) => {
      const links = [];
      const numLinks = 60; // More links for realism
      for (let i = 0; i < numLinks; i++) {
        const fraction = i / (numLinks - 1);
        const pos = curve.getPoint(fraction);
        const tangent = curve.getTangent(fraction);
        
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        if (i % 2 === 0) {
            quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
        }

        const euler = new THREE.Euler().setFromQuaternion(quaternion);
        links.push({ 
          pos: [pos.x, pos.y, pos.z] as [number, number, number], 
          rotation: [euler.x, euler.y, euler.z] as [number, number, number] 
        });
      }
      return links;
    };

    return {
      leftLinks: createLinks(lCurve),
      rightLinks: createLinks(rCurve),
    };
  }, [cachedWidth, shape]);

  const heartShape = useMemo(() => {
    const s = new THREE.Shape();
    const x = 0, y = 0;
    s.moveTo( x + 5, y + 5 );
    s.bezierCurveTo( x + 5, y + 5, x + 4, y, x, y );
    s.bezierCurveTo( x - 6, y, x - 6, y + 7,x - 6, y + 7 );
    s.bezierCurveTo( x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19 );
    s.bezierCurveTo( x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7 );
    s.bezierCurveTo( x + 16, y + 7, x + 16, y, x + 10, y );
    s.bezierCurveTo( x + 7, y, x + 5, y + 5, x + 5, y + 5 );
    return s;
  }, []);

  const wingShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(10, 5, 20, 0);
    s.quadraticCurveTo(15, -5, 5, -10);
    s.quadraticCurveTo(8, -8, 12, -8);
    s.quadraticCurveTo(5, -12, -2, -15);
    s.quadraticCurveTo(2, -10, 0, 0);
    return s;
  }, []);

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group position={[0, -0.3, 0]}>
          <Center 
            position={[0, 0, 0]}
            onCentered={({ width }) => {
              if (Math.abs(width - cachedWidth) > 0.05 && width > 0) {
                setCachedWidth(width);
              }
            }}
          >
            <group>
              <Text3D
                font={fontUrl}
                size={0.4}
                height={0.08}
                curveSegments={12}
                bevelEnabled
                bevelThickness={shape === 'standard' ? 0.02 : 0.005}
                bevelSize={shape === 'standard' ? 0.01 : 0}
                bevelOffset={0}
                bevelSegments={3}
                position={[0, 0, shape === 'standard' ? 0 : 0.05]}
              >
                {text && text.trim().length > 0 ? text : 'PD'}
                <meshStandardMaterial {...metalMaterial} envMapIntensity={3} color={shape === 'standard' ? metalMaterial.color : '#333'} metalness={shape === 'standard' ? metalMaterial.metalness : 0.8} />
              </Text3D>
              
              {shape === 'heart' && (
                <mesh position={[cachedWidth / 2, -0.6, -0.05]} scale={[0.08, -0.08, 0.08]} castShadow>
                  <extrudeGeometry args={[heartShape, { depth: 1, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.1, bevelThickness: 0.1 }]} />
                  <meshPhysicalMaterial {...metalMaterial} envMapIntensity={3} />
                </mesh>
              )}

              {shape === 'wing' && (
                <mesh position={[cachedWidth / 2 - 0.4, 0.2, -0.05]} scale={[0.08, -0.08, 0.08]} castShadow>
                  <extrudeGeometry args={[wingShape, { depth: 1, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.1, bevelThickness: 0.1 }]} />
                  <meshPhysicalMaterial {...metalMaterial} envMapIntensity={3} />
                </mesh>
              )}
            </group>
          </Center>

          {/* Left jump ring */}
          <mesh position={[-cachedWidth / 2, 0.22, 0.0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <torusGeometry args={[0.04, 0.015, 32, 64]} />
            <meshPhysicalMaterial {...metalMaterial} envMapIntensity={3} />
          </mesh>

          {/* Right jump ring */}
          <mesh position={[cachedWidth / 2, 0.22, 0.0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <torusGeometry args={[0.04, 0.015, 32, 64]} />
            <meshPhysicalMaterial {...metalMaterial} envMapIntensity={3} />
          </mesh>

          {/* Left Chain Links */}
          {leftLinks.map((link, i) => (
            <mesh key={`l-${i}`} position={link.pos} rotation={link.rotation} castShadow>
              <torusGeometry args={[0.03, 0.01, 16, 32]} />
              <meshPhysicalMaterial {...metalMaterial} envMapIntensity={3} />
            </mesh>
          ))}

          {/* Right Chain Links */}
          {rightLinks.map((link, i) => (
            <mesh key={`r-${i}`} position={link.pos} rotation={link.rotation} castShadow>
              <torusGeometry args={[0.03, 0.01, 16, 32]} />
              <meshPhysicalMaterial {...metalMaterial} envMapIntensity={3} />
            </mesh>
          ))}
        </group>
      </Float>
    </group>
  );
}
