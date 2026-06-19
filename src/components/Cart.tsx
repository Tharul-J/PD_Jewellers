import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export function Cart() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

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
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[var(--color-paper)] z-50 flex flex-col shadow-2xl border-l border-[rgba(26,26,26,0.1)]"
          >
            <div className="flex items-center justify-between p-6 border-b border-[rgba(26,26,26,0.1)]">
              <h2 className="text-2xl font-serif">Your Bag</h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={24} strokeWidth={1} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                  <ShoppingBag size={48} strokeWidth={1} />
                  <p className="font-serif text-xl">Your bag is empty.</p>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-24 h-24 bg-white/50 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover mix-blend-multiply" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-medium text-sm tracking-widest uppercase">{item.name}</h3>
                        <p className="text-xs opacity-60 mt-1 uppercase tracking-widest">{item.options?.material} {item.options?.stone && `Â· ${item.options.stone}`}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-[rgba(26,26,26,0.2)] rounded-full px-2 py-1">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 opacity-70 hover:opacity-100">
                            <Minus size={14} />
                          </button>
                          <span className="px-3 text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 opacity-70 hover:opacity-100">
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="font-serif text-lg">Starts from LKR {Number(item.price).toLocaleString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-xs underline underline-offset-4 self-start opacity-50 hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-[rgba(26,26,26,0.1)] space-y-4 bg-white/30">
                <div className="flex justify-between items-center font-serif text-xl">
                  <span>Total</span>
                  <span className="text-right">Starts from LKR {cartTotal.toLocaleString()}<br/><span className="text-xs text-gray-500 font-sans tracking-normal">Estimated Total</span></span>
                </div>
                <button 
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/checkout');
                  }}
                  className="w-full py-4 bg-[var(--color-ink)] text-[var(--color-paper)] uppercase tracking-[0.2em] text-xs font-semibold hover:bg-black transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
