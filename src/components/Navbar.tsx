import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, Menu, X, Sparkles, Bell, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationBadge } from './NotificationBadge';
import { useState, useEffect } from 'react';
import { StyleQuiz } from './StyleQuiz';
import { useOverlayGuard } from '../lib/pollGuard';

// Single source of truth for the primary nav links — mapped in both the
// desktop bar and the mobile drawer so the two never drift apart.
const NAV_LINKS = [
  { label: 'Collection', to: '/collections' },
  { label: 'Make Your Own', to: '/configurator' },
  { label: 'About Us', to: '/about' },
  { label: 'Blog', to: '/blog' },
];

const timeAgo = (iso: string) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export function Navbar() {
  const { setIsCartOpen, items } = useCart();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // The bell dropdown is the one surface the notification poll would rewrite
  // underneath the reader; the drawer and quiz are modal over the whole page.
  useOverlayGuard(notifOpen);
  useOverlayGuard(menuOpen);
  // StyleQuiz registers itself, so it isn't counted again here.

  // Close the drawer on any route change.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Close the drawer on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const handleNotificationClick = (link: string) => {
    setNotifOpen(false);
    markAllRead();
    if (link) navigate(link);
  };
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  // If on home page and not scrolled, hide the entire navbar
  const isHidden = isHome && !isScrolled;

  return (
    <>
    <div className={`fixed w-full z-40 top-0 transition-transform duration-500 bg-[var(--color-paper)] shadow-sm ${isHidden ? 'translate-y-[-100%]' : 'translate-y-0'}`}>
      {/* Main Navbar */}
      <nav className="border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center justify-between">
          
          {/* Mobile Menu Icon (Left) */}
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="p-2 -ml-2 text-[var(--color-ink)] hover:text-[var(--color-gold)]"
            >
              {menuOpen ? <X strokeWidth={1.5} size={24} /> : <Menu strokeWidth={1.5} size={24} />}
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
            {NAV_LINKS.map(link => (
              <Link key={link.to} to={link.to} className="transition-colors hover:text-[var(--color-gold)] whitespace-nowrap">{link.label}</Link>
            ))}
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
              <button onClick={() => navigate(user ? "/profile" : "/login")} className="hover:text-[var(--color-gold)] transition-colors flex items-center justify-center p-2">
                <User strokeWidth={1.5} size={20} />
              </button>
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(v => !v)}
                    className={`relative flex items-center justify-center p-2 transition-colors ${notifOpen ? 'text-[var(--color-gold)]' : 'hover:text-[var(--color-gold)]'}`}
                    title="Notifications"
                  >
                    <Bell strokeWidth={1.5} size={20} />
                    <span className="absolute top-1 right-0.5">
                      <NotificationBadge count={unreadCount} />
                    </span>
                  </button>
                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white border border-gray-100 rounded-lg shadow-lg z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Notifications</span>
                        </div>
                        {notifications.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8">No notifications yet.</p>
                        ) : (
                          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                            {notifications.slice(0, 5).map(n => (
                              <button
                                key={n._id}
                                onClick={() => handleNotificationClick(n.link)}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${!n.read ? 'bg-amber-50/40' : ''}`}
                              >
                                <p className="text-[var(--color-ink)] leading-snug">{n.message}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
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

    {/* ---------- Mobile navigation drawer (rendered as a sibling of the
         transformed navbar wrapper so `fixed` resolves to the viewport) ---------- */}
    {/* Backdrop */}
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={() => setMenuOpen(false)}
      aria-hidden="true"
    />

    {/* Panel */}
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className={`fixed top-0 left-0 h-[100dvh] w-[82vw] max-w-[320px] z-50 lg:hidden bg-[var(--color-paper)] shadow-2xl overflow-y-auto transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-6 h-20 border-b border-[var(--color-ink)]/10">
        <Link to="/" className="flex items-center">
          <img src="/logo.png" alt="P Dedigamuwa Jewellers" className="h-12 w-auto object-contain" />
        </Link>
        <button
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
          className="p-2 -mr-2 text-[var(--color-ink)] hover:text-[var(--color-gold)]"
        >
          <X strokeWidth={1.5} size={24} />
        </button>
      </div>

      {/* Primary nav links */}
      <nav>
        {NAV_LINKS.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="block px-6 py-4 min-h-[48px] border-b border-[var(--color-ink)]/10 text-base tracking-wide uppercase text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Account / action items (mirror of the desktop `hidden lg:flex` cluster) */}
      <div className="pt-2">
        {user && (
          <div className="px-6 py-3">
            <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        )}

        <button
          onClick={() => { setIsAssistantOpen(true); setMenuOpen(false); }}
          className="w-full flex items-center gap-4 px-6 py-3 min-h-[48px] text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
        >
          <Sparkles strokeWidth={1.5} size={20} />
          <span className="text-sm tracking-wide">Style Assistant</span>
        </button>

        <button
          onClick={() => { setSearchOpen(true); setSearchQuery(''); setMenuOpen(false); }}
          className="w-full flex items-center gap-4 px-6 py-3 min-h-[48px] text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
        >
          <Search strokeWidth={1.5} size={20} />
          <span className="text-sm tracking-wide">Search</span>
        </button>

        <button
          onClick={() => navigate(user ? '/profile' : '/login')}
          className="w-full flex items-center gap-4 px-6 py-3 min-h-[48px] text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
        >
          <User strokeWidth={1.5} size={20} />
          <span className="text-sm tracking-wide">{user ? 'My Account' : 'Login / Register'}</span>
        </button>

        <button
          onClick={() => { setIsCartOpen(true); setMenuOpen(false); }}
          className="w-full flex items-center gap-4 px-6 py-3 min-h-[48px] text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
        >
          <ShoppingBag strokeWidth={1.5} size={20} />
          <span className="text-sm tracking-wide">Cart</span>
          {cartItemCount > 0 && (
            <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-[var(--color-gold)] text-[var(--color-paper)] text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </button>

        {user && (
          <div className="border-t border-[var(--color-ink)]/10 mt-2 pt-2">
            <div className="w-full flex items-center gap-4 px-6 py-3 min-h-[48px] text-[var(--color-ink)]">
              <Bell strokeWidth={1.5} size={20} />
              <span className="text-sm tracking-wide">Notifications</span>
              <NotificationBadge count={unreadCount} />
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-gray-400 px-6 pb-3">No notifications yet.</p>
            ) : (
              <div className="divide-y divide-[var(--color-ink)]/5">
                {notifications.slice(0, 5).map(n => (
                  <button
                    key={n._id}
                    onClick={() => { handleNotificationClick(n.link); setMenuOpen(false); }}
                    className={`w-full text-left px-6 py-3 text-sm hover:bg-black/5 transition-colors ${!n.read ? 'bg-amber-50/40' : ''}`}
                  >
                    <p className="text-[var(--color-ink)] leading-snug">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {user && (
          <div className="border-t border-[var(--color-ink)]/10 mt-2 pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-3 min-h-[48px] text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
            >
              <LogOut strokeWidth={1.5} size={20} />
              <span className="text-sm tracking-wide">Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
