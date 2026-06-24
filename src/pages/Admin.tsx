import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePricing, IPricing } from '../context/PricingContext';
import { motion } from 'motion/react';
import { Users, Package, ShoppingCart, Activity, DollarSign, LayoutList, Pencil, Trash2, BookOpen, LogOut, Tag, ChevronDown, ChevronRight, Shield, UserX } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

const DEFAULT_PRODUCT_CATEGORIES = ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Bridal', 'Mens'];
// Extend this list to add new 3D model categories without other code changes
const MODEL_CATEGORIES = ['ring', 'pendant'];

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
  const [modelCategoryFilter, setModelCategoryFilter] = useState<'all' | 'ring' | 'pendant'>('all');

  // Pricing save feedback
  const [pricingSaveStatus, setPricingSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Inquiry expand + delete state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  // User CRUD state
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

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

  const handleDeleteOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setOrdersList(prev => prev.filter(o => o._id !== id));
        setDeleteOrderId(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch { alert('Delete failed'); }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setUsersList(prev => prev.filter(u => u._id !== id));
        setDeleteUserId(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch { alert('Delete failed'); }
  };

  const handleToggleUserRole = async (usr: any) => {
    const newRole = usr.role === 'administrator' ? 'customer' : 'administrator';
    setTogglingUserId(usr._id);
    try {
      const res = await fetch(`/api/users/${usr._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsersList(prev => prev.map(u => u._id === usr._id ? { ...u, role: newRole } : u));
      } else {
        const err = await res.json();
        alert(err.message || 'Update failed');
      }
    } catch { alert('Update failed'); }
    finally { setTogglingUserId(null); }
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 fixed top-[112px] md:top-[128px] left-0 h-[calc(100vh-112px)] md:h-[calc(100vh-128px)] hidden md:flex flex-col z-10">
        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">
          <h2 className="text-xl font-serif text-[var(--color-ink)] mb-6 px-4">Admin Panel</h2>
          <nav className="space-y-1 flex-1">
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
                    ? 'btn-richbrown text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-[var(--color-ink)]'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        {/* Pinned sign-out */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-4">
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
      <main className="flex-1 md:ml-64 max-w-7xl mx-auto px-4 md:px-8 w-full pt-8 pb-16">
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
              {/* Stat Cards — gold theme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {[
                  { label: 'Catalog Products', value: productsList.length, icon: LayoutList, sub: 'In collection', gradient: 'from-amber-500 via-yellow-400 to-amber-300', shadow: 'shadow-amber-200/60' },
                  { label: 'Customers', value: customerCount, icon: Users, sub: 'Registered', gradient: 'from-stone-800 via-stone-700 to-stone-800', shadow: 'shadow-stone-400/30' },
                  { label: 'Inquiries', value: ordersList.length, icon: ShoppingCart, sub: 'Total received', gradient: 'from-amber-700 via-amber-600 to-yellow-500', shadow: 'shadow-amber-300/50' },
                  { label: '3D Models', value: modelsList.length, icon: Package, sub: 'Uploaded', gradient: 'from-yellow-600 via-amber-500 to-yellow-400', shadow: 'shadow-yellow-300/50' },
                ].map((stat, i) => (
                  <div key={i} className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${stat.gradient} shadow-lg ${stat.shadow}`}>
                    {/* Decorative rings */}
                    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -right-2 w-20 h-20 rounded-full bg-white/5" />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-5">
                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                          <stat.icon size={20} className="text-white" />
                        </div>
                        <span className="text-white/60 text-[9px] font-bold uppercase tracking-widest text-right leading-tight">{stat.sub}</span>
                      </div>
                      <h3 className="text-4xl font-serif font-bold text-white mb-1">
                        {loading ? <span className="text-white/50">—</span> : stat.value}
                      </h3>
                      <p className="text-white/75 text-[10px] font-semibold uppercase tracking-widest">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Inquiry Status Breakdown */}
                <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-serif text-[var(--color-ink)]">Inquiries by Status</h2>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">{ordersList.length} total</span>
                  </div>
                  {loading ? (
                    <div className="py-8 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                  ) : ordersList.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No inquiries yet</p>
                  ) : (
                    <div className="space-y-3.5">
                      {statusBreakdown.map(({ key, label, count }) => {
                        const pct = ordersList.length > 0 ? Math.round((count / ordersList.length) * 100) : 0;
                        const style: Record<string, { bar: string; badge: string; text: string }> = {
                          pending: { bar: 'from-orange-400 to-orange-300', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-600' },
                          availability_confirmed: { bar: 'from-blue-500 to-blue-400', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-600' },
                          crafting: { bar: 'from-amber-500 to-yellow-400', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-600' },
                          completed: { bar: 'from-green-500 to-emerald-400', badge: 'bg-green-100 text-green-700', text: 'text-green-600' },
                          declined: { bar: 'from-red-500 to-rose-400', badge: 'bg-red-100 text-red-700', text: 'text-red-600' },
                        };
                        const s = style[key] || style.pending;
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${s.bar} flex-shrink-0`} />
                                <span className="text-xs text-gray-600 font-medium">{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.badge}`}>{count}</span>
                                <span className="text-[10px] text-gray-400 font-mono w-8 text-right">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${s.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Products by Category */}
                <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-serif text-[var(--color-ink)]">Products by Category</h2>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">{productsList.length} total</span>
                  </div>
                  {loading ? (
                    <div className="py-8 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                  ) : categoryCounts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No products yet</p>
                  ) : (
                    <div className="space-y-3.5">
                      {categoryCounts.map(({ name, count }, idx) => {
                        const maxCount = Math.max(...categoryCounts.map(c => c.count), 1);
                        const pct = Math.round((count / maxCount) * 100);
                        const bars = ['from-amber-500 to-yellow-400','from-yellow-600 to-amber-400','from-amber-400 to-yellow-300','from-orange-400 to-amber-300'];
                        const bar = bars[idx % bars.length];
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-gray-600 font-medium">{name}</span>
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">{count}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
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
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Name</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Email</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Role</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100">Joined</th>
                        <th className="py-4 px-6 font-semibold border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                      {usersList.map(usr => {
                        const isSelf = usr._id === user?._id;
                        const isAdmin = usr.role === 'administrator';
                        return (
                          <tr key={usr._id} className={`transition-colors ${deleteUserId === usr._id ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${isAdmin ? 'bg-gradient-to-br from-amber-500 to-yellow-400' : 'bg-gradient-to-br from-blue-500 to-blue-400'}`}>
                                  {usr.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                  <p className="font-medium text-[var(--color-ink)]">{usr.name}</p>
                                  {isSelf && <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">You</span>}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-gray-600 text-xs">{usr.email}</td>
                            <td className="py-4 px-6">
                              <button
                                onClick={() => !isSelf && handleToggleUserRole(usr)}
                                disabled={isSelf || togglingUserId === usr._id}
                                title={isSelf ? 'Cannot change your own role' : `Click to make ${isAdmin ? 'Customer' : 'Admin'}`}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wide rounded-full font-bold transition-all ${
                                  isAdmin
                                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                } ${isSelf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} disabled:opacity-50`}
                              >
                                {isAdmin ? <Shield size={10} /> : <Users size={10} />}
                                {togglingUserId === usr._id ? '…' : usr.role}
                              </button>
                            </td>
                            <td className="py-4 px-6 text-gray-500 text-xs">{new Date(usr.createdAt).toLocaleDateString()}</td>
                            <td className="py-4 px-6 text-right">
                              {deleteUserId === usr._id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-red-600 font-medium">Delete?</span>
                                  <button onClick={() => handleDeleteUser(usr._id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                  <button onClick={() => setDeleteUserId(null)} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => !isSelf && setDeleteUserId(usr._id)}
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot delete yourself' : 'Delete user'}
                                  className={`p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors ${isSelf ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                  <UserX size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
                          {MODEL_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                          ))}
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
                        className="px-6 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest font-bold rounded transition-colors disabled:opacity-50"
                      >
                        {savingModel ? 'Saving…' : 'Update Model'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Upload Form */}
              <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8">
                <div className="flex flex-wrap justify-between items-center mb-6 border-b border-gray-100 pb-4 gap-3">
                  <h2 className="text-lg font-serif text-[var(--color-ink)]">3D Models & Inventory</h2>
                  <div className="flex gap-1">
                    {(['all', 'ring', 'pendant'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setModelCategoryFilter(cat)}
                        className={`px-3 py-1.5 text-xs rounded capitalize font-semibold transition-colors ${modelCategoryFilter === cat ? 'bg-[var(--color-ink)] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {cat === 'all' ? 'All' : cat + 's'}
                      </button>
                    ))}
                  </div>
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
                        {MODEL_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                        ))}
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
                        className="w-full text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:btn-richbrown file:text-white cursor-pointer"
                      />
                    </div>
                  </div>
                  <button
                    type="submit" disabled={uploading}
                    className="px-6 py-2 btn-richbrown text-white text-[10px] uppercase tracking-widest rounded-sm transition-colors disabled:opacity-50"
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
                      {modelsList.filter(m => modelCategoryFilter === 'all' || m.category === modelCategoryFilter).map(model => (
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
                  {modelsList.filter(m => modelCategoryFilter === 'all' || m.category === modelCategoryFilter).length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">No {modelCategoryFilter === 'all' ? '' : modelCategoryFilter + ' '}models found.</div>
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
                          className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:btn-richbrown file:text-white cursor-pointer"
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
                        className="px-6 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest font-bold rounded transition-colors disabled:opacity-50"
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
                        className="px-4 py-2 btn-richbrown text-white text-[10px] uppercase tracking-widest font-bold rounded transition-colors"
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
                    className="px-5 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest font-bold rounded transition-colors disabled:opacity-40"
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
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Date</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100">Status</th>
                        <th className="py-4 px-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {ordersList.map(order => {
                        const isExpanded = expandedOrderId === order._id;
                        const isPendingDelete = deleteOrderId === order._id;
                        const items: any[] = order.orderItems || [];
                        const statusStyle: Record<string, { pill: string; chevron: string }> = {
                          pending: { pill: 'bg-orange-100 text-orange-700 border border-orange-200 focus:ring-orange-300', chevron: 'text-orange-400' },
                          availability_confirmed: { pill: 'bg-blue-100 text-blue-700 border border-blue-200 focus:ring-blue-300', chevron: 'text-blue-400' },
                          crafting: { pill: 'bg-amber-100 text-amber-700 border border-amber-200 focus:ring-amber-300', chevron: 'text-amber-500' },
                          completed: { pill: 'bg-green-100 text-green-700 border border-green-200 focus:ring-green-300', chevron: 'text-green-500' },
                          declined: { pill: 'bg-red-100 text-red-700 border border-red-200 focus:ring-red-300', chevron: 'text-red-400' },
                        };
                        const ss = statusStyle[order.status] || statusStyle.pending;
                        return (
                          <>
                            <tr
                              key={order._id}
                              className={`transition-colors cursor-pointer ${isPendingDelete ? 'bg-red-50' : isExpanded ? 'bg-amber-50/40' : 'hover:bg-gray-50'} border-b border-gray-100`}
                              onClick={() => !isPendingDelete && setExpandedOrderId(isExpanded ? null : order._id)}
                            >
                              <td className="py-4 px-4 text-gray-400">
                                {isExpanded
                                  ? <ChevronDown size={14} className="text-amber-600" />
                                  : <ChevronRight size={14} />}
                              </td>
                              <td className="py-4 px-4 font-mono text-xs font-bold text-amber-700">{order.inquiryRef || 'INQ-PENDING'}</td>
                              <td className="py-4 px-4 font-medium text-[var(--color-ink)]">{order.user?.name || 'Unknown'}</td>
                              <td className="py-4 px-4 font-semibold text-gray-700">Rs. {Number(order.totalPrice || 0).toLocaleString()}</td>
                              <td className="py-4 px-4 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                              <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                                <div className="relative inline-flex items-center">
                                  <select
                                    value={order.status}
                                    onChange={e => handleUpdateOrderStatus(order._id, e.target.value)}
                                    className={`appearance-none pl-3 pr-7 py-1.5 rounded-full text-[11px] font-bold cursor-pointer focus:outline-none focus:ring-2 transition-colors ${ss.pill}`}
                                  >
                                    <option value="pending">Pending Review</option>
                                    <option value="availability_confirmed">Availability Confirmed</option>
                                    <option value="crafting">Crafting</option>
                                    <option value="completed">Completed / Collection</option>
                                    <option value="declined">Declined / Slot full</option>
                                  </select>
                                  <ChevronDown size={11} className={`absolute right-2 pointer-events-none ${ss.chevron}`} />
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right" onClick={e => e.stopPropagation()}>
                                {isPendingDelete ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-xs text-red-600 font-medium">Delete?</span>
                                    <button onClick={() => handleDeleteOrder(order._id)} className="px-2.5 py-1 text-xs bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors">Yes</button>
                                    <button onClick={() => setDeleteOrderId(null)} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 transition-colors">No</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setDeleteOrderId(order._id); setExpandedOrderId(null); }}
                                    className="p-1.5 border border-red-100 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    title="Delete inquiry"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${order._id}-items`} className="bg-amber-50/20 border-b border-gray-100">
                                <td colSpan={7} className="px-8 py-4">
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
            <div className="space-y-6">
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  if (!user) return;
                  setSavingPricing(true);
                  setPricingSaveStatus('idle');
                  const success = await updatePricing(priceForm, user.token);
                  setPricingSaveStatus(success ? 'success' : 'error');
                  setSavingPricing(false);
                  if (success) setTimeout(() => setPricingSaveStatus('idle'), 3000);
                }}
              >
                {/* Metal Multipliers card */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                    <div className="w-2 h-5 bg-amber-400 rounded-full" />
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">Metal Multipliers</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Applied as: Base Price × Multiplier</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {([
                      { key: 'metalMultiplier_silver',   label: '925 Sterling Silver',       def: 1  },
                      { key: 'metalMultiplier_white',    label: '18K White Gold',             def: 13 },
                      { key: 'metalMultiplier_gold',     label: '22K Yellow Gold (916 Gold)', def: 18 },
                      { key: 'metalMultiplier_rose',     label: '18K Rose Gold',              def: 13 },
                      { key: 'metalMultiplier_platinum', label: 'Platinum (Pt950)',           def: 22 },
                    ] as const).map(({ key, label, def }) => (
                      <div key={key} className="bg-gray-50 rounded-md p-3">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" step="0.01" min="0"
                            value={(priceForm as any)[key] ?? def}
                            onChange={e => setPriceForm({ ...priceForm, [key]: Number(e.target.value) })}
                            className="flex-1 p-2 border border-gray-200 text-sm rounded bg-white focus:outline-none focus:border-amber-400"
                          />
                          <span className="text-xs text-gray-400">×</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Default: {def}.0</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Center Stone Prices card */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                    <div className="w-2 h-5 bg-blue-400 rounded-full" />
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">Center Stone Prices</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Price per stone in Rs. — added on top of metal cost</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {([
                      { key: 'stonePrice_aquamarine',    label: 'Cornflower / Sky Blue Sapphire', def: 65000  },
                      { key: 'stonePrice_diamond',       label: 'White Ceylon Sapphire',          def: 95000  },
                      { key: 'stonePrice_ruby',          label: 'Crimson Ceylon Ruby',            def: 145000 },
                      { key: 'stonePrice_emerald',       label: 'Vibrant Emerald',                def: 120000 },
                      { key: 'stonePrice_sapphire',      label: 'Royal Blue Ceylon Sapphire',     def: 185000 },
                      { key: 'stonePrice_padparadscha',  label: 'Ceylon Padparadscha ✦ Ultra Rare', def: 480000 },
                      { key: 'stonePrice_moonstone',     label: 'Premium Blue-Sheen Moonstone',   def: 45000  },
                      { key: 'stonePrice_yellowsapphire',label: 'Yellow Ceylon Sapphire',         def: 75000  },
                    ] as const).map(({ key, label, def }) => (
                      <div key={key} className="bg-gray-50 rounded-md p-3">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 shrink-0">Rs.</span>
                          <input
                            type="number" min="0"
                            value={(priceForm as any)[key] ?? def}
                            onChange={e => setPriceForm({ ...priceForm, [key]: Number(e.target.value) })}
                            className="flex-1 p-2 border border-gray-200 text-sm rounded bg-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other Upgrades card */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                    <div className="w-2 h-5 bg-green-400 rounded-full" />
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-ink)]">Other Upgrades</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-md p-3">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Custom Engraving</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 shrink-0">Rs.</span>
                        <input
                          type="number" min="0"
                          value={priceForm.engravingPrice ?? 5000}
                          onChange={e => setPriceForm({ ...priceForm, engravingPrice: Number(e.target.value) })}
                          className="flex-1 p-2 border border-gray-200 text-sm rounded bg-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save bar */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-lg px-6 py-4 flex items-center justify-between">
                  {pricingSaveStatus === 'success' && (
                    <span className="text-xs text-green-600 font-semibold">Pricing saved successfully.</span>
                  )}
                  {pricingSaveStatus === 'error' && (
                    <span className="text-xs text-red-600 font-semibold">Failed to save — please try again.</span>
                  )}
                  {pricingSaveStatus === 'idle' && <span />}
                  <button
                    type="submit" disabled={savingPricing}
                    className="px-6 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest rounded-sm transition-colors disabled:opacity-50"
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
                        className="px-6 py-2.5 btn-richbrown text-white text-xs uppercase tracking-widest font-bold rounded transition-colors disabled:opacity-50"
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
                      className="px-4 py-2 btn-richbrown text-white text-[10px] uppercase tracking-widest font-bold rounded transition-colors"
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
