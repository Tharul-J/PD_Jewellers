import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Plus, ShoppingBag, ChevronRight, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Cart() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, cartTotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myInquiries, setMyInquiries] = useState<any[]>([]);
  const [isLoadingInquiries, setIsLoadingInquiries] = useState(false);

  useEffect(() => {
    if (isCartOpen && user) {
      const fetchInquiries = async () => {
        setIsLoadingInquiries(true);
        try {
          const res = await fetch('/api/orders/myorders', {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setMyInquiries(data);
          }
        } catch (error) {
          console.error("Error fetching my inquiries in sidebar:", error);
        } finally {
          setIsLoadingInquiries(false);
        }
      };
      fetchInquiries();
    }
  }, [isCartOpen, user]);

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

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Draft / Unsubmitted Inquiry Items */}
              {items.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-[#cca150] font-bold">New Submissions ({items.length})</span>
                    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Unsaved Draft</span>
                  </div>
                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="flex gap-4 p-3 bg-white/40 border border-stone-100 rounded-xl relative group" id={`cart-item-${item.id}`}>
                        <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-100">
                          <img src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover mix-blend-multiply" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            <h3 className="font-bold text-xs tracking-wider uppercase text-stone-800 line-clamp-1">{item.name}</h3>
                            <p className="text-[9px] opacity-60 mt-0.5 uppercase tracking-widest font-mono">
                              {item.options?.material} {item.options?.stone && `· Stone: ${item.options.stone}`}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-[rgba(26,26,26,0.15)] rounded-full px-1.5 py-0.5 bg-white/60">
                              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-0.5 opacity-60 hover:opacity-100" id={`qty-dec-${item.id}`}>
                                <Minus size={11} />
                              </button>
                              <span className="px-2 text-xs font-semibold">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-0.5 opacity-60 hover:opacity-100" id={`qty-inc-${item.id}`}>
                                <Plus size={11} />
                              </button>
                            </div>
                            <span className="font-serif text-sm font-semibold text-stone-900">Est. Rs. {Number(item.price).toLocaleString()}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-[10px] uppercase tracking-wider absolute top-3 right-3 opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-red-700 transition-all font-bold"
                          id={`remove-${item.id}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted Active Inquiries & Real-time Status */}
              <div className="pt-4 border-t border-dashed border-stone-200/80">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Inquiry Tracking Status</span>
                  {user && myInquiries.length > 0 && (
                    <button 
                      onClick={() => {
                        setIsCartOpen(false);
                        navigate('/profile');
                      }}
                      className="text-[9px] text-[#cca150] uppercase tracking-wider font-extrabold hover:underline flex items-center gap-0.5"
                      id="track-history-btn"
                    >
                      History <ChevronRight size={10} />
                    </button>
                  )}
                </div>

                {!user ? (
                  <div className="bg-stone-50 border border-stone-100 p-5 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-stone-500 leading-relaxed font-sans">
                      Log in to check the status of your existing workshop slots and customized inquiries.
                    </p>
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        navigate('/login');
                      }}
                      className="inline-flex items-center justify-center gap-1 bg-stone-900 text-white px-4 py-2 uppercase tracking-widest text-[9px] font-bold hover:bg-stone-800 transition-colors rounded-lg w-full"
                      id="sidebar-login-btn"
                    >
                      <User size={10} /> Log In To Track
                    </button>
                  </div>
                ) : isLoadingInquiries ? (
                  <div className="py-6 text-center space-y-2">
                    <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto" />
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">Fetching Atelier Status...</span>
                  </div>
                ) : myInquiries.length === 0 ? (
                  items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                      <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center border border-stone-100">
                        <ShoppingBag size={32} strokeWidth={1} className="text-stone-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-serif text-lg text-stone-800">No active inquiries</p>
                        <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                          Your draft list is empty and no previous inquiries were found under your profile. Customize a design to start.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsCartOpen(false);
                          navigate('/collections');
                        }}
                        className="btn-richbrown text-white px-5 py-2.5 uppercase tracking-widest text-[9px] font-bold transition-colors rounded-xl shadow-md"
                        id="sidebar-explore-btn"
                      >
                        Explore Showroom
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {myInquiries.slice(0, 3).map((inquiry) => {
                      const latestItem = inquiry.orderItems?.[0];
                      const statusStyles: Record<string, { bg: string, text: string, label: string }> = {
                        pending: { bg: 'bg-orange-50 text-orange-700 border-orange-200/50', text: 'text-orange-700', label: 'Pending Review' },
                        availability_confirmed: { bg: 'bg-blue-50 text-blue-700 border-blue-200/50', text: 'text-blue-700', label: 'Confirmed' },
                        crafting: { bg: 'bg-amber-50 text-amber-800 border-amber-200/50', text: 'text-amber-800', label: 'In Crafting' },
                        completed: { bg: 'bg-green-50 text-green-700 border-green-200/50', text: 'text-green-700', label: 'Completed' },
                        declined: { bg: 'bg-red-50 text-red-700 border-red-200/50', text: 'text-red-700', label: 'Declined' },
                      };
                      const statusInfo = statusStyles[inquiry.status] || { bg: 'bg-stone-100 text-stone-700 border-stone-200', text: 'text-stone-700', label: inquiry.status };

                      return (
                        <div 
                          key={inquiry._id} 
                          onClick={() => {
                            setIsCartOpen(false);
                            navigate('/profile');
                          }}
                          className="p-4 bg-white/60 hover:bg-white border border-stone-150/85 hover:border-stone-300 rounded-2xl transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-3 group"
                          id={`inquiry-track-${inquiry._id}`}
                        >
                          <div className="flex justify-between items-center select-none">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-mono font-bold text-amber-700">{inquiry.inquiryRef || 'INQ-PENDING'}</span>
                              <span className="text-[9px] text-stone-400">{new Date(inquiry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <span className={`px-2 py-0.5 text-[8px] uppercase tracking-widest rounded-md font-bold border ${statusInfo.bg}`}>
                              {statusInfo.label}
                            </span>
                          </div>

                          {latestItem && (
                            <div className="flex gap-2 items-center bg-stone-50/50 p-2 rounded-xl">
                              <img src={latestItem.image} alt={latestItem.name} className="w-8 h-8 rounded object-cover border border-stone-100" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[10px] uppercase font-bold text-stone-700 truncate">{latestItem.name}</h4>
                                <p className="text-[8px] tracking-wider text-stone-400 capitalize truncate">{latestItem.options?.material || 'Handcrafted Custom model'}</p>
                              </div>
                            </div>
                          )}

                          {/* Simplified Timeline Progress Strip */}
                          {inquiry.status !== 'declined' && (
                            <div className="relative mt-1">
                              <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
                                  style={{
                                    width: 
                                      inquiry.status === 'pending' ? '25%' :
                                      inquiry.status === 'availability_confirmed' ? '50%' :
                                      inquiry.status === 'crafting' ? '75%' : '100%'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action Block */}
            {items.length > 0 && (
              <div className="p-6 border-t border-[rgba(26,26,26,0.1)] space-y-4 bg-white/80 backdrop-blur-md">
                <div className="flex justify-between items-center font-serif text-xl text-stone-900">
                  <span>Total Est. Value</span>
                  <div className="text-right">
                    <span className="block text-[9px] text-stone-400 font-sans tracking-widest uppercase mb-0.5">Starting from</span>
                    <span className="font-bold">Rs. {cartTotal.toLocaleString()}</span>
                    <span className="block text-[10px] text-stone-500 font-sans tracking-normal font-semibold mt-0.5 animate-pulse">Excludes Handcrafting Overhead</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/inquiry');
                  }}
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
