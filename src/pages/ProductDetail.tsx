import { useState, useMemo, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Html, Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, ShoppingBag, ArrowLeft, Check, Sparkles, 
  ShieldCheck, Truck, RotateCcw, Share2, Facebook, 
  Twitter, Copy, Star, Key, Type, Info, HelpCircle
} from 'lucide-react';

import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { usePricing } from '../context/PricingContext';
import { useAuth } from '../context/AuthContext';
import { MOCK_PRODUCTS } from '../data/products';
import { METALS, STONES, FONTS } from '../constants';
import { CustomGLBRingModel } from '../components/RingModels';
import { PendantModel } from '../components/PendantModel';
import { LoadingSpinner } from '../components/LoadingSpinner';
import ARTryOnModal from '../components/ARTryOnModal';
import { SizeGuideModal } from '../components/SizeGuideModal';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlistItem, isInWishlist } = useWishlist();
  const { pricing } = usePricing();
  const { user } = useAuth();

  const isCustomProduct = id === 'custom';

  // Configurator options (if custom or standard customizable)
  const queryType = (searchParams.get('type') || 'ring') as 'ring' | 'pendant';
  const queryMetal = (searchParams.get('metal') || 'gold') as keyof typeof METALS;
  const queryStone = (searchParams.get('stone') || 'diamond') as keyof typeof STONES;
  const queryText = searchParams.get('text') || 'PD';
  const queryFont = (searchParams.get('font') || 'helvetiker') as keyof typeof FONTS;
  const querySize = searchParams.get('size') || 'US 7';
  const queryStyle = searchParams.get('style') || 'custom-glb';

  // State
  const [selectedMetal, setSelectedMetal] = useState<keyof typeof METALS>('gold');
  const [selectedStone, setSelectedStone] = useState<keyof typeof STONES>('diamond');
  const [engravingText, setEngravingText] = useState('');
  const [wantEngraving, setWantEngraving] = useState(false);
  const [selectedSize, setSelectedSize] = useState('US 7');
  const [selectedFont, setSelectedFont] = useState<keyof typeof FONTS>('helvetiker');
  const [selectedPendantShape, setSelectedPendantShape] = useState<'standard' | 'heart' | 'wing'>('standard');
  const [activeTab, setActiveTab] = useState<'details' | 'specifications'>('details');
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  
  // Modals
  const [isAROpen, setIsAROpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);

  // Load the catalog product if it exists
  const catalogProduct = useMemo(() => {
    if (isCustomProduct) return null;
    return MOCK_PRODUCTS.find(p => p.id === id) || null;
  }, [id, isCustomProduct]);

  // Set default states based on product or URL
  useEffect(() => {
    if (isCustomProduct) {
      setSelectedMetal(queryMetal);
      setSelectedStone(queryStone);
      setEngravingText(queryText);
      setWantEngraving(queryText.length > 0);
      setSelectedFont(queryFont);
      setSelectedSize(querySize);
    } else if (catalogProduct) {
      // Determine default metal from name
      if (catalogProduct.name.toLowerCase().includes('white gold') || catalogProduct.name.toLowerCase().includes('platinum')) {
        setSelectedMetal('silver');
      } else if (catalogProduct.name.toLowerCase().includes('rose gold') || catalogProduct.name.toLowerCase().includes('18k')) {
        setSelectedMetal('rose');
      } else {
        setSelectedMetal('gold');
      }
      
      // Determine stone state
      if (catalogProduct.hasStones) {
        if (catalogProduct.name.toLowerCase().includes('diamond')) setSelectedStone('diamond');
        else if (catalogProduct.name.toLowerCase().includes('amethyst')) setSelectedStone('ruby'); 
        else if (catalogProduct.name.toLowerCase().includes('sapphire')) setSelectedStone('sapphire');
        else setSelectedStone('aquamarine');
      }
    }
  }, [catalogProduct, isCustomProduct, queryMetal, queryStone, queryText, queryFont, querySize]);

  // If the product doesn't exist and not custom, let the UI handle fallback nicely
  const finalProductExists = catalogProduct || isCustomProduct;

  // Calculate pricing based on options
  const computedPrice = useMemo(() => {
    if (isCustomProduct) {
      let base = queryType === 'pendant' ? 12000 : 25000;
      let multiplier = METALS[selectedMetal]?.priceMultiplier || 1;
      if (pricing) {
        if (selectedMetal === 'silver') multiplier = pricing.metalMultiplier_silver;
        if (selectedMetal === 'gold') multiplier = pricing.metalMultiplier_gold;
        if (selectedMetal === 'rose') multiplier = pricing.metalMultiplier_rose;
      }

      const metalPart = base * multiplier;
      let stonePart = 0;
      if (queryType === 'ring') {
        stonePart = pricing ? (pricing as any)[`stonePrice_${selectedStone}`] : (STONES[selectedStone]?.price || 0);
      }

      let engravingPart = 0;
      if (wantEngraving || queryType === 'pendant') {
        engravingPart = pricing?.engravingPrice || 5000;
      }

      return Math.round(metalPart + stonePart + engravingPart);
    } else if (catalogProduct) {
      // Base catalog price represents the metal model
      let metalMultiplier = 1;
      if (selectedMetal === 'rose') metalMultiplier = 1.1; // modest premium for rose gold plating
      if (selectedMetal === 'gold') metalMultiplier = 1.25; // 22K yellow gold premium

      let stonePremium = 0;
      if (catalogProduct.hasStones && selectedStone !== 'aquamarine') {
        if (selectedStone === 'diamond') stonePremium = 145000;
        else if (selectedStone === 'sapphire') stonePremium = 65000;
        else if (selectedStone === 'ruby') stonePremium = 45000;
        else if (selectedStone === 'emerald') stonePremium = 55000;
      }

      let engravingPart = 0;
      if (wantEngraving) {
        engravingPart = pricing?.engravingPrice || 5000;
      }

      return Math.round((catalogProduct.price * metalMultiplier) + stonePremium + engravingPart);
    }
    return 0;
  }, [catalogProduct, isCustomProduct, selectedMetal, selectedStone, wantEngraving, queryType, pricing]);

  const productDescription = useMemo(() => {
    if (isCustomProduct) {
      return `Custom designed ${queryType} meticulously configured to your luxurious aesthetic preferences. Features authentic premium handcrafting, high-reflection polished finishes, and customized dimensions. Configured in ${METALS[selectedMetal].name}.`;
    }
    return catalogProduct?.description || '';
  }, [isCustomProduct, catalogProduct, queryType, selectedMetal]);

  const productName = useMemo(() => {
    if (isCustomProduct) {
      return queryType === 'ring' 
        ? `${METALS[selectedMetal].name} Bespoke Ring ("${engravingText || 'PD'}")` 
        : `${METALS[selectedMetal].name} Heritage Pendant ("${engravingText || 'PD'}")`;
    }
    return catalogProduct?.name || 'Luxury Jewel';
  }, [isCustomProduct, catalogProduct, queryType, selectedMetal, engravingText]);

  const mainImage = useMemo(() => {
    if (isCustomProduct) {
      return queryType === 'ring'
        ? 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80&w=600'
        : 'https://images.unsplash.com/photo-1599643478514-4a4802c61e44?auto=format&fit=crop&q=80&w=600';
    }
    return catalogProduct?.image || '';
  }, [isCustomProduct, catalogProduct, queryType]);

  const isInWishlistState = useMemo(() => {
    const checkId = isCustomProduct ? `custom-${queryType}-${queryStyle}-${selectedMetal}-${selectedStone}-${selectedFont}-${engravingText}-${selectedSize}` : (id || '');
    return isInWishlist(checkId);
  }, [isCustomProduct, queryType, queryStyle, selectedMetal, selectedStone, selectedFont, engravingText, selectedSize, id, isInWishlist]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: productName,
        text: `Take a look at this gorgeous ${productName} on PD Jewellers!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleAddToBag = () => {
    const itemToAddId = isCustomProduct 
      ? `custom-${queryType}-${queryStyle}-${selectedMetal}-${selectedStone}-${selectedFont}-${engravingText}-${selectedSize}`
      : `${id}-${selectedMetal}-${selectedStone}-${selectedSize}-${wantEngraving ? 'engraved' : 'plain'}`;

    addToCart({
      id: itemToAddId,
      name: productName,
      price: computedPrice,
      image: mainImage,
      options: {
        material: METALS[selectedMetal].name,
        size: selectedSize,
        ...(wantEngraving && { engraving: engravingText, font: FONTS[selectedFont].name }),
        ...((isCustomProduct || catalogProduct?.hasStones) && { gemstone: STONES[selectedStone].name })
      },
      quantity: quantity
    });
  };

  const handleToggleWishlist = () => {
    const itemToAddId = isCustomProduct 
      ? `custom-${queryType}-${queryStyle}-${selectedMetal}-${selectedStone}-${selectedFont}-${engravingText}-${selectedSize}`
      : `${id}-${selectedMetal}-${selectedStone}-${selectedSize}-${wantEngraving ? 'engraved' : 'plain'}`;

    toggleWishlistItem({
      productId: itemToAddId,
      name: productName,
      price: computedPrice.toString(),
      image: mainImage,
      category: isCustomProduct ? 'Custom Configuration' : (catalogProduct?.category || 'Legacy Collection'),
      isCustom: isCustomProduct
    });
  };

  if (!finalProductExists) {
    return (
      <div className="min-h-screen pt-32 pb-24 text-center max-w-lg mx-auto px-6">
        <h2 className="text-3xl font-serif text-[#111] mb-4">Masterpiece Not Found</h2>
        <p className="text-stone-500 mb-8 font-sans">The requested jewelry item or custom design could not be loaded. Please explore our dynamic catalog or design a custom piece.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/collections" className="bg-gradient-to-r from-stone-900 to-black text-white px-6 py-3 uppercase tracking-widest text-xs font-bold">Collections</Link>
          <Link to="/configurator" className="bg-gold-gradient text-white px-6 py-3 uppercase tracking-widest text-xs font-bold">Design Studio</Link>
        </div>
      </div>
    );
  }

  // Related products selection
  const relatedMasters = MOCK_PRODUCTS
    .filter(p => p.id !== id && (catalogProduct ? p.category === catalogProduct.category : true))
    .slice(0, 4);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Back Link */}
        <div className="mb-8 flex justify-between items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="group flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors uppercase tracking-widest text-[10px] font-bold"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to Collections
          </button>
          
          <div className="text-[10px] tracking-widest uppercase text-stone-400">
            Colombo Elite &bull; Authentic Certificates
          </div>
        </div>

        {/* Master Details Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20">
          
          {/* Left Panel: Presentation (3D Interactive or High-End Image Showcase) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative aspect-[4/5] bg-white border border-stone-200/50 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center">
              
              {isCustomProduct ? (
                /* Dynamic Interactive 3D Canvas Preview for configured custom items */
                <div className="w-full h-full relative bg-radial-gradient">
                  <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm border border-stone-200 px-4 py-2 rounded-full text-[9px] uppercase tracking-widest font-semibold text-stone-700 flex items-center gap-1.5 shadow-sm">
                    <Sparkles size={11} className="text-amber-500 animate-pulse" />
                    Bespoke 3D Configured Render
                  </div>
                  <div className="absolute top-4 right-4 z-10 bg-black/5 p-2 rounded-full text-[9px] uppercase tracking-wider text-stone-500">
                    Drag to Pivot Ring
                  </div>
                  
                  <Canvas shadows camera={{ position: [0, 1.8, 4.5], fov: 45 }}>
                    <ambientLight intensity={0.8} />
                    <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={2} />
                    <pointLight position={[-10, -10, -10]} intensity={1} />
                    <Suspense fallback={<Html center><LoadingSpinner fullScreen={false} /></Html>}>
                      <group scale={1.6} position={[0, -0.2, -0.4]}>
                        {queryType === 'ring' ? (
                          <CustomGLBRingModel 
                            style={queryStyle} 
                            text={wantEngraving ? engravingText : undefined} 
                            metalMaterial={METALS[selectedMetal]} 
                            stoneMaterial={STONES[selectedStone]} 
                            fontStyle={selectedFont} 
                          />
                        ) : (
                          <PendantModel 
                            text={engravingText} 
                            metalMaterial={METALS[selectedMetal]} 
                            fontStyle={selectedFont}
                            shape={selectedPendantShape}
                          />
                        )}
                      </group>
                      <Environment preset="city" background={false} />
                      <ContactShadows position={[0, -1.8, 0]} opacity={0.4} scale={6} blur={2.4} />
                    </Suspense>
                    <OrbitControls 
                      enablePan={false} 
                      enableZoom={true} 
                      minPolarAngle={Math.PI/4} 
                      maxPolarAngle={Math.PI/2} 
                    />
                  </Canvas>
                </div>
              ) : (
                /* Beautiful High-Resolution Image for catalog model with zoom action */
                <div className="w-full h-full relative group">
                  <img 
                    src={mainImage} 
                    alt={productName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 z-10 bg-[#edd19b]/10 text-[#a8823d] border border-[#edd19b]/30 px-3.5 py-1.5 rounded-full text-[9px] uppercase font-bold tracking-[0.15em] backdrop-blur-sm">
                    Luxury Original
                  </div>
                </div>
              )}

              {/* Heart and Share Floating over Picture */}
              <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-10">
                <button 
                  onClick={handleToggleWishlist}
                  className="w-12 h-12 flex items-center justify-center bg-white/90 backdrop-blur-md hover:bg-white rounded-full shadow-lg border border-stone-100 transition-all active:scale-95 text-rose-500"
                  aria-label="Toggle Wishlist"
                >
                  <Heart size={20} fill={isInWishlistState ? "currentColor" : "none"} />
                </button>
                <div className="relative">
                  <button 
                    onClick={handleShare}
                    className="w-12 h-12 flex items-center justify-center bg-white/90 backdrop-blur-md hover:bg-white rounded-full shadow-lg border border-stone-100 transition-all active:scale-95 text-stone-700 font-bold"
                    aria-label="Share Piece"
                  >
                    <Share2 size={18} />
                  </button>
                  <AnimatePresence>
                    {copiedLink && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0 }}
                        className="absolute right-14 top-3 bg-stone-900 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded whitespace-nowrap shadow-md"
                      >
                        Link Copied!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>


            {/* Visual Hallmark Certification Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-stone-200/50 text-center flex flex-col items-center justify-center">
                <ShieldCheck className="text-amber-600 mb-1.5" size={20} />
                <span className="text-[9px] uppercase font-bold tracking-widest text-stone-800">ISO Certified</span>
                <span className="text-[8px] text-stone-400 mt-0.5 font-sans">99.9% Hallmark Guarantee</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-stone-200/50 text-center flex flex-col items-center justify-center">
                <RotateCcw className="text-amber-600 mb-1.5" size={20} />
                <span className="text-[9px] uppercase font-bold tracking-widest text-stone-800">Peace of Mind</span>
                <span className="text-[8px] text-[#cca150] font-bold mt-0.5 font-sans">Genuine Resizing/Return</span>
              </div>
            </div>
            
          </div>

          {/* Right Panel: Spec Sheet and Custom Configuration Actions */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#cca150] font-bold mb-2">
                {isCustomProduct ? `Custom configured ${queryType}` : (catalogProduct?.category || 'Legacy Gemstone')}
              </p>
              <h1 className="text-3xl xl:text-4xl font-serif text-stone-900 leading-tight mb-3">
                {productName}
              </h1>

              {/* Dynamic Price Display */}
              <div className="flex items-baseline gap-3 mt-4 border-b border-stone-200/60 pb-6">
                <span className="text-3xl font-normal text-stone-900">
                  Rs. {computedPrice.toLocaleString()}
                </span>
                <span className="text-xs uppercase tracking-widest text-stone-400">
                  (Tax and duty included)
                </span>
              </div>
            </div>

            {/* All Customizable Option Forms */}
            {isCustomProduct ? (
              <div className="space-y-6">
                
                {/* Option 1: Premium Metals Alloys */}
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-700 mb-3 flex items-center justify-between">
                    <span>Sovereign Metal Grade</span>
                    <span className="text-amber-700 font-serif lowercase italic">{METALS[selectedMetal].name}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(METALS) as Array<keyof typeof METALS>).map((mKey) => (
                      <button
                        key={mKey}
                        onClick={() => setSelectedMetal(mKey)}
                        className={`p-3 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                          selectedMetal === mKey 
                            ? 'border-amber-600 bg-amber-50/25 shadow-sm' 
                            : 'border-stone-200 bg-white hover:border-stone-400'
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-full border border-black/10 shadow-inner relative flex items-center justify-center"
                          style={{ backgroundColor: METALS[mKey].color }}
                        >
                          {selectedMetal === mKey && (
                            <div className="w-5 h-5 rounded-full bg-stone-900 border border-white flex items-center justify-center">
                              <Check size={11} className="text-amber-400" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-stone-700 text-center tracking-tight leading-tight">
                          {METALS[mKey].name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Option 2: Center focal Gemstone (Visible if custom or original has stone) */}
                {(isCustomProduct || catalogProduct?.hasStones) && (
                  <div>
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-700 mb-3 flex items-center justify-between">
                      <span>Accent Gemstone Selection</span>
                      <span className="text-amber-700 font-serif lowercase italic">{STONES[selectedStone].name}</span>
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                      {(Object.keys(STONES) as Array<keyof typeof STONES>).map((sKey) => (
                        <button
                          key={sKey}
                          onClick={() => setSelectedStone(sKey)}
                          className={`p-2 border rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                            selectedStone === sKey 
                              ? 'border-amber-600 bg-amber-50/30' 
                              : 'border-stone-200 bg-white hover:border-stone-300'
                          }`}
                          title={STONES[sKey].name}
                        >
                          <div 
                            className="w-8 h-8 rounded-full border border-stone-200 shadow-inner relative flex items-center justify-center opacity-90 hover:opacity-100"
                            style={{ backgroundColor: STONES[sKey].color }}
                          >
                            {selectedStone === sKey && (
                              <Check size={12} className="text-stone-900 stroke-[3] mix-blend-difference" />
                            )}
                          </div>
                          <span className="text-[8px] font-sans font-bold text-stone-600 text-center truncate w-full">
                            {STONES[sKey].name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Option 3: Dimensions/Size selection */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-700">
                      Bespoke Dimension Scale
                    </h3>
                    <button 
                      onClick={() => setIsSizeOpen(true)}
                      className="text-[10px] uppercase tracking-wider text-[#cca150] font-bold hover:underline flex items-center gap-1"
                    >
                      <Info size={11} /> Size Guide
                    </button>
                  </div>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full p-4 bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-amber-500 uppercase tracking-widest text-xs font-bold appearance-none transition-all cursor-pointer shadow-sm"
                  >
                    <option value="US 4">US 4 (Inner Radius 14.8mm)</option>
                    <option value="US 5">US 5 (Inner Radius 15.7mm)</option>
                    <option value="US 6">US 6 (Inner Radius 16.5mm)</option>
                    <option value="US 7">US 7 (Inner Radius 17.3mm)</option>
                    <option value="US 8">US 8 (Inner Radius 18.1mm)</option>
                    <option value="US 9">US 9 (Inner Radius 18.9mm)</option>
                    <option value="US 10">US 10 (Inner Radius 19.8mm)</option>
                    <option value="US 11">US 11 (Inner Radius 20.6mm)</option>
                    <option value="US 12">US 12 (Inner Radius 21.4mm)</option>
                  </select>
                </div>

                {/* Option 4: Custom Diamond Laser Engraving Toggle & Text */}
                <div className="border border-stone-200 p-5 rounded-xl bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Type size={16} className="text-amber-700" />
                      <span className="text-xs uppercase tracking-widest font-bold text-stone-800">Add Micro-Laser Engraving</span>
                    </div>
                    <button 
                      onClick={() => setWantEngraving(!wantEngraving)}
                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${wantEngraving ? 'bg-amber-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${wantEngraving ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {wantEngraving && (
                    <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-1">
                      <div>
                        <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">
                          <span className="font-bold text-stone-600">Engraving Inscription</span>
                          <span>{engravingText.length}/10 letters</span>
                        </div>
                        <input
                          type="text"
                          value={engravingText}
                          onChange={(e) => setEngravingText(e.target.value.slice(0, 10))}
                          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-500 uppercase tracking-widest text-xs tracking-wide shadow-inner"
                          placeholder="e.g. FOREVER, PATHUM..."
                        />
                      </div>

                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5 font-bold">Inlay Font Calligraphy</div>
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.keys(FONTS) as Array<keyof typeof FONTS>).slice(0, 4).map((fKey) => (
                            <button
                              key={fKey}
                              onClick={() => setSelectedFont(fKey)}
                              className={`p-2.5 rounded-xl text-[9px] uppercase tracking-wider border text-center font-bold transition-all ${
                                selectedFont === fKey 
                                  ? 'border-amber-600 bg-amber-50/10 text-stone-950 font-extrabold' 
                                  : 'border-stone-200 bg-white hover:border-stone-400'
                              }`}
                            >
                              {FONTS[fKey].name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Option 5: Pendant Shape selection (Custom Pendants helper) */}
                {isCustomProduct && queryType === 'pendant' && (
                  <div>
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-700 mb-3">
                      Heritage Pendant Frame Shape
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(['standard', 'heart', 'wing'] as const).map((shape) => (
                        <button
                          key={shape}
                          onClick={() => setSelectedPendantShape(shape)}
                          className={`py-3 px-4 text-xs tracking-widest border rounded-xl capitalize font-bold transition-all ${
                            selectedPendantShape === shape ? 'border-amber-600 bg-amber-50/20 text-stone-900' : 'border-stone-200 bg-white hover:border-stone-300'
                          }`}
                        >
                          {shape}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-stone-50/60 border border-stone-200/60 p-6 rounded-2xl space-y-4 font-sans shadow-[inset_0_1px_3px_rgba(0,0,0,0.01)]">
                <div className="flex items-center justify-between">
                  <span className="inline-block bg-stone-900 text-white text-[9px] uppercase tracking-[0.15em] font-bold px-3 py-1 rounded-md">
                    Original Ready-To-Wear Curation
                  </span>
                  <span className="text-[9px] uppercase font-bold text-[#cca150] tracking-widest">Permanent Showroom</span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed font-sans">
                  This masterpiece belongs to our collection series and is configured as styled by our master lapidaries. We preserve the signature carat weights, diamond clarity grades, and sovereign metal selections on these specific heritage releases to guarantee cohesive value and pristine original design alignment. No further customization is applicable.
                </p>
                <div className="text-[11px] text-stone-500 font-medium flex flex-col gap-2.5 border-t border-stone-200/50 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Standard Metal Alloy</span>
                    <span className="font-bold text-stone-800 uppercase tracking-widest font-mono">
                      {catalogProduct ? (catalogProduct.name.toLowerCase().includes('platinum') ? 'Platinum 950' : (catalogProduct.name.toLowerCase().includes('white gold') ? '18K White Gold' : (catalogProduct.name.toLowerCase().includes('rose gold') ? '18K Rose Gold' : '22K Gold Sovereign'))) : 'Solid Precious Metal'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Gemstone Accents</span>
                    <span className="font-bold text-stone-800">
                      {catalogProduct?.hasStones ? 'Genuine Fine Gemstones' : 'Classic Solid Metal Band'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Inquiry Dispatch Code</span>
                    <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                      REG-CURAT-{id?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity Selector, Add to Bag & Buy Direct Actions */}
            <div className="pt-4 border-t border-stone-200/60 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-stone-200 rounded-xl bg-white p-1">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-stone-500 font-bold hover:bg-stone-50 transition-colors rounded-lg"
                    title="Decrease Quantity"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-sm font-semibold text-stone-800">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-stone-500 font-bold hover:bg-stone-50 transition-colors rounded-lg"
                    title="Increase Quantity"
                  >
                    +
                  </button>
                </div>

                <button 
                  onClick={handleAddToBag}
                  className="flex-1 bg-stone-950 text-white rounded-xl py-4 uppercase tracking-[0.2em] text-xs font-bold hover:bg-stone-900 transition-colors flex items-center justify-center gap-2 shadow-md shadow-stone-900/10"
                >
                  <ShoppingBag size={15} /> Inquire Now
                </button>
              </div>

              {isCustomProduct && (
                <div className="text-center">
                  <Link 
                    to="/configurator" 
                    className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#cca150] hover:underline"
                  >
                    &larr; Refine 3D Model Parameters in Configurator
                  </Link>
                </div>
              )}
            </div>

            {/* Extra product specification tabs */}
            <div className="border border-stone-200 rounded-2xl bg-white overflow-hidden shadow-sm">
              <div className="flex border-b border-stone-200">
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold border-b-2 transition-all ${activeTab === 'details' ? 'border-[#cca150] text-stone-950 bg-stone-50/40' : 'border-transparent text-stone-400 hover:text-stone-700'}`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setActiveTab('specifications')}
                  className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold border-b-2 transition-all ${activeTab === 'specifications' ? 'border-[#cca150] text-stone-950 bg-stone-50/40' : 'border-transparent text-stone-400 hover:text-stone-700'}`}
                >
                  Heritage Spec
                </button>
              </div>
              <div className="p-6 text-xs text-stone-600 leading-relaxed font-sans space-y-3">
                {activeTab === 'details' && (
                  <>
                    <p>{productDescription}</p>
                    <p className="font-light">Every masterpiece produced by PD Jewellers is custom cast, polished by lineage craftsmen, and authenticated with micro laser engravings to guarantee lifelong preservation.</p>
                  </>
                )}
                {activeTab === 'specifications' && (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-stone-100 pt-2 text-[11px]">
                    <div className="text-stone-400">Metal Weight:</div>
                    <div className="text-stone-800 font-medium">Bespoke (4.50g - 14.50g average)</div>
                    <div className="text-stone-400">Metal Purity:</div>
                    <div className="text-stone-800 font-medium">{METALS[selectedMetal].name}</div>
                    <div className="text-stone-400">Hallmark Grade:</div>
                    <div className="text-stone-800 font-medium">PD Certified 916 Luxury Shield</div>
                    <div className="text-stone-400">Accent stones:</div>
                    <div className="text-stone-800 font-medium">{(isCustomProduct || catalogProduct?.hasStones) ? STONES[selectedStone].name : 'No stones (Solid plain)'}</div>
                    <div className="text-stone-400">Country of birth:</div>
                    <div className="text-stone-800 font-medium">Sri Lanka (Colombo House)</div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Similar Masterworks Recommendations Section */}
        <div className="mt-24 border-t border-stone-200/60 pt-16">
          <div className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#cca150] font-bold">PD Curation</span>
            <h2 className="text-2xl font-serif text-stone-900 mt-1">Other Necessary Masterpieces</h2>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#cca150] to-transparent mx-auto mt-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedMasters.map((related) => (
              <Link 
                to={`/product/${related.id}`} 
                key={related.id} 
                className="group bg-white p-4 rounded-xl border border-stone-100 hover:border-[#cca150]/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="aspect-[4/5] overflow-hidden rounded-lg bg-stone-50 mb-4 relative">
                  <img 
                    src={related.image} 
                    alt={related.name} 
                    className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-[10px] text-stone-400">
                    <Star size={10} fill="#cca150" color="#cca150" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[9px] uppercase tracking-widest text-[#cca150] font-bold mb-1">{related.category}</p>
                  <h4 className="font-serif text-xs font-bold text-stone-800 text-ellipsis overflow-hidden whitespace-nowrap mb-1">
                    {related.name}
                  </h4>
                  <p className="text-xs font-bold text-stone-900">
                    Starts from Rs. {related.price.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      <ARTryOnModal 
        isOpen={isAROpen} 
        onClose={() => setIsAROpen(false)} 
        metal={selectedMetal} 
        metalName={METALS[selectedMetal].name} 
        stone={selectedStone}
        modelType={isCustomProduct ? queryType : 'ring'}
        ringStyle={isCustomProduct ? queryStyle : 'custom-glb'}
        customText={wantEngraving ? engravingText : undefined}
        fontStyle={selectedFont}
      />

      <SizeGuideModal 
        isOpen={isSizeOpen} 
        onClose={() => setIsSizeOpen(false)} 
      />
    </div>
  );
}
