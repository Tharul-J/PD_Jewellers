import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const IMAGES = [
  "https://i.pinimg.com/736x/21/4e/51/214e51fb17c1097fbca6cd89ae5030d2.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTE8cO1imuaDgCe4AT3nM6HGa9ekI0srUJY4Nl0w3KvfQ&s=10",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwygJ-n733e9mqzXB18l9WqbUyVazaYgPBSIsPhtqv0A&s=10",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSI5JXA3vIrGwdHC8yP6VuZMRa8bdZPiGI7htLDkyGqDw&s=10",
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
