import { useState, useEffect, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, Star, ChevronLeft, ChevronRight, Quote, MapPin, Clock, Phone } from 'lucide-react';
import { ProductCarousel, Product } from '../components/ProductCarousel';
import { ImageSlider } from '../components/ImageSlider';

// Shown only if the featured endpoint is unreachable, so the homepage never
// renders an empty carousel.
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'NE007',
    name: 'Swarovski Zirconia Choker Necklace',
    price: 540000,
    image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0000974A.jpg?v=1593000004',
    category: 'Necklaces'
  },
  {
    id: 'RI004',
    name: '18K Yellow Gold Star Ring with Stone',
    price: 132000,
    image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0002319-C.jpg?v=1678276684',
    category: 'Rings'
  },
  {
    id: 'BR009',
    name: '18K White Gold Diamond Bracelet',
    price: 850000,
    image: 'https://www.swarnamahal.lk/cdn/shop/products/07DR19-18K195C.jpg?v=1593069723',
    category: 'Bracelets'
  },
  {
    id: 'ES009',
    name: 'Cubic Zirconia Drop Earrings',
    price: 71000,
    image: 'https://www.swarnamahal.lk/cdn/shop/products/ES0000155-B.jpg?v=1678266378',
    category: 'Earrings'
  },
  {
    id: 'RI015',
    name: '22K Blossom Stone Studded Ladies Ring',
    price: 98000,
    image: 'https://www.swarnamahal.lk/cdn/shop/products/RI0002032A.jpg?v=1644819654',
    category: 'Rings'
  },
  {
    id: 'NE001',
    name: 'Swarovski Zirconia Premium Necklace',
    price: 520000,
    image: 'https://www.swarnamahal.lk/cdn/shop/products/NE0001014B.jpg?v=1593000311',
    category: 'Necklaces'
  }
];

const COLLECTION_BANNERS = [
  '/banners/Rings_Banner.png',
  '/banners/Necklaces_Banner.png',
  '/banners/Earrings_Banner.png',
  '/banners/Bracelets_Banner.png',
  '/banners/Pendants_Banner.png',
  '/banners/Bridal_Banner.png',
  '/banners/Mens_Banner.png',
];

