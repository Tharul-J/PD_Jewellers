import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, Clock, Gem, Award, ShieldCheck, Mail, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const HERO_IMAGES = [
  "https://ceylonmastergems.com/wp-content/uploads/2025/08/Blog-What-makes-Ceylon-Sapphire-So-special.png",
  "https://www.caratlane.com/blog/wp-content/uploads/2025/04/gold-jewellery-22-carat.jpg",
  "https://jevarmart.com/assets/images/slider/slide_69b25c0bf2d9a.jpg",
  "https://static.vecteezy.com/system/resources/thumbnails/055/167/270/small/gold-bangles-are-displayed-in-a-shop-photo.jpg",
  "https://www.dheejewels.com/cdn/shop/articles/jewelry-necklace_1277133-4219.jpg?v=1749706461&width=2048",
  "https://media.istockphoto.com/id/118199633/photo/jewelry.jpg?b=1&s=1024x1024&w=0&k=20&c=KwtWosbuJX4l9pJdRCGuqCxK-gAGcN2m6kcX-Ru8w6Y=",
  "https://static.vecteezy.com/system/resources/thumbnails/024/654/275/small/shiny-gemstone-necklace-reflects-elegance-and-glamour-generated-by-ai-free-photo.jpg",
  "https://t4.ftcdn.net/jpg/08/13/39/89/360_F_813398976_T2ZiKgGaYXeI2Iwk6zpqFnAl1BRbO4Lz.jpg",
];

