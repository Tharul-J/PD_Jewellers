import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, Menu, Phone, Sparkles, Heart } from 'lucide-react';
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
      {/* Top Announcement Bar */}
      <div className="bg-[var(--color-ink)] text-white text-[10px] sm:text-[11px] py-2 px-6 flex justify-between items-center font-sans tracking-widest uppercase transition-opacity duration-300">
        <div className="hidden sm:flex items-center gap-4 opacity-80">
          <span className="flex items-center gap-1"><Phone size={12} /> 033 222 2735 | 070 442 2735</span>
          <span>PD jewellers, No. 05, Main Street, Gampaha</span>
        </div>
        <div className="mx-auto mt-0.5 opacity-90 tracking-[0.2em] sm:mx-0">
          Sri Lanka
        </div>
        <div className="hidden sm:flex items-center gap-4 opacity-80">
          <span>Book an Appointment</span>
        </div>
      </div>

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
            <Link to="/" className="flex flex-col items-center lg:items-start justify-center">
              <span className="text-2xl md:text-3xl font-serif text-gold-gradient tracking-wider whitespace-nowrap">PD JEWELLERS</span>
              <span className="text-[8px] xl:text-[9px] uppercase tracking-[0.4em] text-[var(--color-gold-dark)] mt-1 opacity-80 whitespace-nowrap">Fine Jewellery</span>
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
              <button className="hover:text-[var(--color-gold)] transition-colors">
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
    </div>
  );
}
