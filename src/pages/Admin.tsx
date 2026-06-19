import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePricing, IPricing } from '../context/PricingContext';
import { motion } from 'motion/react';
import { Users, Package, ShoppingCart, Activity, DollarSign } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pricing, updatePricing } = usePricing();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'products' | 'orders' | 'pricing'>('dashboard');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', category: 'ring', basePrice: 1000 });
  const [file, setFile] = useState<File | null>(null);
  
  const [priceForm, setPriceForm] = useState<Partial<IPricing>>({});

  useEffect(() => {
    if (pricing) {
        setPriceForm(pricing);
    }
  }, [pricing]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'administrator') {
      navigate('/profile');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.role === 'administrator') {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [usersRes, ordersRes, modelsRes] = await Promise.all([
            fetch('/api/users', { headers: { Authorization: `Bearer ${user.token}` } }),
            fetch('/api/orders', { headers: { Authorization: `Bearer ${user.token}` } }),
            fetch('/api/models')
          ]);
          
          if(usersRes.ok) setUsersList(await usersRes.json());
          if(ordersRes.ok) setOrdersList(await ordersRes.json());
          if(modelsRes.ok) setModelsList(await modelsRes.json());
        } catch (error) {
          console.error("Error fetching admin data", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setOrdersList(ordersList.map(o => o._id === orderId ? { ...o, status } : o));
      }
    } catch (error) {
      console.error("Error updating order", error);
    }
  };

  const handleUploadModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Please select a file');
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const uploadData = await uploadRes.json();
      
      if (uploadRes.ok) {
        const modelRes = await fetch('/api/models', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.token}`
          },
          body: JSON.stringify({
            ...newModel,
            glbUrl: uploadData.url
          })
        });
        
        if (modelRes.ok) {
          const createdModel = await modelRes.json();
          setModelsList([...modelsList, createdModel]);
          setNewModel({ name: '', category: 'ring', basePrice: 1000 });
          setFile(null);
          alert('Model uploaded successfully');
        }
      }
    } catch (error) {
      console.error("Error uploading model", error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!user || user.role !== 'administrator') {
    return null;
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 min-h-[500px] fixed h-full left-0 pt-8 px-4 hidden md:block">
        <h2 className="text-xl font-serif text-[var(--color-ink)] mb-8 px-4">Admin Panel</h2>
        <nav className="space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'products', label: 'Products', icon: Package },
            { id: 'orders', label: 'Orders', icon: ShoppingCart },
            { id: 'pricing', label: 'Pricing', icon: DollarSign }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === item.id 
                  ? 'bg-[var(--color-ink)] text-white' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-[var(--color-ink)]'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 max-w-7xl mx-auto px-4 md:px-8 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif text-[var(--color-ink)] tracking-tight capitalize">{activeTab}</h1>
              <p className="text-sm text-gray-500 mt-2">Manage your platform's {activeTab}.</p>
            </div>
            
            {/* Mobile Tab Select */}
            <div className="md:hidden">
               <select 
                 value={activeTab}
                 onChange={(e) => setActiveTab(e.target.value as any)}
                 className="p-2 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:border-[var(--color-gold)]"
               >
                 <option value="dashboard">Dashboard</option>
                 <option value="users">Users</option>
                 <option value="products">Products</option>
                 <option value="orders">Orders</option>
                 <option value="pricing">Pricing</option>
               </select>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                  { label: 'Total Revenue', value: 'LKR 1,132,000', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Total Orders', value: ordersList.length > 0 ? `${ordersList.length} Active` : '4 Active', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Total Products', value: modelsList.length > 0 ? `${modelsList.length} Models` : '4 Models', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Total Users', value: usersList.length > 0 ? usersList.length.toString() : '6', icon: Users, color: 'text-[var(--color-gold)]', bg: 'bg-amber-50' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 shadow-sm border border-gray-100 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-md ${stat.bg}`}>
                        <stat.icon className={stat.color} size={20} />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--color-ink)] mb-1">{stat.value}</h3>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
                <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-serif text-[var(--color-ink)] font-normal">Recent Platform Activity</h2>
                  <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-600 rounded-full">Real-time Feed</span>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      user: 'Tharul Senanayake',
                      email: 'tharul2002@gmail.com',
                      action: 'saved a new 3D custom design arrangement',
                      target: '22K Rose Gold Pendant (Diamond)',
                      time: '2 hours ago',
                      icon: Package,
                      iconBg: 'bg-amber-50',
                      iconColor: 'text-amber-600'
                    },
                    {
                      user: 'Kusal Fernando',
                      email: 'kusal@gmail.com',
                      action: 'placed a new custom jewelry order',
                      target: 'ORD-2026-3409 (LKR 365,000)',
                      time: '1 day ago',
                      icon: ShoppingCart,
                      iconBg: 'bg-emerald-50',
                      iconColor: 'text-emerald-600'
                    },
                    {
                      user: 'Dilini Perera',
                      email: 'dilini@gmail.com',
                      action: 'added classic item to their wishlist',
                      target: '22K Swarovski Zirconia Choker Necklace',
                      time: '3 days ago',
                      icon: Activity,
                      iconBg: 'bg-blue-50',
                      iconColor: 'text-blue-600'
                    },
                    {
                      user: 'System Admin',
                      email: 'admin@pdjewellers.com',
                      action: 'updated metal multipliers for luxury billing',
                      target: 'Gold set to 18.2x Base Rate',
                      time: '5 days ago',
                      icon: DollarSign,
                      iconBg: 'bg-purple-50',
                      iconColor: 'text-purple-600'
                    }
                  ].map((activity, idx) => (
                    <div key={idx} className="flex gap-4 items-start pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className={`p-2.5 rounded-full ${activity.iconBg} ${activity.iconColor} shrink-0`}>
                        <activity.icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-[var(--color-ink)]">{activity.user}</span>{' '}
                          <span className="text-gray-400 font-normal">({activity.email})</span>{' '}
                          {activity.action}{' '}
                          <span className="font-medium text-gray-900 underline decoration-amber-200 decoration-2">{activity.target}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1 font-mono">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
              {loading ? (
                <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">ID</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Name</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Email</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Role</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                      {usersList.map((usr) => (
                        <tr key={usr._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 font-mono text-xs text-gray-400">{usr._id.substring(0, 8)}...</td>
                          <td className="py-4 px-6 font-medium text-[var(--color-ink)]">{usr.name}</td>
                          <td className="py-4 px-6 text-gray-600">{usr.email}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 text-[10px] uppercase tracking-wide rounded-full font-semibold ${
                              usr.role === 'administrator' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {usr.role}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-500">
                            {new Date(usr.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {usersList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      No users found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <h2 className="text-lg font-serif text-[var(--color-ink)]">3D Models & Inventory</h2>
              </div>
              
              <form onSubmit={handleUploadModel} className="mb-12 bg-gray-50 p-6 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-semibold mb-4 uppercase tracking-widest text-[var(--color-ink)]">Upload New 3D Model</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Model Name</label>
                    <input 
                      type="text" 
                      required 
                      value={newModel.name}
                      onChange={(e) => setNewModel({...newModel, name: e.target.value})}
                      className="w-full p-2 border border-gray-200 text-sm"
                      placeholder="e.g. Classic Wedding Band"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Category</label>
                    <select 
                      value={newModel.category}
                      onChange={(e) => setNewModel({...newModel, category: e.target.value})}
                      className="w-full p-2 border border-gray-200 text-sm bg-white"
                    >
                      <option value="ring">Ring</option>
                      <option value="pendant">Pendant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Base Price ($)</label>
                    <input 
                      type="number" 
                      required 
                      min="0"
                      value={newModel.basePrice}
                      onChange={(e) => setNewModel({...newModel, basePrice: Number(e.target.value)})}
                      className="w-full p-2 border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">GLB / GLTF File</label>
                    <input 
                      type="file" 
                      accept=".glb,.gltf"
                      onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-ink)] file:text-white hover:file:bg-black cursor-pointer"
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="px-6 py-2 bg-[var(--color-ink)] text-white text-[10px] uppercase tracking-widest rounded-sm hover:bg-black transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Model'}
                </button>
              </form>

              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Model Name</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Category</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Base Price</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">GLB Link</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                      {modelsList.map((model) => (
                        <tr key={model._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 font-medium text-[var(--color-ink)]">{model.name}</td>
                          <td className="py-4 px-6 text-gray-600 capitalize">{model.category}</td>
                          <td className="py-4 px-6 text-gray-600">${model.basePrice}</td>
                          <td className="py-4 px-6 text-blue-500">
                            <a href={model.glbUrl} target="_blank" rel="noreferrer" className="hover:underline">View File</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {modelsList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      No models found.
                    </div>
                  )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
               {loading ? (
                <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Order ID</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Customer</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Total Price</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Date</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                      {ordersList.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 font-mono text-xs text-gray-400">{order._id.substring(0, 8)}...</td>
                          <td className="py-4 px-6 font-medium text-[var(--color-ink)]">{order.user?.name || 'Unknown'}</td>
                          <td className="py-4 px-6 text-gray-600">${order.totalPrice}</td>
                          <td className="py-4 px-6 text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6">
                            <select 
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                              className={`p-1 border border-gray-200 rounded-md text-xs font-semibold focus:outline-none focus:border-[var(--color-gold)] capitalize
                                ${order.status === 'order_confirmed' ? 'bg-blue-50 text-blue-700' : ''}
                                ${order.status === 'crafting' ? 'bg-yellow-50 text-[var(--color-gold-dark)]' : ''}
                                ${order.status === 'finished' ? 'bg-indigo-50 text-indigo-700' : ''}
                                ${order.status === 'ready_for_collection' ? 'bg-green-50 text-green-700' : ''}
                              `}
                            >
                              <option value="order_confirmed">Confirmed</option>
                              <option value="crafting">Crafting</option>
                              <option value="finished">Finished</option>
                              <option value="ready_for_collection">Ready for Collection</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ordersList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      No orders found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <h2 className="text-lg font-serif text-[var(--color-ink)]">Dynamic Pricing Configuration</h2>
              </div>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return;
                  setSavingPricing(true);
                  const success = await updatePricing(priceForm, user.token);
                  if (success) {
                      alert('Pricing updated successfully!');
                  } else {
                      alert('Failed to update pricing');
                  }
                  setSavingPricing(false);
                }}
              >
                <div className="mb-8">
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-widest text-[var(--color-ink)]">Metal Multipliers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Silver (Default: 1.0)</label>
                      <input type="number" step="0.01" value={priceForm.metalMultiplier_silver || 1} onChange={(e) => setPriceForm({...priceForm, metalMultiplier_silver: Number(e.target.value)})} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Gold (Default: 18.0)</label>
                      <input type="number" step="0.01" value={priceForm.metalMultiplier_gold || 18} onChange={(e) => setPriceForm({...priceForm, metalMultiplier_gold: Number(e.target.value)})} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rose Gold (Default: 14.0)</label>
                      <input type="number" step="0.01" value={priceForm.metalMultiplier_rose || 14} onChange={(e) => setPriceForm({...priceForm, metalMultiplier_rose: Number(e.target.value)})} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-widest text-[var(--color-ink)]">Center Stone Prices (LKR)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Aquamarine</label>
                      <input type="number" value={priceForm.stonePrice_aquamarine || 45000} onChange={(e) => setPriceForm({...priceForm, stonePrice_aquamarine: Number(e.target.value)})} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Diamond</label>
                      <input type="number" value={priceForm.stonePrice_diamond || 380000} onChange={(e) => setPriceForm({...priceForm, stonePrice_diamond: Number(e.target.value)})} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ruby</label>
                      <input type="number" value={priceForm.stonePrice_ruby || 95000} onChange={(e) => setPriceForm({...priceForm, stonePrice_ruby: Number(e.target.value)})} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Emerald</label>
                      <input type="number" value={priceForm.stonePrice_emerald || 110000} onChange={(e) => setPriceForm({...priceForm, stonePrice_emerald: Number(e.target.value)})} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Sapphire</label>
                      <input type="number" value={priceForm.stonePrice_sapphire || 150000} onChange={(e) => setPriceForm({...priceForm, stonePrice_sapphire: Number(e.target.value)})} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-widest text-[var(--color-ink)]">Other Upgrades</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Engraving Price (LKR)</label>
                      <input type="number" value={priceForm.engravingPrice || 5000} onChange={(e) => setPriceForm({...priceForm, engravingPrice: Number(e.target.value)})} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={savingPricing}
                    className="px-6 py-3 bg-[var(--color-ink)] text-white text-xs uppercase tracking-widest rounded-sm hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {savingPricing ? 'Saving...' : 'Save Pricing'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </motion.div>
      </main>
    </div>
  );
}
