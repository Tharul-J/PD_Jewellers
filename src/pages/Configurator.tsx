import { Suspense, useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { usePricing } from '../context/PricingContext';
import { Check, Glasses, Type, Save } from 'lucide-react';
import ARTryOnModal, { warmARRuntime } from '../components/ARTryOnModal';
import { SizeGuideModal } from '../components/SizeGuideModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
// Metals and stones now come from the Pricing API via usePricing(); constants.ts
// still supplies their 3D material properties, merged in PricingContext.
import { FONTS, visibleFontKeys } from '../constants';
import { CustomGLBRingModel } from '../components/RingModels';
import { prefetchModel } from '../utils/modelLoader';
import { formatPrice, formatEstimate, INDICATIVE_NOTE } from '../lib/price';

import { PendantModel } from '../components/PendantModel';
import { Scene3DErrorBoundary } from '../components/Scene3DErrorBoundary';
import { useAdminGuard } from '../hooks/useAdminGuard';
import AdminActionWarning from '../components/AdminActionWarning';

// Scales the pendant body (not the chain/attachment) for all three pendant shapes.
const PENDANT_SIZE_SCALE: Record<'small' | 'medium' | 'large', number> = {
  small: 0.82,
  medium: 1.00,
  large: 1.22,
};

// Camera FOV compensates for body scale so Large stays framed and Small doesn't look lost.
const PENDANT_SIZE_FOV: Record<'small' | 'medium' | 'large', number> = {
  small: 38,
  medium: 42,
  large: 46,
};

// Real-world reference sizes shown in the UI only — geometry is already calibrated visually.
const PENDANT_SIZE_INFO: Record<'small' | 'medium' | 'large', { label: string; mm: string }> = {
  small:  { label: 'Small',  mm: '~18 mm' },
  medium: { label: 'Medium', mm: '~22 mm' },
  large:  { label: 'Large',  mm: '~27 mm' },
};

// Lives inside <Canvas> so it can read the active camera via useThree(). Ring scenes
// always resolve to 42 (the original constant fov), so only the pendant scene reacts.
function PendantCameraFov({ fov }: { fov: number }) {
  const { camera } = useThree();
  useEffect(() => {
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (camera as THREE.PerspectiveCamera).fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, fov]);
  return null;
}

const DEFAULT_RING_STYLES = [
  { id: 'ring-style-1', name: 'Ring Style 1', fileUrl: '/glb-models/rings/ring1.glb', basePrice: 25000, hasRealStone: false },
  { id: 'ring-style-2', name: 'Ring Style 2', fileUrl: '/glb-models/rings/ring2.glb', basePrice: 25000, hasRealStone: false },
  { id: 'ring-style-3', name: 'Ring Style 3', fileUrl: '/glb-models/rings/ring3.glb', basePrice: 30000, hasRealStone: false },
  { id: 'ring-style-4', name: 'Ring Style 4', fileUrl: '/glb-models/rings/ring4.glb', basePrice: 25000, hasRealStone: false },
  { id: 'ring-style-5', name: 'Ring Style 5', fileUrl: '/glb-models/rings/ring5.glb', basePrice: 25000, hasRealStone: false },
];

// The models endpoint returns Mongo's natural order, which reshuffles whenever a document
// is edited — so "Ring Style 4" can arrive first and the selector reads 4,1,2,3. There is no
// order field on the document, so the number in the name is the stable key. Numeric compare,
// not alphabetical: "Ring Style 10" has to follow 9, not land between 1 and 2.
const styleNumber = (s: { name?: string }) => {
  const m = /(\d+)\s*$/.exec(s.name ?? '');
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER; // unnumbered names sink to the end
};

// Sorts a copy — the caller's array (and the cached API payload it came from) is left alone.
function byStyleNumber<T extends { name?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => styleNumber(a) - styleNumber(b));
}

