import { Suspense, useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Environment, OrbitControls, ContactShadows, Float, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { usePricing, IPricing } from '../context/PricingContext';
import { Check, Glasses, Box, Type, Heart, Save, Sparkles } from 'lucide-react';
import ARTryOnModal from '../components/ARTryOnModal';
import { SizeGuideModal } from '../components/SizeGuideModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { XR, createXRStore, XRHitTest } from '@react-three/xr';
import { METALS, STONES, FONTS } from '../constants';
import { CustomGLBRingModel } from '../components/RingModels';
import { prefetchModel } from '../utils/modelLoader';

import { PendantModel } from '../components/PendantModel';
import { ARViewContent } from '../components/ARViewContent';

const store = createXRStore();

const DEFAULT_RING_STYLES = [
  { id: 'custom-glb', name: 'Diamond Engagement Ring (Custom)', fileUrl: '/diamond_engagement_ring_wedding_ring.glb' },
  { id: 'ri1', name: 'Ring Model 1', fileUrl: '/RI1.glb' },
  { id: 'ri2', name: 'Ring Model 2', fileUrl: '/RI2.glb' },
  { id: 'ri3', name: 'Ring Model 3', fileUrl: '/RI3.glb' },
  { id: 'ri4', name: 'Ring Model 4', fileUrl: '/RI4.glb' },
  { id: 'ri5', name: 'Ring Model 5', fileUrl: '/RI5.glb' },
];

export default function Configurator() {
  const navigate = useNavigate();
  const [modelType, setModelType] = useState<'ring' | 'pendant'>(() => (localStorage.getItem('cfg_modelType') as 'ring' | 'pendant') || 'ring');
  const [dynamicStyles, setDynamicStyles] = useState<{id: string, name: string, fileUrl?: string, basePrice?: number}[]>(DEFAULT_RING_STYLES);
  const [ringStyle, setRingStyle] = useState(() => localStorage.getItem('cfg_ringStyle') || DEFAULT_RING_STYLES[0].id);
  const [isARModalOpen, setIsARModalOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [customText, setCustomText] = useState(() => localStorage.getItem('cfg_customText') || 'PD');
  const [engraveWant, setEngraveWant] = useState(() => localStorage.getItem('cfg_engraveWant') === 'true');
  const [pendantShape, setPendantShape] = useState<'standard'|'heart'|'wing'>(() => (localStorage.getItem('cfg_pendantShape') as 'standard'|'heart'|'wing') || 'standard');
  const [metal, setMetal] = useState<keyof typeof METALS>(() => (localStorage.getItem('cfg_metal') as keyof typeof METALS) || 'silver');
  const [stone, setStone] = useState<keyof typeof STONES>(() => (localStorage.getItem('cfg_stone') as keyof typeof STONES) || 'aquamarine');
  const [fontStyle, setFontStyle] = useState<keyof typeof FONTS>(() => (localStorage.getItem('cfg_fontStyle') as keyof typeof FONTS) || 'helvetiker');
  const [ringSize, setRingSize] = useState(() => localStorage.getItem('cfg_ringSize') || 'US 7');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const { addToCart } = useCart();
  const { toggleWishlistItem, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const { pricing } = usePricing();
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save configuration changes
  useEffect(() => {
    localStorage.setItem('cfg_modelType', modelType);
    localStorage.setItem('cfg_ringStyle', ringStyle);
    localStorage.setItem('cfg_customText', customText);
    localStorage.setItem('cfg_engraveWant', String(engraveWant));
    localStorage.setItem('cfg_pendantShape', pendantShape);
    localStorage.setItem('cfg_metal', metal);
    localStorage.setItem('cfg_stone', stone);
    localStorage.setItem('cfg_fontStyle', fontStyle);
    localStorage.setItem('cfg_ringSize', ringSize);
  }, [modelType, ringStyle, customText, engraveWant, pendantShape, metal, stone, fontStyle, ringSize]);

  useEffect(() => {
    const cachedModels = localStorage.getItem('cfg_cache_api_models');
    
    const processModelsData = (data: any[]) => {
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
    };

    if (cachedModels) {
      try {
        const parsed = JSON.parse(cachedModels);
        if (Array.isArray(parsed)) {
          processModelsData(parsed);
          setIsLoadingModels(false);
        }
      } catch (e) {
        console.error('Failed to parse cached models', e);
      }
    }

    if (!cachedModels) setIsLoadingModels(true);
    
    fetch('/api/models').then(res => {
      if (!res.ok) throw new Error('API Error');
      return res.json();
    }).then(data => {
      if (Array.isArray(data)) {
        localStorage.setItem('cfg_cache_api_models', JSON.stringify(data));
        processModelsData(data);
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
    
    let metalMultiplier = METALS[metal]?.priceMultiplier || 1;
    if (pricing) {
        if (metal === 'silver') metalMultiplier = pricing.metalMultiplier_silver;
        if (metal === 'gold') metalMultiplier = pricing.metalMultiplier_gold;
        if (metal === 'rose') metalMultiplier = pricing.metalMultiplier_rose;
    }

    const metalPart = basePrice * metalMultiplier;
    let stonePart = 0;
    
    if (modelType === 'ring') {
       stonePart = pricing ? (pricing as any)[`stonePrice_${stone}`] : (STONES[stone]?.price || 0);
    }

    let engravingPart = 0;
    if ((modelType === 'ring' && engraveWant) || modelType === 'pendant') {
       engravingPart = pricing?.engravingPrice || 5000;
       if (customText.length > 0) {
           // We could multiply by chars, but let's just use flat fee per engraving
       } else {
           engravingPart = 0; 
       }
    }
    
    return {
        total: Math.round(metalPart + stonePart + engravingPart),
        breakdown: {
            metal: Math.round(metalPart),
            stone: Math.round(stonePart),
            engraving: Math.round(engravingPart)
        }
    };
  };

  const handleAddToCart = () => {
    const isRing = modelType === 'ring';
    const ringNameInfo = currentStyleDef?.name || 'Custom Ring';
    const itemName = isRing ? `${ringNameInfo} ("${customText}")` : `Name Pendant ("${customText}")`;
    const finalPrice = calculatePrice().total;

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
    const finalPrice = calculatePrice().total;

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
          price: calculatePrice().total
        })
      });
      
      if (response.ok) {
        const configs = await response.json();
        // Sync newly saved configurations to localStorage profile cache
        const profileCachedStr = localStorage.getItem(`profile_${user._id}`);
        if (profileCachedStr) {
          try {
            const cached = JSON.parse(profileCachedStr);
            cached.savedConfigurations = configs;
            localStorage.setItem(`profile_${user._id}`, JSON.stringify(cached));
          } catch(e) {
            console.error("Failed to update configurations cache", e);
          }
        }
        alert('Custom design saved successfully! Redirecting you to your exclusive product details page...');
        navigate(`/product/custom?type=${modelType}&metal=${metal}&stone=${stone}&text=${encodeURIComponent(customText)}&font=${fontStyle}&size=${encodeURIComponent(ringSize)}&style=${ringStyle}`);
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
                       <CustomGLBRingModel style={ringStyle} text={engraveWant ? customText : undefined} metalMaterial={METALS[metal]} stoneMaterial={STONES[stone]} fontStyle={fontStyle} fileUrl={currentStyleDef?.fileUrl} />
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
          <div className="flex flex-col mb-4">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mb-1 border-b border-black/5 pb-1">
               <span>Base + Metal:</span>
               <span>LKR {calculatePrice().breakdown.metal.toLocaleString()}</span>
            </div>
            {modelType === 'ring' && (
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mb-1 border-b border-black/5 pb-1">
                 <span>Stone:</span>
                 <span>LKR {calculatePrice().breakdown.stone.toLocaleString()}</span>
              </div>
            )}
            {((modelType === 'ring' && engraveWant) || modelType === 'pendant') && (
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mb-2 border-b border-black/5 pb-1">
                 <span>Engraving:</span>
                 <span>LKR {calculatePrice().breakdown.engraving.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-end mt-2">
              <span className="text-xs uppercase tracking-widest font-bold text-gray-800">Total Price:</span>
              <span className="font-serif text-2xl text-[var(--color-ink)]">LKR {calculatePrice().total.toLocaleString()}</span>
            </div>
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
            type="button"
            onClick={() => navigate(`/product/custom?type=${modelType}&metal=${metal}&stone=${stone}&text=${encodeURIComponent(customText)}&font=${fontStyle}&size=${encodeURIComponent(ringSize)}&style=${ringStyle}`)}
            className="w-full mb-2 bg-gradient-to-r from-stone-900 to-black text-[var(--color-sand)] py-4 uppercase tracking-[0.2em] text-xs font-bold hover:opacity-90 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={14} className="text-[#cca150]" /> View Separated Product Details
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
