import { motion } from 'motion/react';
import { Diamond, Sparkles, Gem } from 'lucide-react';

export default function Materials() {
  const materials = [
    {
      id: 'gold',
      name: '18K & 22K Gold',
      description: 'Our heritage is built on the finest gold. Sourced responsibly and alloyed to perfection to ensure a lifetime of radiant wear.',
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
      icon: <Sparkles className="w-6 h-6" />
    },
    {
      id: 'diamonds',
      name: 'Ethical Diamonds',
      description: 'Every diamond we use is meticulously selected for its exceptional cut, color, and clarity, ensuring maximum brilliance.',
      image: 'https://images.unsplash.com/photo-1605100804763-247f661c9e94?auto=format&fit=crop&q=80',
      icon: <Diamond className="w-6 h-6" />
    },
    {
      id: 'sapphires',
      name: 'Ceylon Sapphires',
      description: 'Renowned worldwide, our vibrant Ceylon sapphires are handpicked from the gem-rich soils of Sri Lanka.',
      image: 'https://images.unsplash.com/photo-1599643478514-4a4802c61e44?auto=format&fit=crop&q=80',
      icon: <Gem className="w-6 h-6" />
    },
    {
      id: 'rubies',
      name: 'Precious Rubies',
      description: 'Deep, passionate reds that capture the heart. Our rubies are chosen for their intense saturation and inner fire.',
      image: 'https://images.unsplash.com/photo-1599643477874-c689ff887d19?auto=format&fit=crop&q=80',
      icon: <Gem className="w-6 h-6" />
    }
  ];

  return (
    <div className="bg-[var(--color-paper)] min-h-screen pt-32 pb-24">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto px-6 mb-20">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--color-gold-dark)] mb-4 block">The Art of Sourcing</span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[var(--color-ink)] mb-6 leading-tight">BLOG</h1>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Every masterpiece begins with exceptional materials. Explore the ethically sourced gemstones and pure precious metals that form the foundation of our timeless jewelry.
          </p>
        </motion.div>
      </section>

      {/* Materials Grid */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
          {materials.map((material, index) => (
            <motion.div 
              key={material.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex flex-col group"
            >
              <div className="relative w-full h-[400px] overflow-hidden rounded-t-full mb-8 bg-white border border-gray-100 p-2">
                <img 
                  src={material.image} 
                  alt={material.name}
                  className="w-full h-full object-cover rounded-t-full transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500 rounded-t-full" />
              </div>
              
              <div className="text-center px-4">
                <div className="text-[var(--color-gold)] mb-4 flex justify-center transform group-hover:scale-110 transition-transform duration-300">
                  {material.icon}
                </div>
                <h3 className="text-2xl font-serif text-[var(--color-ink)] mb-3">{material.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed font-sans">{material.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Craftsmanship CTA */}
      <section className="max-w-5xl mx-auto px-6 mt-32 text-center bg-white border border-[var(--color-gold)]/20 py-16">
        <div className="w-12 h-12 rounded-full border border-[var(--color-gold)] flex items-center justify-center mx-auto mb-6 text-[var(--color-gold)]">
          <Sparkles className="w-5 h-5" />
        </div>
        <h2 className="text-3xl font-serif text-[var(--color-ink)] mb-4">A Legacy of Craftsmanship</h2>
        <p className="text-sm text-gray-500 max-w-lg mx-auto mb-8 leading-relaxed">
          For over a century, our master artisans have transformed these raw, precious elements into breathtaking works of art that endure through generations.
        </p>
        <button className="px-8 py-3 bg-[var(--color-ink)] text-white text-[10px] uppercase tracking-widest hover:bg-black transition-colors rounded-sm">
          Discover Our Collections
        </button>
      </section>
    </div>
  );
}