export default function Configurator() {
  const navigate = useNavigate();
  const [modelType, setModelType] = useState<'ring' | 'pendant'>(() => (localStorage.getItem('cfg_modelType') as 'ring' | 'pendant') || 'ring');
  const [dynamicStyles, setDynamicStyles] = useState<{id: string, name: string, fileUrl?: string, basePrice?: number, hasRealStone?: boolean}[]>(DEFAULT_RING_STYLES);
  const [ringStyle, setRingStyle] = useState(() => localStorage.getItem('cfg_ringStyle') || DEFAULT_RING_STYLES[0].id);
  const [isARModalOpen, setIsARModalOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [customText, setCustomText] = useState(() => localStorage.getItem('cfg_customText') || 'PD');
  const [pendantShape, setPendantShape] = useState<'standard'|'heart'|'tag'>(() => { const s = localStorage.getItem('cfg_pendantShape'); return (s === 'standard' || s === 'heart' || s === 'tag') ? s : 'standard'; });
  const [pendantSize, setPendantSize] = useState<'small'|'medium'|'large'>(() => { const s = localStorage.getItem('cfg_pendantSize'); return (s === 'small' || s === 'medium' || s === 'large') ? s : 'medium'; });
  const prevPendantShapeRef = useRef(pendantShape);
  // Metal/stone are addressed by key, which now comes from the Pricing API rather
  // than from constants.ts. The saved key is trusted on load and only corrected
  // once the catalogue has actually arrived (see the reconciliation effect below),
  // so a slow fetch can't silently reset the visitor's choice.
  const [metal, setMetal] = useState<string>(() => localStorage.getItem('cfg_metal') || 'gold');
  const [stone, setStone] = useState<string>(() => localStorage.getItem('cfg_stone') || 'aquamarine');
  const [fontStyle, setFontStyle] = useState<keyof typeof FONTS>(() => {
    const saved = localStorage.getItem('cfg_fontStyle') as keyof typeof FONTS;
    return (saved && saved in FONTS) ? saved : 'cinzel';
  });
  const [textDirection, setTextDirection] = useState<'horizontal' | 'vertical'>(() =>
    (localStorage.getItem('cfg_textDirection') === 'vertical') ? 'vertical' : 'horizontal'
  );
  // Normalized text-size multiplier (0.7–1.3, default 1.0). At 1.0 every text path
  // renders exactly as before; it scales each path's own base size, never replaces it.
  const [textSize, setTextSize] = useState<number>(() => {
    const saved = parseFloat(localStorage.getItem('cfg_textSize') || '');
    return (Number.isFinite(saved) && saved >= 0.7 && saved <= 1.3) ? saved : 1.0;
  });
  const [fontBold, setFontBold] = useState(() => localStorage.getItem('cfg_fontBold') === 'true');
  const [fontItalic, setFontItalic] = useState(() => localStorage.getItem('cfg_fontItalic') === 'true');
  const [ringSize, setRingSize] = useState(() => localStorage.getItem('cfg_ringSize') || 'US 7');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const { user } = useAuth();
  const { guard, showWarning, dismiss } = useAdminGuard();
  const { pricing, configuratorMetals, configuratorStones } = usePricing();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [configuratorEnabled, setConfiguratorEnabled] = useState<boolean | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch('/api/config/configurator-status')
      .then(r => r.json())
      .then(data => setConfiguratorEnabled(data.configuratorEnabled ?? true))
      .catch(() => setConfiguratorEnabled(true)); // fail open
  }, []);

  // Pre-fetch MediaPipe WASM runtime so it's ready before user opens AR modal
  useEffect(() => { warmARRuntime(); }, []);

  // Close the mobile options sheet on Escape (matches the nav drawer's behaviour).
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  // Auto-save configuration changes
  // Tag shape is monogram-only — enforce 3-char max when switching to tag
  useEffect(() => {
    if (pendantShape === 'tag' && customText.length > 3) {
      setCustomText(customText.slice(0, 3));
    }
  }, [pendantShape]);

  // Pendant size resets to Medium whenever the shape changes (not on initial mount,
  // so a persisted size survives a page reload).
  useEffect(() => {
    if (prevPendantShapeRef.current !== pendantShape) {
      setPendantSize('medium');
      prevPendantShapeRef.current = pendantShape;
    }
  }, [pendantShape]);

  // Keep the selected font valid for the current context: the Tag pendant hides the
  // serif fonts that fragment in generateShapes(), and the cursive fonts are Tag-only.
  // If the active selection isn't offered here, fall back to the first available font.
  const availableFontKeys = visibleFontKeys(modelType, pendantShape);
  useEffect(() => {
    if (!availableFontKeys.includes(fontStyle)) {
      setFontStyle(availableFontKeys[0]);
    }
  }, [modelType, pendantShape, fontStyle]);

  // Shared "Text Size" slider — applies to pendant text and ring engraving.
  const textSizeControl = (
    <div>
      <h3 className="text-xs uppercase tracking-widest font-semibold mb-2 flex justify-between">
        <span>Text Size</span>
        <span className="opacity-50 tabular-nums">{Math.round(textSize * 100)}%</span>
      </h3>
      <input
        type="range"
        min={0.7}
        max={1.3}
        step={0.05}
        value={textSize}
        onChange={(e) => setTextSize(parseFloat(e.target.value))}
        className="w-full accent-[var(--color-ink)] cursor-pointer"
      />
      <div className="flex justify-between text-[9px] uppercase tracking-widest text-gray-400 mt-1">
        <span>Smaller</span>
        <button type="button" onClick={() => setTextSize(1.0)} className="hover:text-black/70">Reset</button>
        <span>Larger</span>
      </div>
    </div>
  );

  useEffect(() => {
    localStorage.setItem('cfg_modelType', modelType);
    localStorage.setItem('cfg_ringStyle', ringStyle);
    localStorage.setItem('cfg_customText', customText);
    localStorage.setItem('cfg_pendantShape', pendantShape);
    localStorage.setItem('cfg_pendantSize', pendantSize);
    localStorage.setItem('cfg_metal', metal);
    localStorage.setItem('cfg_stone', stone);
    localStorage.setItem('cfg_fontStyle', fontStyle);
    localStorage.setItem('cfg_fontBold', String(fontBold));
    localStorage.setItem('cfg_fontItalic', String(fontItalic));
    localStorage.setItem('cfg_ringSize', ringSize);
    localStorage.setItem('cfg_textDirection', textDirection);
    localStorage.setItem('cfg_textSize', String(textSize));
  }, [modelType, ringStyle, customText, pendantShape, pendantSize, metal, stone, fontStyle, fontBold, fontItalic, ringSize, textDirection, textSize]);

  useEffect(() => {
    const cachedModels = localStorage.getItem('cfg_cache_api_models');
    
    const processModelsData = (data: any[], fromCache = false) => {
      // Skip stale cache if all ring models point to /uploads/ (old session leftovers)
      if (fromCache) {
        const cacheRings = data.filter(m => m.category === 'ring');
        const allStale = cacheRings.length > 0 && cacheRings.every(m => (m.glbUrl || '').startsWith('/uploads/'));
        if (allStale) { localStorage.removeItem('cfg_cache_api_models'); return; }
      }

      const dbModels = data.filter(m => m.isActive !== false).map(m => ({
        id: `db-${m._id}`,
        name: m.name,
        category: m.category,
        basePrice: m.basePrice,
        fileUrl: m.glbUrl,
        hasRealStone: m.hasRealStone ?? false,
      }));
      const dbRingModels = dbModels.filter(m => m.category === 'ring');
      // DB is authoritative: use DB ring models if available, else fall back to local defaults
      // Sorted here rather than at render so the selector AND the default-selection below
      // read from the same ordering — newStyles[0] is then the lowest-numbered style, not
      // whichever document Mongo happened to return first.
      const newStyles = byStyleNumber(dbRingModels.length > 0 ? dbRingModels : DEFAULT_RING_STYLES);
      setDynamicStyles(newStyles);
      // Auto-select first style if saved ring style no longer exists in new list
      setRingStyle(prev => newStyles.find(s => s.id === prev) ? prev : (newStyles[0]?.id ?? prev));

      // Prefetch all ring models in background
      setTimeout(() => {
        newStyles.forEach(s => { if (s.fileUrl) prefetchModel(s.fileUrl); });
      }, 1000);
    };

    if (cachedModels) {
      try {
        const parsed = JSON.parse(cachedModels);
        if (Array.isArray(parsed)) {
          processModelsData(parsed, true);
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
  // A brand-new account hits this on a cold cache (no cfg_cache_api_models, no cached GLB),
  // so the canvas can take well over a fixed delay to mount — poll for it instead of guessing.
  useEffect(() => {
    if (user && localStorage.getItem('cfg_pendingAutoSave') === 'true') {
      let cancelled = false;
      let attempts = 0;
      const maxAttempts = 20; // ~4s ceiling waiting for the canvas to mount
      let timeoutId: ReturnType<typeof setTimeout>;
      const waitForCanvas = () => {
        if (cancelled) return;
        attempts++;
        if (canvasRef.current || attempts >= maxAttempts) {
          // Extra buffer so the GLB model has a chance to render before capture.
          timeoutId = setTimeout(() => {
            if (cancelled) return;
            // Flag removal is deferred to the actual fire (not detection time) so that
            // StrictMode's dev-only double-invoke — which cancels the first run before
            // it completes — doesn't leave the second run with nothing to consume.
            if (localStorage.getItem('cfg_pendingAutoSave') === 'true') {
              localStorage.removeItem('cfg_pendingAutoSave');
              guard(() => handleSaveConfiguration());
            }
          }, 600);
        } else {
          timeoutId = setTimeout(waitForCanvas, 200);
        }
      };
      timeoutId = setTimeout(waitForCanvas, 200);
      return () => { cancelled = true; clearTimeout(timeoutId); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // The selected entries, resolved against the live catalogue. Falling back to
  // the first entry keeps the viewer rendering while a stale key is corrected.
  const currentMetal = configuratorMetals.find(m => m.key === metal) ?? configuratorMetals[0];
  const currentStone = configuratorStones.find(s => s.key === stone) ?? configuratorStones[0];

  // An admin can rename or delete a metal/stone between visits, which would leave
  // localStorage pointing at a key that no longer exists. Snap back to the first
  // available option once — never while the list is still empty, or the default
  // would overwrite a valid saved choice on the first paint.
  useEffect(() => {
    if (configuratorMetals.length > 0 && !configuratorMetals.some(m => m.key === metal)) {
      setMetal(configuratorMetals[0].key);
    }
  }, [configuratorMetals, metal]);

  useEffect(() => {
    if (configuratorStones.length > 0 && !configuratorStones.some(s => s.key === stone)) {
      setStone(configuratorStones[0].key);
    }
  }, [configuratorStones, stone]);

  const calculatePrice = () => {
    const basePrice = currentStyleDef?.basePrice || (modelType === 'pendant' ? 12000 : 25000);

    // The merged catalogue already prefers the API value over constants.ts.
    const metalPart = basePrice * (currentMetal?.multiplier ?? 1);

    // Stone price — rings only
    const stonePart = modelType === 'ring' ? (currentStone?.price ?? 0) : 0;

    // Engraving fee — pendant only (rings no longer offer engraving)
    let engravingPart = 0;
    if (modelType === 'pendant') {
      if (customText.length > 0) {
        engravingPart = pricing?.engravingPrice ?? 5000;
      }
    }

    return {
      total: Math.round(metalPart + stonePart + engravingPart),
      breakdown: {
        metal:    Math.round(metalPart),
        stone:    Math.round(stonePart),
        engraving:Math.round(engravingPart),
      },
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
      const canvas = canvasRef.current;
      let thumbnail = '';
      if (canvas) {
        try {
          thumbnail = canvas.toDataURL('image/jpeg', 0.6);
        } catch (e) {
          console.error('Thumbnail capture failed:', e);
        }
      }

      const response = await fetch('/api/users/configurations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          type: modelType,
          ringSize: modelType === 'ring' ? ringSize : undefined,
          ringStyle: modelType === 'ring' ? ringStyle : undefined,
          metal,
          stone,
          engravingText: modelType === 'pendant' ? customText : undefined,
          fontStyle,
          pendantShape: modelType === 'pendant' ? pendantShape : undefined,
          pendantSize: modelType === 'pendant' ? pendantSize : undefined,
          price: calculatePrice().total,
          thumbnail
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

  // Show nothing while checking (avoids flash of 3D scene)
  if (configuratorEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show warning gate if disabled
  if (!configuratorEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f7] px-6">
        <div className="max-w-lg text-center">
          {/* Decorative icon */}
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-6.836m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-light tracking-widest uppercase text-gray-800 mb-3"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Custom Designs Paused
          </h1>

          {/* Divider */}
          <div className="w-12 h-px bg-amber-400 mx-auto mb-5" />

          {/* Body */}
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Our bespoke jewellery configurator is temporarily unavailable while we
            make improvements to bring you an even better crafting experience.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            In the meantime, explore our curated collections — each piece is crafted
            with the same care and artistry.
          </p>

          {/* CTA */}
          <Link
            to="/collections"
            className="inline-block px-8 py-3 bg-gray-900 text-white text-xs tracking-widest uppercase hover:bg-amber-700 transition-colors duration-300"
          >
            Browse Our Collection
          </Link>

          {/* Sub-note */}
          <p className="mt-6 text-xs text-gray-400">
            For bespoke enquiries, please visit our{' '}
            <Link to="/about" className="underline underline-offset-2 hover:text-amber-600 transition-colors">
              contact page
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  // Computed once per render; shared by the slim bar (mobile) and the sheet footer.
  const price = calculatePrice();

  return (
    <div className="h-[calc(100dvh-112px)] md:h-[calc(100dvh-128px)] relative flex flex-col lg:flex-row overflow-hidden">
      {/* 3D Viewer — on mobile it fills the region ABOVE the persistent slim bar.
          bottom-[64px] MUST match the slim bar's h-[64px]; keep them in sync. This box is
          CONSTANT (independent of sheetOpen) so the canvas never resizes on toggle.
          lg:inset-auto resets all of this at desktop. */}
      <div ref={viewerRef} className="absolute inset-x-0 top-0 bottom-[64px] lg:relative lg:inset-auto lg:flex-1 lg:min-h-0 lg:h-full border-r border-black/10 flex items-center justify-center" style={{ background: '#eae4dc' }}>
        {isLoadingModels ? (
           <div className="animate-pulse w-full h-full flex items-center justify-center bg-gray-50">
             <div className="flex flex-col items-center">
               <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
               <p className="mt-4 text-xs uppercase tracking-widest text-gray-400">Loading Configuration...</p>
             </div>
           </div>
        ) : (
          <Scene3DErrorBoundary>
            <div className="absolute top-4 right-4 z-10 bg-white/70 border border-black/10 px-3 py-1.5 rounded-full text-[9px] uppercase tracking-widest text-black/50 backdrop-blur-sm">
              Drag to Revolve
            </div>
            <Canvas ref={canvasRef} shadows camera={{ position: [0, 0.5, 3.2], fov: 42 }} gl={{ preserveDrawingBuffer: true }}>
              <PendantCameraFov fov={modelType === 'pendant' ? PENDANT_SIZE_FOV[pendantSize] : 42} />
              {/* Set THREE.js scene background so WebGL clear color matches the CSS bg */}
              <color attach="background" args={['#eae4dc']} />
              <ambientLight intensity={0.6} />
              <spotLight position={[4, 8, 6]}  angle={0.35} penumbra={1} intensity={3}   castShadow />
              <spotLight position={[-4, 6, 4]} angle={0.35} penumbra={1} intensity={1.5} />
              <pointLight position={[0, -2, 4]} intensity={0.8} />
              <Suspense fallback={<Html center><LoadingSpinner fullScreen={false} /></Html>}>
                <group position={[0, 0, -0.6]} scale={1.5}>
                  {modelType === 'ring' ? (
                     <CustomGLBRingModel key={ringStyle} style={ringStyle} metalMaterial={currentMetal?.material} stoneMaterial={currentStone?.material} syntheticStone={!(currentStyleDef?.hasRealStone ?? false)} fileUrl={currentStyleDef?.fileUrl || '/glb-models/rings/ring1.glb'} />
                  ) : (
                    <PendantModel
                      text={customText}
                      metalMaterial={currentMetal?.material}
                      fontStyle={fontStyle}
                      fontBold={fontBold}
                      fontItalic={fontItalic}
                      shape={pendantShape}
                      textDirection={textDirection}
                      textSizeMult={textSize}
                      sizeMultiplier={PENDANT_SIZE_SCALE[pendantSize]}
                    />
                  )}
                </group>
                <Environment preset="apartment" />
                <ContactShadows position={[0, -1.8, 0]} opacity={0.25} scale={12} blur={2.5} far={4} />
              </Suspense>
              <OrbitControls
                enablePan={false}
                enableZoom={true}
                target={modelType === 'pendant' ? [0, -0.25, -0.6] : [0, 0, -0.6]}
                minPolarAngle={Math.PI/6}
                maxPolarAngle={Math.PI * 0.75}
                enableDamping={true}
                dampingFactor={0.05}
              />
            </Canvas>
          </Scene3DErrorBoundary>
        )}
      </div>

      {/* Slim bar — persistent on mobile; shows the live total and opens the sheet */}
      <div className="lg:hidden absolute inset-x-0 bottom-0 h-[64px] z-20 px-5 flex items-center justify-between border-t border-[rgba(26,26,26,0.1)] bg-[var(--color-paper)]">
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] tracking-[0.2em] uppercase opacity-60">Starting From</span>
          <span className="font-serif text-2xl text-[var(--color-ink)]">{formatPrice(price.total)}</span>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="bg-gold-gradient text-white px-5 py-3 rounded-sm text-xs tracking-[0.15em] uppercase font-bold hover:opacity-90 transition-opacity"
        >
          Customize
        </button>
      </div>

      {/* Controls Panel — slide-over sheet on mobile, fixed column at lg */}
      <div className={`absolute inset-x-0 bottom-0 z-30 h-[88%] rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out ${sheetOpen ? 'translate-y-0' : 'translate-y-full'} lg:static lg:z-auto lg:translate-y-0 lg:h-full lg:w-[450px] lg:flex-none lg:rounded-none lg:shadow-xl lg:transition-none flex flex-col min-h-0 overflow-hidden border-l border-white/50 bg-[var(--color-paper)]`}>
        {/* Handle — mobile only; tap (or Escape) closes the sheet */}
        <button
          type="button"
          onClick={() => setSheetOpen(false)}
          aria-label="Close options"
          className="lg:hidden w-full shrink-0 py-3 flex flex-col items-center gap-1"
        >
          <span className="w-10 h-1 rounded-full bg-black/20" />
          <span className="text-[11px] tracking-[0.15em] uppercase opacity-70 truncate max-w-[80%]">
            {modelType === 'ring' ? (currentStyleDef?.name || 'Signature Ring') : 'Name Pendant'}
          </span>
        </button>
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
          <div className="px-5 pt-2 pb-6 lg:p-10 flex-1 overflow-y-auto">
          <p className="hidden lg:block text-[10px] uppercase tracking-[0.2em] opacity-50 mb-4">Bespoke Design</p>
          <h1 className="hidden lg:block text-2xl lg:text-4xl font-serif mb-2">
            {modelType === 'ring' ? (currentStyleDef?.name || 'Signature Ring') : 'Name Pendant'}
          </h1>
          <p className="hidden lg:block font-serif text-2xl opacity-60 mb-4 lg:mb-10">
            {modelType === 'ring' ? formatPrice(currentStyleDef?.basePrice ?? 25000) : formatPrice(12000)}
          </p>

          <div className="mb-6 lg:mb-10">
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
            <div className="mb-6 lg:mb-10">
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
          <div className="mb-6 lg:mb-10">
            <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
              <span>Metal</span>
              <span className="opacity-50">{currentMetal?.name ?? ''}</span>
            </h3>
            <div className="flex gap-4 flex-wrap">
              {configuratorMetals.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetal(m.key)}
                  title={m.name}
                  className={`w-12 h-12 rounded-full border-2 p-1 transition-all ${
                    metal === m.key ? 'border-[var(--color-ink)]' : 'border-transparent'
                  }`}
                >
                  <div
                    className="w-full h-full rounded-full"
                    style={{ backgroundColor: m.color }}
                  >
                    {metal === m.key && <Check className="w-full h-full p-2 text-white/50 mix-blend-difference" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stone Option */}
          {modelType === 'ring' && (
            <div className="mb-6 lg:mb-10">
              <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
                <span>Center Stone</span>
                <span className="opacity-50">{currentStone?.name ?? ''}</span>
              </h3>
              <div className="flex flex-wrap gap-2 cursor-pointer">
                {configuratorStones.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStone(s.key)}
                    title={s.name}
                    className={`w-10 h-10 rounded-full border-2 p-1 transition-all ${
                      stone === s.key ? 'border-[var(--color-ink)]' : 'border-transparent'
                    }`}
                  >
                    <div
                      className="w-full h-full rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: s.color }}
                    >
                      {stone === s.key && <Check className="w-full h-full p-2 text-black/50 mix-blend-difference" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Option (Rings only) */}
          {modelType === 'ring' && (
            <div className="mb-6 lg:mb-10">
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

          {/* Ring engraving removed — section intentionally empty for rings.
              Pendant keeps its own text/shape/size/font controls below. */}
          {modelType === 'pendant' && (
            <>
              {/* Pendant Properties */}
              <div className="mb-6 lg:mb-10">
                <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
                  <span>Pendant Shape</span>
                  <span className="opacity-50 capitalize">{pendantShape}</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['standard', 'heart', 'tag'] as const).map((shape) => (
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

              <div className="mb-6 lg:mb-10">
                <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
                  <span>Pendant Size</span>
                  <span className="opacity-50">{PENDANT_SIZE_INFO[pendantSize].label} · {PENDANT_SIZE_INFO[pendantSize].mm}</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setPendantSize(size)}
                      className={`py-3 px-4 min-h-[3.25rem] text-xs tracking-widest transition-colors border flex flex-col items-center justify-center gap-0.5 ${
                        pendantSize === size ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'
                      }`}
                    >
                      <span className="capitalize font-medium">{PENDANT_SIZE_INFO[size].label}</span>
                      <span className="text-[9px] opacity-65 normal-case tracking-normal">{PENDANT_SIZE_INFO[size].mm}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6 lg:mb-10">
                <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2 flex justify-between">
                  <span>{pendantShape === 'tag' ? 'Monogram (initials)' : 'Custom Text'}</span>
                  <span className={`opacity-60 tabular-nums ${pendantShape === 'tag' && customText.length >= 3 ? 'text-amber-600' : ''}`}>
                    {customText.length}/{pendantShape === 'tag' ? '3' : '10'}
                  </span>
                </h3>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value.slice(0, pendantShape === 'tag' ? 3 : 10))}
                  className="w-full p-4 bg-white border border-black/10 focus:outline-none focus:border-[var(--color-ink)] uppercase tracking-widest text-sm"
                  placeholder={pendantShape === 'tag' ? 'A, AB, or ABC...' : 'Enter Name...'}
                />
                {pendantShape === 'tag' && (
                  <p className="text-[10px] text-gray-400 mt-1.5 uppercase tracking-wider">Tag shape is monogram-only — 1 to 3 initials</p>
                )}
                {pendantShape === 'tag' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setTextDirection('horizontal')}
                      className={`flex-1 py-2 text-[10px] tracking-widest border transition-colors ${textDirection === 'horizontal' ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'}`}
                    >
                      — Horizontal
                    </button>
                    <button
                      onClick={() => setTextDirection('vertical')}
                      className={`flex-1 py-2 text-[10px] tracking-widest border transition-colors ${textDirection === 'vertical' ? 'border-[var(--color-ink)] bg-black/5' : 'border-black/10 hover:border-black/50'}`}
                    >
                      | Vertical
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-6 lg:mb-10">
                {textSizeControl}
              </div>

              <div className="mb-6 lg:mb-10">
                <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 border-b border-black/10 pb-2">Font Style</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {availableFontKeys.map((key) => (
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

        <div className="px-5 py-4 lg:p-6 border-t border-[rgba(26,26,26,0.1)] bg-[var(--color-paper)] shrink-0">
          <div className="flex flex-col mb-4">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mb-1 border-b border-black/5 pb-1">
               <span>Base + Metal:</span>
               <span>{formatEstimate(price.breakdown.metal)}</span>
            </div>
            {modelType === 'ring' && (
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mb-1 border-b border-black/5 pb-1">
                 <span>Stone:</span>
                 <span>{formatEstimate(price.breakdown.stone)}</span>
              </div>
            )}
            {modelType === 'pendant' && (
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mb-2 border-b border-black/5 pb-1">
                 <span>Engraving:</span>
                 <span>{formatEstimate(price.breakdown.engraving)}</span>
              </div>
            )}
            <div className="flex justify-between items-end mt-2">
              <div>
                <span className="block text-[9px] uppercase tracking-widest text-gray-400 mb-0.5">Starting from</span>
                <span className="text-xs uppercase tracking-widest font-bold text-gray-800">Total Price:</span>
              </div>
              <span className="font-serif text-2xl text-[var(--color-ink)]">{formatPrice(price.total)}</span>
            </div>
            <p className="text-[10px] leading-snug opacity-60 mt-1">{INDICATIVE_NOTE}</p>
          </div>
          {saveMessage && (
            <div className={`mb-3 px-3 py-2 rounded text-xs font-medium ${saveMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {saveMessage.text}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => guard(handleSaveConfiguration)}
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
        metalName={currentMetal?.name ?? ''}
        stone={stone}
        metalMaterialOverride={currentMetal?.material}
        stoneMaterialOverride={currentStone?.material}
        modelType={modelType}
        customText={customText}
        fontStyle={fontStyle}
        fileUrl={currentStyleDef?.fileUrl}
        pendantShape={modelType === 'pendant' ? pendantShape : undefined}
        pendantSize={modelType === 'pendant' ? pendantSize : undefined}
        fontBold={fontBold}
        fontItalic={fontItalic}
        textDirection={textDirection}
      />
      
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
      {showWarning && <AdminActionWarning onClose={dismiss} />}
    </div>
  );
}
