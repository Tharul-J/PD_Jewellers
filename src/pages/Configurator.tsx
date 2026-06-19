import { Suspense, useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Environment, OrbitControls, ContactShadows, Float, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { Check, Glasses, Box, Type, Heart, Save } from 'lucide-react';
import ARTryOnModal from '../components/ARTryOnModal';
import { SizeGuideModal } from '../components/SizeGuideModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { XR, createXRStore, XRHitTest } from '@react-three/xr';
import { METALS, STONES, FONTS } from '../constants';
import { CustomGLBRingModel } from '../components/RingModels';
import { prefetchModel } from '../utils/modelLoader';

const store = createXRStore();

const DEFAULT_RING_STYLES = [
  { id: 'custom-glb', name: 'Diamond Engagement Ring (Custom)' },
];

function renderRingModel(style: string, props: any) {
  return <CustomGLBRingModel {...props} />;
}

function PendantModel({ text, metalMaterial, fontStyle, shape = 'standard' }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const textGroupRef = useRef<THREE.Group>(null);
  const fontUrl = FONTS[fontStyle as keyof typeof FONTS]?.url || FONTS.helvetiker.url;

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
                {text || 'PD'}
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

function ARViewContent({ modelType, ringStyle, metal, stone, customText, fontStyle }: any) {
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
              renderRingModel(ringStyle, { text: customText, metalMaterial: METALS[metal], stoneMaterial: STONES[stone], fontStyle })
            ) : (
              <PendantModel text={customText} metalMaterial={METALS[metal]} />
            )}
          </group>
        </group>
      )}
      
      {/* If no placement yet (searching for planes), we can show some instructions or just wait */}
    </>
  );
}

