import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Heart, Share2, Facebook, Twitter, Link as LinkIcon, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLocation } from 'react-router-dom';

export const MOCK_PRODUCTS = [
  // Rings
  { id: 'r1', name: 'Eternity Diamond Ring', price: 450000, category: 'Rings', image: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80', description: 'A continuous line of flawlessly matched diamonds set in 18k white gold.', karatage: '18K', hasStones: true, dateAdded: '2023-10-01', views: 1250 },
  { id: 'r2', name: 'Bridal Solitaire Set', price: 210000, category: 'Rings', image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&q=80', description: 'A classic ring capturing the elegant simplicity of true love.', karatage: '18K', hasStones: true, dateAdded: '2023-11-15', views: 890 },
  { id: 'r3', name: 'Sapphire Halo Ring', price: 450000, category: 'Rings', image: 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?auto=format&fit=crop&q=80', description: 'Stunning blue sapphire surrounded by a halo of brilliant diamonds.', karatage: '18K', hasStones: true, dateAdded: '2024-01-10', views: 2100 },
  
  // Necklaces
  { id: 'n1', name: 'Antique Gold Necklace', price: 180000, category: 'Necklaces', image: 'https://images.unsplash.com/photo-1599643478514-4a4802c61e44?auto=format&fit=crop&q=80', description: 'An intricate traditional antique gold necklace for the modern royal.', karatage: '22K', hasStones: false, dateAdded: '2023-09-05', views: 3400 },
  { id: 'n2', name: 'Diamond Tennis Necklace', price: 1250000, category: 'Necklaces', image: 'https://images.unsplash.com/photo-1599687267812-35fc05fd4b50?auto=format&fit=crop&q=80', description: 'Seamless strand of round brilliant diamonds.', karatage: '18K', hasStones: true, dateAdded: '2024-02-20', views: 4500 },
  { id: 'n3', name: 'Pearl & Gold Chain', price: 85000, category: 'Necklaces', image: 'https://images.unsplash.com/photo-1515562141207-7a8efb545f47?auto=format&fit=crop&q=80', description: 'Cultured freshwater pearls alternating with gold links.', karatage: '22K', hasStones: true, dateAdded: '2023-12-01', views: 1100 },
  
  // Earrings
  { id: 'e1', name: 'Kundan Drop Earrings', price: 95000, category: 'Earrings', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80', description: 'Classic Kundan style drop earrings echoing timeless traditions.', karatage: '22K', hasStones: true, dateAdded: '2023-08-15', views: 2200 },
  { id: 'e2', name: 'Diamond Hoop Earrings', price: 340000, category: 'Earrings', image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80', description: 'Inside-out diamond hoop earrings crafted in white gold.', karatage: '18K', hasStones: true, dateAdded: '2024-03-05', views: 1800 },
  { id: 'e3', name: 'Pearl Studs', price: 45000, category: 'Earrings', image: 'https://images.unsplash.com/photo-1574542385491-03cd61bced3a?auto=format&fit=crop&q=80', description: 'Elegant South Sea pearl stud earrings.', karatage: '18K', hasStones: true, dateAdded: '2023-07-20', views: 950 },

  // Bracelets
  { id: 'b1', name: 'Temple Bangles', price: 450000, category: 'Bracelets', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80', description: 'A pair of heavy gold temple bangles, studded with rubies.', karatage: '22K', hasStones: true, dateAdded: '2023-10-25', views: 2800 },
  { id: 'b2', name: 'Diamond Tennis Bracelet', price: 890000, category: 'Bracelets', image: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&q=80', description: 'Classic 4-prong diamond tennis bracelet in platinum.', karatage: '18K', hasStones: true, dateAdded: '2024-01-30', views: 3100 },
  { id: 'b3', name: 'Chain Link Bracelet', price: 120000, category: 'Bracelets', image: 'https://images.unsplash.com/photo-1573408301145-b98c46544ea6?auto=format&fit=crop&q=80', description: 'Modern chunky chain link bracelet in 14k yellow gold.', karatage: '18K', hasStones: false, dateAdded: '2023-11-05', views: 1400 },

  // Pendants
  { id: 'p1', name: 'Heritage Pendant', price: 280000, category: 'Pendants', image: 'https://images.unsplash.com/photo-1599643477873-cecefb2c42d4?auto=format&fit=crop&q=80', description: 'An ancestral design featuring uncut polki diamonds in pure gold.', karatage: '22K', hasStones: true, dateAdded: '2023-09-12', views: 1600 },
  { id: 'p2', name: 'Emerald Cut Pendant', price: 540000, category: 'Pendants', image: 'https://images.unsplash.com/photo-1599643477874-c689ff887d19?auto=format&fit=crop&q=80', description: 'Dazzling emerald cut diamond pendant on a delicate chain.', karatage: '18K', hasStones: true, dateAdded: '2024-02-14', views: 2500 },

  // Engagement
  { id: 'en1', name: 'Princess Cut Engagement Ring', price: 560000, category: 'Engagement', image: 'https://images.unsplash.com/photo-1515562141207-7a8efb545f47?auto=format&fit=crop&q=80', description: 'A breathtaking princess cut diamond set in platinum.', karatage: '18K', hasStones: true, dateAdded: '2024-01-05', views: 3800 },
  { id: 'en2', name: 'Oval Solitaire', price: 720000, category: 'Engagement', image: 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?auto=format&fit=crop&q=80', description: 'Brilliant oval diamond on a delicate pavé band.', karatage: '18K', hasStones: true, dateAdded: '2024-02-10', views: 4000 },

  // Bridal Sets
  { id: 'br1', name: 'Rivaah Bridal Set', price: 2500000, category: 'Bridal Sets', image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80', description: 'Complete wedding set includes necklace, earrings, and maang tikka.', karatage: '22K', hasStones: true, dateAdded: '2023-11-20', views: 6500 },
  { id: 'br2', name: 'Diamond Encrusted Set', price: 1850000, category: 'Bridal Sets', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80', description: 'Matching necklace and earrings adorned with brilliant cut diamonds.', karatage: '18K', hasStones: true, dateAdded: '2024-01-15', views: 5800 }
];

const CATEGORIES = ['All', 'Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Engagement', 'Bridal Sets'];

export default function Collections() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get('category');
  const priceParam = searchParams.get('price');
  const karatageParam = searchParams.get('karatage');
  const stonesParam = searchParams.get('stones');
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [urlFilters, setUrlFilters] = useState<{price?: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  // New states for extended filtering and sorting
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [karatageFilter, setKaratageFilter] = useState<string[]>([]);
  const [stonesFilter, setStonesFilter] = useState<string | null>(null);

  const maxProductPrice = Math.max(...MOCK_PRODUCTS.map(p => p.price));
  const [maxPrice, setMaxPrice] = useState(maxProductPrice);

  useEffect(() => {
    if (categoryParam) {
      const match = CATEGORIES.find(c => c.toLowerCase() === categoryParam.toLowerCase());
      if (match) setActiveCategory(match);
    }
    
    if (priceParam) {
      setUrlFilters({ price: priceParam });
    } else {
      setUrlFilters({});
    }

    if (karatageParam && karatageParam !== 'Any') {
      setKaratageFilter([karatageParam]);
    }

    if (stonesParam && stonesParam !== 'Any') {
      setStonesFilter(stonesParam === 'With Stones' ? 'with' : 'without');
    }

    if (categoryParam || priceParam || karatageParam || stonesParam) {
      // Clean up from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [categoryParam, priceParam, karatageParam, stonesParam]);

  useEffect(() => {
    // Simulate loading for better UX when filters change
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [activeCategory, urlFilters, maxPrice, sortBy, karatageFilter, stonesFilter]);

  const { addToCart } = useCart();
  const { toggleWishlistItem, isInWishlist } = useWishlist();

  const filteredProducts = useMemo(() => {
    let products = activeCategory === 'All' 
      ? [...MOCK_PRODUCTS] 
      : MOCK_PRODUCTS.filter(p => p.category === activeCategory);

    if (urlFilters.price) {
      if (urlFilters.price === 'Under LKR 150K') products = products.filter(p => p.price < 150000);
      else if (urlFilters.price === 'LKR 150K - 600K') products = products.filter(p => p.price >= 150000 && p.price <= 600000);
      else if (urlFilters.price === 'Over LKR 600K') products = products.filter(p => p.price > 600000);
    }
    
    if (maxPrice < maxProductPrice) {
      products = products.filter(p => p.price <= maxPrice);
    }

    if (karatageFilter.length > 0) {
      products = products.filter(p => p.karatage && karatageFilter.includes(p.karatage));
    }
    
    if (stonesFilter) {
      if (stonesFilter === 'with') {
        products = products.filter(p => p.hasStones === true);
      } else if (stonesFilter === 'without') {
        products = products.filter(p => p.hasStones === false);
      }
    }

    if (sortBy === 'latest') {
      products.sort((a, b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime());
    } else if (sortBy === 'most_viewed') {
      products.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === 'price_low_high') {
      products.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_high_low') {
      products.sort((a, b) => b.price - a.price);
    }

    return products;
  }, [activeCategory, urlFilters, maxPrice, maxProductPrice, karatageFilter, stonesFilter, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-serif mb-6 text-gold-gradient">The Masterpieces</h1>
        <div className="w-24 h-0.5 bg-gold-gradient mx-auto mb-6"></div>
        <p className="max-w-2xl mx-auto text-sm text-[var(--color-ink)] opacity-80">
          Discover our full range of exquisite pieces, each crafted with unparalleled attention to detail and beauty.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12 border-b border-black/5 pb-8 overflow-x-auto whitespace-nowrap">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`uppercase tracking-[0.15em] text-xs pb-2 font-semibold transition-all ${
              activeCategory === category ? 'text-[var(--color-gold)] border-b-2 border-[var(--color-gold)]' : 'text-gray-500 hover:text-[var(--color-gold-light)]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Advanced Filters Bar */}
      <div className="flex justify-end gap-4 items-center mb-8 pb-4">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 border border-black px-6 py-3 uppercase tracking-widest text-xs font-bold hover:bg-black hover:text-white transition-colors"
        >
          {showFilters ? 'Hide Filters' : 'Filter By'} 
          {showFilters ? <X size={16} /> : <span className="text-lg leading-none font-normal">+</span>}
        </button>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none border border-black px-6 py-3 pr-10 uppercase tracking-widest text-xs font-bold bg-white focus:outline-none cursor-pointer"
          >
            <option value="latest">Sort By Latest</option>
            <option value="most_viewed">Most Viewed</option>
            <option value="price_low_high">Price: Low to High</option>
            <option value="price_high_low">Price: High to Low</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-[#fcf8f0] border border-[#e5dfd3] p-8 mb-12 flex flex-col md:flex-row gap-12 rounded-sm transition-all duration-300">
          
          <div className="flex-1">
            <h4 className="font-serif text-2xl text-[var(--color-ink)] mb-8">Filter by</h4>
            
            <div className="mb-8">
              <h5 className="text-[12px] uppercase font-bold tracking-widest text-gray-800 mb-5">Karatage</h5>
              <div className="flex gap-10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 flex items-center justify-center border transition-colors ${karatageFilter.includes('18K') ? 'bg-[#e5dfd3] border-[#e5dfd3]' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                    {karatageFilter.includes('18K') && <svg className="w-4 h-4 text-[#8a7f66]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={karatageFilter.includes('18K')} onChange={() => {
                    setKaratageFilter(prev => prev.includes('18K') ? prev.filter(k => k !== '18K') : [...prev, '18K'])
                  }} />
                  <span className="text-[15px] text-[#4a5568]">18K</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 flex items-center justify-center border transition-colors ${karatageFilter.includes('22K') ? 'bg-[#e5dfd3] border-[#e5dfd3]' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                    {karatageFilter.includes('22K') && <svg className="w-4 h-4 text-[#8a7f66]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                  <input type="checkbox" className="hidden" checked={karatageFilter.includes('22K')} onChange={() => {
                    setKaratageFilter(prev => prev.includes('22K') ? prev.filter(k => k !== '22K') : [...prev, '22K'])
                  }} />
                  <span className="text-[15px] text-[#4a5568]">22K</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <h5 className="text-[12px] uppercase font-bold tracking-widest text-gray-800 mb-5 relative flex items-center gap-3">
                Stones 
                {stonesFilter && <button onClick={() => setStonesFilter(null)} className="text-[9px] text-[#a09a8a] underline hover:text-black uppercase tracing-widest">Clear</button>}
              </h5>
              <div className="flex gap-10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border transition-colors relative flex items-center justify-center ${stonesFilter === 'with' ? 'border-[#8a7f66]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                     {stonesFilter === 'with' && <div className="w-2.5 h-2.5 rounded-full bg-[#8a7f66]"></div>}
                  </div>
                  <input type="radio" name="stones" className="hidden" checked={stonesFilter === 'with'} onChange={() => setStonesFilter('with')} />
                  <span className="text-[15px] text-[#4a5568]">With Stones</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-full border transition-colors relative flex items-center justify-center ${stonesFilter === 'without' ? 'border-[#8a7f66]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                    {stonesFilter === 'without' && <div className="w-2.5 h-2.5 rounded-full bg-[#8a7f66]"></div>}
                  </div>
                  <input type="radio" name="stones" className="hidden" checked={stonesFilter === 'without'} onChange={() => setStonesFilter('without')} />
                  <span className="text-[15px] text-[#4a5568]">Without Stones</span>
                </label>
              </div>
            </div>

          </div>
          
          <div className="w-px bg-[#e5dfd3] hidden md:block"></div>

          <div className="flex-1 md:max-w-md flex flex-col justify-start">
            <h4 className="font-serif text-2xl text-[var(--color-ink)] mb-8 opacity-0 pointer-events-none hidden md:block">Budget</h4>
            <label className="text-[12px] uppercase font-bold tracking-widest text-gray-800 mb-6">
              Maximum Budget: <span className="text-[var(--color-gold)]">LKR {maxPrice.toLocaleString()}</span>
            </label>
            <div className="w-full relative mt-2">
              <input 
                type="range" 
                min="0" 
                max={maxProductPrice} 
                step="10000" 
                value={maxPrice} 
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full h-[3px] bg-[#e5dfd3] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
              <div className="flex justify-between mt-3 text-[11px] text-[#a09a8a] uppercase font-bold tracking-wider">
                <span>Any</span>
                <span>LKR {maxProductPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* Active Selection Filters from Style Assistant */}
      {(urlFilters.price) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10 -mt-8">
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Match Filters:</span>
          {urlFilters.price && (
            <span className="flex items-center gap-2 bg-[#D4AF37]/5 border border-[#D4AF37]/20 text-[#D4AF37] px-3 py-1.5 rounded-full text-xs font-medium">
              {urlFilters.price}
              <button 
                onClick={() => setUrlFilters(prev => ({...prev, price: undefined}))}
                className="hover:text-black transition-colors"
                title="Remove filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button 
             onClick={() => setUrlFilters({})} 
             className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-black underline transition-colors"
          >
             Clear All
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-pulse">
              <div className="relative aspect-[4/5] bg-gray-200 rounded-lg overflow-hidden mb-6"></div>
              <div className="text-center flex flex-col items-center">
                <div className="h-3 w-16 bg-gray-200 rounded mb-4"></div>
                <div className="h-5 w-48 bg-gray-200 rounded mb-3"></div>
                <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
                <div className="h-5 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))
        ) : (
          filteredProducts.map((product, index) => {
            const inWishlist = isInWishlist(product.id);
            
            return (
            <motion.div 
              key={product.id} 
              className="group cursor-pointer"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: (index % 4) * 0.1 }}
            >
              <div 
                className="relative aspect-[4/5] bg-white rounded-lg overflow-hidden mb-6 border border-black/5 group-hover:border-[var(--color-gold)] transition-colors"
                onMouseMove={(e) => {
                  const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - left) / width * 100;
                  const y = (e.clientY - top) / height * 100;
                  const img = e.currentTarget.querySelector('img');
                  if (img) {
                    img.style.transformOrigin = `${x}% ${y}%`;
                  }
                }}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) {
                    img.style.transformOrigin = 'center center';
                  }
                }}
              >
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      toggleWishlistItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price.toString(),
                        image: product.image,
                        category: product.category,
                        isCustom: false
                      });
                    }}
                    className="w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <Heart size={18} fill={inWishlist ? "var(--color-gold)" : "none"} color={inWishlist ? "var(--color-gold)" : "gray"} />
                  </button>
                  <div className="group/share relative">
                    <button 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          if (navigator.share) {
                            navigator.share({
                              title: product.name,
                              text: `Check out ${product.name} at our store!`,
                              url: window.location.origin + `/collections?category=${product.category}`
                            }).catch(console.error);
                          }
                        }}
                        className="w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
                        title="Share this product"
                    >
                        <Share2 size={16} className="text-gray-500 group-hover/share:text-[var(--color-gold)] transition-colors" />
                    </button>
                    <div className="absolute top-0 right-full mr-2 flex flex-row items-center gap-2 opacity-0 pointer-events-none group-hover/share:opacity-100 group-hover/share:pointer-events-auto transition-all bg-white px-3 py-2 rounded-full shadow-md translate-x-2 group-hover/share:translate-x-0">
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/collections?category=' + product.category)}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition-colors" onClick={e => e.stopPropagation()} title="Share on Facebook">
                          <Facebook size={16} />
                        </a>
                        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out ' + product.name)}&url=${encodeURIComponent(window.location.origin + '/collections?category=' + product.category)}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors" onClick={e => e.stopPropagation()} title="Share on Twitter">
                          <Twitter size={16} />
                        </a>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(window.location.origin + '/collections?category=' + product.category); alert('Link copied to clipboard!'); }} className="text-gray-500 hover:text-gray-800 transition-colors" title="Copy Link">
                          <LinkIcon size={16} />
                        </button>
                    </div>
                  </div>
                </div>
                <img 
                  src={product.image} 
                  alt={product.name} 
                  loading="lazy"
                  className="w-full h-full object-cover mix-blend-multiply transition-transform duration-300 ease-out group-hover:scale-[2]"
                />
                <button 
                  onClick={(e) => { e.preventDefault(); addToCart(product); }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gold-gradient text-white p-3 rounded-full opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl hover:opacity-90 hover:scale-105 z-10"
                  title="Add to Bag"
                >
                  <ShoppingBag size={20} className="stroke-white" strokeWidth={2} />
                </button>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold)] mb-2 font-bold">{product.category}</p>
                <h3 className="font-serif text-lg md:text-xl mb-2 text-[var(--color-ink)]">{product.name}</h3>
                <p className="text-sm opacity-70 mb-4 line-clamp-2 px-2 h-10">{product.description}</p>
                <p className="font-sans font-medium text-lg text-[var(--color-ink)]">Starts from LKR {product.price.toLocaleString()}</p>
              </div>
            </motion.div>
          );
        })
      )}
      </div>
    </div>
  );
}
