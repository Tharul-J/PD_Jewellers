import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, Tag, BookOpen } from 'lucide-react';

interface BlogPost {
  _id: string;
  title: string;
  category: string;
  excerpt: string;
  coverImage: string;
  images: string[];
  content: string;
  author: string;
  publishedAt: string | Date;
}

const SEED_POSTS: BlogPost[] = [
  {
    _id: 'seed-1',
    title: 'The Modern Sri Lankan Guide to Layering Necklaces and Rings',
    category: 'Styling Tips',
    excerpt: 'From the elegant Peti Maala to minimalist everyday wear — balancing heritage with contemporary style.',
    coverImage: 'https://dropinblog.net/34252283/files/featured/Jewellery_Layering.jpg',
    images: ['https://dropinblog.net/34252283/files/featured/Jewellery_Layering.jpg'],
    author: 'PD Jewellers',
    publishedAt: '2026-06-01',
    content: `Every Sri Lankan woman knows the breathtaking impact of traditional multi-layered bridal jewelry—from the elegant Peti Maala to the intricate Paththiri Mal Maala. But how do you bring that beautiful, layered aesthetic into your everyday, modern wardrobe without looking like you are headed straight to a wedding porch (Poruwa)?

The secret lies in balancing heritage patterns with contemporary minimalist trends.

## The Neckline Blueprint: Mix Your Chains

When layering necklaces for a casual lunch in Colombo or a professional day at the office, stick to the Rule of Three with distinct lengths:

• The Base (14–16 inches): A delicate, plain choke-style chain or a subtle herringbone pattern.
• The Focal Point (18 inches): A mid-length chain featuring a small, meaningful gemstone—like a brilliant blue Ceylon Sapphire or a delicate moonstone drop.
• The Anchor (20–22 inches): A longer, structural piece. You can use a modern geometric pendant here, or a tiny, stylized contemporary adaptation of a traditional Peti Maala coin.

## The Ring Stack: Combine Textures, Not Just Sizes

Don't just wear multiple rings on different fingers; stack them intentionally on one or two fingers.

• Pair smooth with textured: Place an ultra-smooth 22-karat yellow gold band directly next to a diamond-encrusted chevron ring or a hand-stamped rope band.
• Leave "Negative Space": Use an open-front ring or a curved band to create small gaps of skin between your jewelry pieces. This keeps the stack looking light, airy, and thoroughly modern.`,
  },
  {
    _id: 'seed-2',
    title: 'Why Ceylon Sapphire Bezel Settings Are Dominating Sri Lankan Engagement Trends',
    category: 'Engagement',
    excerpt: 'A massive shift is happening among modern couples — from classic claw prongs to smooth, contemporary bezel settings.',
    coverImage: 'https://www.bluelankatours.com/wp-content/uploads/2019/02/Gem-1100x732.jpg',
    images: [
      'https://www.bluelankatours.com/wp-content/uploads/2019/02/Gem-1100x732.jpg',
      'https://www.shafteldiamonds.com/wp-content/uploads/2024/09/Sapphire-Colours.webp',
    ],
    author: 'PD Jewellers',
    publishedAt: '2026-06-08',
    content: `For decades, the standard for a Sri Lankan engagement ring was clear: a stunning oval-cut Ceylon Blue Sapphire raised high in a traditional diamond halo setting. While that look remains timeless, a massive shift is happening among modern couples.

Enter the Bezel Setting—a design where a smooth rim of precious metal entirely surrounds the edge of the gemstone, holding it completely flush.

## 1. Zero Snagging on Traditional Fabrics

Traditional claw prongs look beautiful, but they are notorious for snagging on delicate fabrics. If you regularly wear a fine georgette, silk, or embroidered lace saree, a pronged ring can easily pull threads. A bezel setting features completely smooth, rounded metal edges that glide effortlessly over the most fragile silk sarees.

## 2. Ultimate Protection for Your Gemstone

Although sapphires are incredibly durable (ranking 9 on the Mohs hardness scale), their edges can still chip if struck hard against a surface. The solid gold or platinum border of a bezel setting acts like a protective armor casing, absorbing the shock of everyday bumps and drops.

## 3. It Makes the Sapphire Look Larger

When a master craftsman wraps a bright band of white gold or platinum smoothly around a vivid blue sapphire, the metal rim acts like a mirror. It visually extends the borders of the stone, giving your center gem a larger, bolder presence on your finger.`,
  },
  {
    _id: 'seed-3',
    title: 'Behind the Bench: How Sri Lankan Master Artisans Blend 3D Technology with Traditional Craft',
    category: 'Craftsmanship',
    excerpt: "Sri Lanka's finest jewellery houses are pairing ancient lost-wax casting techniques with cutting-edge 3D design software.",
    coverImage: 'https://sanajewellers.com/cdn/shop/articles/sana_jewellers_8_1024x1024.jpg?v=1750878499',
    images: [
      'https://io.dropinblog.com/uploaded/blogs/34252283/files/jewellery_layering.jpg',
      'https://sanajewellers.com/cdn/shop/articles/sana_jewellers_8_1024x1024.jpg?v=1750878499',
    ],
    author: 'PD Jewellers',
    publishedAt: '2026-06-15',
    content: `Sri Lanka's rich jewelry heritage spans thousands of years, passed down through generations of traditional artisans in historic hubs like Galle and Kandy. Today, a quiet revolution is happening at the workbench. The country's finest jewelry houses aren't abandoning ancient techniques—they are pairing them with cutting-edge 3D design technology.

## Step 1: The Digital Blueprint (CAD Design)

The creation of a modern luxury piece begins on a computer screen. Using Computer-Aided Design (CAD) software, designers map out the exact dimensions of a ring or pendant down to a fraction of a millimeter. This allows clients to view an incredibly realistic 3D model of their custom piece before any gold is even melted.

## Step 2: High-Precision 3D Printing

Once the digital design is finalized, it is sent to a high-precision 3D printer. Instead of plastic, this printer uses a specialized jewelry-grade casting wax or resin to print a physical, three-dimensional replica of the piece.

## Step 3: The Ancient Art of Lost-Wax Casting

This is where technology meets thousands of years of human history. The 3D-printed wax model is placed inside a metal flask and covered in a plaster mixture. Once dry, the flask is heated in a furnace until the wax completely melts and drains away, leaving a perfect hollow impression inside the plaster. Molten precious metal (such as 18k yellow gold or white gold) is then poured into that exact cavity.

## Step 4: Hand-Setting and Polishing

Technology can map out the lines, but it takes a true human touch to bring a piece to life. After casting, a traditional Sri Lankan master setter takes over. Using fine handheld microscopes and specialized pushers, they meticulously set each gemstone by hand and polish the metal until it achieves its signature mirror-like luster.`,
  },
];

