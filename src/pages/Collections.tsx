import { useState, useMemo, useEffect } from 'react';
import { ShoppingBag, Heart, Share2, Facebook, Twitter, Link as LinkIcon, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLocation } from 'react-router-dom';

export const MOCK_PRODUCTS = [
  // Rings
  { id: 'r1', name: 'Eternity Diamond Ring', price: 450000, category: 'Rings', image: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80', description: 'A continuous line of flawlessly matched diamonds set in 18k white gold.' },
  { id: 'r2', name: 'Bridal Solitaire Set', price: 210000, category: 'Rings', image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&q=80', description: 'A classic ring capturing the elegant simplicity of true love.' },
  { id: 'r3', name: 'Sapphire Halo Ring', price: 450000, category: 'Rings', image: 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?auto=format&fit=crop&q=80', description: 'Stunning blue sapphire surrounded by a halo of brilliant diamonds.' },
  
  // Necklaces
  { id: 'n1', name: 'Antique Gold Necklace', price: 180000, category: 'Necklaces', image: 'https://images.unsplash.com/photo-1599643478514-4a4802c61e44?auto=format&fit=crop&q=80', description: 'An intricate traditional antique gold necklace for the modern royal.' },
  { id: 'n2', name: 'Diamond Tennis Necklace', price: 1250000, category: 'Necklaces', image: 'https://images.unsplash.com/photo-1599687267812-35fc05fd4b50?auto=format&fit=crop&q=80', description: 'Seamless strand of round brilliant diamonds.' },
  { id: 'n3', name: 'Pearl & Gold Chain', price: 85000, category: 'Necklaces', image: 'https://images.unsplash.com/photo-1515562141207-7a8efb545f47?auto=format&fit=crop&q=80', description: 'Cultured freshwater pearls alternating with gold links.' },
  
  // Earrings
  { id: 'e1', name: 'Kundan Drop Earrings', price: 95000, category: 'Earrings', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80', description: 'Classic Kundan style drop earrings echoing timeless traditions.' },
  { id: 'e2', name: 'Diamond Hoop Earrings', price: 340000, category: 'Earrings', image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80', description: 'Inside-out diamond hoop earrings crafted in white gold.' },
  { id: 'e3', name: 'Pearl Studs', price: 45000, category: 'Earrings', image: 'https://images.unsplash.com/photo-1574542385491-03cd61bced3a?auto=format&fit=crop&q=80', description: 'Elegant South Sea pearl stud earrings.' },

  // Bracelets
  { id: 'b1', name: 'Temple Bangles', price: 450000, category: 'Bracelets', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80', description: 'A pair of heavy gold temple bangles, studded with rubies.' },
  { id: 'b2', name: 'Diamond Tennis Bracelet', price: 890000, category: 'Bracelets', image: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&q=80', description: 'Classic 4-prong diamond tennis bracelet in platinum.' },
  { id: 'b3', name: 'Chain Link Bracelet', price: 120000, category: 'Bracelets', image: 'https://images.unsplash.com/photo-1573408301145-b98c46544ea6?auto=format&fit=crop&q=80', description: 'Modern chunky chain link bracelet in 14k yellow gold.' },

  // Pendants
  { id: 'p1', name: 'Heritage Pendant', price: 280000, category: 'Pendants', image: 'https://images.unsplash.com/photo-1599643477873-cecefb2c42d4?auto=format&fit=crop&q=80', description: 'An ancestral design featuring uncut polki diamonds in pure gold.' },
  { id: 'p2', name: 'Emerald Cut Pendant', price: 540000, category: 'Pendants', image: 'https://images.unsplash.com/photo-1599643477874-c689ff887d19?auto=format&fit=crop&q=80', description: 'Dazzling emerald cut diamond pendant on a delicate chain.' },

  // Watches
  { id: 'w1', name: 'Classic Gold Timepiece', price: 650000, category: 'Watches', image: 'https://images.unsplash.com/photo-1587836149124-a4002e21b8c0?auto=format&fit=crop&q=80', description: 'Automatic movement watch with an 18k gold case.' },
  { id: 'w2', name: 'Diamond Bezel Watch', price: 1240000, category: 'Watches', image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&q=80', description: 'Luxury timepiece featuring a diamond-encrusted bezel.' },

  // Engagement
  { id: 'en1', name: 'Princess Cut Engagement Ring', price: 560000, category: 'Engagement', image: 'https://images.unsplash.com/photo-1515562141207-7a8efb545f47?auto=format&fit=crop&q=80', description: 'A breathtaking princess cut diamond set in platinum.' },
  { id: 'en2', name: 'Oval Solitaire', price: 720000, category: 'Engagement', image: 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?auto=format&fit=crop&q=80', description: 'Brilliant oval diamond on a delicate pavé band.' },

  // Bridal Sets
  { id: 'br1', name: 'Rivaah Bridal Set', price: 2500000, category: 'Bridal Sets', image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80', description: 'Complete wedding set includes necklace, earrings, and maang tikka.' },
  { id: 'br2', name: 'Diamond Encrusted Set', price: 1850000, category: 'Bridal Sets', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80', description: 'Matching necklace and earrings adorned with brilliant cut diamonds.' }
];

const CATEGORIES = ['All', 'Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Watches', 'Engagement', 'Bridal Sets'];

export default function Collections() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get('category');
  const materialParam = searchParams.get('material');
  const priceParam = searchParams.get('price');
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [urlFilters, setUrlFilters] = useState<{material?: string, price?: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  const maxProductPrice = Math.max(...MOCK_PRODUCTS.map(p => p.price));
  const [maxPrice, setMaxPrice] = useState(maxProductPrice);

  useEffect(() => {
    if (categoryParam) {
      const match = CATEGORIES.find(c => c.toLowerCase() === categoryParam.toLowerCase());
      if (match) setActiveCategory(match);
      // Clean up category from URL when selected to avoid sticky state
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    if (materialParam || priceParam) {
        setUrlFilters({
            material: materialParam || undefined,
            price: priceParam || undefined
        });
    }
  }, [categoryParam, materialParam, priceParam]);

  useEffect(() => {
    // Simulate loading for better UX when filters change
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [activeCategory, urlFilters, maxPrice]);

  const { addToCart } = useCart();
  const { toggleWishlistItem, isInWishlist } = useWishlist();

  const filteredProducts = useMemo(() => {
    let products = activeCategory === 'All' 
      ? MOCK_PRODUCTS 
      : MOCK_PRODUCTS.filter(p => p.category === activeCategory);

    if (urlFilters.price) {
      if (urlFilters.price === 'Under LKR 150K') products = products.filter(p => p.price < 150000);
      else if (urlFilters.price === 'LKR 150K - 600K') products = products.filter(p => p.price >= 150000 && p.price <= 600000);
      else if (urlFilters.price === 'Over LKR 600K') products = products.filter(p => p.price > 600000);
    }
    
    if (urlFilters.material) {
      if (urlFilters.material === 'Classic Gold (18K/22K)') {
        products = products.filter(p => p.name.includes('Gold') || p.description.toLowerCase().includes('gold') || p.description.toLowerCase().includes('kundan'));
      } else if (urlFilters.material === 'White Gold / Platinum') {
        products = products.filter(p => p.description.toLowerCase().includes('white gold') || p.description.toLowerCase().includes('platinum') || p.name.includes('Silver'));
      } else if (urlFilters.material === 'Diamond Focused') {
        products = products.filter(p => p.name.includes('Diamond') || p.description.toLowerCase().includes('diamond'));
      }
    }

    if (maxPrice < maxProductPrice) {
      products = products.filter(p => p.price <= maxPrice);
    }

    return products;
  }, [activeCategory, urlFilters, maxPrice, maxProductPrice]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-serif mb-6 text-gold-gradient">The Masterpieces</h1>
        <div className="w-24 h-0.5 bg-gold-gradient mx-auto mb-6"></div>
        <p className="max-w-2xl mx-auto text-sm text-[var(--color-ink)] opacity-80">
          Discover our full range of exquisite pieces, each crafted with unparalleled attention to detail and beauty.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-16 border-b border-black/5 pb-8 overflow-x-auto whitespace-nowrap">
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

      <div className="max-w-md mx-auto mb-12 flex flex-col items-center">
        <label className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-4 text-center">
          Maximum Budget: <span className="text-[var(--color-ink)]">LKR {maxPrice.toLocaleString()}</span>
        </label>
        <div className="w-full relative">
          <input 
            type="range" 
            min="0" 
            max={maxProductPrice} 
            step="10000" 
            value={maxPrice} 
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-gold)]"
          />
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>Any</span>
            <span>Max</span>
          </div>
        </div>
      </div>

      {/* Active Selection Filters from Style Assistant */}
      {(urlFilters.material || urlFilters.price) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10 -mt-8">
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Match Filters:</span>
          {urlFilters.material && (
            <span className="flex items-center gap-2 bg-[#D4AF37]/5 border border-[#D4AF37]/20 text-[#D4AF37] px-3 py-1.5 rounded-full text-xs font-medium">
              {urlFilters.material}
              <button 
                onClick={() => setUrlFilters(prev => ({...prev, material: undefined}))}
                className="hover:text-black transition-colors"
                title="Remove filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
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
          filteredProducts.map(product => {
            const inWishlist = isInWishlist(product.id);
            
            return (
            <div key={product.id} className="group cursor-pointer">
              <div className="relative aspect-[4/5] bg-white rounded-lg overflow-hidden mb-6 border border-black/5 group-hover:border-[var(--color-gold)] transition-colors">
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
                  className="w-full h-full object-cover mix-blend-multiply transition-transform duration-1000 group-hover:scale-105"
                />
                <button 
                  onClick={(e) => { e.preventDefault(); addToCart(product); }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gold-gradient text-white p-3 rounded-full opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl hover:opacity-90 hover:scale-105"
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
            </div>
          );
        })
      )}
      </div>
    </div>
  );
}
