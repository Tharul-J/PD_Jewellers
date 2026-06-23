import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, Menu, Sparkles, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useState, useEffect } from 'react';
import { StyleQuiz } from './StyleQuiz';

export function Navbar() {
  const { setIsCartOpen, items } = useCart();
  const { user } = useAuth();
  const { wishlist } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);
  const wishlistItemCount = wishlist.length;

  // If on home page and not scrolled, hide the entire navbar
  const isHidden = isHome && !isScrolled;

  return (
    <div className={`fixed w-full z-40 top-0 transition-transform duration-500 bg-[var(--color-paper)] shadow-sm ${isHidden ? 'translate-y-[-100%]' : 'translate-y-0'}`}>
      {/* Main Navbar */}
      <nav className="border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center justify-between">
          
          {/* Mobile Menu Icon (Left) */}
          <div className="flex items-center gap-4 lg:hidden">
            <button className="p-2 -ml-2 text-[var(--color-ink)] hover:text-[var(--color-gold)]">
              <Menu strokeWidth={1.5} size={24} />
            </button>
          </div>

          {/* Left: Logo */}
          <div className="flex-1 flex justify-center lg:justify-start">
            <Link to="/" className="flex items-center justify-center lg:justify-start">
              <img
                src="/logo.png"
                alt="P Dedigamuwa Jewellers"
                className="h-14 md:h-16 w-auto object-contain"
              />
            </Link>
          </div>
          
          {/* Center: Navigation Links */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-6 xl:gap-8 text-[10px] xl:text-[11px] font-medium tracking-[0.2em] uppercase text-[var(--color-ink)]">
            <Link to="/collections" className="transition-colors hover:text-[var(--color-gold)] whitespace-nowrap">Collection</Link>
            <Link to="/configurator" className="transition-colors hover:text-[var(--color-gold)] whitespace-nowrap">Make Your Own</Link>
            <Link to="/about" className="transition-colors hover:text-[var(--color-gold)] whitespace-nowrap">About Us</Link>
            <Link to="/blog" className="transition-colors hover:text-[var(--color-gold)] whitespace-nowrap">Blog</Link>
          </div>

          {/* Right: User Icons */}
          <div className="flex flex-1 items-center justify-end gap-5 md:gap-6 text-[var(--color-ink)]">
            <div className="hidden lg:flex items-center gap-5 xl:gap-6">
              <button 
                onClick={() => setIsAssistantOpen(true)}
                className={`flex items-center justify-center p-2 transition-colors ${isAssistantOpen ? 'text-[var(--color-gold)]' : 'hover:text-[var(--color-gold)]'}`}
                title="Style Assistant"
              >
                <Sparkles strokeWidth={1.5} size={20} />
              </button>
              <button onClick={() => { setSearchOpen(v => !v); setSearchQuery(''); }} className={`flex items-center justify-center p-2 transition-colors ${searchOpen ? 'text-[var(--color-gold)]' : 'hover:text-[var(--color-gold)]'}`}>
                <Search strokeWidth={1.5} size={20} />
              </button>
              <button 
                onClick={() => navigate("/profile")} 
                className="relative flex items-center justify-center p-2 hover:text-[var(--color-gold)] transition-colors" 
                title="Wishlist"
              >
                <Heart strokeWidth={1.5} size={20} />
                {wishlistItemCount > 0 && (
                  <span className="absolute bottom-1 right-0 w-4 h-4 bg-[var(--color-gold)] text-[var(--color-paper)] rounded-full text-[9px] flex items-center justify-center font-bold">
                    {wishlistItemCount}
                  </span>
                )}
              </button>
              <button onClick={() => navigate(user ? "/profile" : "/login")} className="hover:text-[var(--color-gold)] transition-colors flex items-center justify-center p-2">
                <User strokeWidth={1.5} size={20} />
              </button>
            </div>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center justify-center p-2 hover:text-[var(--color-gold)] transition-colors"
            >
              <ShoppingBag strokeWidth={1.5} size={22} />
              {cartItemCount > 0 && (
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-[var(--color-gold)] text-[var(--color-paper)] rounded-full text-[9px] flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
      
      <StyleQuiz isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />

      {/* Search bar */}
      {searchOpen && (
        <div className="border-t border-black/5 bg-[var(--color-paper)] px-6 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                navigate(`/collections?search=${encodeURIComponent(searchQuery.trim())}`);
                setSearchOpen(false);
                setSearchQuery('');
              }
            }}
            className="max-w-xl mx-auto flex items-center gap-3"
          >
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search jewellery by name…"
              className="flex-1 bg-transparent text-sm text-[var(--color-ink)] placeholder-gray-400 outline-none"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-[var(--color-ink)] text-xs">✕</button>
            )}
            <button type="submit" className="btn-richbrown text-white text-[10px] uppercase tracking-widest px-4 py-1.5 rounded">Search</button>
          </form>
        </div>
      )}
    </div>
  );
}