const GALLERY_ITEMS = [
  { url: 'https://www.swarnamahal.lk/cdn/shop/products/RI0002319-C.jpg?v=1593000004', category: 'Rings', title: 'Classic Gold Band' },
  { url: 'https://www.swarnamahal.lk/cdn/shop/products/NE0000974A.jpg?v=1593000004', category: 'Necklaces', title: 'Diamond Necklace' },
  { url: 'https://www.swarnamahal.lk/cdn/shop/products/07DR19-18K195C.jpg?v=1593000004', category: 'Bracelets', title: '18K Gold Bracelet' },
  { url: 'https://www.swarnamahal.lk/cdn/shop/products/NE007A.jpg', category: 'Necklaces', title: 'Gold Chain Necklace' },
  { url: 'https://www.swarnamahal.lk/cdn/shop/products/RI004A.jpg', category: 'Rings', title: 'Stone-Set Ring' },
  { url: 'https://www.swarnamahal.lk/cdn/shop/products/BR009A.jpg', category: 'Bracelets', title: 'Bangle Bracelet' },
  { url: 'https://www.swarnamahal.lk/cdn/shop/products/ES009A.jpg', category: 'Earrings', title: 'Drop Earrings' },
  { url: 'https://www.swarnamahal.lk/cdn/shop/products/RI015A.jpg', category: 'Rings', title: 'Engagement Ring' },
  { url: 'https://www.swarnamahal.lk/cdn/shop/products/NE001A.jpg', category: 'Necklaces', title: 'Pendant Chain' },
  { url: 'https://www.bluelankatours.com/wp-content/uploads/2019/02/Gem-1100x732.jpg', category: 'Gemstones', title: 'Ceylon Sapphires' },
  { url: 'https://dropinblog.net/34252283/files/featured/Jewellery_Layering.jpg', category: 'Styling', title: 'Layering Guide' },
  { url: 'https://sanajewellers.com/cdn/shop/articles/sana_jewellers_8_1024x1024.jpg?v=1750878499', category: 'Craftsmanship', title: 'Master Artisans' },
];

const GALLERY_CATEGORIES = ['All', 'Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Gemstones'];

const CATEGORY_COLORS: Record<string, string> = {
  'Styling Tips': 'bg-rose-50 text-rose-700 border-rose-200',
  'Engagement': 'bg-blue-50 text-blue-700 border-blue-200',
  'Craftsmanship': 'bg-amber-50 text-amber-700 border-amber-200',
  'Gold Guide': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Gemstones': 'bg-purple-50 text-purple-700 border-purple-200',
  'Bridal': 'bg-pink-50 text-pink-700 border-pink-200',
  'Mens': 'bg-slate-50 text-slate-700 border-slate-200',
  'General': 'bg-gray-50 text-gray-600 border-gray-200',
};

function renderContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={key++} className="h-3" />);
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={key++} className="text-xl font-serif text-[var(--color-ink)] mt-8 mb-3 font-semibold tracking-tight">
          {trimmed.slice(3)}
        </h3>
      );
    } else if (trimmed.startsWith('• ')) {
      elements.push(
        <div key={key++} className="flex gap-3 py-1">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] flex-shrink-0" />
          <p className="text-gray-600 leading-relaxed text-[15px]">{trimmed.slice(2)}</p>
        </div>
      );
    } else {
      elements.push(
        <p key={key++} className="text-gray-600 leading-relaxed text-[15px]">
          {trimmed}
        </p>
      );
    }
  }
  return elements;
}

function ArticleCard({ post, onRead }: { post: BlogPost; onRead: () => void }) {
  const badgeClass = CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS['General'];
  const date = new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
      onClick={onRead}
    >
      <div className="aspect-[4/3] overflow-hidden bg-gray-50">
        <img
          src={post.coverImage}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=PD+Jewellers'; }}
        />
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${badgeClass}`}>
            {post.category}
          </span>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Calendar size={11} />
            {date}
          </span>
        </div>
        <h2 className="text-lg font-serif text-[var(--color-ink)] leading-snug mb-2 group-hover:text-[var(--color-gold)] transition-colors">
          {post.title}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
        <button className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-gold)] flex items-center gap-1.5 hover:gap-3 transition-all">
          Read Article <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}

function ArticleModal({ post, onClose }: { post: BlogPost; onClose: () => void }) {
  const badgeClass = CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS['General'];
  const date = new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-10 px-4"
      onClick={onClose}
    >
      <motion.article
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[var(--color-paper)] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${badgeClass}`}>
            {post.category}
          </span>
          <button
            onClick={onClose}
            className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[var(--color-ink)] transition-colors"
          >
            Close ✕
          </button>
        </div>

        <div className="px-8 py-6">
          {/* Header */}
          <h1 className="text-2xl md:text-3xl font-serif text-[var(--color-ink)] leading-tight mb-3">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-[11px] text-gray-400 mb-6 pb-6 border-b border-gray-100">
            <span className="flex items-center gap-1"><Calendar size={11} /> {date}</span>
            <span className="flex items-center gap-1"><Tag size={11} /> {post.author}</span>
          </div>

          {/* Images — prominent responsive container directly below the header */}
          {post.images.length > 0 && (
            <div className={`mb-8 ${post.images.length === 1 ? '' : 'grid grid-cols-2 gap-3'}`}>
              {post.images.map((img, i) => (
                <div
                  key={i}
                  className={`overflow-hidden rounded-xl bg-gray-50 ${post.images.length === 1 ? 'w-full' : ''}`}
                >
                  <img
                    src={img}
                    alt={`${post.title} — image ${i + 1}`}
                    className="w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="space-y-1">{renderContent(post.content)}</div>
        </div>
      </motion.article>
    </motion.div>
  );
}

function GallerySection() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [galleryIndex, setGalleryIndex] = useState(0);

  const filtered = activeCategory === 'All'
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((g) => g.category === activeCategory);

  const total = filtered.length;

  const prev = useCallback(() => setGalleryIndex((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setGalleryIndex((i) => (i + 1) % total), [total]);

  useEffect(() => {
    setGalleryIndex(0);
  }, [activeCategory]);

  const getCard = (offset: number) => filtered[(galleryIndex + offset + total) % total];

  const CARD_CONFIG = [
    { offset: -2, x: '-170%', rotate: '-18deg', scale: 0.68, opacity: 0.35, zIndex: 1 },
    { offset: -1, x: '-90%', rotate: '-9deg', scale: 0.82, opacity: 0.65, zIndex: 2 },
    { offset:  0, x:   '0%', rotate:   '0deg', scale: 1.00, opacity: 1.00, zIndex: 3 },
    { offset:  1, x:  '90%', rotate:  '9deg', scale: 0.82, opacity: 0.65, zIndex: 2 },
    { offset:  2, x: '170%', rotate: '18deg', scale: 0.68, opacity: 0.35, zIndex: 1 },
  ];

  return (
    <section className="py-24 text-white overflow-hidden" style={{ backgroundImage: 'url(https://files.123freevectors.com/wp-content/original/150776-abstract-dark-brown-diagonal-shiny-lines-background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">
            Visual Showcase
          </p>
          <h2 className="text-4xl font-serif text-white mb-3">The Jewellery Gallery</h2>
          <p className="text-sm text-white/50">Explore our finest pieces across every category</p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-16">
          {GALLERY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeCategory === cat
                  ? 'bg-[var(--color-gold)] text-[var(--color-ink)]'
                  : 'border border-white/20 text-white/60 hover:border-white/50 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Fan Card Display */}
        <div className="relative h-[340px] md:h-[420px] flex items-center justify-center mb-12">
          {CARD_CONFIG.map(({ offset, x, rotate, scale, opacity, zIndex }) => {
            const item = getCard(offset);
            return (
              <motion.div
                key={`${activeCategory}-${(galleryIndex + offset + total) % total}`}
                animate={{ x, rotate, scale, opacity }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ zIndex, position: 'absolute' }}
                className="w-[200px] md:w-[260px]"
                onClick={offset === 0 ? undefined : (offset < 0 ? prev : next)}
              >
                <div className="rounded-2xl overflow-hidden shadow-2xl bg-gray-800 aspect-[3/4] cursor-pointer">
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/260x350?text=PD+Jewellers'; }}
                  />
                  {offset === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-2xl">
                      <p className="text-white text-xs font-bold">{item.title}</p>
                      <p className="text-white/60 text-[10px] uppercase tracking-wider mt-0.5">{item.category}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={prev}
            className="w-11 h-11 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/60 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex gap-2">
            {filtered.map((_, i) => (
              <button
                key={i}
                onClick={() => setGalleryIndex(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === galleryIndex
                    ? 'w-6 h-2 bg-[var(--color-gold)]'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-11 h-11 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/60 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

const HERO_IMAGES = GALLERY_ITEMS.map(g => g.url);

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>(SEED_POSTS);
  const [activeCategory, setActiveCategory] = useState('All');
  const [openPost, setOpenPost] = useState<BlogPost | null>(null);
  const [heroIdx, setHeroIdx] = useState(2);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('/api/blog')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setPosts(data); })
      .catch(() => {});
  }, []);

  const categories = ['All', ...Array.from(new Set(posts.map((p) => p.category)))];
  const filtered = activeCategory === 'All' ? posts : posts.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {/* Hero Image Slider */}
      <section className="relative overflow-hidden" style={{ height: '68vh', minHeight: '420px' }}>
        <AnimatePresence mode="popLayout">
          <motion.img
            key={heroIdx}
            src={HERO_IMAGES[heroIdx]}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full object-cover"
            alt="PD Jewellers gallery"
          />
        </AnimatePresence>

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/40 to-stone-900/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[var(--color-ink)]/20 pointer-events-none" />

        {/* Gold corner frames */}
        <div className="absolute top-5 left-5 w-10 h-10 border-t-2 border-l-2 border-[#D4AF37]/60 pointer-events-none" />
        <div className="absolute top-5 right-5 w-10 h-10 border-t-2 border-r-2 border-[#D4AF37]/60 pointer-events-none" />
        <div className="absolute bottom-16 left-5 w-10 h-10 border-b-2 border-l-2 border-[#D4AF37]/60 pointer-events-none" />
        <div className="absolute bottom-16 right-5 w-10 h-10 border-b-2 border-r-2 border-[#D4AF37]/60 pointer-events-none" />

        {/* Prev / Next */}
        <button
          onClick={() => setHeroIdx(i => (i - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)}
          className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/25 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white hover:bg-black/45 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length)}
          className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/25 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white hover:bg-black/45 transition-all"
        >
          <ChevronRight size={20} />
        </button>

        {/* Text + dots */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-10 px-4 text-center text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-[var(--color-gold)] mb-3 flex items-center justify-center gap-2">
            <BookOpen size={13} /> The Journal
          </p>
          <h1 className="text-5xl md:text-6xl font-serif text-white mb-3 leading-tight drop-shadow-lg">
            The Jewellery Blog
          </h1>
          <p className="text-white/65 text-sm max-w-xl mx-auto leading-relaxed mb-6">
            Stories, guides, and expertise from Sri Lanka's leading fine jewellery artisans.
          </p>
          <div className="flex gap-2">
            {HERO_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIdx(i)}
                className={`rounded-full transition-all duration-500 ${i === heroIdx ? 'bg-[#D4AF37] w-5 h-2' : 'w-2 h-2 bg-white/35 hover:bg-white/65'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <div className="sticky top-[112px] md:top-[128px] z-30 bg-[var(--color-paper)]/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto py-3 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeCategory === cat
                  ? 'btn-richbrown text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-[var(--color-ink)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Article Grid */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-24 text-sm">No articles in this category yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((post) => (
              <ArticleCard key={post._id} post={post} onRead={() => setOpenPost(post)} />
            ))}
          </div>
        )}
      </section>

      {/* Gallery */}
      <GallerySection />

      {/* Article Modal */}
      <AnimatePresence>
        {openPost && (
          <ArticleModal post={openPost} onClose={() => setOpenPost(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
