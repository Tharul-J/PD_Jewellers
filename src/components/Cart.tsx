import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, ShoppingBag, Trash2, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatPrice, formatEstimate, INDICATIVE_NOTE } from '../lib/price';
import { useOverlayGuard } from '../lib/pollGuard';
import { InquiryItemThumbnail } from './InquiryItemThumbnail';

const RECENT_LIMIT = 3;

// The drawer is the working inquiry list: add, adjust, remove, submit. Below it
// sits a short receipt of already-submitted requests, so a submission doesn't
// just vanish — full status tracking still lives in the profile.
export function Cart() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, cartTotal, lastSubmittedAt } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submitted, setSubmitted] = useState<any[]>([]);

  // The drawer is modal over the page — hold background refreshes while it's up.
  useOverlayGuard(isCartOpen);

  useEffect(() => {
    if (!isCartOpen || !user) {
      setSubmitted([]);
      return;
    }
    let cancelled = false;

    fetch('/api/orders/myorders', { headers: { Authorization: `Bearer ${user.token}` } })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !Array.isArray(data)) return;
        // The endpoint sorts newest-first; re-sorting here is belt-and-braces so
        // the "recent" slice below can never show the oldest requests.
        setSubmitted(
          [...data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      })
      .catch(() => {
        // offline — the section simply stays hidden
      });

    return () => { cancelled = true; };
    // lastSubmittedAt refreshes the list when a submit happens behind an open drawer
  }, [isCartOpen, user, lastSubmittedAt]);

  const goTo = (path: string) => {
    setIsCartOpen(false);
    navigate(path);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[var(--color-paper)] z-50 flex flex-col shadow-2xl border-l border-[rgba(26,26,26,0.1)] animate-in slide-in-from-right duration-300"
          >
            <div className="flex items-center justify-between p-6 border-b border-[rgba(26,26,26,0.1)]">
              <h2 className="text-2xl font-serif">Inquiry List</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
                id="close-cart-btn"
              >
                <X size={24} strokeWidth={1} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-[#cca150] font-bold">
                    New Submissions ({items.length})
                  </span>
                  {items.length > 0 && (
                    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Unsaved Draft</span>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-stone-200 rounded-xl bg-white/30">
                    <ShoppingBag size={26} strokeWidth={1} className="mx-auto mb-3 text-stone-300" />
                    <p className="text-sm text-stone-600 font-serif">Your inquiry list is empty</p>
                    <p className="text-[10px] text-stone-400 mt-1 mb-5">Add a piece to start a new inquiry.</p>
                    <button
                      onClick={() => goTo('/collections')}
                      className="btn-richbrown text-white px-5 py-2.5 uppercase tracking-widest text-[9px] font-bold transition-colors rounded-xl shadow-md"
                      id="sidebar-explore-btn"
                    >
                      Explore Showroom
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="flex gap-4 p-3 pr-9 bg-white/40 border border-stone-100 rounded-xl relative group" id={`cart-item-${item.id}`}>
                        <InquiryItemThumbnail image={item.image} name={item.name} isCustomDesign={item.isCustomDesign} />
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            <h3 className="font-bold text-xs tracking-wider uppercase text-stone-800 line-clamp-1">{item.name}</h3>
                            <p className="text-[9px] opacity-60 mt-0.5 uppercase tracking-widest font-mono">
                              {item.options?.material} {item.options?.stone && `· Stone: ${item.options.stone}`}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            {/* Icons stay small; the padding carries the tap target
                                up to the 32px accessibility minimum. */}
                            <div className="flex items-center border border-[rgba(26,26,26,0.15)] rounded-full bg-white/60">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 transition-colors"
                                id={`qty-dec-${item.id}`}
                                aria-label={`Decrease quantity of ${item.name}`}
                              >
                                <Minus size={13} />
                              </button>
                              <span className="px-1 text-xs font-semibold min-w-[16px] text-center" id={`qty-value-${item.id}`}>{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 transition-colors"
                                id={`qty-inc-${item.id}`}
                                aria-label={`Increase quantity of ${item.name}`}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            <span className="font-serif text-sm font-semibold text-stone-900">{formatEstimate(item.price * item.quantity)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-full text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          id={`remove-${item.id}`}
                          title={`Remove ${item.name} from inquiry list`}
                          aria-label={`Remove ${item.name} from inquiry list`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Short receipt of submitted requests — reference, size and date
                  only. Status, timelines and cancellation live in the profile. */}
              {user && submitted.length > 0 && (
                <div className="mt-8 pt-5 border-t border-dashed border-stone-200/80">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                      Submitted Requests ({submitted.length})
                    </span>
                    <button
                      onClick={() => goTo('/profile?tab=orders')}
                      className="text-[9px] text-[#cca150] uppercase tracking-wider font-extrabold hover:underline flex items-center gap-0.5"
                      id="view-all-inquiries-btn"
                    >
                      View All <ChevronRight size={10} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {submitted.slice(0, RECENT_LIMIT).map(inquiry => {
                      const count = inquiry.orderItems?.length ?? 0;
                      return (
                        <button
                          key={inquiry._id}
                          onClick={() => goTo('/profile?tab=orders')}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-white/50 hover:bg-white border border-stone-100 hover:border-stone-300 rounded-lg text-left transition-colors"
                          id={`submitted-inquiry-${inquiry._id}`}
                        >
                          <span className="font-mono text-[11px] font-bold text-amber-700">
                            {inquiry.inquiryRef || 'INQ-PENDING'}
                          </span>
                          <span className="text-[10px] text-stone-400 shrink-0">
                            {count} item{count === 1 ? '' : 's'}
                            {inquiry.createdAt && ` · ${new Date(inquiry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action Block */}
            {items.length > 0 && (
              <div className="p-6 border-t border-[rgba(26,26,26,0.1)] space-y-4 bg-white/80 backdrop-blur-md">
                <div className="flex justify-between items-center font-serif text-xl text-stone-900">
                  <span>Total Est. Value</span>
                  <div className="text-right">
                    <span className="block text-[9px] text-stone-400 font-sans tracking-widest uppercase mb-0.5">Starting from</span>
                    <span className="font-bold" id="cart-total">{formatPrice(cartTotal)}</span>
                    <span className="block text-[10px] text-stone-500 font-sans tracking-normal font-normal mt-0.5">{INDICATIVE_NOTE}</span>
                  </div>
                </div>
                <button
                  onClick={() => goTo('/inquiry')}
                  className="w-full py-4 btn-richbrown text-white uppercase tracking-[0.2em] text-xs font-bold transition-colors rounded-xl shadow-lg shadow-stone-850/10"
                  id="submit-inquiry-btn"
                >
                  Submit Inquiry Request
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