const STATIC_REVIEWS = [
  {
    name: "Tom Timer",
    text: "Trustworthy service .My family has been dealing with them for generations now.",
    tag: "Verified Customer",
    rating: 5
  },
  {
    name: "Prasanna Rodrigo",
    text: "One of my friends own this place. A really good place to buy all sorts of jwelary.",
    tag: "Local Guide",
    rating: 5
  },
  {
    name: "Mag Tat",
    text: "Best place . Faithfull service.",
    tag: "Verified Customer",
    rating: 5
  },
  {
    name: "Sajith Eranga",
    text: "One of the oldest jewellery shops in Gampaha.",
    tag: "Local Guide",
    rating: 5
  },
  {
    name: "Chathurika Liyanage",
    text: "The best ♥️",
    tag: "Local Guide",
    rating: 5
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [collBanner, setCollBanner] = useState(0);
  const [allReviews, setAllReviews] = useState<any[]>(STATIC_REVIEWS);
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);
  const [featured, setFeatured] = useState<Product[]>(FALLBACK_PRODUCTS);

  // Best sellers, computed from actual purchases and topped up with the newest
  // catalog items when there aren't enough sales yet.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/products/featured?limit=9')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        setFeatured(data.map((p: any) => ({
          id: p.id, name: p.name, price: p.price, image: p.image, category: p.category,
        })));
      })
      .catch(() => {}); // keep the fallback list
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCollBanner(i => (i + 1) % COLLECTION_BANNERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('/api/reviews/homepage')
      .then(r => r.json())
      .then(d => {
        if (d.reviews?.length) {
          const live = d.reviews.map((r: any) => ({
            id: r._id,
            name: r.user?.name || 'Verified Customer',
            text: r.text,
            tag: 'Verified Customer',
            rating: r.rating,
          }));
          // Live reviews lead, static ones always stay as a permanent backdrop
          setAllReviews([...live, ...STATIC_REVIEWS]);
        }
      })
      .catch(() => {}); // silent fallback to static-only
  }, []);

  // Auto-advance the review fan
  useEffect(() => {
    const t = setInterval(() => setActiveReviewIdx(i => (i + 1) % allReviews.length), 4000);
    return () => clearInterval(t);
  }, [allReviews.length]);

  const visibleReviews = [-2, -1, 0, 1, 2].map(offset => ({
    review: allReviews[(activeReviewIdx + offset + allReviews.length) % allReviews.length],
    offset,
  }));

  const getReviewCardStyle = (offset: number): CSSProperties => {
    const abs = Math.abs(offset);
    return {
      position: 'absolute',
      width: '260px',
      transform: `translateX(${offset * 160}px) rotate(${offset * 8}deg) scale(${1 - abs * 0.12})`,
      zIndex: 10 - abs,
      opacity: 1 - abs * 0.25,
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: abs > 0 ? 'pointer' : 'default',
    };
  };

  const sliderImages = [
    "https://ceylonmastergems.com/wp-content/uploads/2025/08/Blog-What-makes-Ceylon-Sapphire-So-special.png",
    "https://www.caratlane.com/blog/wp-content/uploads/2025/04/gold-jewellery-22-carat.jpg",
    "https://static.vecteezy.com/system/resources/thumbnails/055/167/270/small/gold-bangles-are-displayed-in-a-shop-photo.jpg",
    "https://www.dheejewels.com/cdn/shop/articles/jewelry-necklace_1277133-4219.jpg?v=1749706461&width=2048",
    "https://media.istockphoto.com/id/118199633/photo/jewelry.jpg?b=1&s=1024x1024&w=0&k=20&c=KwtWosbuJX4l9pJdRCGuqCxK-gAGcN2m6kcX-Ru8w6Y=",
    "https://static.vecteezy.com/system/resources/thumbnails/024/654/275/small/shiny-gemstone-necklace-reflects-elegance-and-glamour-generated-by-ai-free-photo.jpg",
    "https://t4.ftcdn.net/jpg/08/13/39/89/360_F_813398976_T2ZiKgGaYXeI2Iwk6zpqFnAl1BRbO4Lz.jpg",
  ];

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % sliderImages.length);
  const prevSlide = () => setCurrentSlide((p) => (p === 0 ? sliderImages.length - 1 : p - 1));

  useEffect(() => {
    const timer = setInterval(nextSlide, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-[var(--color-paper)] text-[var(--color-ink)] font-sans">
      
      {/* Hero Section */}
      <section className="relative w-full h-[100svh] overflow-hidden bg-gradient-to-br from-[#F6ECD9] to-[#E5CCAB]">
        
        {/* Full Background Image */}
        <div className="absolute inset-0 z-0">
           <img 
              src="/image.png"
              alt="P Dedigamuwa Jewellers Background"
              className="w-full h-full object-cover object-center"
           />
        </div>

        {/* Legibility scrim — stronger on mobile where the wordmark overlaps the model */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/40 sm:from-black/30 sm:via-transparent sm:to-black/30 pointer-events-none" />

        <div className="max-w-7xl mx-auto h-full px-6 relative z-10">
          
          {/* Logo on Left */}
          <div className="absolute top-16 md:top-24 left-6 md:left-12 flex flex-col items-center z-20">
            {/* Logo approximation using text since we don't have the vector */}
            <div className="relative mb-2">
               <h1 className="text-7xl md:text-8xl lg:text-[120px] font-serif text-[#D4AF37] tracking-widest leading-none drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>PDJ</h1>
               {/* Tiny decorative ring shape on top right of logo */}
               <div className="absolute -top-4 -right-2 md:-top-6 md:-right-4 w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-[#D4AF37] shadow-lg flex items-start justify-center">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-white rotate-45 transform -translate-y-1/2 shadow-inner"></div>
               </div>
            </div>
            
            <div className="h-[1px] w-full max-w-[300px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent my-4"></div>
            
            <h2 className="text-[10px] md:text-sm tracking-[0.3em] font-sans uppercase text-[#3A352F] font-medium text-center">
              P Dedigamuwa Jewellers
            </h2>
            <p className="text-xs md:text-lg italic tracking-wider text-[#A67C00] mt-3 font-serif">
              Over 110 Years of Excellence
            </p>
          </div>
          
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-24 max-w-7xl mx-auto px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
             <div className="order-2 lg:order-1 h-[400px] md:h-[500px]">
                <ImageSlider />
             </div>
             <div className="order-1 lg:order-2">
                <h2 className="text-[10px] tracking-[0.3em] font-sans uppercase text-[var(--color-gold-dark)] font-bold mb-4">
                  P Dedigamuwa Jewellers
                </h2>
                <h3 className="text-4xl md:text-5xl font-serif leading-tight mb-6">
                  ABOUT US
                </h3>
                <p className="text-sm opacity-80 mb-8 max-w-lg leading-relaxed text-[var(--color-ink-light)] italic font-serif">
                  Over 110 years of unparalleled craftsmanship and timeless elegance.
                </p>
                <p className="text-sm opacity-80 mb-10 max-w-md leading-relaxed text-[var(--color-ink-light)]">
                  Established with a profound passion for exquisite jewelry, we have been a cornerstone of trust and quality for generations. Our legacy is built on the pursuit of perfection, creating masterpieces that capture the essence of your most cherished moments.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-[var(--color-gold)]/20">
                   <div>
                      <div className="flex items-center gap-2 mb-3 text-[var(--color-gold-dark)]">
                         <MapPin size={16} />
                         <span className="text-[10px] uppercase font-bold tracking-widest">Visit Us</span>
                      </div>
                      <Link to="/about" className="text-sm opacity-80 hover:text-[var(--color-gold)] transition-colors block leading-relaxed font-semibold">
                         No 5 Main Street,<br/>
                         Gampaha, Sri Lanka
                      </Link>
                   </div>
                   <div>
                      <div className="flex items-center gap-2 mb-3 text-[var(--color-gold-dark)]">
                         <Phone size={16} />
                         <span className="text-[10px] uppercase font-bold tracking-widest">Contact Us</span>
                      </div>
                      <p className="text-sm opacity-80 leading-relaxed font-semibold">
                         0332 222 735
                      </p>
                   </div>
                   <div className="col-span-1 sm:col-span-2 pt-2">
                      <Link to="/about" className="inline-flex items-center gap-2.5 px-6 py-4 bg-stone-900 border border-stone-800 hover:bg-[#cca150] text-[#E5CCAB] hover:text-stone-950 transition-all duration-300 text-[10px] uppercase tracking-widest font-black shadow-md rounded-xl group/btn">
                        Discover Our Full Story & Map
                        <svg className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"></path>
                        </svg>
                      </Link>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-8 mt-20 text-center border-y border-[var(--color-gold)]/10 py-12">
             <div className="flex flex-col items-center justify-center gap-2">
               <span className="text-3xl font-serif text-[var(--color-gold-dark)]">110+</span>
               <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] opacity-60">Years Of<br/>Excellence</span>
             </div>
             <div className="flex flex-col items-center justify-center gap-2 border-x border-[var(--color-gold)]/10">
               <span className="text-3xl font-serif text-[var(--color-gold-dark)]">100%</span>
               <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] opacity-60">Authentic<br/>Craftsmanship</span>
             </div>
             <div className="flex flex-col items-center justify-center gap-2">
               <span className="text-3xl font-serif text-[var(--color-gold-dark)]">10K+</span>
               <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] opacity-60">Satisfied<br/>Generations</span>
             </div>
          </div>
      </section>

      {/* Blog Section */}
      <section className="py-24 bg-white border-y border-[var(--color-ink)]/5">
         <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-8 text-[10px] tracking-[0.3em] uppercase text-[var(--color-ink-light)]">
               <span className="w-16 h-[1px] bg-[var(--color-gold)]"></span>
               Blog
               <span className="w-16 h-[1px] bg-[var(--color-gold)]"></span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-[var(--color-ink)] mb-6">
               OUR MATERIALS & GEMS
            </h2>
            <p className="text-sm opacity-80 max-w-2xl mx-auto mb-16 leading-relaxed">
               We source only the finest ethical diamonds, vibrant Ceylon sapphires, deep rubies, and premium 18K & 22K gold. Every piece is crafted to ensure a lifetime of radiant wear.
            </p>
            <div className="flex justify-center">
               <Link to="/materials" className="px-8 py-3 btn-richbrown text-white text-[10px] uppercase tracking-widest transition-colors rounded-sm">
                  Discover Our Craftsmanship
               </Link>
            </div>
         </div>
      </section>

      {/* Collection Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">

         {/* Collection Banner Slider (replaces old text header) */}
         <div className="relative rounded-2xl overflow-hidden mb-16 group shadow-md">
           <AnimatePresence mode="wait">
             <motion.img
               key={collBanner}
               src={COLLECTION_BANNERS[collBanner]}
               alt="Collection Banner"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.7 }}
               className="w-full block"
             />
           </AnimatePresence>

           {/* Overlay with Explore button */}
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-end p-8 md:p-12">
             <Link
               to="/collections"
               className="inline-flex items-center gap-3 px-7 py-3.5 bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-[var(--color-ink)] font-black text-[10px] uppercase tracking-widest transition-all duration-300 rounded-lg shadow-lg hover:shadow-xl hover:scale-105"
             >
               Explore Collections
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
             </Link>
           </div>

           {/* Prev / Next */}
           <button onClick={() => setCollBanner(i => (i - 1 + COLLECTION_BANNERS.length) % COLLECTION_BANNERS.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50">
             <ChevronLeft size={18} />
           </button>
           <button onClick={() => setCollBanner(i => (i + 1) % COLLECTION_BANNERS.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50">
             <ChevronRight size={18} />
           </button>

           {/* Dots */}
           <div className="absolute bottom-4 right-8 flex gap-1.5">
             {COLLECTION_BANNERS.map((_, i) => (
               <button key={i} onClick={() => setCollBanner(i)} className={`h-1.5 rounded-full transition-all ${i === collBanner ? 'w-5 bg-[var(--color-gold)]' : 'w-1.5 bg-white/50 hover:bg-white'}`} />
             ))}
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

            {/* Card 1 — Rings */}
            <Link to="/collections?category=rings" className="flex flex-col group cursor-pointer">
               <div className="w-full h-[400px] overflow-hidden rounded-t-[200px] border border-[var(--color-gold)]/10 mb-6 bg-white p-2">
                 <img src="https://www.swarnamahal.lk/cdn/shop/products/RI0002319-C.jpg?v=1678276684" alt="Timeless Rings" className="w-full h-full object-cover rounded-t-[200px] transition-transform duration-700 group-hover:scale-105" />
               </div>
               <h3 className="text-xl font-serif mb-4 group-hover:text-[var(--color-gold-dark)] transition-colors">TIMELESS RINGS FOR EVERY MOMENT</h3>
               <p className="text-xs opacity-70 mb-6 leading-relaxed">Discover timeless rings designed for every moment, combining elegance, quality, and lasting beauty.</p>
               <div className="flex items-center gap-4 text-[9px] tracking-[0.2em] uppercase font-medium text-[var(--color-gold-dark)]">
                 <span className="w-8 h-[1px] bg-[var(--color-gold-dark)]"></span>
                 Explore Now
               </div>
            </Link>

            {/* Card 2 — Necklaces */}
            <Link to="/collections?category=necklaces" className="flex flex-col group cursor-pointer md:mt-16">
               <div className="w-full h-[350px] overflow-hidden rounded-t-[200px] border border-[var(--color-gold)]/10 mb-6 bg-white p-2">
                 <img src="https://www.swarnamahal.lk/cdn/shop/products/NE0000974A.jpg?v=1593000004" alt="Necklaces" className="w-full h-full object-cover rounded-t-[200px] transition-transform duration-700 group-hover:scale-105" />
               </div>
               <h3 className="text-xl font-serif mb-4 group-hover:text-[var(--color-gold-dark)] transition-colors">NECKLACES THAT RADIATE ELEGANCE</h3>
               <p className="text-xs opacity-70 mb-6 leading-relaxed">Necklaces designed to radiate elegance, adding sophistication and timeless charm to every outfit.</p>
               <div className="flex items-center gap-4 text-[9px] tracking-[0.2em] uppercase font-medium text-[var(--color-gold-dark)]">
                 <span className="w-8 h-[1px] bg-[var(--color-gold-dark)]"></span>
                 Explore Now
               </div>
            </Link>

            {/* Card 3 — Bracelets */}
            <Link to="/collections?category=bracelets" className="flex flex-col group cursor-pointer md:mt-32">
               <div className="w-full h-[450px] overflow-hidden rounded-t-[200px] border border-[var(--color-gold)]/10 mb-6 bg-white p-2">
                 <img src="https://www.swarnamahal.lk/cdn/shop/products/07DR19-18K195C.jpg?v=1593069723" alt="Bracelets" className="w-full h-full object-cover rounded-t-[200px] transition-transform duration-700 group-hover:scale-105" />
               </div>
               <h3 className="text-xl font-serif mb-4 group-hover:text-[var(--color-gold-dark)] transition-colors">GRACEFUL ELEGANCE IN EVERY BRACELET</h3>
               <p className="text-xs opacity-70 mb-6 leading-relaxed">Each bracelet embodies graceful elegance, offering timeless beauty and a refined touch to any look.</p>
               <div className="flex items-center gap-4 text-[9px] tracking-[0.2em] uppercase font-medium text-[var(--color-gold-dark)]">
                 <span className="w-8 h-[1px] bg-[var(--color-gold-dark)]"></span>
                 Explore Now
               </div>
            </Link>

         </div>
      </section>

      {/* Style Quiz Section removed from here, now triggered globally */}

      {/* Featured Products Carousel */}
      <ProductCarousel products={featured} title="FEATURED PRODUCTS" subtitle="Our best-selling pieces" />

      {/* Elegant Image Slider — Prominent Landscape */}
      <section className="py-20 text-white" style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 30%, #6b2d00 60%, #3d1a00 80%, #1a0a00 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-gold)] font-medium block mb-3">Bespoke Elegance</span>
            <h2 className="text-4xl md:text-5xl font-serif leading-tight">
              CAPTURING TIMELESS<br/>MOMENTS IN GOLD
            </h2>
            <p className="text-sm opacity-60 max-w-md mx-auto leading-relaxed mt-4">
              Discover how our expert craftsmanship transforms precious moments into eternal memories.
            </p>
          </div>

          {/* Prominent landscape slider card */}
          <div className="relative rounded-2xl overflow-hidden mx-auto shadow-2xl border border-[#D4AF37]/25" style={{ aspectRatio: '16/7' }}>
            <AnimatePresence mode="popLayout">
              <motion.img
                key={currentSlide}
                src={sliderImages[currentSlide]}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full object-cover"
                alt={`PD Jewellers — slide ${currentSlide + 1}`}
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-black/50 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-black/50 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Gold corner accent */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#D4AF37]/60 rounded-tl pointer-events-none" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#D4AF37]/60 rounded-tr pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#D4AF37]/60 rounded-bl pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#D4AF37]/60 rounded-br pointer-events-none" />
          </div>

          {/* Dot indicators */}
          <div className="flex gap-2 justify-center mt-6">
            {sliderImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`rounded-full transition-all duration-500 ${i === currentSlide ? 'bg-[var(--color-gold)] w-6 h-2' : 'w-2 h-2 bg-white/30 hover:bg-white/60'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Structured Customer Reviews */}
      <section className="py-24 bg-white relative overflow-hidden">
         <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
               <h2 className="text-3xl md:text-5xl font-serif text-[var(--color-ink)] mb-4">
                  STORIES OF RADIANCE
               </h2>
               <div className="h-[1px] w-24 bg-[var(--color-gold)] mx-auto mb-6"></div>
               <p className="text-xs uppercase tracking-[0.2em] font-medium text-[var(--color-ink-light)]">
                  Words from our esteemed clientele
               </p>
            </div>

            {/* Fan container */}
            <div className="relative flex items-center justify-center" style={{ height: '340px' }}>
               {visibleReviews.map(({ review, offset }) => (
                  <div
                     key={`${review.id ?? review.name}-${offset}`}
                     style={getReviewCardStyle(offset)}
                     onClick={() => offset !== 0 && setActiveReviewIdx(
                        i => (i + offset + allReviews.length) % allReviews.length
                     )}
                  >
                     <div className={`flex flex-col bg-[var(--color-paper)] p-8 h-full rounded-sm border ${
                        offset === 0
                           ? 'border-[var(--color-gold)]/30 shadow-xl'
                           : 'border-transparent shadow-sm'
                     }`}>
                        <Quote className="w-7 h-7 text-[var(--color-gold)]/20 mb-3" />
                        <div className="flex gap-1 text-[var(--color-gold-dark)] mb-4">
                           {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} fill={s <= review.rating ? 'currentColor' : 'none'} strokeWidth={s <= review.rating ? 0 : 1.5} className="w-3.5 h-3.5" />
                           ))}
                        </div>
                        <p className="text-[13px] leading-relaxed opacity-80 italic mb-6 line-clamp-3">
                           {review.text}
                        </p>
                        <div className="mt-auto border-t border-black/5 pt-3">
                           <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] mb-1">{review.name}</h4>
                           <p className="text-[10px] text-[var(--color-gold-dark)] font-medium">{review.tag}</p>
                        </div>
                     </div>
                  </div>
               ))}
            </div>

            {/* Dot indicators */}
            <div className="flex gap-2 justify-center mt-6">
               {allReviews.map((_, i) => (
                  <button
                     key={i}
                     onClick={() => setActiveReviewIdx(i)}
                     className={`rounded-full transition-all duration-300 ${i === activeReviewIdx ? 'bg-[var(--color-gold)] w-6 h-2' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'}`}
                     aria-label={`Go to review ${i + 1}`}
                  />
               ))}
            </div>
         </div>
      </section>

    </div>
  );
}
