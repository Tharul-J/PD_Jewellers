import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, Star, ChevronLeft, ChevronRight, Quote, MapPin, Clock, Phone } from 'lucide-react';
import { ProductCarousel, Product } from '../components/ProductCarousel';
import { ImageSlider } from '../components/ImageSlider';

const FEATURED_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Royal Sapphire Necklace',
    price: 'Starts from LKR 4,200,000',
    image: 'https://images.unsplash.com/photo-1599643478514-4a4802c61e44?auto=format&fit=crop&q=80',
    category: 'Necklace'
  },
  {
    id: '2',
    name: 'Diamond Solitaire Ring',
    price: 'Starts from LKR 6,500,000',
    image: 'https://images.unsplash.com/photo-1605100804763-247f661c9e94?auto=format&fit=crop&q=80',
    category: 'Rings'
  },
  {
    id: '3',
    name: 'Gold Heritage Bangle',
    price: 'Starts from LKR 2,800,000',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
    category: 'Bracelets'
  },
  {
    id: '4',
    name: 'Emerald Drop Earrings',
    price: 'Starts from LKR 3,400,000',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80',
    category: 'Earrings'
  },
  {
    id: '5',
    name: 'Platinum Wedding Band',
    price: 'Starts from LKR 1,800,000',
    image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&q=80',
    category: 'Rings'
  },
  {
    id: '6',
    name: 'Ruby Pendant Necklace',
    price: 'Starts from LKR 3,100,000',
    image: 'https://images.unsplash.com/photo-1599643477874-c689ff887d19?auto=format&fit=crop&q=80',
    category: 'Necklace'
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderImages = [
    "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1577741314755-048d8525d31e?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1621510202164-325bdfa91ec5?auto=format&fit=crop&q=80&w=2000"
  ];

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % sliderImages.length);
  const prevSlide = () => setCurrentSlide((p) => (p === 0 ? sliderImages.length - 1 : p - 1));

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
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
                      <a href="https://maps.app.goo.gl/cNBJc2rsfr2PvYq66" target="_blank" rel="noopener noreferrer" className="text-sm opacity-80 hover:text-[var(--color-gold)] transition-colors block leading-relaxed">
                         No 5 Main Street,<br/>
                         Gampaha, Sri Lanka
                      </a>
                   </div>
                   <div>
                      <div className="flex items-center gap-2 mb-3 text-[var(--color-gold-dark)]">
                         <Phone size={16} />
                         <span className="text-[10px] uppercase font-bold tracking-widest">Contact</span>
                      </div>
                      <p className="text-sm opacity-80 leading-relaxed">
                         0332 222 735
                      </p>
                   </div>
                   <div className="col-span-1 sm:col-span-2">
                      <div className="flex items-center gap-2 mb-3 text-[var(--color-gold-dark)]">
                         <Clock size={16} />
                         <span className="text-[10px] uppercase font-bold tracking-widest">Opening Hours</span>
                      </div>
                      <div className="text-sm opacity-80 grid gap-1">
                         <div className="flex justify-between max-w-[250px]"><span>Monday - Saturday</span><span>9:00 AM – 6:00 PM</span></div>
                         <div className="flex justify-between max-w-[250px]"><span>Sunday</span><span>Closed</span></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-20 text-center border-y border-[var(--color-gold)]/10 py-12">
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
               <Link to="/materials" className="px-8 py-3 bg-[var(--color-ink)] text-white text-[10px] uppercase tracking-widest hover:bg-black transition-colors rounded-sm">
                  Discover Our Craftsmanship
               </Link>
            </div>
         </div>
      </section>

      {/* Collection Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
         <div className="flex justify-between items-end mb-16">
            <h2 className="text-3xl md:text-5xl font-serif leading-tight">
               DISCOVER THE ELEGANCE<br/>IN OUR COLLECTION
            </h2>
            <div className="hidden md:flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase font-medium hover:text-[var(--color-gold)] transition-colors cursor-pointer">
              <span className="w-8 h-[1px] bg-[var(--color-gold)]"></span>
              Explore Now
            </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            
            {/* Card 1 */}
            <div className="flex flex-col group cursor-pointer">
               <div className="w-full h-[400px] overflow-hidden rounded-t-[200px] border border-[var(--color-gold)]/10 mb-6 bg-white p-2">
                 <img src="https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&q=80" alt="Timeless Rings" className="w-full h-full object-cover rounded-t-[200px] transition-transform duration-700 group-hover:scale-105" />
               </div>
               <h3 className="text-xl font-serif mb-4">TIMELESS RINGS FOR EVERY MOMENT</h3>
               <p className="text-xs opacity-70 mb-6 leading-relaxed">Discover timeless rings designed for every moment, combining elegance, quality, and lasting beauty.</p>
               <div className="flex items-center gap-4 text-[9px] tracking-[0.2em] uppercase font-medium text-[var(--color-gold-dark)]">
                 <span className="w-8 h-[1px] bg-[var(--color-gold-dark)]"></span>
                 Explore Now
               </div>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col group cursor-pointer md:mt-16">
               <div className="w-full h-[350px] overflow-hidden rounded-t-[200px] border border-[var(--color-gold)]/10 mb-6 bg-white p-2">
                 <img src="https://images.unsplash.com/photo-1599643477874-c689ff887d19?auto=format&fit=crop&q=80" alt="Necklaces" className="w-full h-full object-cover rounded-t-[200px] transition-transform duration-700 group-hover:scale-105" />
               </div>
               <h3 className="text-xl font-serif mb-4">NECKLACES THAT RADIATE ELEGANCE</h3>
               <p className="text-xs opacity-70 mb-6 leading-relaxed">Necklaces designed to radiate elegance, adding sophistication and timeless charm to every outfit.</p>
               <div className="flex items-center gap-4 text-[9px] tracking-[0.2em] uppercase font-medium text-[var(--color-gold-dark)]">
                 <span className="w-8 h-[1px] bg-[var(--color-gold-dark)]"></span>
                 Explore Now
               </div>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col group cursor-pointer md:mt-32">
               <div className="w-full h-[450px] overflow-hidden rounded-t-[200px] border border-[var(--color-gold)]/10 mb-6 bg-white p-2">
                 <img src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80" alt="Pendants" className="w-full h-full object-cover rounded-t-[200px] transition-transform duration-700 group-hover:scale-105" />
               </div>
               <h3 className="text-xl font-serif mb-4">GRACEFUL ELEGANCE IN EVERY PENDANT</h3>
               <p className="text-xs opacity-70 mb-6 leading-relaxed">Each pendant embodies graceful elegance, offering timeless beauty and a refined touch to any look.</p>
               <div className="flex items-center gap-4 text-[9px] tracking-[0.2em] uppercase font-medium text-[var(--color-gold-dark)]">
                 <span className="w-8 h-[1px] bg-[var(--color-gold-dark)]"></span>
                 Explore Now
               </div>
            </div>

         </div>
      </section>

      {/* Style Quiz Section removed from here, now triggered globally */}

      {/* Featured Products Carousel */}
      <ProductCarousel products={FEATURED_PRODUCTS} title="FEATURED PRODUCTS" subtitle="Handpicked for you" />

      {/* Elegant Image Slider */}
      <section className="py-24 bg-[var(--color-ink)] text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
           <AnimatePresence mode="popLayout">
             <motion.img
                key={currentSlide}
                src={sliderImages[currentSlide]}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.4, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="w-full h-full object-cover object-center absolute inset-0"
             />
           </AnimatePresence>
           <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)] via-[var(--color-ink)]/50 to-transparent"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-gold)] mb-6 font-medium">Bespoke Elegance</span>
            <h2 className="text-4xl md:text-6xl font-serif leading-tight mb-8 max-w-3xl">
               CAPTURING TIMELESS<br/>MOMENTS IN GOLD
            </h2>
            <p className="text-sm opacity-80 max-w-md mx-auto leading-relaxed mb-12">
               Discover how our expert craftsmanship transforms precious moments into eternal memories. Wear your story with pride.
            </p>
            
            <div className="flex gap-4">
               <button onClick={prevSlide} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 hover:border-white/40 transition-colors backdrop-blur-sm">
                 <ChevronLeft className="w-5 h-5" />
               </button>
               <button onClick={nextSlide} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 hover:border-white/40 transition-colors backdrop-blur-sm">
                 <ChevronRight className="w-5 h-5" />
               </button>
            </div>
            
            <div className="flex gap-2 mt-8">
               {sliderImages.map((_, i) => (
                  <button 
                     key={i} 
                     onClick={() => setCurrentSlide(i)}
                     className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? 'bg-[var(--color-gold)] w-6' : 'bg-white/30 hover:bg-white/60'}`}
                     aria-label={`Go to slide ${i + 1}`}
                  />
               ))}
            </div>
        </div>
      </section>

      {/* Structured Customer Reviews */}
      <section className="py-24 bg-white relative">
         <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
               <h2 className="text-3xl md:text-5xl font-serif text-[var(--color-ink)] mb-4">
                  STORIES OF RADIANCE
               </h2>
               <div className="h-[1px] w-24 bg-[var(--color-gold)] mx-auto mb-6"></div>
               <p className="text-xs uppercase tracking-[0.2em] font-medium text-[var(--color-ink-light)]">
                  Words from our esteemed clientele
               </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
               {[
                 {
                   name: "Tom Timer",
                   text: "Trustworthy service .My family has been dealing with them for generations now.",
                   tag: "Verified Customer"
                 },
                 {
                   name: "Prasanna Rodrigo",
                   text: "One of my friends own this place. A really good place to buy all sorts of jwelary.",
                   tag: "Local Guide"
                 },
                 {
                   name: "Mag Tat",
                   text: "Best place . Faithfull service.",
                   tag: "Verified Customer"
                 },
                 {
                   name: "Sajith Eranga",
                   text: "One of the oldest jewellery shops in Gampaha.",
                   tag: "Local Guide"
                 },
                 {
                   name: "Chathurika Liyanage",
                   text: "The best ♥️",
                   tag: "Local Guide"
                 }
               ].map((review, i) => (
                  <div key={i} className="flex flex-col bg-[var(--color-paper)] p-10 relative group hover:-translate-y-2 transition-transform duration-500 border border-transparent hover:border-[var(--color-gold)]/20 shadow-sm hover:shadow-xl rounded-sm">
                     <Quote className="w-8 h-8 text-[var(--color-gold)]/20 absolute top-8 right-8" />
                     <div className="flex gap-1 text-[var(--color-gold-dark)] mb-6">
                        <Star fill="currentColor" strokeWidth={0} className="w-4 h-4" />
                        <Star fill="currentColor" strokeWidth={0} className="w-4 h-4" />
                        <Star fill="currentColor" strokeWidth={0} className="w-4 h-4" />
                        <Star fill="currentColor" strokeWidth={0} className="w-4 h-4" />
                        <Star fill="currentColor" strokeWidth={0} className="w-4 h-4" />
                     </div>
                     <p className="text-[13px] leading-loose opacity-80 mb-8 italic flex-grow">
                        "{review.text}"
                     </p>
                     <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] mb-1">{review.name}</h4>
                        <p className="text-[10px] text-[var(--color-gold-dark)] font-medium">{review.tag}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

    </div>
  );
}
