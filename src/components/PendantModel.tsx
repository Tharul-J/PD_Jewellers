import { Suspense, useState, useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Float, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { FONTS } from '../constants';

// ── Tag constants (portrait orientation, fixed-size monogram plate) ──────────
const TAG_W     = 0.88;
const TAG_H     = 1.25;   // taller than wide → portrait
const TAG_R     = 0.12;
const TAG_DEPTH = 0.10;
const TAG_RING_Y = TAG_H / 2 + 0.04;   // 0.665 — bail above top edge

// ── TagInner: loads font via Suspense, builds cut-through geometry ────────────
function TagInner({ fontUrl, displayText, metalMaterial, textDirection = 'horizontal' }: {
  fontUrl: string; displayText: string; metalMaterial: any; textDirection?: 'horizontal' | 'vertical';
}) {
  const font = useLoader(FontLoader as any, fontUrl);

  const geometry = useMemo(() => {
    // Build rounded-rectangle outer shape
    const hw = TAG_W / 2, hh = TAG_H / 2, r = TAG_R;
    const tagShape = new THREE.Shape();
    tagShape.moveTo(-hw + r, -hh);
    tagShape.lineTo( hw - r, -hh);
    tagShape.quadraticCurveTo( hw, -hh,  hw, -hh + r);
    tagShape.lineTo( hw,  hh - r);
    tagShape.quadraticCurveTo( hw,  hh,  hw - r,  hh);
    tagShape.lineTo(-hw + r,  hh);
    tagShape.quadraticCurveTo(-hw,  hh, -hw,  hh - r);
    tagShape.lineTo(-hw, -hh + r);
    tagShape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

    if (textDirection === 'vertical') {
      // ── Vertical layout: stack each character individually top-to-bottom ──
      const chars = Array.from(displayText);
      // Generate and measure each glyph independently
      const glyphData = chars.map((ch) => {
        const shapes: THREE.Shape[] = (font as any).generateShapes(ch, 0.5);
        const geo = new THREE.ShapeGeometry(shapes);
        geo.computeBoundingBox();
        const bb = geo.boundingBox!;
        geo.dispose();
        return {
          shapes,
          w: bb.max.x - bb.min.x,
          h: bb.max.y - bb.min.y,
          cx: (bb.max.x + bb.min.x) / 2,
          cy: (bb.max.y + bb.min.y) / 2,
        };
      });

      const LINE_GAP = 0.08;   // extra vertical gap between stacked glyphs
      const totalH = glyphData.reduce((s, g) => s + g.h, 0) + LINE_GAP * (glyphData.length - 1);
      const maxW   = glyphData.reduce((s, g) => Math.max(s, g.w), 0);

      const scale = Math.min(
        (TAG_W * 0.68) / maxW,
        (TAG_H * 0.52) / totalH,
        2.2,
      );

      // Stack top-to-bottom: first glyph at top, last at bottom, all centered on X
      let curY = (totalH / 2) * scale;   // start at top in scaled space
      for (const g of glyphData) {
        curY -= g.h * scale / 2;  // move to this glyph's center-Y
        for (const lShape of g.shapes) {
          const { shape: outerPts } = lShape.extractPoints(48);
          const hole = new THREE.Path();
          outerPts.forEach((p, i) => {
            const x = (p.x - g.cx) * scale;
            const y = (p.y - g.cy) * scale + curY;
            if (i === 0) hole.moveTo(x, y); else hole.lineTo(x, y);
          });
          hole.closePath();
          tagShape.holes.push(hole);
        }
        curY -= g.h * scale / 2 + LINE_GAP * scale;  // advance past this glyph + gap
      }
    } else {
      // ── Horizontal layout (default): lay out all characters on a single baseline ──
      const letterShapes: THREE.Shape[] = (font as any).generateShapes(displayText, 0.5);

      const measureGeo = new THREE.ShapeGeometry(letterShapes);
      measureGeo.computeBoundingBox();
      const bb = measureGeo.boundingBox!;
      const textW  = bb.max.x - bb.min.x;
      const textH  = bb.max.y - bb.min.y;
      const textCX = (bb.max.x + bb.min.x) / 2;
      const textCY = (bb.max.y + bb.min.y) / 2;
      measureGeo.dispose();

      const scale = Math.min(
        (TAG_W * 0.68) / textW,
        (TAG_H * 0.52) / textH,
        2.2,
      );

      for (const lShape of letterShapes) {
        const { shape: outerPts } = lShape.extractPoints(48);
        const hole = new THREE.Path();
        outerPts.forEach((p, i) => {
          const x = (p.x - textCX) * scale;
          const y = (p.y - textCY) * scale;
          if (i === 0) hole.moveTo(x, y); else hole.lineTo(x, y);
        });
        hole.closePath();
        tagShape.holes.push(hole);
      }
    }

    return new THREE.ExtrudeGeometry(tagShape, {
      depth:          TAG_DEPTH,
      bevelEnabled:   true,
      bevelThickness: 0.006,
      bevelSize:      0.005,
      bevelSegments:  2,
      curveSegments:  16,
    });
  }, [font, displayText, textDirection]);

  return (
    <mesh geometry={geometry} position={[0, 0, -TAG_DEPTH]} castShadow receiveShadow>
      <meshPhysicalMaterial
        {...metalMaterial}
        envMapIntensity={4}
        roughness={Math.min((metalMaterial.roughness ?? 0.05) + 0.05, 0.3)}
        metalness={metalMaterial.metalness ?? 1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Main pendant component ────────────────────────────────────────────────────
export function PendantModel({ text, metalMaterial, fontStyle, fontBold = false, fontItalic = false, shape = 'standard', textDirection = 'horizontal' }: any) {
  const groupRef = useRef<THREE.Group>(null);

  const fontKey = (fontStyle && fontStyle in FONTS) ? fontStyle : 'cinzel';
  const fontDef  = FONTS[fontKey as keyof typeof FONTS];
  const fontUrl  = fontBold ? fontDef.boldUrl : fontDef.url;

  const [cachedWidth,  setCachedWidth]  = useState(text.length * 0.3);
  const [cachedHeight, setCachedHeight] = useState(0.5);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.18;
    }
  });

  // Y of text top edge after Center centering — derived from measured height so corner
  // rings land at the real top-edge of whatever font/weight/letters are displayed.
  const ATTACH_Y = cachedHeight / 2;

  // Heart dimensions (scale proportional to text width so heart always frames the text)
  const heartScale = Math.max(cachedWidth + 0.4, 0.9);
  const HEART_VNOT = heartScale * 0.38;   // Y of V-notch — single bail attachment

  // Chain link arrays
  const { leftLinks, rightLinks, singleLinks } = useMemo(() => {
    const w = cachedWidth;

    const lCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-w / 2 + 0.04, ATTACH_Y, 0),
      new THREE.Vector3(-w / 2 - 0.02, 1.5,      0),
      new THREE.Vector3(-w / 2 - 0.04, 3.2,      0),
    ]);
    const rCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(w / 2 - 0.04, ATTACH_Y, 0),
      new THREE.Vector3(w / 2 + 0.02, 1.5,      0),
      new THREE.Vector3(w / 2 + 0.04, 3.2,      0),
    ]);

    const hs     = Math.max(cachedWidth + 0.4, 0.9);
    const startY = shape === 'tag'
      ? TAG_RING_Y + 0.06                          // fixed bail position for tag
      : hs * 0.38 + 0.06;                          // V-notch of heart + clearance
    const cCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, startY, 0),
      new THREE.Vector3(0, 1.8,   0),
      new THREE.Vector3(0, 3.2,   0),
    ]);

    const build = (curve: THREE.CatmullRomCurve3) => {
      const out: { pos: [number,number,number]; rot: [number,number,number] }[] = [];
      const N = 65;
      for (let i = 0; i < N; i++) {
        const t   = i / (N - 1);
        const pos = curve.getPoint(t);
        const tan = curve.getTangent(t);
        const q   = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
        if (i % 2 === 0) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
        const e = new THREE.Euler().setFromQuaternion(q);
        out.push({ pos: [pos.x, pos.y, pos.z], rot: [e.x, e.y, e.z] });
      }
      return out;
    };

    return {
      leftLinks:   shape === 'standard' ? build(lCurve) : [],
      rightLinks:  shape === 'standard' ? build(rCurve) : [],
      singleLinks: shape !== 'standard' ? build(cCurve) : [],
    };
  }, [cachedWidth, cachedHeight, shape]);

  // Heart outline shape (bezier, symmetric, centered at origin)
  const heartShapeGeom = useMemo(() => {
    const sc = heartScale;
    const s = new THREE.Shape();
    s.moveTo(0, -sc * 0.50);
    s.bezierCurveTo(-sc * 0.10, -sc * 0.30, -sc * 0.50, -sc * 0.20, -sc * 0.50,  sc * 0.10);
    s.bezierCurveTo(-sc * 0.50,  sc * 0.40, -sc * 0.10,  sc * 0.55,  0,           sc * 0.35);
    s.bezierCurveTo( sc * 0.10,  sc * 0.55,  sc * 0.50,  sc * 0.40,  sc * 0.50,   sc * 0.10);
    s.bezierCurveTo( sc * 0.50, -sc * 0.20,  sc * 0.10, -sc * 0.30,  0,          -sc * 0.50);
    return s;
  }, [heartScale]);

  const metalMat = <meshPhysicalMaterial {...metalMaterial} envMapIntensity={5} />;
  const displayText = (text && text.trim().length > 0) ? text.toUpperCase() : 'PD';

  const onMeasured = ({ width, height }: { width: number; height: number }) => {
    if (width  > 0 && Math.abs(width  - cachedWidth)  > 0.04) setCachedWidth(width);
    if (height > 0 && Math.abs(height - cachedHeight) > 0.02) setCachedHeight(height);
  };

  const textProps = {
    font:           fontUrl,
    size:           0.5,
    height:         0.05,
    curveSegments:  32,
    bevelEnabled:   true,
    bevelThickness: 0.012,
    bevelSize:      0.008,
    bevelOffset:    0,
    bevelSegments:  4,
    letterSpacing:  -0.02,
  } as const;

  const links = (arr: { pos: [number,number,number]; rot: [number,number,number] }[]) =>
    arr.map((l, i) => (
      <mesh key={i} position={l.pos} rotation={l.rot} castShadow>
        <torusGeometry args={[0.032, 0.011, 16, 32]} />
        {metalMat}
      </mesh>
    ));

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={0.08} floatIntensity={0.35}>
        <group position={[0, -0.15, 0]}>

          {/* ════ STANDARD: thin text, two-strand chain, rings tucked into letter corners ════ */}
          {shape === 'standard' && (<>
            <Center onCentered={onMeasured}>
              <group rotation={[0, 0, fontItalic ? -0.42 : 0]}>
                <Text3D {...textProps}>
                  {displayText}
                  <meshPhysicalMaterial {...metalMaterial} envMapIntensity={5}
                    roughness={metalMaterial.roughness ?? 0.05} metalness={metalMaterial.metalness ?? 1} />
                </Text3D>
              </group>
            </Center>

            {/* Rings inset 0.04 into letter corners; z=0 centers ring in letter depth */}
            <mesh position={[-cachedWidth / 2 + 0.04, ATTACH_Y, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <torusGeometry args={[0.055, 0.018, 32, 64]} />
              {metalMat}
            </mesh>
            <mesh position={[cachedWidth / 2 - 0.04, ATTACH_Y, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <torusGeometry args={[0.055, 0.018, 32, 64]} />
              {metalMat}
            </mesh>

            {links(leftLinks)}
            {links(rightLinks)}
          </>)}

          {/* ════ HEART: backing plate + raised text + single bail at V-notch ════ */}
          {shape === 'heart' && (<>
            <mesh position={[0, 0, -0.10]} castShadow>
              <extrudeGeometry args={[heartShapeGeom, {
                depth: 0.10, bevelEnabled: true,
                bevelThickness: 0.008, bevelSize: 0.006,
                bevelSegments: 3, curveSegments: 24,
              }]} />
              <meshPhysicalMaterial {...metalMaterial} envMapIntensity={3}
                roughness={Math.min((metalMaterial.roughness ?? 0.05) + 0.07, 0.35)}
                metalness={metalMaterial.metalness ?? 1} />
            </mesh>

            {/* Front text */}
            <Center onCentered={onMeasured}>
              <group rotation={[0, 0, fontItalic ? -0.42 : 0]}>
                <Text3D {...textProps}>
                  {displayText}
                  <meshPhysicalMaterial {...metalMaterial} envMapIntensity={6}
                    roughness={metalMaterial.roughness ?? 0.05} metalness={metalMaterial.metalness ?? 1} />
                </Text3D>
              </group>
            </Center>

            {/* Back text — rotated PI on Y so it reads correctly from behind */}
            <group position={[0, 0, -0.10]} rotation={[0, Math.PI, 0]}>
              <Center>
                <group rotation={[0, 0, fontItalic ? -0.42 : 0]}>
                  <Text3D {...textProps}>
                    {displayText}
                    <meshPhysicalMaterial {...metalMaterial} envMapIntensity={6}
                      roughness={metalMaterial.roughness ?? 0.05} metalness={metalMaterial.metalness ?? 1} />
                  </Text3D>
                </group>
              </Center>
            </group>

            <mesh position={[0, HEART_VNOT, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.055, 0.018, 32, 64]} />
              {metalMat}
            </mesh>

            {links(singleLinks)}
          </>)}

          {/* ════ TAG: portrait rounded-rectangle with letters cut THROUGH the metal ════ */}
          {shape === 'tag' && (<>
            {/* TagInner suspends until font loads, then builds the cut-through geometry */}
            <Suspense fallback={
              // Plain plate shown during font load (usually instant — font already cached)
              <mesh position={[0, 0, -TAG_DEPTH]} castShadow>
                <extrudeGeometry args={[(() => {
                  const hw = TAG_W/2, hh = TAG_H/2, r = TAG_R;
                  const s = new THREE.Shape();
                  s.moveTo(-hw+r,-hh); s.lineTo(hw-r,-hh);
                  s.quadraticCurveTo(hw,-hh,hw,-hh+r); s.lineTo(hw,hh-r);
                  s.quadraticCurveTo(hw,hh,hw-r,hh); s.lineTo(-hw+r,hh);
                  s.quadraticCurveTo(-hw,hh,-hw,hh-r); s.lineTo(-hw,-hh+r);
                  s.quadraticCurveTo(-hw,-hh,-hw+r,-hh);
                  return s;
                })(), { depth: TAG_DEPTH, bevelEnabled: false }]} />
                <meshPhysicalMaterial {...metalMaterial} envMapIntensity={4} />
              </mesh>
            }>
              <TagInner fontUrl={fontUrl} displayText={displayText} metalMaterial={metalMaterial} textDirection={textDirection} />
            </Suspense>

            {/* Single bail at top-center of tag */}
            <mesh position={[0, TAG_RING_Y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.055, 0.018, 32, 64]} />
              {metalMat}
            </mesh>

            {links(singleLinks)}
          </>)}

        </group>
      </Float>
    </group>
  );
}
