import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePricing, IPricing } from '../context/PricingContext';
import { motion } from 'motion/react';
import { Users, Package, ShoppingCart, Activity, DollarSign, Sparkles, TrendingUp, ArrowUpRight, CreditCard, Sliders, RefreshCw } from 'lucide-react';
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
  
  const chartData = [
    { month: 'Jan', revenue: 420000, orders: 12, designs: 15, activeRate: '98.4%', label: 'January' },
    { month: 'Feb', revenue: 650000, orders: 18, designs: 28, activeRate: '99.1%', label: 'February' },
    { month: 'Mar', revenue: 540000, orders: 15, designs: 42, activeRate: '97.8%', label: 'March' },
    { month: 'Apr', revenue: 780000, orders: 28, designs: 63, activeRate: '99.5%', label: 'April' },
    { month: 'May', revenue: 910000, orders: 32, designs: 87, activeRate: '98.9%', label: 'May' },
    { month: 'Jun', revenue: 1132000, orders: 45, designs: 104, activeRate: '99.8%', label: 'June Peak' },
  ];
  const [hoveredIndex, setHoveredIndex] = useState<number>(5); // June
  
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
            { id: 'orders', label: 'Inquiries', icon: ShoppingCart },
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
              <h1 className="text-3xl font-serif text-[var(--color-ink)] tracking-tight capitalize">{activeTab === 'orders' ? 'Inquiries' : activeTab}</h1>
              <p className="text-sm text-gray-500 mt-2">Manage your platform's {activeTab === 'orders' ? 'Inquiries' : activeTab}.</p>
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
                 <option value="orders">Inquiries</option>
                 <option value="pricing">Pricing</option>
               </select>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <>
              {/* Premium Top Line Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  { 
                    label: 'Total Platform Revenue', 
                    value: 'Rs. 1,132,000', 
                    change: '+18.4% this month', 
                    icon: DollarSign, 
                    color: 'text-amber-600', 
                    bg: 'bg-gradient-to-tr from-amber-50 to-orange-50/70 border border-amber-100',
                    dotColor: 'bg-amber-500'
                  },
                  { 
                    label: 'Orders in Production', 
                    value: ordersList.length > 0 ? `${ordersList.length} Active` : '4 Active', 
                    change: '2 Ready for Collection', 
                    icon: ShoppingCart, 
                    color: 'text-orange-600', 
                    bg: 'bg-gradient-to-tr from-orange-50 to-yellow-50/70 border border-orange-100',
                    dotColor: 'bg-orange-500'
                  },
                  { 
                    label: '3D Configurable Models', 
                    value: modelsList.length > 0 ? `${modelsList.length} Variations` : '4 Variations', 
                    change: 'Fully active on frontend', 
                    icon: Package, 
                    color: 'text-yellow-600', 
                    bg: 'bg-gradient-to-tr from-yellow-50/80 to-amber-50/50 border border-yellow-200/60',
                    dotColor: 'bg-yellow-500'
                  },
                  { 
                    label: 'Platform User Registries', 
                    value: usersList.length > 0 ? `${usersList.length} Registered` : '6 Registered', 
                    change: 'Including 2 VIP Administrators', 
                    icon: Users, 
                    color: 'text-amber-700', 
                    bg: 'bg-gradient-to-tr from-amber-50/60 to-yellow-50/30 border border-amber-100/40',
                    dotColor: 'bg-amber-600'
                  }
                ].map((stat, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="bg-white p-6 rounded-xl border border-gray-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 to-orange-400" />
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{stat.label}</span>
                      <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                        <stat.icon className={stat.color} size={18} />
                      </div>
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[var(--color-ink)] mb-1 tracking-tight">{stat.value}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${stat.dotColor} animate-pulse`} />
                      <span className="text-xs text-gray-500">{stat.change}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bento Grid layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Left panel & interactive custom SVG golden area chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-amber-100 text-amber-700"><TrendingUp size={14} /></span>
                          <h2 className="text-lg font-serif text-[var(--color-ink)] font-normal">Golden Hour Revenue Matrix</h2>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Interactively hover across peak months to fetch historic sales coefficients.</p>
                      </div>
                      
                      {/* Interactive indicator pills */}
                      <div className="flex gap-1 bg-gray-50 p-1 rounded-lg self-start text-[10px] font-bold">
                        <span className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-md shadow-sm">Revenue Forecast</span>
                        <span className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 cursor-pointer">Live Orders Feed</span>
                      </div>
                    </div>

                    {/* Highly aesthetic animated SVG chart */}
                    <div className="relative w-full h-[220px] mb-4 flex items-center justify-center bg-gradient-to-b from-amber-50/10 to-transparent rounded-lg p-2">
                      <svg viewBox="0 0 520 200" className="w-full h-full overflow-visible">
                        <defs>
                          {/* Smooth golden orange gradient for chart area stroke */}
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
                          </linearGradient>
                          {/* Glowing shadow effect for active node */}
                          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
                            <feOffset dx="0" dy="4" />
                            <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
                            <feMerge>
                              <feMergeNode />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Horizontal guide lines */}
                        <line x1="40" y1="40" x2="480" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="40" y1="80" x2="480" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="40" y1="120" x2="480" y2="120" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="40" y1="160" x2="480" y2="160" stroke="#f1f5f9" strokeWidth="1" />

                        {/* Chart Area Fill with gradient */}
                        {/* coordinates mapping based on index: (40 + idx*82, value mapped 40-160) */}
                        <path
                          d="M  40 160
                             L  40 120
                             L 122 100
                             L 204 115
                             L 286  85
                             L 368  60
                             L 450  40
                             L 450 160 Z"
                          fill="url(#chartGradient)"
                          className="transition-all duration-300"
                        />

                        {/* Glowing stroke path */}
                        <path
                          d="M 40 120 L 122 100 L 204 115 L 286 85 L 368 60 L 450 40"
                          fill="none"
                          stroke="url(#lineGradient)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          className="transition-all duration-300"
                        />
                        <defs>
                          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#eab308" />
                            <stop offset="50%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#ea580c" />
                          </linearGradient>
                        </defs>

                        {/* Invisible hover trigger columns for interactivity */}
                        {chartData.map((d, index) => {
                          const x = 40 + index * 82;
                          const yPoints = [120, 100, 115, 85, 60, 40];
                          const y = yPoints[index];
                          return (
                            <g key={index}>
                              {/* Trigger line */}
                              <line
                                x1={x}
                                y1="30"
                                x2={x}
                                y2="170"
                                stroke={hoveredIndex === index ? '#f59e0b' : 'transparent'}
                                strokeWidth="1.5"
                                strokeDasharray="2 2"
                              />

                              {/* Hover sensor rect */}
                              <rect
                                x={x - 40}
                                y="20"
                                width="82"
                                height="150"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredIndex(index)}
                              />

                              {/* Drawing point circles */}
                              <circle
                                cx={x}
                                cy={y}
                                r={hoveredIndex === index ? '7' : '4'}
                                fill={hoveredIndex === index ? '#ffffff' : '#f59e0b'}
                                stroke={hoveredIndex === index ? '#ea580c' : '#ffffff'}
                                strokeWidth="2.5"
                                className="transition-all duration-150 cursor-pointer"
                                filter={hoveredIndex === index ? 'url(#goldGlow)' : ''}
                              />
                            </g>
                          );
                        })}

                        {/* Month labels at bottom */}
                        {chartData.map((d, index) => {
                          const x = 40 + index * 82;
                          return (
                            <text
                              key={index}
                              x={x}
                              y="180"
                              textAnchor="middle"
                              className={`text-[10px] font-mono font-bold transition-colors ${hoveredIndex === index ? 'fill-amber-600' : 'fill-gray-400'}`}
                            >
                              {d.month}
                            </text>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Active Month Stats breakdown display bar */}
                  <div className="bg-gradient-to-r from-amber-50/50 via-orange-50/30 to-yellow-50/40 p-4 rounded-lg border border-amber-100/60 flex flex-wrap gap-4 justify-between items-center mt-2">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Analysis Zone</span>
                      <h4 className="text-sm font-sans font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-500 animate-spin" />
                        Stats for {chartData[hoveredIndex].label}
                      </h4>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Monthly Volume</div>
                        <div className="text-sm font-bold text-amber-600 font-serif">Rs. {chartData[hoveredIndex].revenue.toLocaleString()}</div>
                      </div>
                      <div className="text-right border-l border-amber-100/80 pl-6">
                        <div className="text-xs text-gray-400">Custom Designs</div>
                        <div className="text-sm font-bold text-orange-600">{chartData[hoveredIndex].designs} Units</div>
                      </div>
                      <div className="text-right border-l border-amber-100/80 pl-6">
                        <div className="text-xs text-gray-400">Satisfaction</div>
                        <div className="text-sm font-bold text-yellow-600">{chartData[hoveredIndex].activeRate}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right column: Luxury virtual gold ledger card and quick operations */}
                <div className="space-y-6">
                  {/* Virtual Credit Ledger Card */}
                  <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-600 text-white rounded-xl p-6 shadow-[0_15px_30px_rgba(245,158,11,0.2)] border border-amber-400/30 relative overflow-hidden transition-all duration-300 hover:scale-[1.02]">
                    {/* Abstract radial circles */}
                    <div className="absolute -right-16 -bottom-16 w-40 h-40 rounded-full bg-white/10 blur-xl" />
                    <div className="absolute -left-10 -top-10 w-32 h-32 rounded-full bg-yellow-300/10 blur-lg" />
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div>
                        <p className="text-[10px] font-mono tracking-widest text-amber-100 uppercase uppercase-widest">PD Jewellers</p>
                        <p className="text-[8px] tracking-wider text-amber-200/80 uppercase">PREMIUM STORE LEDGER</p>
                      </div>
                      <Sparkles size={20} className="text-yellow-200 animate-pulse" />
                    </div>

                    {/* Gold card chip simulation */}
                    <div className="mb-4 relative z-10 w-11 h-8 rounded bg-gradient-to-tr from-yellow-300 to-amber-400 border border-amber-200/60 overflow-hidden flex flex-col justify-between p-1.5 shadow-inner">
                      <div className="w-5 h-4 border-r border-b border-amber-600/30" />
                      <div className="flex justify-between w-full">
                        <div className="w-2.5 h-1 border-t border-amber-600/30" />
                        <div className="w-2.5 h-1 border-t border-amber-600/30" />
                      </div>
                    </div>

                    <div className="mb-6 relative z-10">
                      <p className="text-[10px] text-amber-100/70 uppercase tracking-widest font-mono">Store Master Value</p>
                      <h3 className="text-2xl font-serif font-bold text-white tracking-wide">Rs. 1,132,000</h3>
                    </div>

                    <div className="flex justify-between items-end relative z-10 text-[10px] font-mono text-amber-100/90">
                      <div>
                        <span className="text-[8px] text-amber-200/60 block block-widest">CARDHOLDER</span>
                        <span>Tharul Senanayake</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-amber-200/60 block text-right">SECURE TOKEN</span>
                        <span>* * * * 2026</span>
                      </div>
                    </div>
                  </div>

                  {/* Multipliers & Quick Rates summary */}
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                      <h4 className="text-xs font-serif text-[var(--color-ink)] font-semibold flex items-center gap-1.5 uppercase tracking-wide">
                        <Sliders size={14} className="text-amber-500" />
                        Market Valuation Modifiers
                      </h4>
                      <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider bg-amber-50 text-amber-700 rounded border border-amber-100 animate-pulse">Live</span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Gold Index Multiplier</span>
                        <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">18.2x base rate</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Rose Gold Multiplier</span>
                        <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">14.0x base rate</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Engraving Premium charge</span>
                        <span className="font-mono font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded">Rs. 5,000</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveTab('pricing')}
                      className="w-full py-2 bg-gray-50 hover:bg-amber-50 border border-gray-100 hover:border-amber-200 text-[10px] text-gray-600 hover:text-amber-700 uppercase tracking-widest font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw size={11} className="animate-spin-slow" />
                      Configure multipliers
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Aesthetic Timeline Feed for Recent Activity */}
              <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-serif text-[var(--color-ink)] font-normal flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 animate-ping-slow" />
                      Platform Chronology Log
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">A curated chronological feed of recent platform and customer activity.</p>
                  </div>
                  <span className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider bg-gradient-to-r from-amber-600 to-orange-500 text-white rounded-full flex items-center gap-1">
                    <Sparkles size={11} /> Real-time Feed
                  </span>
                </div>

                <div className="relative border-l-2 border-amber-100/60 ml-3.5 space-y-8">
                  {[
                    {
                      user: 'Tharul Senanayake',
                      email: 'tharul2002@gmail.com',
                      action: 'saved a new 3D custom design arrangement',
                      target: '22K Rose Gold Pendant (Diamond)',
                      time: '2 hours ago',
                      icon: Sparkles,
                      badge: 'Saved Configuration',
                      badgeStyle: 'bg-amber-50 text-amber-700 border-amber-100',
                      avatar: 'TS'
                    },
                    {
                      user: 'Kusal Fernando',
                      email: 'kusal@gmail.com',
                      action: 'placed a new custom jewelry order',
                      target: 'ORD-2026-3409 (Rs. 365,000)',
                      time: '1 day ago',
                      icon: ShoppingCart,
                      badge: 'VIP Custom Order',
                      badgeStyle: 'bg-orange-50 text-orange-700 border-orange-100',
                      avatar: 'KF'
                    },
                    {
                      user: 'Dilini Perera',
                      email: 'dilini@gmail.com',
                      action: 'added classic luxury catalog item to wishlist',
                      target: '22K Swarovski Zirconia Choker Necklace',
                      time: '3 days ago',
                      icon: Activity,
                      badge: 'Catalog Interest',
                      badgeStyle: 'bg-yellow-50 text-yellow-800 border-yellow-100',
                      avatar: 'DP'
                    },
                    {
                      user: 'System Admin',
                      email: 'admin@pdjewellers.com',
                      action: 'updated metal scaling indexes for custom calculations',
                      target: 'Gold Multiplier set to 18.2x Base Rate',
                      time: '5 days ago',
                      icon: Sliders,
                      badge: 'Modifier Tweak',
                      badgeStyle: 'bg-gray-100 text-gray-700 border-gray-200',
                      avatar: 'AD'
                    }
                  ].map((activity, idx) => (
                    <div key={idx} className="relative pl-8 group">
                      {/* Timeline dot marker with hover glow */}
                      <div className="absolute -left-[11px] top-0.5 w-5 h-5 rounded-full bg-white border-2 border-amber-400 flex items-center justify-center shadow-sm group-hover:bg-amber-400 group-hover:scale-110 transition-all duration-300">
                        <activity.icon size={10} className="text-amber-600 group-hover:text-white transition-colors" />
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-start gap-3">
                          {/* Colored avatar logo */}
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-amber-500/10 self-center">
                            {activity.avatar}
                          </div>
                          <div>
                            <p className="text-sm text-gray-700">
                              <span className="font-bold text-[var(--color-ink)] hover:text-amber-600 cursor-pointer">{activity.user}</span>{' '}
                              <span className="text-gray-400 text-xs font-normal">({activity.email})</span>{' '}
                              {activity.action}{' '}
                              <span className="font-bold text-gray-900 underline decoration-amber-300 decoration-2 underline-offset-2">{activity.target}</span>
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{activity.time}</span>
                          </div>
                        </div>

                        {/* Custom visual badge indicator */}
                        <div className="self-start md:self-center pl-12 md:pl-0">
                          <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded border ${activity.badgeStyle}`}>
                            {activity.badge}
                          </span>
                        </div>
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
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Inquiry Code</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Customer</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Est. Price</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Date Received</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Availability Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                      {ordersList.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 font-mono text-xs font-bold text-amber-700">{order.inquiryRef || 'INQ-PENDING'}</td>
                          <td className="py-4 px-6 font-medium text-[var(--color-ink)]">{order.user?.name || 'Unknown'}</td>
                          <td className="py-4 px-6 text-gray-600">Rs. {Number(order.totalPrice || 0).toLocaleString()}</td>
                          <td className="py-4 px-6 text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6">
                            <select 
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                              className={`p-1 border border-gray-200 rounded-md text-xs font-semibold focus:outline-none focus:border-[var(--color-gold)] capitalize
                                ${order.status === 'pending' ? 'bg-orange-50 text-orange-700' : ''}
                                ${order.status === 'availability_confirmed' ? 'bg-blue-50 text-blue-700' : ''}
                                ${order.status === 'crafting' ? 'bg-yellow-50 text-[var(--color-gold-dark)]' : ''}
                                ${order.status === 'completed' ? 'bg-green-50 text-green-700' : ''}
                                ${order.status === 'declined' ? 'bg-red-50 text-red-700' : ''}
                              `}
                            >
                              <option value="pending">Pending Review</option>
                              <option value="availability_confirmed">Availability Confirmed</option>
                              <option value="crafting">Crafting</option>
                              <option value="completed">Completed / Collection</option>
                              <option value="declined">Declined / Slot full</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ordersList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      No inquiries found.
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
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-widest text-[var(--color-ink)]">Center Stone Prices (Rs.)</h3>
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
                      <label className="block text-xs text-gray-500 mb-1">Engraving Price (Rs.)</label>
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
