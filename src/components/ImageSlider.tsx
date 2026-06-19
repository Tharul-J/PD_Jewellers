import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const IMAGES = [
  "https://images.unsplash.com/photo-1573408301145-b98c46544ea0?auto=format&fit=crop&q=80", // Jewelry exterior/interior
  "https://images.unsplash.com/photo-1599643478514-4a4802c61e44?auto=format&fit=crop&q=80", // Close up
  "https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&q=80", // Rings/Legacy
  "https://images.unsplash.com/photo-1605100804763-247f661c9e94?auto=format&fit=crop&q=80", // Diamonds
];

export function ImageSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrentIndex((prev) => (prev + 1) % IMAGES.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + IMAGES.length) % IMAGES.length);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden group border border-[#D4AF37]/20">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={IMAGES[currentIndex]}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="w-full h-full object-cover absolute inset-0"
          alt="P Dedigamuwa Jewellers Collection"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/10 transition-opacity duration-300"></div>
      
      <button 
        onClick={prev} 
        className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/30 backdrop-blur border border-white/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/50"
      >
        <ChevronLeft size={16} />
      </button>
      
      <button 
        onClick={next} 
        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/30 backdrop-blur border border-white/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/50"
      >
        <ChevronRight size={16} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {IMAGES.map((_, i) => (
          <button 
            key={i} 
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-[#D4AF37] w-6' : 'bg-white/50 hover:bg-white/80'}`}
          />
        ))}
      </div>
    </div>
  );
}