export default function AboutUs() {
  const [heroSlide, setHeroSlide] = useState(5);

  useEffect(() => {
    const t = setInterval(() => setHeroSlide(i => (i + 1) % HERO_IMAGES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const stats = [
    { value: '110+', label: 'Years of Legacy', desc: 'Preserving heritage craftsmanship since 1912.' },
    { value: '100%', label: 'Certified Sovereign Metal', desc: 'Prudence, standard Hallmarking, and lifetime guarantee.' },
    { value: '4.9★', label: 'Customer Recognition', desc: 'Rated for unmatched precision and absolute generation-defining trust.' },
    { value: '10K+', label: 'Heirloom Creations', desc: 'Bespoke custom commissions crafted to perfection.' }
  ];

  return (
    <div className="w-full bg-[var(--color-paper)] text-[var(--color-ink)] pt-24 min-h-screen">
      
      {/* Hero Image Slider */}
      <section className="relative w-full overflow-hidden" style={{ height: '72vh', minHeight: '480px' }}>
        {/* Sliding images */}
        <AnimatePresence mode="popLayout">
          <motion.img
            key={heroSlide}
            src={HERO_IMAGES[heroSlide]}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full object-cover"
            alt="P Dedigamuwa Jewellers"
          />
        </AnimatePresence>

        {/* Multi-layer gradient for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/85 via-stone-900/35 to-stone-900/15 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-900/30 to-transparent pointer-events-none" />

        {/* Gold corner frames */}
        <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-[#D4AF37]/70 pointer-events-none" />
        <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-[#D4AF37]/70 pointer-events-none" />
        <div className="absolute bottom-20 left-6 w-10 h-10 border-b-2 border-l-2 border-[#D4AF37]/70 pointer-events-none" />
        <div className="absolute bottom-20 right-6 w-10 h-10 border-b-2 border-r-2 border-[#D4AF37]/70 pointer-events-none" />

        {/* Text content */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-14 px-6 text-white text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex items-center justify-center gap-3 text-[#e8c97a] text-[10px] sm:text-[11px] uppercase tracking-[0.3em] font-sans font-bold mb-4"
          >
            <span className="w-8 h-[1px] bg-[#e8c97a]" />
            ESTABLISHED IN 1912 IN GAMPAHA, SRI LANKA
            <span className="w-8 h-[1px] bg-[#e8c97a]" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-white leading-tight mb-4 max-w-3xl drop-shadow-lg"
          >
            OUR LEGACY OF ELEGANCE
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-xs sm:text-sm text-white/70 font-serif italic max-w-xl leading-relaxed mb-7"
          >
            "Crafting generational trust and unparalleled jewelry masterpieces, balancing Sri Lanka's deepest artistic heritage with contemporary design."
          </motion.p>

          {/* Dot indicators */}
          <div className="flex gap-2">
            {HERO_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroSlide(i)}
                className={`rounded-full transition-all duration-500 ${i === heroSlide ? 'bg-[#D4AF37] w-6 h-2' : 'w-2 h-2 bg-white/35 hover:bg-white/65'}`}
              />
            ))}
          </div>
        </div>

        {/* Prev / Next arrows */}
        <button
          onClick={() => setHeroSlide(i => (i - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)}
          className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/25 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white hover:bg-black/45 transition-all"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => setHeroSlide(i => (i + 1) % HERO_IMAGES.length)}
          className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/25 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white hover:bg-black/45 transition-all"
        >
          <ChevronRight size={22} />
        </button>
      </section>

      {/* Main Feature Story (Row with Image and Text) */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Logo + Shop images */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 flex flex-col gap-5"
          >
            {/* Logo panel */}
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-[#edd19b]/20 to-amber-100/10 rounded-2xl blur-lg opacity-70 z-0" />
              <div className="relative rounded-2xl border border-stone-200/80 shadow-xl bg-white flex items-center justify-center py-10 px-8">
                <img
                  src="/logo.png"
                  alt="P Dedigamuwa Jewellers — Over 110 Years of Excellence"
                  className="max-h-56 w-auto object-contain"
                />
              </div>
            </div>

            {/* Shop photo */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-stone-200/80 aspect-video">
              <img
                src="/shop.png"
                alt="P Dedigamuwa Jewellers Showroom, Gampaha"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute bottom-4 left-4 bg-stone-900/95 backdrop-blur-md text-[#E5CCAB] px-4 py-2 rounded-lg text-[9px] uppercase tracking-widest font-mono font-bold shadow-md border border-white/5">
                Authentic Showroom, Gampaha
              </div>
            </div>
          </motion.div>

          {/* Text/History block */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="space-y-2">
              <span className="text-[10px] tracking-[0.2em] font-sans font-extrabold text-[#cca150] uppercase">
                A Century of Excellence
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight leading-tight">
                P Dedigamuwa Jewellers
              </h2>
            </div>
            
            <p className="text-sm text-stone-600 leading-relaxed font-sans">
              Founded over 110 years ago, P Dedigamuwa Jewellers has stood as an unwavering pillar of reliability, luxury, and artistic distinction in Sri Lanka. From a small atelier of legendary local goldsmiths to a multi-generational legacy, our name has been forever synonymous with pristine gold purity and flawless curation.
            </p>
            
            <p className="text-sm text-stone-600 leading-relaxed font-sans">
              We specialize in the meticulous casting of 22K and 18K gold sovereign alloys, hand-selecting premium, vibrant Ceylon Sapphires directly from authentic island mines, and designing bespoke diamond arrangements. Every curve is forged by lineage craftsmen who carry a lifetime of pride in their handiwork.
            </p>

            <div className="pt-4 border-t border-stone-200/60 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-stone-200/80 bg-amber-50/25 flex items-center justify-center text-amber-700 shrink-0 shadow-sm">
                <Award size={20} />
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-stone-800">State Certified Purity</h4>
                <p className="text-[11px] text-stone-500 font-sans mt-0.5">Every curation bears the official state hallmark to certify karat authenticity.</p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Legacy Statistics Grid */}
      <section className="bg-gradient-to-b from-stone-50 to-[#faf7f2] border-y border-stone-200/40 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white p-6 rounded-xl border border-stone-200/50 shadow-[0_4px_12px_rgba(0,0,0,0.01)] text-center sm:text-left space-y-2 hover:border-[#cca150]/40 transition-all group"
              >
                <div className="text-3xl font-serif text-[#cca150] font-bold group-hover:scale-105 transition-transform duration-300 inline-block">
                  {stat.value}
                </div>
                <h4 className="text-xs uppercase font-bold tracking-widest text-stone-800 font-sans">
                  {stat.label}
                </h4>
                <p className="text-[11px] text-stone-500 leading-relaxed font-sans">
                  {stat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <div className="text-[9px] tracking-[0.25em] font-sans font-bold text-[#cca150] uppercase">
            HOW WE EMBODY FINE LUXURY
          </div>
          <h2 className="text-3xl font-serif text-stone-900">
            OUR ATELIER PILLARS
          </h2>
          <div className="w-12 h-[1px] bg-[#cca150] mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 border border-stone-200/60 shadow-sm space-y-4 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-amber-700 flex items-center justify-center border border-orange-100 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Gem size={18} />
            </div>
            <h3 className="text-sm uppercase tracking-widest font-bold text-stone-800">1. Natural Sri Lankan Gems</h3>
            <p className="text-xs text-stone-500 leading-relaxed font-sans">
              Sri Lanka is home to premier Ceylon Blue Sapphires, spinels, and rich rubies. We maintain active partnerships with premium local miners in Ratnapura to direct-source pristine, ethically compiled gems with no intermediaries.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-stone-200/60 shadow-sm space-y-4 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-amber-700 flex items-center justify-center border border-orange-100 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Award size={18} />
            </div>
            <h3 className="text-sm uppercase tracking-widest font-bold text-stone-800">2. Master Gold Alchemy</h3>
            <p className="text-xs text-stone-500 leading-relaxed font-sans">
              We process our precious gold alloys strictly within high-vacuum electric crucible systems. This guarantees zero grain impurity, perfect density, and rich, glowing hues across our Yellow, Platinum, Rose, and White metal selections.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-stone-200/60 shadow-sm space-y-4 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-amber-700 flex items-center justify-center border border-orange-100 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <ShieldCheck size={18} />
            </div>
            <h3 className="text-sm uppercase tracking-widest font-bold text-stone-800">3. Generation-Defining Trust</h3>
            <p className="text-xs text-stone-500 leading-relaxed font-sans">
              We pride ourselves on relationships spanning over three generations of families. Customers return to us to commission wedding curations for their grandchildren, secure in the knowledge of our absolute integrity and honesty.
            </p>
          </div>
        </div>
      </section>

      {/* Boutique Visit & Google Maps Section */}
      <section className="py-20 bg-stone-50 border-t border-stone-200/50 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            
            {/* Interactive Embedded Google Map */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-7 flex flex-col"
            >
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative flex flex-col justify-between flex-1">
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-stone-400 text-[10px] uppercase tracking-widest font-bold mb-1.5">
                    <MapPin size={12} className="text-[#cca150]" />
                    Interactive Atelier Location
                  </div>
                  <h3 className="text-sm font-sans font-bold text-stone-800 uppercase tracking-widest">P Dedigamuwa Jewelers Map</h3>
                </div>
                
                {/* Embedded Responsive Google Map Iframe Provided by User */}
                <div className="relative w-full rounded-xl overflow-hidden border border-stone-100 bg-stone-100 aspect-video lg:flex-1 shadow-inner min-h-[350px]">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7918.5983968143355!2d79.98752564191818!3d7.09127474460125!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2fbecccde7bb3%3A0xc7baae685c66a2f2!2sP%20Dedigamuwa%20Jewelers!5e0!3m2!1sen!2slk!4v1781937509226!5m2!1sen!2slk" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen={true}
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                    title="P Dedigamuwa Jewellers Gampaha Map"
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
            </motion.div>

            {/* Visit Details, opening hours, phones and address */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="lg:col-span-5 flex flex-col"
            >
              <div className="bg-stone-900 text-[#E5CCAB] p-8 rounded-2xl flex flex-col justify-between h-full space-y-8 shadow-xl border border-stone-800 relative overflow-hidden">
                {/* Elegant subtle metallic overlay background pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-radial-gradient from-amber-500/5 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                
                <div className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <span className="text-[9px] tracking-[0.25em] text-[#cca150] uppercase font-sans font-bold">
                      BOUTIQUE SHOWROOM
                    </span>
                    <h3 className="text-2xl font-serif text-white tracking-wide">
                      VISIT THE ATELIER
                    </h3>
                    <p className="text-xs text-stone-400 font-serif italic max-w-sm">
                      Walk in or secure an appointment to consult with a gemologist. Experience the weight, glow, and prestige of 22K Sri Lankan craft in person.
                    </p>
                  </div>

                  <div className="h-[1px] bg-stone-800"></div>

                  <div className="space-y-4 text-xs">
                    {/* Address Line */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700/65 flex items-center justify-center text-[#cca150] shrink-0 mt-0.5">
                        <MapPin size={14} />
                      </div>
                      <div className="space-y-1">
                        <div className="font-sans font-bold text-white uppercase tracking-wider text-[10px]">Atelier Address</div>
                        <p className="text-stone-300 font-sans leading-relaxed">
                          PD Jewellers,<br />
                          No. 05, Main Street, Gampaha,<br />
                          Sri Lanka
                        </p>
                      </div>
                    </div>

                    {/* Phones Line */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700/65 flex items-center justify-center text-[#cca150] shrink-0 mt-0.5">
                        <Phone size={14} />
                      </div>
                      <div className="space-y-1">
                        <div className="font-sans font-bold text-white uppercase tracking-wider text-[10px]">Inquiry Hotlines</div>
                        <p className="text-stone-300 font-sans leading-loose font-bold">
                          033 222 2735 <span className="opacity-40 font-normal">|</span> 070 442 2735
                        </p>
                      </div>
                    </div>

                    {/* Opening Hours Line */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700/65 flex items-center justify-center text-[#cca150] shrink-0 mt-0.5">
                        <Clock size={14} />
                      </div>
                      <div className="space-y-1 w-full">
                        <div className="font-sans font-bold text-white uppercase tracking-wider text-[10px]">Showroom Hours</div>
                        <div className="text-stone-300 font-sans leading-relaxed space-y-1 mt-1">
                          <div className="flex justify-between max-w-[240px]">
                            <span className="opacity-60">Monday — Saturday</span>
                            <span className="font-semibold text-white">9:00 AM – 6:00 PM</span>
                          </div>
                          <div className="flex justify-between max-w-[240px]">
                            <span className="opacity-60">Sunday</span>
                            <span className="font-semibold text-[#cca150] uppercase tracking-widest text-[9px]">Closed</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-stone-800 relative z-10">
                  <a 
                    href="https://maps.app.goo.gl/cNBJc2rsfr2PvYq66" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#cca150] hover:bg-amber-600 text-stone-950 font-sans font-black text-xs uppercase tracking-widest py-4 px-6 rounded-xl transition-all shadow-md group"
                  >
                    Get Directions
                    <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                  </a>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

    </div>
  );
}
