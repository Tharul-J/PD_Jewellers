import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageSliderProps {
  images?: string[];
  intervalMs?: number;
}

const DEFAULT_IMAGES = [
  "https://ceylonmastergems.com/wp-content/uploads/2025/08/Blog-What-makes-Ceylon-Sapphire-So-special.png",
  "https://www.caratlane.com/blog/wp-content/uploads/2025/04/gold-jewellery-22-carat.jpg",
  "https://jevarmart.com/assets/images/slider/slide_69b25c0bf2d9a.jpg",
  "https://static.vecteezy.com/system/resources/thumbnails/055/167/270/small/gold-bangles-are-displayed-in-a-shop-photo.jpg",
  "https://www.dheejewels.com/cdn/shop/articles/jewelry-necklace_1277133-4219.jpg?v=1749706461&width=2048",
  "https://media.istockphoto.com/id/118199633/photo/jewelry.jpg?b=1&s=1024x1024&w=0&k=20&c=KwtWosbuJX4l9pJdRCGuqCxK-gAGcN2m6kcX-Ru8w6Y=",
  "https://static.vecteezy.com/system/resources/thumbnails/024/654/275/small/shiny-gemstone-necklace-reflects-elegance-and-glamour-generated-by-ai-free-photo.jpg",
  "https://t4.ftcdn.net/jpg/08/13/39/89/360_F_813398976_T2ZiKgGaYXeI2Iwk6zpqFnAl1BRbO4Lz.jpg",
];

export function ImageSlider({ images = DEFAULT_IMAGES, intervalMs = 3000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden group border border-[#D4AF37]/20">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="w-full h-full object-cover absolute inset-0"
          alt="P Dedigamuwa Jewellers Collection"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/25 backdrop-blur border border-white/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/25 backdrop-blur border border-white/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
      >
        <ChevronRight size={16} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`rounded-full transition-all duration-500 ${i === currentIndex ? 'bg-[#D4AF37] w-6 h-2' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
          />
        ))}
      </div>
    </div>
  );
}
