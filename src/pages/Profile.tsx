import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { motion } from 'motion/react';
import { LogOut, User as UserIcon, Settings, Heart, ShoppingBag, Trash2, Palette } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function Profile() {
  const { user, logout } = useAuth();
  const { wishlist, toggleWishlistItem, isLoading: isWishlistLoading } = useWishlist();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'account' | 'wishlist' | 'orders' | 'configs'>('account');
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/users/profile', {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });
        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        console.error("Error fetching profile", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'orders' && user) {
      const fetchOrders = async () => {
        setOrdersLoading(true);
        try {
          const res = await fetch('/api/orders/myorders', {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          if (res.ok) {
            setOrders(await res.json());
          }
        } catch (error) {
          console.error("Error fetching orders", error);
        } finally {
          setOrdersLoading(false);
        }
      };
      fetchOrders();
    }
  }, [activeTab, user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[var(--color-paper)]">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row gap-12">
            
            {/* Sidebar */}
            <div className="w-full md:w-1/3 lg:w-1/4">
              <div className="mb-8">
                <h1 className="text-3xl font-serif text-[var(--color-ink)]">{profileData?.name || user?.name}</h1>
                <p className="text-gray-500 mt-2 text-sm">{profileData?.email || user?.email}</p>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => setActiveTab('account')} 
                  className={`flex items-center gap-3 w-full p-3 text-left text-sm font-medium transition-colors rounded-sm ${activeTab === 'account' ? 'bg-[var(--color-ink)] text-white' : 'text-gray-600 hover:text-[var(--color-ink)] hover:bg-gray-100'}`}
                >
                  <UserIcon size={16} /> My Account
                </button>
                <button 
                  onClick={() => setActiveTab('wishlist')} 
                  className={`flex items-center gap-3 w-full p-3 text-left text-sm font-medium transition-colors rounded-sm ${activeTab === 'wishlist' ? 'bg-[var(--color-ink)] text-white' : 'text-gray-600 hover:text-[var(--color-ink)] hover:bg-gray-100'}`}
                >
                  <Heart size={16} /> Wishlist ({wishlist.length})
                </button>
                <button 
                  onClick={() => setActiveTab('configs')} 
                  className={`flex items-center gap-3 w-full p-3 text-left text-sm font-medium transition-colors rounded-sm ${activeTab === 'configs' ? 'bg-[var(--color-ink)] text-white' : 'text-gray-600 hover:text-[var(--color-ink)] hover:bg-gray-100'}`}
                >
                  <Palette size={16} /> Saved Designs ({profileData?.savedConfigurations?.length || 0})
                </button>
                <button 
                  onClick={() => setActiveTab('orders')} 
                  className={`flex items-center gap-3 w-full p-3 text-left text-sm font-medium transition-colors rounded-sm ${activeTab === 'orders' ? 'bg-[var(--color-ink)] text-white' : 'text-gray-600 hover:text-[var(--color-ink)] hover:bg-gray-100'}`}
                >
                  <ShoppingBag size={16} /> Orders
                </button>
                
                {user?.role === 'administrator' && (
                  <button onClick={() => navigate('/admin')} className="flex items-center gap-3 w-full p-3 text-left text-sm font-medium text-[var(--color-gold)] hover:bg-yellow-50 transition-colors rounded-sm mt-4">
                    <Settings size={16} /> Admin Dashboard
                  </button>
                )}

                <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-left text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors rounded-sm mt-8 border-t border-gray-200 pt-6">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="w-full md:w-2/3 lg:w-3/4">
              <div className="bg-white p-8 border border-gray-100 shadow-sm min-h-[500px]">
                
                {activeTab === 'account' && (
                  <>
                    <h2 className="text-xl font-serif text-[var(--color-ink)] mb-6">Account Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Name</label>
                        <p className="text-[var(--color-ink)] font-medium border-b border-gray-200 pb-2">{profileData?.name || user?.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Email</label>
                        <p className="text-[var(--color-ink)] font-medium border-b border-gray-200 pb-2">{profileData?.email || user?.email}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Account Type</label>
                        <p className="text-[var(--color-ink)] font-medium border-b border-gray-200 pb-2 capitalize">{user?.role || 'Customer'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Member Since</label>
                        <p className="text-[var(--color-ink)] font-medium border-b border-gray-200 pb-2">
                          {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'wishlist' && (
                  <>
                    <h2 className="text-xl font-serif text-[var(--color-ink)] mb-6">My Wishlist</h2>
                    
                    {isWishlistLoading ? (
                      <div className="py-12 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                    ) : wishlist.length === 0 ? (
                      <div className="py-16 text-center text-gray-500 bg-gray-50 border border-gray-100 border-dashed rounded-md">
                        <Heart size={32} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm mb-6">Your wishlist is currently empty.</p>
                        <Link to="/collections" className="inline-block px-6 py-3 bg-[var(--color-ink)] text-white text-[10px] uppercase tracking-widest hover:bg-black transition-colors">
                          Explore Collections
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {wishlist.map((item) => (
                          <div key={item.productId} className="flex flex-col group border border-gray-100 rounded-lg overflow-hidden pb-4">
                            <div className="relative aspect-square bg-gray-50 mb-4 overflow-hidden">
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-full h-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
                              />
                              <button 
                                onClick={() => toggleWishlistItem(item)}
                                className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-sm text-red-500 hover:bg-red-50 transition-colors"
                                title="Remove from wishlist"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="px-4 text-center flex-1 flex flex-col">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold-dark)] mb-1 font-bold">{item.category}</p>
                              <h3 className="font-serif text-sm md:text-md mb-2 text-[var(--color-ink)] flex-1">{item.name}</h3>
                              <p className="font-sans font-medium text-sm text-[var(--color-ink)] mb-4">${Number(item.price).toLocaleString()}</p>
                              
                              <Link 
                                to={item.isCustom ? "/configurator" : `/collections`}
                                className="w-full text-center border border-[var(--color-ink)] text-[var(--color-ink)] py-2 text-[10px] uppercase tracking-widest hover:bg-[var(--color-ink)] hover:text-white transition-colors mt-auto"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'orders' && (
                  <>
                    <h2 className="text-xl font-serif text-[var(--color-ink)] mb-6">My Orders</h2>
                    
                    {ordersLoading ? (
                      <div className="py-12 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                    ) : orders.length === 0 ? (
                      <div className="py-16 text-center text-gray-500 bg-gray-50 border border-gray-100 border-dashed rounded-md">
                        <ShoppingBag size={32} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm">You haven't placed any orders yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {orders.map((order) => (
                          <div key={order._id} className="border border-gray-100 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Order Placed</p>
                                <p className="text-sm font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Total</p>
                                <p className="text-sm font-semibold">${order.totalPrice}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Order #</p>
                                <p className="text-sm font-mono text-[var(--color-ink)]">{order._id}</p>
                              </div>
                              <div>
                                <span className={`px-3 py-1 text-[10px] uppercase tracking-wide rounded-full font-bold
                                  ${order.status === 'order_confirmed' ? 'bg-blue-100 text-blue-700' : ''}
                                  ${order.status === 'crafting' ? 'bg-yellow-100 text-[var(--color-gold-dark)]' : ''}
                                  ${order.status === 'finished' ? 'bg-indigo-100 text-indigo-700' : ''}
                                  ${order.status === 'ready_for_collection' ? 'bg-green-100 text-green-700' : ''}
                                `}>
                                  {order.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                            
                            {/* Order Tracker */}
                            <div className="px-8 py-6 border-b border-gray-100">
                              <div className="relative">
                                {/* Track Line */}
                                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-200 -translate-y-1/2"></div>
                                <div 
                                  className="absolute top-1/2 left-0 h-[2px] bg-[var(--color-gold)] -translate-y-1/2 transition-all duration-500"
                                  style={{
                                    width: 
                                      order.status === 'order_confirmed' ? '0%' :
                                      order.status === 'crafting' ? '33.33%' :
                                      order.status === 'finished' ? '66.66%' :
                                      '100%'
                                  }}
                                ></div>

                                {/* Status Points */}
                                <div className="relative flex justify-between">
                                  {[
                                    { id: 'order_confirmed', label: 'Order Confirmed' },
                                    { id: 'crafting', label: 'Crafting' },
                                    { id: 'finished', label: 'Finished' },
                                    { id: 'ready_for_collection', label: 'Ready for Collection' }
                                  ].map((step, index) => {
                                    const isActive = 
                                      order.status === step.id || 
                                      (order.status === 'ready_for_collection') ||
                                      (order.status === 'finished' && index <= 2) ||
                                      (order.status === 'crafting' && index <= 1);
                                      
                                    return (
                                      <div key={step.id} className="flex flex-col items-center">
                                        <div className={`w-4 h-4 rounded-full border-2 bg-white z-10 transition-colors ${isActive ? 'border-[var(--color-gold)]' : 'border-gray-300'}`}>
                                          {isActive && <div className="w-2 h-2 bg-[var(--color-gold)] rounded-full mx-auto mt-[2px]"></div>}
                                        </div>
                                        <span className={`text-[10px] uppercase tracking-widest mt-3 font-semibold text-center w-20 ${isActive ? 'text-[var(--color-ink)]' : 'text-gray-400'}`}>
                                          {step.label}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="p-4 space-y-4">
                              {order.orderItems.map((item: any, idx: number) => (
                                <div key={idx} className="flex gap-4 items-center">
                                  <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-serif">{item.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold">${item.price}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'configs' && (
                  <>
                    <h2 className="text-xl font-serif text-[var(--color-ink)] mb-6">Saved Designs</h2>
                    
                    {!profileData?.savedConfigurations || profileData.savedConfigurations.length === 0 ? (
                      <div className="py-16 text-center text-gray-500 bg-gray-50 border border-gray-100 border-dashed rounded-md">
                        <Palette size={32} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm mb-6">You haven't saved any custom designs yet.</p>
                        <Link to="/configurator" className="inline-block px-6 py-3 bg-[var(--color-ink)] text-white text-[10px] uppercase tracking-widest hover:bg-black transition-colors">
                          Start Designing
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {profileData.savedConfigurations.map((config: any) => (
                          <div key={config._id} className="border border-gray-100 rounded-lg p-5 hover:border-[var(--color-ink)] transition-colors">
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="font-serif text-lg text-[var(--color-ink)]">
                                {config.type === 'ring' ? 'Custom Ring' : 'Custom Pendant'}
                              </h3>
                              <p className="font-semibold">${config.price}</p>
                            </div>
                            
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-6">
                              <dt className="text-gray-500 text-[10px] uppercase tracking-widest">Metal</dt>
                              <dd className="capitalize">{config.metal}</dd>
                              
                              {config.type === 'ring' && (
                                <>
                                  <dt className="text-gray-500 text-[10px] uppercase tracking-widest">Stone</dt>
                                  <dd className="capitalize">{config.stone || 'None'}</dd>
                                  
                                  <dt className="text-gray-500 text-[10px] uppercase tracking-widest">Ring Size</dt>
                                  <dd className="capitalize">{config.ringSize}</dd>
                                </>
                              )}

                              {config.type === 'pendant' && (
                                <>
                                  <dt className="text-gray-500 text-[10px] uppercase tracking-widest">Shape</dt>
                                  <dd className="capitalize">{config.pendantShape || 'Standard'}</dd>
                                </>
                              )}

                              {config.engravingText && (
                                <>
                                  <dt className="text-gray-500 text-[10px] uppercase tracking-widest">Engraving</dt>
                                  <dd className="col-span-2 mt-1">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">"{config.engravingText}"</span>
                                  </dd>
                                </>
                              )}
                            </dl>
                            
                            <Link 
                              to="/configurator"
                              className="block w-full text-center border border-[var(--color-gold)] text-[var(--color-gold-dark)] py-2 text-[10px] uppercase tracking-widest hover:bg-[var(--color-gold)] hover:text-white transition-colors"
                            >
                              Open in Configurator
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
