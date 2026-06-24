import { Suspense, useState, useRef, useMemo, useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Environment, OrbitControls, ContactShadows, Float, Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { usePricing, IPricing } from '../context/PricingContext';
import { Check, Glasses, Box, Type, Save } from 'lucide-react';
import ARTryOnModal from '../components/ARTryOnModal';
import { SizeGuideModal } from '../components/SizeGuideModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { METALS, STONES, FONTS } from '../constants';
import { CustomGLBRingModel } from '../components/RingModels';
import { prefetchModel } from '../utils/modelLoader';

import { PendantModel } from '../components/PendantModel';

class Scene3DErrorBoundary extends Component<
  { children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err: Error) { console.error('[Scene3D] asset load error:', err.message); }
  render() {
    if (this.state.crashed) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <div className="text-center px-8">
            <div className="text-5xl mb-4 opacity-30">💎</div>
            <p className="text-sm font-semibold text-gray-600 mb-1">3D preview unavailable</p>
            <p className="text-xs text-gray-400 mb-4">An asset failed to load</p>
            <button
              onClick={() => this.setState({ crashed: false })}
              className="text-xs px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_RING_STYLES = [
  { id: 'ri0', name: 'Classic Solitaire',          fileUrl: '/glb-models/rings/RI0.glb' },
  { id: 'ri1', name: 'Halo Setting',               fileUrl: '/glb-models/rings/RI1.glb' },
  { id: 'ri2', name: 'Vintage Pavé Band',           fileUrl: '/glb-models/rings/RI2.glb' },
  { id: 'ri3', name: 'Three-Stone Trellis',         fileUrl: '/glb-models/rings/RI3.glb' },
  { id: 'ri4', name: 'Channel-Set Eternity Band',   fileUrl: '/glb-models/rings/RI4.glb' },
  { id: 'ri5', name: 'Split Shank Cathedral',       fileUrl: '/glb-models/rings/RI5.glb' },
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
  const [metal, setMetal] = useState<keyof typeof METALS>(() => {
    const saved = localStorage.getItem('cfg_metal') as keyof typeof METALS;
    return (saved && saved in METALS) ? saved : 'gold';
  });
  const [stone, setStone] = useState<keyof typeof STONES>(() => (localStorage.getItem('cfg_stone') as keyof typeof STONES) || 'aquamarine');
  const [fontStyle, setFontStyle] = useState<keyof typeof FONTS>(() => (localStorage.getItem('cfg_fontStyle') as keyof typeof FONTS) || 'helvetiker');
  const [fontBold, setFontBold] = useState(() => localStorage.getItem('cfg_fontBold') === 'true');
  const [fontItalic, setFontItalic] = useState(() => localStorage.getItem('cfg_fontItalic') === 'true');
  const [ringSize, setRingSize] = useState(() => localStorage.getItem('cfg_ringSize') || 'US 7');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const { user } = useAuth();
  const { pricing } = usePricing();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    localStorage.setItem('cfg_fontBold', String(fontBold));
    localStorage.setItem('cfg_fontItalic', String(fontItalic));
    localStorage.setItem('cfg_ringSize', ringSize);
  }, [modelType, ringStyle, customText, engraveWant, pendantShape, metal, stone, fontStyle, fontBold, fontItalic, ringSize]);

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
      const knownUrls = new Set(DEFAULT_RING_STYLES.map(s => s.fileUrl));
      const newRingModels = dbModels.filter(m => m.category === 'ring' && !knownUrls.has(m.fileUrl));
      setDynamicStyles([...DEFAULT_RING_STYLES, ...newRingModels]);
      
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

  const currentStyleDef = dynamicStyles.find(r => r.id === ringStyle);

  // After login redirect back here, auto-trigger the save the user originally attempted.
  useEffect(() => {
    if (user && localStorage.getItem('cfg_pendingAutoSave') === 'true') {
      localStorage.removeItem('cfg_pendingAutoSave');
      // Small delay to let models finish loading before the save request fires.
      const t = setTimeout(() => handleSaveConfiguration(), 800);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const calculatePrice = () => {
    let basePrice = currentStyleDef?.basePrice || (modelType === 'pendant' ? 12000 : 25000);
    
    let metalMultiplier = METALS[metal]?.priceMultiplier ?? 1;
    if (pricing) {
        metalMultiplier = (pricing as any)[`metalMultiplier_${metal}`] ?? metalMultiplier;
    }

    const metalPart = basePrice * metalMultiplier;
    let stonePart = 0;

    if (modelType === 'ring') {
       const storedStonePrice = pricing ? (pricing as any)[`stonePrice_${stone}`] : undefined;
       stonePart = storedStonePrice ?? STONES[stone]?.price ?? 0;
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

  const handleSaveConfiguration = async () => {
    if (!user) {
      localStorage.setItem('cfg_pendingAutoSave', 'true');
      navigate('/login?redirect=/configurator');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
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
        // Sync to localStorage profile cache
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
        setSaveMessage({ type: 'success', text: 'Design saved! Redirecting to your profile...' });
        setTimeout(() => navigate('/profile?tab=configs'), 1500);
      } else {
        const data = await response.json();
        setSaveMessage({ type: 'error', text: data.message || 'Failed to save. Please try again.' });
      }
    } catch (e) {
      setSaveMessage({ type: 'error', text: 'Failed to save. Please check your connection.' });
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
          <Scene3DErrorBoundary>
            <div className="absolute top-6 border border-black/10 right-6 z-10 bg-white/80 p-3 rounded-full text-[10px] uppercase tracking-widest backdrop-blur-sm">
              Drag to Revolve
            </div>
            <Canvas shadows camera={{ position: [0, 1.5, 4.5], fov: 40 }}>
              <ambientLight intensity={0.8} />
              <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
              <pointLight position={[-10, -10, -10]} intensity={1} />
              <Suspense fallback={<Html center><LoadingSpinner fullScreen={false} /></Html>}>
                <group position={[0, 0, -0.6]} scale={1.5}>
                  {modelType === 'ring' ? (
                     <CustomGLBRingModel key={ringStyle} style={ringStyle} text={engraveWant ? customText : undefined} metalMaterial={METALS[metal]} stoneMaterial={STONES[stone]} fontStyle={fontStyle} fontBold={fontBold} fontItalic={fontItalic} fileUrl={currentStyleDef?.fileUrl} />
                  ) : (
                    <PendantModel
                      text={customText}
                      metalMaterial={METALS[metal]}
                      fontStyle={fontStyle}
                      fontBold={fontBold}
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
                target={[0, 0, -0.6]}
                minPolarAngle={Math.PI/6}
                maxPolarAngle={Math.PI * 0.7}
                enableDamping={true}
                dampingFactor={0.05}
              />
            </Canvas>
          </Scene3DErrorBoundary>
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
            Rs. {modelType === 'ring' ? (currentStyleDef?.basePrice?.toLocaleString() || '25,000') : '12,000'}
          </p>

          <div className="mb-10">
            <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2">Model</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => setModelType('ring')}
                className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors border ${modelType === 'ring' ? 'border-transparent btn-richbrown text-white' : 'border-black/10 hover:border-black/50'}`}
              >
                Ring
              </button>
              <button 
                onClick={() => setModelType('pendant')}
                className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors border ${modelType === 'pendant' ? 'border-transparent btn-richbrown text-white' : 'border-black/10 hover:border-black/50'}`}
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
                    <h3 className="text-xs uppercase tracking-widest font-semibold mb-2">Font Style</h3>
                    <div className="grid grid-cols-2 gap-2 mb-3">
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFontBold(!fontBold)}
                        className={`flex-1 py-2 text-[10px] font-bold tracking-widest border transition-colors ${fontBold ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'}`}
                      >
                        B Bold
                      </button>
                      <button
                        onClick={() => setFontItalic(!fontItalic)}
                        className={`flex-1 py-2 text-[10px] italic tracking-widest border transition-colors ${fontItalic ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'}`}
                      >
                        I Italic
                      </button>
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
                <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2">Font Style</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
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
                <div className="flex gap-2">
                  <button
                    onClick={() => setFontBold(!fontBold)}
                    className={`flex-1 py-2 text-[10px] font-bold tracking-widest border transition-colors ${fontBold ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'}`}
                  >
                    B Bold
                  </button>
                  <button
                    onClick={() => setFontItalic(!fontItalic)}
                    className={`flex-1 py-2 text-[10px] italic tracking-widest border transition-colors ${fontItalic ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'}`}
                  >
                    I Italic
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-[rgba(26,26,26,0.1)] bg-white/30 sticky bottom-0">
          <div className="flex flex-col mb-4">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mb-1 border-b border-black/5 pb-1">
               <span>Base + Metal:</span>
               <span>Est. Rs. {calculatePrice().breakdown.metal.toLocaleString()}</span>
            </div>
            {modelType === 'ring' && (
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mb-1 border-b border-black/5 pb-1">
                 <span>Stone:</span>
                 <span>Est. Rs. {calculatePrice().breakdown.stone.toLocaleString()}</span>
              </div>
            )}
            {((modelType === 'ring' && engraveWant) || modelType === 'pendant') && (
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mb-2 border-b border-black/5 pb-1">
                 <span>Engraving:</span>
                 <span>Est. Rs. {calculatePrice().breakdown.engraving.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-end mt-2">
              <div>
                <span className="block text-[9px] uppercase tracking-widest text-gray-400 mb-0.5">Starting from</span>
                <span className="text-xs uppercase tracking-widest font-bold text-gray-800">Total Price:</span>
              </div>
              <span className="font-serif text-2xl text-[var(--color-ink)]">Rs. {calculatePrice().total.toLocaleString()}</span>
            </div>
          </div>
          {saveMessage && (
            <div className={`mb-3 px-3 py-2 rounded text-xs font-medium ${saveMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {saveMessage.text}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSaveConfiguration}
              disabled={isSaving}
              className="flex-1 bg-gold-gradient text-white py-4 uppercase tracking-[0.2em] text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Design'}
            </button>
            <button
              onClick={() => setIsARModalOpen(true)}
              className="flex-1 border-2 border-[var(--color-orange)] text-[var(--color-orange-dark)] py-4 uppercase tracking-[0.2em] text-xs font-bold hover:bg-[var(--color-orange)] hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <Glasses size={16} /> AR Try-On
            </button>
          </div>
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