export default function Configurator() {
  const [modelType, setModelType] = useState<'ring' | 'pendant'>('ring');
  const [dynamicStyles, setDynamicStyles] = useState<{id: string, name: string, fileUrl?: string, basePrice?: number}[]>(DEFAULT_RING_STYLES);
  const [ringStyle, setRingStyle] = useState(DEFAULT_RING_STYLES[0].id);
  const [isARModalOpen, setIsARModalOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [customText, setCustomText] = useState('PD');
  const [engraveWant, setEngraveWant] = useState(false);
  const [pendantShape, setPendantShape] = useState<'standard'|'heart'|'wing'>('standard');
  const [metal, setMetal] = useState<keyof typeof METALS>('silver');
  const [stone, setStone] = useState<keyof typeof STONES>('aquamarine');
  const [fontStyle, setFontStyle] = useState<keyof typeof FONTS>('helvetiker');
  const [ringSize, setRingSize] = useState('US 7');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const { addToCart } = useCart();
  const { toggleWishlistItem, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoadingModels(true);
    fetch('/api/models').then(res => {
      if (!res.ok) throw new Error('API Error');
      return res.json();
    }).then(data => {
      if (Array.isArray(data)) {
        const dbModels = data.filter(m => m.isActive !== false).map(m => ({
          id: `custom-glb-${m._id}`,
          name: m.name,
          category: m.category,
          basePrice: m.basePrice,
          fileUrl: m.glbUrl
        }));
        setDynamicStyles([...DEFAULT_RING_STYLES, ...dbModels.filter(m => m.category === 'ring')]);
        
        // Prefetch custom models in background
        setTimeout(() => {
          dbModels.forEach(m => {
            if (m.fileUrl) prefetchModel(m.fileUrl);
          });
        }, 1000);
      }
    }).catch(err => console.error("Could not fetch models", err)).finally(() => {
        setIsLoadingModels(false);
    });
  }, []);

  const getCustomId = () => `custom-${modelType}-${ringStyle}-${metal}-${stone}-${fontStyle}-${customText}-${ringSize}`;
  const isWished = isInWishlist(getCustomId());
  
  const currentStyleDef = dynamicStyles.find(r => r.id === ringStyle);

  const calculatePrice = () => {
    let basePrice = currentStyleDef?.basePrice || (modelType === 'pendant' ? 12000 : 25000);
    
    const metalMultiplier = METALS[metal]?.priceMultiplier || 1;
    let finalPrice = basePrice * metalMultiplier;
    
    if (modelType === 'ring') {
       finalPrice += STONES[stone]?.price || 0;
    }
    
    return Math.round(finalPrice);
  };

  const handleAddToCart = () => {
    const isRing = modelType === 'ring';
    const ringNameInfo = currentStyleDef?.name || 'Custom Ring';
    const itemName = isRing ? `${ringNameInfo} ("${customText}")` : `Name Pendant ("${customText}")`;
    const finalPrice = calculatePrice();

    addToCart({
      id: getCustomId(),
      name: itemName,
      price: finalPrice,
      image: isRing 
        ? 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1599643478514-4a4802c61e44?auto=format&fit=crop&q=80',
      options: {
        material: METALS[metal].name,
        text: customText,
        font: FONTS[fontStyle].name,
        ...(isRing && { stone: STONES[stone].name, size: ringSize }),
      }
    });
  };

  const handleToggleWishlist = () => {
    const isRing = modelType === 'ring';
    const ringNameInfo = currentStyleDef?.name || 'Custom Ring';
    const itemName = isRing ? `${ringNameInfo} ("${customText}")` : `Name Pendant ("${customText}")`;
    const finalPrice = calculatePrice();

    toggleWishlistItem({
      productId: getCustomId(),
      name: itemName,
      price: finalPrice.toString(),
      image: isRing 
        ? 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1599643478514-4a4802c61e44?auto=format&fit=crop&q=80',
      category: isRing ? 'Custom Rings' : 'Custom Pendant',
      isCustom: true
    });
  };

  const handleSaveConfiguration = async () => {
    if (!user) {
      alert("Please log in to save custom designs.");
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/users/configurations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          type: modelType,
          ringSize: modelType === 'ring' ? ringSize : undefined,
          metal,
          stone,
          engravingText: (modelType === 'ring' && engraveWant) || modelType === 'pendant' ? customText : undefined,
          fontStyle,
          pendantShape: modelType === 'pendant' ? pendantShape : undefined,
          price: calculatePrice()
        })
      });
      
      if (response.ok) {
        alert('Custom design saved to your profile!');
      } else {
        const data = await response.json();
        alert('Error: ' + data.message);
      }
    } catch (e) {
      alert('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col lg:flex-row">
      {/* 3D Viewer */}
      <div className="flex-1 bg-white relative h-[50vh] lg:h-auto border-r border-[rgba(26,26,26,0.1)] flex items-center justify-center">
        {isLoadingModels ? (
           <div className="animate-pulse w-full h-full flex items-center justify-center bg-gray-50">
             <div className="flex flex-col items-center">
               <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
               <p className="mt-4 text-xs uppercase tracking-widest text-gray-400">Loading Configuration...</p>
             </div>
           </div>
        ) : (
          <>
            <div className="absolute top-6 border border-black/10 right-6 z-10 bg-white/80 p-3 rounded-full text-[10px] uppercase tracking-widest backdrop-blur-sm">
              Drag to Revolve
            </div>
            <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }}>
              <XR store={store}>
                <ambientLight intensity={0.8} />
                <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={1} />
                <Suspense fallback={<Html center><LoadingSpinner fullScreen={false} /></Html>}>
                  <group position={[0, 0, -0.6]} scale={1.5}>
                    {modelType === 'ring' ? (
                       renderRingModel(ringStyle, { text: engraveWant ? customText : undefined, metalMaterial: METALS[metal], stoneMaterial: STONES[stone], fontStyle, fileUrl: currentStyleDef?.fileUrl })
                    ) : (
                      <PendantModel 
                        text={customText} 
                        metalMaterial={METALS[metal]} 
                        fontStyle={fontStyle}
                        shape={pendantShape}
                      />
                    )}
                  </group>
                  <Environment preset="city" background blur={0.5} />
                  <ContactShadows position={[0, -1.8, 0]} opacity={0.5} scale={10} blur={2} far={4} />
                </Suspense>
                <OrbitControls 
                  enablePan={false} 
                  enableZoom={true} 
                  minPolarAngle={Math.PI/4} 
                  maxPolarAngle={Math.PI/2} 
                  enableDamping={true}
                  dampingFactor={0.05}
                />
              </XR>
            </Canvas>
          </>
        )}
      </div>

      {/* Controls Panel */}
      <div className="w-full lg:w-[450px] bg-[var(--color-paper)] flex flex-col h-[50vh] lg:h-auto border-l border-white/50 shadow-xl overflow-y-auto">
        {isLoadingModels ? (
          <div className="p-10 flex-1 animate-pulse">
            <div className="h-3 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 w-64 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 w-40 bg-gray-200 rounded mb-12"></div>
            
            <div className="h-4 w-24 bg-gray-200 rounded mb-6"></div>
            <div className="flex gap-4 mb-10">
              <div className="h-12 flex-1 bg-gray-200 rounded"></div>
              <div className="h-12 flex-1 bg-gray-200 rounded"></div>
            </div>
            
            <div className="h-4 w-24 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="h-20 w-full bg-gray-200 rounded"></div>
              <div className="h-20 w-full bg-gray-200 rounded"></div>
              <div className="h-20 w-full bg-gray-200 rounded"></div>
              <div className="h-20 w-full bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <>
          <div className="p-10 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-4">Bespoke Design</p>
          <h1 className="text-4xl font-serif mb-2">
            {modelType === 'ring' ? (currentStyleDef?.name || 'Signature Ring') : 'Name Pendant'}
          </h1>
          <p className="font-serif text-2xl opacity-60 mb-10">
            ${modelType === 'ring' ? (currentStyleDef?.basePrice || (ringStyle.includes('band') ? '1,800' : '5,400')) : '1,200'}
          </p>

          <div className="mb-10">
            <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2">Model</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => setModelType('ring')}
                className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors border ${modelType === 'ring' ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white' : 'border-black/10 hover:border-black/50'}`}
              >
                Ring
              </button>
              <button 
                onClick={() => setModelType('pendant')}
                className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors border ${modelType === 'pendant' ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white' : 'border-black/10 hover:border-black/50'}`}
              >
                Pendant
              </button>
            </div>
          </div>

          {modelType === 'ring' && (
            <div className="mb-10">
              <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
                <span>Ring Design</span>
                <span className="opacity-50">{currentStyleDef?.name}</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {dynamicStyles.map((styleOption) => (
                  <button
                    key={styleOption.id}
                    onClick={() => setRingStyle(styleOption.id)}
                    className={`py-3 px-4 text-xs tracking-widest transition-colors border flex flex-col items-center gap-1 ${
                      ringStyle === styleOption.id ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'
                    }`}
                  >
                    <span>{styleOption.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Metal Option */}
          <div className="mb-10">
            <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
              <span>Metal</span>
              <span className="opacity-50">{METALS[metal].name}</span>
            </h3>
            <div className="flex gap-4">
              {(Object.keys(METALS) as Array<keyof typeof METALS>).map((key) => (
                <button
                  key={key}
                  onClick={() => setMetal(key)}
                  className={`w-12 h-12 rounded-full border-2 p-1 transition-all ${
                    metal === key ? 'border-[var(--color-ink)]' : 'border-transparent'
                  }`}
                >
                  <div 
                    className="w-full h-full rounded-full" 
                    style={{ backgroundColor: METALS[key].color }}
                  >
                    {metal === key && <Check className="w-full h-full p-2 text-white/50 mix-blend-difference" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stone Option */}
          {modelType === 'ring' && (
            <div className="mb-10">
              <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
                <span>Center Stone</span>
                <span className="opacity-50">{STONES[stone].name}</span>
              </h3>
              <div className="flex gap-4 cursor-pointer">
                {(Object.keys(STONES) as Array<keyof typeof STONES>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setStone(key)}
                    className={`w-12 h-12 rounded-full border-2 p-1 transition-all ${
                      stone === key ? 'border-[var(--color-ink)]' : 'border-transparent'
                    }`}
                  >
                    <div 
                      className="w-full h-full rounded-full border border-black/10 shadow-inner" 
                      style={{ backgroundColor: STONES[key].color }}
                    >
                      {stone === key && <Check className="w-full h-full p-2 text-black/50 mix-blend-difference" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Option (Rings only) */}
          {modelType === 'ring' && (
            <div className="mb-10">
              <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between items-center">
                <span>Ring Size</span>
                <button 
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-[var(--color-gold)] uppercase tracking-wider text-[10px] font-bold hover:underline"
                >
                  Size Guide
                </button>
              </h3>
              <select 
                value={ringSize}
                onChange={(e) => setRingSize(e.target.value)}
                className="w-full p-4 bg-white border border-black/10 focus:outline-none focus:border-[var(--color-ink)] uppercase tracking-widest text-sm appearance-none"
              >
                <option value="US 4">US 4 (14.8mm)</option>
                <option value="US 5">US 5 (15.7mm)</option>
                <option value="US 6">US 6 (16.5mm)</option>
                <option value="US 7">US 7 (17.3mm)</option>
                <option value="US 8">US 8 (18.1mm)</option>
                <option value="US 9">US 9 (18.9mm)</option>
              </select>
            </div>
          )}

          {/* Engraving & Fonts */}
          {modelType === 'ring' ? (
            <div className="mb-10 border border-black/10 p-5 rounded-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-widest font-semibold">Add Custom Engraving</span>
                <button 
                  onClick={() => setEngraveWant(!engraveWant)}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${engraveWant ? 'bg-[var(--color-ink)]' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${engraveWant ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              
              {engraveWant && (
                <div className="mt-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest font-semibold mb-2 flex justify-between">
                      <span>Engraving Text</span>
                      <span className="opacity-50">{customText.length}/10</span>
                    </h3>
                    <input
                      type="text"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value.slice(0, 10))}
                      className="w-full p-3 bg-white border border-black/10 focus:outline-none focus:border-[var(--color-ink)] uppercase tracking-widest text-sm"
                      placeholder="Enter Text..."
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-xs uppercase tracking-widest font-semibold mb-2 flex justify-between">
                      <span>Font Style</span>
                      <span className="opacity-50">{FONTS[fontStyle].name}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(FONTS) as Array<keyof typeof FONTS>).map((key) => (
                        <button
                          key={key}
                          onClick={() => setFontStyle(key)}
                          className={`py-2 px-3 text-[10px] tracking-widest transition-colors border flex items-center gap-2 ${
                            fontStyle === key ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'
                          }`}
                        >
                          <Type className="w-3 h-3 opacity-50" />
                          {FONTS[key].name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Pendant Properties */}
              <div className="mb-10">
                <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
                  <span>Pendant Shape</span>
                  <span className="opacity-50 capitalize">{pendantShape}</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['standard', 'heart', 'wing'] as const).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => setPendantShape(shape)}
                      className={`py-3 px-4 text-xs tracking-widest transition-colors border flex flex-col items-center gap-1 capitalize ${
                        pendantShape === shape ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
                  <span>Custom Text</span>
                  <span className="opacity-50">{customText.length}/10</span>
                </h3>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value.slice(0, 10))}
                  className="w-full p-4 bg-white border border-black/10 focus:outline-none focus:border-[var(--color-ink)] uppercase tracking-widest text-sm"
                  placeholder="Enter Name..."
                />
              </div>

              <div className="mb-10">
                <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
                  <span>Font Style</span>
                  <span className="opacity-50">{FONTS[fontStyle].name}</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FONTS) as Array<keyof typeof FONTS>).map((key) => (
                    <button
                      key={key}
                      onClick={() => setFontStyle(key)}
                      className={`py-3 px-4 text-xs tracking-widest transition-colors border flex items-center gap-2 ${
                        fontStyle === key ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'
                      }`}
                    >
                      <Type className="w-3 h-3 opacity-50" />
                      {FONTS[key].name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-[rgba(26,26,26,0.1)] bg-white/30 sticky bottom-0">
          <div className="flex justify-between items-end mb-4">
            <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Estimated Price:</span>
            <span className="font-serif text-2xl text-[var(--color-ink)]">Starts from LKR {calculatePrice().toLocaleString()}</span>
          </div>
          <div className="flex gap-2 mb-2">
            <button 
              onClick={handleAddToCart}
              className="flex-1 bg-[var(--color-ink)] text-[var(--color-sand)] py-4 uppercase tracking-[0.2em] text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Add to Bag
            </button>
            <button 
              onClick={handleSaveConfiguration}
              disabled={isSaving}
              className="flex-1 bg-gold-gradient text-white py-4 uppercase tracking-[0.2em] text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Design'}
            </button>
            <button 
              onClick={handleToggleWishlist}
              className="w-14 flex items-center justify-center border-2 border-[var(--color-orange)] transition-colors active:scale-95"
            >
               <Heart size={20} fill={isWished ? "var(--color-orange)" : "none"} color={isWished ? "var(--color-orange)" : "var(--color-orange-dark)"} />
            </button>
          </div>
          <button 
            onClick={() => store.enterAR()}
            className="w-full border-2 border-[var(--color-orange)] text-[var(--color-orange-dark)] py-4 uppercase tracking-[0.2em] text-xs font-bold hover:bg-[var(--color-orange)] hover:text-white transition-colors mb-2"
          >
            Place in Room (WebXR)
          </button>
          <button 
            onClick={() => setIsARModalOpen(true)}
            className="w-full opacity-80 border-2 border-[var(--color-orange)] text-[var(--color-orange-dark)] py-4 uppercase tracking-[0.2em] text-xs font-bold hover:bg-[var(--color-orange)] hover:text-white transition-colors"
          >
            Virtual Try-On (Camera)
          </button>
        </div>
        </>
        )}
      </div>

      <ARTryOnModal 
        isOpen={isARModalOpen} 
        onClose={() => setIsARModalOpen(false)} 
        metal={metal} 
        metalName={METALS[metal].name} 
        stone={stone}
        modelType={modelType}
        ringStyle={ringStyle}
        customText={customText}
        fontStyle={fontStyle}
        fileUrl={currentStyleDef?.fileUrl}
      />
      
      <SizeGuideModal 
        isOpen={isSizeGuideOpen} 
        onClose={() => setIsSizeGuideOpen(false)} 
      />
    </div>
  );
}
