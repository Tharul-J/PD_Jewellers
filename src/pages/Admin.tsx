import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePricing, IPricing } from '../context/PricingContext';
import { motion } from 'motion/react';
import { Users, Package, ShoppingCart, Activity, DollarSign, LayoutList, Pencil, Trash2, BookOpen, LogOut, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

const DEFAULT_PRODUCT_CATEGORIES = ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Bridal', 'Mens'];

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pricing, updatePricing } = usePricing();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'products' | 'catalog' | 'categories' | 'orders' | 'pricing' | 'blog'>('dashboard');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', category: 'ring', basePrice: 1000 });
  const [file, setFile] = useState<File | null>(null);

  // Blog CRUD state
  const [blogList, setBlogList] = useState<any[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [deleteBlogId, setDeleteBlogId] = useState<string | null>(null);
  const [blogForm, setBlogForm] = useState({ title: '', category: 'General', excerpt: '', coverImage: '', imagesRaw: '', content: '', author: 'PD Jewellers' });
  const [savingBlog, setSavingBlog] = useState(false);

  // Catalog CRUD state
  const [productsList, setProductsList] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({ name: '', category: 'Rings', description: '', price: '', image: '' });
  const [productFile, setProductFile] = useState<File | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<string>('all');

  // Categories state
  const [availableCategories, setAvailableCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('pd_product_categories');
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const merged = [...DEFAULT_PRODUCT_CATEGORIES];
        parsed.forEach(c => { if (!merged.includes(c)) merged.push(c); });
        return merged;
      }
    } catch {}
    return DEFAULT_PRODUCT_CATEGORIES;
  });
  const [newCategoryName, setNewCategoryName] = useState('');

  // 3D Model edit/delete state
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [showModelEditForm, setShowModelEditForm] = useState(false);
  const [modelForm, setModelForm] = useState({ name: '', category: 'ring', basePrice: 1000, glbUrl: '' });
  const [savingModel, setSavingModel] = useState(false);

  // Inquiry expand state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [priceForm, setPriceForm] = useState<Partial<IPricing>>({});

  useEffect(() => {
    if (pricing) setPriceForm(pricing);
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
          const [usersRes, ordersRes, modelsRes, productsRes] = await Promise.all([
            fetch('/api/users', { headers: { Authorization: `Bearer ${user.token}` } }),
            fetch('/api/orders', { headers: { Authorization: `Bearer ${user.token}` } }),
            fetch('/api/models'),
            fetch('/api/products', { headers: { Authorization: `Bearer ${user.token}` } }),
          ]);
          if (usersRes.ok) setUsersList(await usersRes.json());
          if (ordersRes.ok) setOrdersList(await ordersRes.json());
          if (modelsRes.ok) setModelsList(await modelsRes.json());
          if (productsRes.ok) setProductsList(await productsRes.json());
        } catch (error) {
          console.error('Error fetching admin data', error);
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setOrdersList(ordersList.map(o => o._id === orderId ? { ...o, status } : o));
      }
    } catch (error) {
      console.error('Error updating order', error);
    }
  };

  const handleUploadModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Please select a file');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (uploadRes.ok) {
        const modelRes = await fetch('/api/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
          body: JSON.stringify({ ...newModel, glbUrl: uploadData.url }),
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
      console.error('Error uploading model', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteModel = async (id: string) => {
    try {
      const res = await fetch(`/api/models/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setModelsList(prev => prev.filter(m => m._id !== id));
        setDeleteModelId(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    }
  };

  const handleEditModel = (model: any) => {
    setEditingModel(model);
    setModelForm({ name: model.name, category: model.category, basePrice: model.basePrice, glbUrl: model.glbUrl || '' });
    setShowModelEditForm(true);
    setDeleteModelId(null);
  };

  const handleCancelModelForm = () => {
    setEditingModel(null);
    setModelForm({ name: '', category: 'ring', basePrice: 1000, glbUrl: '' });
    setShowModelEditForm(false);
  };

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel || !user) return;
    setSavingModel(true);
    try {
      const res = await fetch(`/api/models/${editingModel._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(modelForm),
      });
      if (!res.ok) {
        let message = `Server error (${res.status})`;
        try { const err = await res.json(); message = err.message || message; } catch {}
        throw new Error(message);
      }
      const updated = await res.json();
      setModelsList(prev => prev.map(m => m._id === editingModel._id ? updated : m));
      handleCancelModelForm();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingModel(false);
    }
  };

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch('/api/products', { headers: { Authorization: `Bearer ${user?.token}` } });
      if (res.ok) setProductsList(await res.json());
    } catch {
      console.error('Failed to fetch catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalog' && user?.role === 'administrator') fetchCatalog();
    if (activeTab === 'blog' && user?.role === 'administrator') fetchBlog();
  }, [activeTab]);

  const fetchBlog = async () => {
    setBlogLoading(true);
    try {
      const res = await fetch('/api/blog', { headers: { Authorization: `Bearer ${user?.token}` } });
      if (res.ok) setBlogList(await res.json());
    } catch {
      console.error('Failed to fetch blog posts');
    } finally {
      setBlogLoading(false);
    }
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingBlog(true);
    try {
      const images = blogForm.imagesRaw.split('\n').map(u => u.trim()).filter(Boolean);
      const body = { ...blogForm, images, coverImage: blogForm.coverImage || images[0] || '' };
      const url = editingBlog ? `/api/blog/${editingBlog._id}` : '/api/blog';
      const method = editingBlog ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Server error (${res.status})`);
      }
      await fetchBlog();
      setShowBlogForm(false);
      setEditingBlog(null);
      setBlogForm({ title: '', category: 'General', excerpt: '', coverImage: '', imagesRaw: '', content: '', author: 'PD Jewellers' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingBlog(false);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    try {
      const res = await fetch(`/api/blog/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setBlogList(prev => prev.filter(p => p._id !== id));
        setDeleteBlogId(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    }
  };

  const handleEditBlog = (post: any) => {
    setEditingBlog(post);
    setBlogForm({
      title: post.title,
      category: post.category || 'General',
      excerpt: post.excerpt || '',
      coverImage: post.coverImage || '',
      imagesRaw: (post.images || []).join('\n'),
      content: post.content || '',
      author: post.author || 'PD Jewellers',
    });
    setShowBlogForm(true);
    setDeleteBlogId(null);
  };

  const handleCancelBlogForm = () => {
    setEditingBlog(null);
    setBlogForm({ title: '', category: 'General', excerpt: '', coverImage: '', imagesRaw: '', content: '', author: 'PD Jewellers' });
    setShowBlogForm(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProduct(true);
    try {
      let imageUrl = productForm.image;
      if (productFile) {
        const fd = new FormData();
        fd.append('file', productFile);
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!upRes.ok) throw new Error('Image upload failed');
        const upData = await upRes.json();
        imageUrl = upData.url;
      }
      const body = { ...productForm, price: Number(productForm.price), image: imageUrl };
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let message = `Server error (${res.status})`;
        try { const err = await res.json(); message = err.message || message; } catch {}
        throw new Error(message);
      }
      await fetchCatalog();
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ name: '', category: 'Rings', description: '', price: '', image: '' });
      setProductFile(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setProductsList(prev => prev.filter(p => p._id !== id));
        setDeleteConfirmId(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch {
      alert('Delete failed');
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category,
      description: product.description || '',
      price: String(product.price),
      image: product.image || '',
    });
    setProductFile(null);
    setShowProductForm(true);
    setDeleteConfirmId(null);
  };

  const handleCancelProductForm = () => {
    setEditingProduct(null);
    setProductForm({ name: '', category: 'Rings', description: '', price: '', image: '' });
    setProductFile(null);
    setShowProductForm(false);
  };

  // Category management
  const saveCategories = (cats: string[]) => {
    setAvailableCategories(cats);
    localStorage.setItem('pd_product_categories', JSON.stringify(cats));
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    if (availableCategories.map(c => c.toLowerCase()).includes(capitalized.toLowerCase())) return;
    saveCategories([...availableCategories, capitalized]);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (cat: string) => {
    if (DEFAULT_PRODUCT_CATEGORIES.includes(cat)) return;
    saveCategories(availableCategories.filter(c => c !== cat));
  };

  // Dashboard computed values
  const customerCount = usersList.filter(u => u.role !== 'administrator').length;

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending Review',
    availability_confirmed: 'Confirmed',
    crafting: 'Crafting',
    completed: 'Completed',
    declined: 'Declined',
  };

  const statusBreakdown = Object.entries(STATUS_LABELS).map(([key, label]) => ({
    key,
    label,
    count: ordersList.filter(o => o.status === key).length,
  }));

  const categoryCounts = availableCategories
    .map(cat => ({ name: cat, count: productsList.filter(p => p.category === cat).length }))
    .filter(c => c.count > 0);

  const recentInquiries = [...ordersList]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentModels = [...modelsList]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 6);

  // Catalog filtered list
  const filteredProducts = catalogFilter === 'all'
    ? productsList
    : productsList.filter(p => p.category === catalogFilter);

  if (!user || user.role !== 'administrator') return null;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 fixed h-full left-0 pt-8 px-4 hidden md:block">
        <h2 className="text-xl font-serif text-[var(--color-ink)] mb-8 px-4">Admin Panel</h2>
        <nav className="space-y-2 mb-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'catalog', label: 'Catalog', icon: LayoutList },
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'products', label: '3D Models', icon: Package },
            { id: 'orders', label: 'Inquiries', icon: ShoppingCart },
            { id: 'pricing', label: 'Pricing', icon: DollarSign },
            { id: 'blog', label: 'Blog', icon: BookOpen },
          ].map(item => (
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
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
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
              <h1 className="text-3xl font-serif text-[var(--color-ink)] tracking-tight capitalize">
                {activeTab === 'orders' ? 'Inquiries'
                  : activeTab === 'products' ? '3D Models'
                  : activeTab === 'catalog' ? 'Catalog Products'
                  : activeTab === 'blog' ? 'Blog Posts'
                  : activeTab === 'categories' ? 'Product Categories'
                  : activeTab}
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                Manage your platform's {activeTab === 'orders' ? 'inquiries'
                  : activeTab === 'products' ? '3D models'
                  : activeTab === 'catalog' ? 'product catalog'
                  : activeTab === 'blog' ? 'blog posts and articles'
                  : activeTab === 'categories' ? 'product categories'
                  : activeTab}.
              </p>
            </div>
            <div className="md:hidden">
              <select
                value={activeTab}
                onChange={e => setActiveTab(e.target.value as any)}
                className="p-2 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:border-[var(--color-gold)]"
              >
                <option value="dashboard">Dashboard</option>
                <option value="users">Users</option>
                <option value="catalog">Catalog</option>
                <option value="categories">Categories</option>
                <option value="products">3D Models</option>
                <option value="orders">Inquiries</option>
                <option value="pricing">Pricing</option>
                <option value="blog">Blog</option>
              </select>
            </div>
          </div>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Total Products', value: productsList.length, icon: LayoutList, iconColor: 'text-amber-600', bg: 'bg-amber-50 border border-amber-100' },
                  { label: 'Registered Customers', value: customerCount, icon: Users, iconColor: 'text-blue-600', bg: 'bg-blue-50 border border-blue-100' },
                  { label: 'Total Inquiries', value: ordersList.length, icon: ShoppingCart, iconColor: 'text-orange-600', bg: 'bg-orange-50 border border-orange-100' },
                  { label: '3D Models', value: modelsList.length, icon: Package, iconColor: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{stat.label}</span>
                      <div className={`p-2 rounded-lg ${stat.bg}`}>
                        <stat.icon className={stat.iconColor} size={18} />
                      </div>
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-[var(--color-ink)]">
                      {loading ? '—' : stat.value}
                    </h3>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Inquiry Status Breakdown */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                  <h2 className="text-base font-serif text-[var(--color-ink)] mb-5">Inquiries by Status</h2>
                  {loading ? (
                    <div className="py-8 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                  ) : ordersList.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No inquiries yet</p>
                  ) : (
                    <div className="space-y-4">
                      {statusBreakdown.map(({ key, label, count }) => {
                        const pct = ordersList.length > 0 ? Math.round((count / ordersList.length) * 100) : 0;
                        const barColor: Record<string, string> = {
                          pending: 'bg-orange-400',
                          availability_confirmed: 'bg-blue-400',
                          crafting: 'bg-amber-400',
                          completed: 'bg-green-500',
                          declined: 'bg-red-400',
                        };
                        return (
                          <div key={key}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-gray-600 font-medium">{label}</span>
                              <span className="text-gray-400 font-mono">{count}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor[key]}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Products by Category */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                  <h2 className="text-base font-serif text-[var(--color-ink)] mb-5">Products by Category</h2>
                  {loading ? (
                    <div className="py-8 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                  ) : categoryCounts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No products yet</p>
                  ) : (
                    <div className="space-y-4">
                      {categoryCounts.map(({ name, count }) => {
                        const maxCount = Math.max(...categoryCounts.map(c => c.count), 1);
                        const pct = Math.round((count / maxCount) * 100);
                        return (
                          <div key={name}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-gray-600 font-medium">{name}</span>
                              <span className="text-gray-400 font-mono">{count}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full">
                              <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Recent Inquiries */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-serif text-[var(--color-ink)]">Recent Inquiries</h2>
                    <button onClick={() => setActiveTab('orders')} className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors">View all →</button>
                  </div>
                  {loading ? (
                    <div className="py-12 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                  ) : recentInquiries.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">No inquiries yet</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {recentInquiries.map(order => (
                        <div key={order._id} className="px-6 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-mono font-bold text-amber-700">{order.inquiryRef || '—'}</p>
                            <p className="text-sm font-medium text-[var(--color-ink)]">{order.user?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ${
                            order.status === 'pending' ? 'bg-orange-100 text-orange-700'
                              : order.status === 'availability_confirmed' ? 'bg-blue-100 text-blue-700'
                              : order.status === 'crafting' ? 'bg-amber-100 text-amber-700'
                              : order.status === 'completed' ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3D Models list */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-serif text-[var(--color-ink)]">3D Models</h2>
                    <button onClick={() => setActiveTab('products')} className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors">Manage →</button>
                  </div>
                  {loading ? (
                    <div className="py-12 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                  ) : recentModels.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">No models uploaded yet</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {recentModels.map(model => (
                        <div key={model._id} className="px-6 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-purple-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--color-ink)]">{model.name}</p>
                              <p className="text-xs text-gray-400 capitalize">{model.category}</p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-gray-700">Rs. {Number(model.basePrice).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── USERS ── */}
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
                      {usersList.map(usr => (
                        <tr key={usr._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 font-mono text-xs text-gray-400">{usr._id.substring(0, 8)}...</td>
                          <td className="py-4 px-6 font-medium text-[var(--color-ink)]">{usr.name}</td>
                          <td className="py-4 px-6 text-gray-600">{usr.email}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 text-[10px] uppercase tracking-wide rounded-full font-semibold ${
                              usr.role === 'administrator' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {usr.role}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-500">{new Date(usr.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {usersList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">No users found.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 3D MODELS ── */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Edit Form */}
              {showModelEditForm && editingModel && (
                <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
                  <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-serif text-[var(--color-ink)]">Edit 3D Model</h2>
                    <button onClick={handleCancelModelForm} className="text-xs text-gray-400 hover:text-gray-700 uppercase tracking-wider font-semibold">Cancel</button>
                  </div>
                  <form onSubmit={handleUpdateModel}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Model Name</label>
                        <input
                          type="text" required
                          value={modelForm.name}
                          onChange={e => setModelForm({ ...modelForm, name: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Category</label>
                        <select
                          value={modelForm.category}
                          onChange={e => setModelForm({ ...modelForm, category: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm bg-white rounded focus:outline-none focus:border-amber-400"
                        >
                          <option value="ring">Ring</option>
                          <option value="pendant">Pendant</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Base Price (Rs.)</label>
                        <input
                          type="number" required min="0"
                          value={modelForm.basePrice}
                          onChange={e => setModelForm({ ...modelForm, basePrice: Number(e.target.value) })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">GLB File URL (optional override)</label>
                        <input
                          type="url"
                          value={modelForm.glbUrl}
                          onChange={e => setModelForm({ ...modelForm, glbUrl: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="Leave blank to keep existing file"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
                      <button type="button" onClick={handleCancelModelForm} className="px-5 py-2.5 border border-gray-200 text-xs uppercase tracking-wider font-semibold text-gray-600 rounded hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                      <button
                        type="submit" disabled={savingModel}
                        className="px-6 py-2.5 bg-[var(--color-ink)] text-white text-xs uppercase tracking-widest font-bold rounded hover:bg-black transition-colors disabled:opacity-50"
                      >
                        {savingModel ? 'Saving…' : 'Update Model'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Upload Form */}
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
                        type="text" required
                        value={newModel.name}
                        onChange={e => setNewModel({ ...newModel, name: e.target.value })}
                        className="w-full p-2 border border-gray-200 text-sm"
                        placeholder="e.g. Classic Wedding Band"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Category</label>
                      <select
                        value={newModel.category}
                        onChange={e => setNewModel({ ...newModel, category: e.target.value })}
                        className="w-full p-2 border border-gray-200 text-sm bg-white"
                      >
                        <option value="ring">Ring</option>
                        <option value="pendant">Pendant</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Base Price (Rs.)</label>
                      <input
                        type="number" required min="0"
                        value={newModel.basePrice}
                        onChange={e => setNewModel({ ...newModel, basePrice: Number(e.target.value) })}
                        className="w-full p-2 border border-gray-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">GLB / GLTF File</label>
                      <input
                        type="file" accept=".glb,.gltf"
                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-ink)] file:text-white hover:file:bg-black cursor-pointer"
                      />
                    </div>
                  </div>
                  <button
                    type="submit" disabled={uploading}
                    className="px-6 py-2 bg-[var(--color-ink)] text-white text-[10px] uppercase tracking-widest rounded-sm hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Model'}
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Model Name</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Category</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Base Price</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">GLB Link</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                      {modelsList.map(model => (
                        <tr key={model._id} className={`transition-colors ${deleteModelId === model._id ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                          <td className="py-4 px-4 font-medium text-[var(--color-ink)]">{model.name}</td>
                          <td className="py-4 px-4 text-gray-600 capitalize">{model.category}</td>
                          <td className="py-4 px-4 text-gray-600">Rs. {Number(model.basePrice).toLocaleString()}</td>
                          <td className="py-4 px-4 text-blue-500">
                            <a href={model.glbUrl} target="_blank" rel="noreferrer" className="hover:underline">View File</a>
                          </td>
                          <td className="py-4 px-4 text-right">
                            {deleteModelId === model._id ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-xs text-red-600 font-medium mr-1">Delete?</span>
                                <button onClick={() => handleDeleteModel(model._id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                <button onClick={() => setDeleteModelId(null)} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditModel(model)}
                                  className="p-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 hover:text-[var(--color-ink)] transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => { setDeleteModelId(model._id); setShowModelEditForm(false); setEditingModel(null); }}
                                  className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {modelsList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">No models found.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── CATALOG ── */}
          {activeTab === 'catalog' && (
            <div className="space-y-6">
              {showProductForm && (
                <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
                  <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-serif text-[var(--color-ink)]">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
                    <button onClick={handleCancelProductForm} className="text-xs text-gray-400 hover:text-gray-700 uppercase tracking-wider font-semibold">Cancel</button>
                  </div>
                  <form onSubmit={handleSaveProduct}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Product Name *</label>
                        <input
                          type="text" required
                          value={productForm.name}
                          onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="e.g. 22K Classic Gold Ring"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Category *</label>
                        <select
                          value={productForm.category}
                          onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm bg-white rounded focus:outline-none focus:border-amber-400"
                        >
                          {availableCategories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Price (Rs.) *</label>
                        <input
                          type="number" required min="0"
                          value={productForm.price}
                          onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="e.g. 155000"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Product Image</label>
                        <input
                          type="file" accept=".jpg,.jpeg,.png,.webp"
                          onChange={e => {
                            setProductFile(e.target.files ? e.target.files[0] : null);
                            if (e.target.files?.[0]) setProductForm(f => ({ ...f, image: '' }));
                          }}
                          className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-ink)] file:text-white cursor-pointer"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider">or paste URL</span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                        <input
                          type="url"
                          value={productForm.image}
                          onChange={e => {
                            setProductForm({ ...productForm, image: e.target.value });
                            if (e.target.value) setProductFile(null);
                          }}
                          className="w-full mt-2 p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="https://example.com/image.jpg"
                        />
                        {productForm.image && !productFile && (
                          <img src={productForm.image} alt="preview" className="mt-2 h-16 w-16 object-cover rounded border border-gray-100" onError={e => (e.currentTarget.style.display = 'none')} />
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Description</label>
                        <textarea
                          rows={3}
                          value={productForm.description}
                          onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400 resize-none"
                          placeholder="Brief product description..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
                      <button type="button" onClick={handleCancelProductForm} className="px-5 py-2.5 border border-gray-200 text-xs uppercase tracking-wider font-semibold text-gray-600 rounded hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                      <button
                        type="submit" disabled={savingProduct}
                        className="px-6 py-2.5 bg-[var(--color-ink)] text-white text-xs uppercase tracking-widest font-bold rounded hover:bg-black transition-colors disabled:opacity-50"
                      >
                        {savingProduct ? 'Saving…' : editingProduct ? 'Update Product' : 'Add Product'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-serif text-[var(--color-ink)]">
                    All Products <span className="text-sm text-gray-400 font-sans font-normal ml-1">({filteredProducts.length}{catalogFilter !== 'all' ? ` of ${productsList.length}` : ''})</span>
                  </h2>
                  <div className="flex items-center gap-3">
                    {/* Category filter */}
                    <select
                      value={catalogFilter}
                      onChange={e => setCatalogFilter(e.target.value)}
                      className="p-2 border border-gray-200 text-xs bg-white rounded focus:outline-none focus:border-amber-400 text-gray-600"
                    >
                      <option value="all">All Categories</option>
                      {availableCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {!showProductForm && (
                      <button
                        onClick={() => { handleCancelProductForm(); setShowProductForm(true); }}
                        className="px-4 py-2 bg-[var(--color-ink)] text-white text-[10px] uppercase tracking-widest font-bold rounded hover:bg-black transition-colors"
                      >
                        + Add Product
                      </button>
                    )}
                  </div>
                </div>
                {catalogLoading ? (
                  <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold border-b border-gray-100 w-16">Image</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Name</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Category</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">SKU</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Price</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {filteredProducts.map(product => (
                          <tr key={product._id} className={`transition-colors ${deleteConfirmId === product._id ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="py-3 px-4">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded border border-gray-100" />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded border border-gray-100 flex items-center justify-center text-[10px] text-gray-300">N/A</div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-[var(--color-ink)] max-w-[180px] truncate">{product.name}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{product.category}</td>
                            <td className="py-3 px-4 font-mono text-[10px] text-gray-400">{product.id}</td>
                            <td className="py-3 px-4 font-semibold text-gray-700">Rs. {Number(product.price).toLocaleString()}</td>
                            <td className="py-3 px-4 text-right">
                              {deleteConfirmId === product._id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-red-600 font-medium mr-1">Delete?</span>
                                  <button onClick={() => handleDeleteProduct(product._id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                  <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEditProduct(product)}
                                    className="p-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 hover:text-[var(--color-ink)] transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => { setDeleteConfirmId(product._id); setShowProductForm(false); setEditingProduct(null); }}
                                    className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredProducts.length === 0 && !catalogLoading && (
                      <div className="text-center py-12 text-gray-500 text-sm">
                        {catalogFilter !== 'all' ? `No products in "${catalogFilter}"` : 'No products found.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CATEGORIES ── */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-serif text-[var(--color-ink)] mb-1">Add New Category</h2>
                <p className="text-xs text-gray-400 mb-4">New categories appear in the Catalog product form immediately.</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                    placeholder="e.g. Anklets"
                    className="flex-1 p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    className="px-5 py-2.5 bg-[var(--color-ink)] text-white text-xs uppercase tracking-widest font-bold rounded hover:bg-black transition-colors disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-serif text-[var(--color-ink)]">
                    All Categories <span className="text-sm text-gray-400 font-sans font-normal ml-1">({availableCategories.length})</span>
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {availableCategories.map(cat => {
                    const isDefault = DEFAULT_PRODUCT_CATEGORIES.includes(cat);
                    const count = productsList.filter(p => p.category === cat).length;
                    return (
                      <div key={cat} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Tag size={14} className="text-gray-400" />
                          <span className="text-sm font-medium text-[var(--color-ink)]">{cat}</span>
                          {isDefault && (
                            <span className="text-[10px] uppercase tracking-wider text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Default</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-400">{count} product{count !== 1 ? 's' : ''}</span>
                          {!isDefault && (
                            <button
                              onClick={() => handleRemoveCategory(cat)}
                              className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Remove category"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── INQUIRIES ── */}
          {activeTab === 'orders' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
              {loading ? (
                <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-4 font-semibold border-b border-gray-100 w-8"></th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Inquiry Code</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Customer</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Est. Price</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Date Received</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {ordersList.map(order => {
                        const isExpanded = expandedOrderId === order._id;
                        const items: any[] = order.orderItems || [];
                        return (
                          <>
                            <tr
                              key={order._id}
                              className={`transition-colors cursor-pointer ${isExpanded ? 'bg-amber-50/40' : 'hover:bg-gray-50'} border-b border-gray-100`}
                              onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                            >
                              <td className="py-4 px-4 text-gray-400">
                                {isExpanded
                                  ? <ChevronDown size={14} className="text-amber-600" />
                                  : <ChevronRight size={14} />}
                              </td>
                              <td className="py-4 px-4 font-mono text-xs font-bold text-amber-700">{order.inquiryRef || 'INQ-PENDING'}</td>
                              <td className="py-4 px-4 font-medium text-[var(--color-ink)]">{order.user?.name || 'Unknown'}</td>
                              <td className="py-4 px-4 text-gray-600">Rs. {Number(order.totalPrice || 0).toLocaleString()}</td>
                              <td className="py-4 px-4 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                              <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                                <select
                                  value={order.status}
                                  onChange={e => handleUpdateOrderStatus(order._id, e.target.value)}
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
                            {isExpanded && (
                              <tr key={`${order._id}-items`} className="bg-amber-50/20 border-b border-gray-100">
                                <td colSpan={6} className="px-8 py-4">
                                  {items.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No item details available.</p>
                                  ) : (
                                    <div>
                                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">Requested Items</p>
                                      <div className="space-y-2">
                                        {items.map((item: any, idx: number) => (
                                          <div key={idx} className="flex items-start gap-3 bg-white rounded border border-gray-100 p-3">
                                            {item.image && (
                                              <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded border border-gray-100 flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-[var(--color-ink)] truncate">{item.name}</p>
                                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                {item.quantity && <span className="text-xs text-gray-500">Qty: <span className="font-medium">{item.quantity}</span></span>}
                                                {item.options?.material && <span className="text-xs text-gray-500">Metal: <span className="font-medium">{item.options.material}</span></span>}
                                                {item.options?.gemstone && <span className="text-xs text-gray-500">Stone: <span className="font-medium">{item.options.gemstone}</span></span>}
                                                {item.options?.size && <span className="text-xs text-gray-500">Size: <span className="font-medium">{item.options.size}</span></span>}
                                                {item.options?.engraving && <span className="text-xs text-gray-500">Engraving: <span className="font-medium">"{item.options.engraving}"</span></span>}
                                                {item.options?.font && <span className="text-xs text-gray-500">Font: <span className="font-medium">{item.options.font}</span></span>}
                                                {item.category && <span className="text-xs text-gray-400 ml-auto">{item.category}</span>}
                                              </div>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-700 flex-shrink-0">Rs. {Number(item.price || 0).toLocaleString()}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                  {ordersList.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">No inquiries found.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── PRICING ── */}
          {activeTab === 'pricing' && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <h2 className="text-lg font-serif text-[var(--color-ink)]">Dynamic Pricing Configuration</h2>
              </div>
              <form
                onSubmit={async e => {
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
                      <input type="number" step="0.01" value={priceForm.metalMultiplier_silver || 1} onChange={e => setPriceForm({ ...priceForm, metalMultiplier_silver: Number(e.target.value) })} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Gold (Default: 18.0)</label>
                      <input type="number" step="0.01" value={priceForm.metalMultiplier_gold || 18} onChange={e => setPriceForm({ ...priceForm, metalMultiplier_gold: Number(e.target.value) })} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rose Gold (Default: 14.0)</label>
                      <input type="number" step="0.01" value={priceForm.metalMultiplier_rose || 14} onChange={e => setPriceForm({ ...priceForm, metalMultiplier_rose: Number(e.target.value) })} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-widest text-[var(--color-ink)]">Center Stone Prices (Rs.)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Aquamarine</label>
                      <input type="number" value={priceForm.stonePrice_aquamarine || 45000} onChange={e => setPriceForm({ ...priceForm, stonePrice_aquamarine: Number(e.target.value) })} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Diamond</label>
                      <input type="number" value={priceForm.stonePrice_diamond || 380000} onChange={e => setPriceForm({ ...priceForm, stonePrice_diamond: Number(e.target.value) })} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ruby</label>
                      <input type="number" value={priceForm.stonePrice_ruby || 95000} onChange={e => setPriceForm({ ...priceForm, stonePrice_ruby: Number(e.target.value) })} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Emerald</label>
                      <input type="number" value={priceForm.stonePrice_emerald || 110000} onChange={e => setPriceForm({ ...priceForm, stonePrice_emerald: Number(e.target.value) })} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Sapphire</label>
                      <input type="number" value={priceForm.stonePrice_sapphire || 150000} onChange={e => setPriceForm({ ...priceForm, stonePrice_sapphire: Number(e.target.value) })} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-widest text-[var(--color-ink)]">Other Upgrades</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Engraving Price (Rs.)</label>
                      <input type="number" value={priceForm.engravingPrice || 5000} onChange={e => setPriceForm({ ...priceForm, engravingPrice: Number(e.target.value) })} className="w-full p-2 border border-gray-200 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit" disabled={savingPricing}
                    className="px-6 py-3 bg-[var(--color-ink)] text-white text-xs uppercase tracking-widest rounded-sm hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {savingPricing ? 'Saving...' : 'Save Pricing'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── BLOG ── */}
          {activeTab === 'blog' && (
            <div className="space-y-6">
              {showBlogForm && (
                <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
                  <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-serif text-[var(--color-ink)]">{editingBlog ? 'Edit Article' : 'New Article'}</h2>
                    <button onClick={handleCancelBlogForm} className="text-xs text-gray-400 hover:text-gray-700 uppercase tracking-wider font-semibold">Cancel</button>
                  </div>
                  <form onSubmit={handleSaveBlog}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Title *</label>
                        <input
                          type="text" required
                          value={blogForm.title}
                          onChange={e => setBlogForm({ ...blogForm, title: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="e.g. The Art of Gold Purity in Sri Lanka"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Category</label>
                        <select
                          value={blogForm.category}
                          onChange={e => setBlogForm({ ...blogForm, category: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm bg-white rounded focus:outline-none focus:border-amber-400"
                        >
                          {['General', 'Styling Tips', 'Engagement', 'Craftsmanship', 'Gold Guide', 'Gemstones', 'Bridal', 'Mens'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Author</label>
                        <input
                          type="text"
                          value={blogForm.author}
                          onChange={e => setBlogForm({ ...blogForm, author: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="PD Jewellers"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Excerpt</label>
                        <input
                          type="text"
                          value={blogForm.excerpt}
                          onChange={e => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400"
                          placeholder="One-line article summary shown on the blog card"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                          Images (one URL per line — first image becomes the cover)
                        </label>
                        <textarea
                          rows={3}
                          value={blogForm.imagesRaw}
                          onChange={e => setBlogForm({ ...blogForm, imagesRaw: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400 resize-none font-mono"
                          placeholder={'https://example.com/image1.jpg\nhttps://example.com/image2.jpg'}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Content</label>
                        <p className="text-[10px] text-gray-400 mb-1">Use <strong>## Heading</strong> for sections, <strong>• Item</strong> for bullet points. Blank lines separate paragraphs.</p>
                        <textarea
                          rows={12}
                          value={blogForm.content}
                          onChange={e => setBlogForm({ ...blogForm, content: e.target.value })}
                          className="w-full p-2.5 border border-gray-200 text-sm rounded focus:outline-none focus:border-amber-400 resize-y font-mono"
                          placeholder={'Intro paragraph...\n\n## Section Heading\n\nBody text...\n\n• Bullet point 1\n• Bullet point 2'}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
                      <button type="button" onClick={handleCancelBlogForm} className="px-5 py-2.5 border border-gray-200 text-xs uppercase tracking-wider font-semibold text-gray-600 rounded hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                      <button
                        type="submit" disabled={savingBlog}
                        className="px-6 py-2.5 bg-[var(--color-ink)] text-white text-xs uppercase tracking-widest font-bold rounded hover:bg-black transition-colors disabled:opacity-50"
                      >
                        {savingBlog ? 'Saving…' : editingBlog ? 'Update Article' : 'Publish Article'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-serif text-[var(--color-ink)]">
                    All Articles <span className="text-sm text-gray-400 font-sans font-normal ml-1">({blogList.length})</span>
                  </h2>
                  {!showBlogForm && (
                    <button
                      onClick={() => { handleCancelBlogForm(); setShowBlogForm(true); }}
                      className="px-4 py-2 bg-[var(--color-ink)] text-white text-[10px] uppercase tracking-widest font-bold rounded hover:bg-black transition-colors"
                    >
                      + New Article
                    </button>
                  )}
                </div>
                {blogLoading ? (
                  <div className="py-20 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold border-b border-gray-100 w-16">Cover</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Title</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Category</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100">Published</th>
                          <th className="py-3 px-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {blogList.map(post => (
                          <tr key={post._id} className={`transition-colors ${deleteBlogId === post._id ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="py-3 px-4">
                              {post.coverImage ? (
                                <img src={post.coverImage} alt={post.title} className="w-12 h-12 object-cover rounded border border-gray-100" />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded border border-gray-100 flex items-center justify-center text-[10px] text-gray-300">N/A</div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-[var(--color-ink)] max-w-[220px] truncate">{post.title}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{post.category}</td>
                            <td className="py-3 px-4 text-gray-400 text-xs">
                              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {deleteBlogId === post._id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-red-600 font-medium mr-1">Delete?</span>
                                  <button onClick={() => handleDeleteBlog(post._id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                  <button onClick={() => setDeleteBlogId(null)} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEditBlog(post)}
                                    className="p-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 hover:text-[var(--color-ink)] transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => { setDeleteBlogId(post._id); setShowBlogForm(false); setEditingBlog(null); }}
                                    className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {blogList.length === 0 && !blogLoading && (
                      <div className="text-center py-12 text-gray-500 text-sm">No blog posts found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </main>
    </div>
  );
}
