import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
}

interface ProductCarouselProps {
  title?: string;
  subtitle?: string;
  products: Product[];
}

export function ProductCarousel({ 
  title = "FEATURED COLLECTIONS", 
  subtitle = "Discover our most popular designs",
  products 
}: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalPages = Math.ceil(products.length / itemsPerPage);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const visibleProducts = products.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage
  );

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif text-[var(--color-ink)] mb-4">{title}</h2>
            <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] font-medium text-[var(--color-gold-dark)] uppercase">
              <span className="w-8 h-[1px] bg-[var(--color-gold-dark)]"></span>
              {subtitle}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={prevSlide}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft size={20} className="ml-[-2px]" />
            </button>
            <button 
              onClick={nextSlide}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight size={20} className="mr-[-2px]" />
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden min-h-[450px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full`}
            >
              {visibleProducts.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`} className="group block">
                  <div className="relative h-[300px] overflow-hidden mb-6 bg-gray-50 p-4 border border-gray-100 group-hover:border-[var(--color-gold)]/30 transition-colors">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--color-gold-dark)] font-bold mb-2">{product.category}</p>
                    <h3 className="text-lg font-serif text-[var(--color-ink)] mb-2 group-hover:text-[var(--color-gold)] transition-colors">{product.name}</h3>
                    <p className="text-sm tracking-wide text-gray-500">{product.price}</p>
                  </div>
                </Link>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Indicators */}
        <div className="flex justify-center mt-8 gap-2">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1 transition-all duration-300 ${
                currentIndex === idx ? 'w-8 bg-[var(--color-gold)]' : 'w-4 bg-gray-200 hover:bg-gray-300'
              }`}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
