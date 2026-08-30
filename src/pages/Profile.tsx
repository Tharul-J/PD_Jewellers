import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';
import { LogOut, User as UserIcon, Heart, ShoppingBag, Trash2, Palette, Edit, Lock, Camera, Phone, MapPin, X, ChevronDown, Wand2, Gem, Package, Star, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { NotificationBadge } from '../components/NotificationBadge';
import { useNotifications } from '../hooks/useNotifications';
import { useAdminGuard } from '../hooks/useAdminGuard';
import AdminActionWarning from '../components/AdminActionWarning';
import InitialsAvatar from '../components/InitialsAvatar';
import ProfilePictureUpload from '../components/ProfilePictureUpload';
import { METALS, STONES, FONTS } from '../constants';
import { formatPrice, formatExact } from '../lib/price';
import { skuOf } from '../lib/sku';
import InquiryMessages from '../components/InquiryMessages';

const STATUS_LABELS: Record<string, string> = {
  pending:                'Pending Review',
  availability_confirmed: 'Confirmed',
  ordered:                'Order Placed',
  crafting:               'Crafting',
  ready:                  'Ready for Collection',
  completed:              'Collection / Handover',
  declined:               'Declined',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const { wishlist, toggleWishlistItem, isLoading: isWishlistLoading } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { unreadByType, markReadByType } = useNotifications();
  const { guard, showWarning, dismiss } = useAdminGuard();

  const [profileData, setProfileData] = useState<any>(null);
  const [deletingConfigId, setDeletingConfigId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [expandedPurchaseIds, setExpandedPurchaseIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'account' | 'wishlist' | 'orders' | 'configs' | 'purchases' | 'reviews'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'configs' || tab === 'wishlist' || tab === 'orders' || tab === 'purchases' || tab === 'reviews') return tab;
    return 'account';
  });

  // Notification deep links: /profile?tab=orders&id=<inquiryId>. The page stays
  // mounted between notification clicks, so react to the params rather than
  // only reading them in the initial state above.
  const deepLinkTab = searchParams.get('tab');
  const deepLinkId = searchParams.get('id');

  useEffect(() => {
    if (deepLinkTab && ['account', 'wishlist', 'orders', 'configs', 'purchases', 'reviews'].includes(deepLinkTab)) {
      setActiveTab(deepLinkTab as typeof activeTab);
    }
    if (deepLinkId) {
      // Only one of these collections will hold the id; the other add is inert.
      setExpandedOrderIds(prev => new Set(prev).add(deepLinkId));
      setExpandedPurchaseIds(prev => new Set(prev).add(deepLinkId));
    }
  }, [deepLinkTab, deepLinkId]);

  const [orders, setOrders] = useState<any[]>([]);

  const [ordersLoading, setOrdersLoading] = useState(false);

  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewForm, setEditReviewForm] = useState({ rating: 0, title: '', text: '' });
  const [editReviewSaving, setEditReviewSaving] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Edit / password modes
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile Form States
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });

  // Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Synchronize state when profile data transitions
  useEffect(() => {
    if (profileData) {
      setEditName(profileData.name || '');
      setEditEmail(profileData.email || '');
      setEditPhone(profileData.phone || '');
      setEditAddress({
        street: profileData.address?.street || '',
        city: profileData.address?.city || '',
        state: profileData.address?.state || '',
        zip: profileData.address?.zip || '',
        country: profileData.address?.country || '',
      });
    }
  }, [profileData]);

  const { login: syncAuthContext } = useAuth();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          address: editAddress
        })
      });
      const data = await response.json();
      if (response.ok) {
        setProfileData(data);
        syncAuthContext({
          _id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
          profilePicture: data.profilePicture || user.profilePicture || '',
          token: data.token || user.token
        });
        setSuccessMsg('Profile updated successfully!');
        setIsEditing(false);
      } else {
        setErrorMsg(data.message || 'Error updating profile');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProfilePictureChange = (url: string) => {
    setProfileData((prev: any) => (prev ? { ...prev, profilePicture: url } : prev));
    if (user) {
      syncAuthContext({ ...user, profilePicture: url });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          password: newPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg('Password updated successfully!');
        setIsChangingPassword(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(data.message || 'Error updating password');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role === 'administrator') {
      navigate('/admin');
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
        if (response.ok) {
          setProfileData(data);
        }
      } catch (error) {
        console.error("Error fetching profile", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  useEffect(() => {
    // Fetched on mount (not tab-gated) — the review prompt banner on My Account
    // needs completed-inquiry data regardless of which tab is active.
    if (user) {
      const fetchOrders = async () => {
        setOrdersLoading(true);
        try {
          const res = await fetch('/api/orders/myorders', {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setOrders(data);
          }
        } catch (error) {
          console.error("Error fetching orders", error);
        } finally {
          setOrdersLoading(false);
        }
      };
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/reviews/mine', {
      headers: { Authorization: `Bearer ${user.token}` }
    }).then(r => r.json()).then(d => setMyReviews(d.reviews ?? [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (activeTab === 'purchases' && user) {
      const fetchPurchases = async () => {
        setPurchasesLoading(true);
        try {
          const res = await fetch('/api/purchases/my', {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setPurchases(data);
          }
        } catch (error) {
          console.error("Error fetching purchases", error);
        } finally {
          setPurchasesLoading(false);
        }
      };
      fetchPurchases();
    }
  }, [activeTab, user]);

  // Scroll to the deep-linked card once the list it lives in has rendered.
  useEffect(() => {
    if (!deepLinkId) return;
    const el = document.getElementById(`inquiry-card-${deepLinkId}`)
      || document.getElementById(`purchase-card-${deepLinkId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [deepLinkId, activeTab, orders.length, purchases.length]);

  const inquiryNotifCount = unreadByType['inquiry_status'] ?? 0;

  useEffect(() => {
    if (activeTab === 'orders' && inquiryNotifCount > 0) {
      markReadByType('inquiry_status');
    }
  }, [activeTab]);

  // Site reviews carry no product; product reviews are written against a
  // purchased piece and populate their product on the way back.
  const siteReview = myReviews.find(r => !r.product);
  const reviewForProduct = (sku: string) => myReviews.find(r => r.product?.id === sku);

  const handleSubmitReview = async () => {
    if (!reviewRating || !reviewText.trim() || !user) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ rating: reviewRating, title: reviewTitle, text: reviewText, reviewType: 'site' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');
      setReviewSubmitted(true);
      setMyReviews(prev => [...prev, data.review ?? { rating: reviewRating, title: reviewTitle, text: reviewText }]);
      setReviewRating(0);
      setReviewTitle('');
      setReviewText('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleEditReview = (review: any) => {
    setEditingReviewId(review._id);
    setEditReviewForm({ rating: review.rating, title: review.title || '', text: review.text });
  };

  const handleEditReviewSave = async (id: string) => {
    if (!user || !editReviewForm.rating || !editReviewForm.text.trim()) return;
    setEditReviewSaving(true);
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(editReviewForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update review');
      setMyReviews(prev => prev.map(r => r._id === id ? data.review : r));
      setEditingReviewId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update review');
    } finally {
      setEditReviewSaving(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!user || !window.confirm('Delete this review?')) return;
    setDeletingReviewId(id);
    try {
      const res = await fetch(`/api/reviews/mine/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error();
      setMyReviews(prev => prev.filter(r => r._id !== id));
    } catch {
      alert('Could not delete review.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleOpenInConfigurator = (config: any) => {
    // Resolve stored value to internal key; fall back to name-based lookup
    // for any legacy entries that stored display names instead of keys.
    const resolveKey = <T extends Record<string, { name: string }>>(
      map: T, value: string | undefined, fallback: keyof T
    ): string => {
      if (!value) return fallback as string;
      if (value in map) return value;
      const found = Object.entries(map).find(
        ([, v]) => v.name.toLowerCase() === value.toLowerCase()
      );
      return found ? found[0] : fallback as string;
    };

    const metalKey  = resolveKey(METALS, config.metal, 'silver');
    const stoneKey  = resolveKey(STONES, config.stone, 'aquamarine');
    const fontKey   = resolveKey(FONTS,  config.fontStyle, 'helvetiker');

    localStorage.setItem('cfg_modelType', config.type || 'ring');
    if (config.ringSize) localStorage.setItem('cfg_ringSize', config.ringSize);
    localStorage.setItem('cfg_metal', metalKey);
    localStorage.setItem('cfg_stone', stoneKey);
    if (config.engravingText) {
      localStorage.setItem('cfg_engraveWant', 'true');
      localStorage.setItem('cfg_customText', config.engravingText);
    } else {
      localStorage.setItem('cfg_engraveWant', 'false');
    }
    localStorage.setItem('cfg_fontStyle', fontKey);
    if (config.pendantShape) localStorage.setItem('cfg_pendantShape', config.pendantShape);
    navigate('/configurator');
  };

  const handleAddToInquiry = (item: any) => {
    // addToCart opens the inquiry drawer so the item can be reviewed and
    // adjusted there; submitting is a separate, deliberate step.
    addToCart({ id: item.productId, name: item.name, price: Number(item.price), image: item.image });
  };

  const CONFIG_PLACEHOLDER_IMAGE: Record<'ring' | 'pendant', string> = {
    ring: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80&w=600',
    pendant: 'https://images.unsplash.com/photo-1599643478514-4a4802c61e44?auto=format&fit=crop&q=80&w=600',
  };

  const handleAddConfigToInquiry = (config: any) => {
    const type: 'ring' | 'pendant' = config.type === 'pendant' ? 'pendant' : 'ring';
    const name = type === 'ring'
      ? `${config.metal} ${config.stone} Ring`
      : `${config.metal} ${config.pendantShape || 'Standard'} Pendant`;

    handleAddToInquiry({
      productId: `custom-config-${config._id}`,
      name,
      price: config.price,
      image: CONFIG_PLACEHOLDER_IMAGE[type],
    });
  };

  const handleDeleteConfiguration = async (configId: string) => {
    if (!user || !window.confirm('Remove this saved design?')) return;
    setDeletingConfigId(configId);
    try {
      const res = await fetch(`/api/users/configurations/${configId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const savedConfigurations = await res.json();
      setProfileData((prev: any) => prev ? { ...prev, savedConfigurations } : prev);
    } catch (err) {
      console.error('[saved-designs] delete error:', err);
      alert('Could not remove design. Please try again.');
    } finally {
      setDeletingConfigId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Opening an inquiry clears the shop's unread messages on it.
  const markInquiryRead = async (id: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/orders/${id}/messages/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setOrders(prev => prev.map(o => (o._id === id ? { ...o, ...data } : o)));
    } catch {
      // a failed read-receipt is not worth surfacing
    }
  };

  const toggleOrderExpanded = (id: string) => {
    const wasExpanded = expandedOrderIds.has(id);
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    if (!wasExpanded) void markInquiryRead(id);
  };

  const isOrderExpanded = (id: string) => expandedOrderIds.has(id);

  const togglePurchaseExpanded = (id: string) => {
    setExpandedPurchaseIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isPurchaseExpanded = (id: string) => expandedPurchaseIds.has(id);

  const handleCancelInquiry = async (orderId: string) => {
    if (!user || !window.confirm('Are you sure you want to cancel this inquiry? This action cannot be undone.')) return;
    setCancellingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel');
      setOrders(prev => prev.filter(o => o._id !== orderId));
    } catch (err: any) {
      console.error('[inquiries] cancel error:', err);
      alert(err.message || 'Could not cancel inquiry. Please try again.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[var(--color-paper)]">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row gap-12">
            
            {/* Sidebar */}
            <div className="w-full md:w-1/3 lg:w-1/4">
              <div className="mb-8 flex flex-col items-center md:items-start text-center md:text-left">
                {/* The upload control itself lives in the account tab's edit mode.
                    This makes the avatar the obvious way in, rather than expecting
                    people to find "Edit Profile" first. */}
                <button
                  type="button"
                  onClick={() => { setActiveTab('account'); setIsEditing(true); }}
                  className="group relative mb-4 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-2"
                  title="Change profile photo"
                  aria-label="Change profile photo"
                  id="avatar-upload-entry"
                >
                  {profileData?.profilePicture ? (
                    <img
                      src={profileData.profilePicture}
                      alt={profileData.name}
                      className="w-24 h-24 rounded-full object-cover border-2 border-[var(--color-gold)] shadow-sm"
                    />
                  ) : (
                    <InitialsAvatar
                      name={profileData?.name || user?.name || '?'}
                      size={96}
                      className="border-2 border-[var(--color-gold)] shadow-sm"
                    />
                  )}
                  <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={22} className="text-white" />
                  </span>
                </button>
                <h1 className="text-2xl font-serif text-[var(--color-ink)] break-words w-full">{profileData?.name || user?.name}</h1>
                <p className="text-gray-500 mt-2 text-sm break-all w-full">{profileData?.email || user?.email}</p>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => setActiveTab('account')} 
                  className={`flex items-center gap-3 w-full p-3 text-left text-sm font-medium transition-colors rounded-sm ${activeTab === 'account' ? 'btn-richbrown text-white' : 'text-gray-600 hover:text-[var(--color-ink)] hover:bg-gray-100'}`}
                >
                  <UserIcon size={16} /> My Account
                </button>
                <button 
                  onClick={() => setActiveTab('wishlist')} 
                  className={`flex items-center gap-3 w-full p-3 text-left text-sm font-medium transition-colors rounded-sm ${activeTab === 'wishlist' ? 'btn-richbrown text-white' : 'text-gray-600 hover:text-[var(--color-ink)] hover:bg-gray-100'}`}
                >
                  <Heart size={16} /> Wishlist ({wishlist.length})
                </button>
                <button 
                  onClick={() => setActiveTab('configs')} 
                  className={`flex items-center gap-3 w-full p-3 text-left text-sm font-medium transition-colors rounded-sm ${activeTab === 'configs' ? 'btn-richbrown text-white' : 'text-gray-600 hover:text-[var(--color-ink)] hover:bg-gray-100'}`}
                >
                  <Palette size={16} /> Saved Designs ({profileData?.savedConfigurations?.length || 0})
                </button>
                <button 
                  onClick={() => setActiveTab('orders')} 
                  className={`flex items-center gap-3 w-full p-3 text-left text-sm font-medium transition-colors rounded-sm ${activeTab === 'orders' ? 'btn-richbrown text-white' : 'text-gray-600 hover:text-[var(--color-ink)] hover:bg-gray-100'}`}
                >
                  <ShoppingBag size={16} /> My Inquiries
                  <NotificationBadge count={inquiryNotifCount} />
                </button>
                <button
                  onClick={() => setActiveTab('purchases')}
                  className={`flex items-center gap-3 w-full p-3 text-left text-sm font-medium transition-colors rounded-sm ${activeTab === 'purchases' ? 'btn-richbrown text-white' : 'text-gray-600 hover:text-[var(--color-ink)] hover:bg-gray-100'}`}
                >
                  <Package size={16} /> Purchased Items
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex items-center gap-3 w-full p-3 text-left text-sm font-medium transition-colors rounded-sm ${activeTab === 'reviews' ? 'btn-richbrown text-white' : 'text-gray-600 hover:text-[var(--color-ink)] hover:bg-gray-100'}`}
                >
                  <Star size={16} /> Reviews{myReviews.length ? ` (${myReviews.length})` : ''}
                </button>

                <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-left text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors rounded-sm mt-8 border-t border-gray-200 pt-6">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="w-full md:w-2/3 lg:w-3/4">
              <div className="bg-white p-8 border border-gray-100 shadow-sm min-h-[500px]">
                
                {activeTab === 'account' && !isEditing && !isChangingPassword && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                      <h2 className="text-2xl font-serif text-[var(--color-ink)]">Account Details</h2>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => { setIsEditing(true); setSuccessMsg(''); setErrorMsg(''); }}
                          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-[10px] uppercase tracking-widest text-[#1a1a1a] hover:text-[var(--color-gold-dark)] hover:border-[var(--color-gold)] transition-colors font-medium rounded-sm"
                        >
                          <Edit size={12} /> Edit Profile
                        </button>
                        <button 
                          onClick={() => { setIsChangingPassword(true); setSuccessMsg(''); setErrorMsg(''); }}
                          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-[10px] uppercase tracking-widest text-[#1a1a1a] hover:text-[var(--color-gold-dark)] hover:border-[var(--color-gold)] transition-colors font-medium rounded-sm"
                        >
                          <Lock size={12} /> Change Password
                        </button>
                      </div>
                    </div>
                    
                    {successMsg && (
                      <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm font-medium">
                        {successMsg}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Full Name</label>
                        <p className="text-lg text-[var(--color-ink)] font-medium border-b border-gray-100 pb-2">{profileData?.name || user?.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Email Address</label>
                        <p className="text-lg text-[var(--color-ink)] font-medium border-b border-gray-100 pb-2">{profileData?.email || user?.email}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Phone Number</label>
                        <p className="text-lg text-[var(--color-ink)] font-medium border-b border-gray-100 pb-2">{profileData?.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Account Type</label>
                        <p className="text-lg text-[var(--color-ink)] font-medium border-b border-gray-100 pb-2 capitalize">{user?.role || 'Customer'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Member Since</label>
                        <p className="text-lg text-[var(--color-ink)] font-medium border-b border-gray-100 pb-2">
                          {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-8 mt-8">
                      <h3 className="text-lg font-serif text-[var(--color-ink)] mb-4 flex items-center gap-2"><MapPin size={16} className="text-gray-400" /> Default Delivery Address</h3>
                      {profileData?.address?.street || profileData?.address?.city || profileData?.address?.state ? (
                        <div className="bg-gray-50 p-4 rounded-sm border border-gray-100 text-base text-gray-700 space-y-1">
                          <p className="font-semibold text-[var(--color-ink)]">{profileData.name || user?.name}</p>
                          <p>{profileData.address.street}</p>
                          <p>{profileData.address.city}, {profileData.address.state} {profileData.address.zip}</p>
                          <p className="uppercase font-semibold tracking-wider text-xs text-gray-500 mt-1">{profileData.address.country}</p>
                        </div>
                      ) : (
                        <p className="text-base text-gray-500 italic">No delivery address saved yet. Update your profile to add an address.</p>
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'account' && isEditing && (
                  <form onSubmit={handleUpdateProfile}>
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <h2 className="text-xl font-serif text-[var(--color-ink)]">Edit Profile</h2>
                      <button 
                        type="button"
                        onClick={() => { setIsEditing(false); setErrorMsg(''); }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {errorMsg && (
                      <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium">
                        {errorMsg}
                      </div>
                    )}

                    {/* Profile Picture */}
                    <div className="mb-8 flex justify-center">
                      {user && (
                        <ProfilePictureUpload
                          name={profileData?.name || user.name}
                          profilePicture={profileData?.profilePicture || ''}
                          token={user.token}
                          onChange={handleProfilePictureChange}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full border border-gray-100 p-2 text-sm focus:outline-none focus:border-[var(--color-ink)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Email Address</label>
                        <input 
                          type="email" 
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full border border-gray-100 p-2 text-sm focus:outline-none focus:border-[var(--color-ink)]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Phone Number</label>
                        <input 
                          type="text" 
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="e.g. +94 77 123 4567"
                          className="w-full border border-gray-100 p-2 text-sm focus:outline-none focus:border-[var(--color-ink)]"
                        />
                      </div>
                    </div>

                    {/* Address Fields */}
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-sm font-serif text-[var(--color-ink)] mb-4 uppercase tracking-wider">Delivery Address</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Street Address</label>
                          <input 
                            type="text" 
                            value={editAddress.street}
                            onChange={(e) => setEditAddress({ ...editAddress, street: e.target.value })}
                            placeholder="Apartment, suite, unit, building, floor, street details"
                            className="w-full border border-gray-100 p-2 text-sm focus:outline-none focus:border-[var(--color-ink)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">City</label>
                          <input 
                            type="text" 
                            value={editAddress.city}
                            onChange={(e) => setEditAddress({ ...editAddress, city: e.target.value })}
                            className="w-full border border-gray-100 p-2 text-sm focus:outline-none focus:border-[var(--color-ink)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">State / Province</label>
                          <input 
                            type="text" 
                            value={editAddress.state}
                            onChange={(e) => setEditAddress({ ...editAddress, state: e.target.value })}
                            className="w-full border border-gray-100 p-2 text-sm focus:outline-none focus:border-[var(--color-ink)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">ZIP / Postal Code</label>
                          <input 
                            type="text" 
                            value={editAddress.zip}
                            onChange={(e) => setEditAddress({ ...editAddress, zip: e.target.value })}
                            className="w-full border border-gray-100 p-2 text-sm focus:outline-none focus:border-[var(--color-ink)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Country</label>
                          <input 
                            type="text" 
                            value={editAddress.country}
                            onChange={(e) => setEditAddress({ ...editAddress, country: e.target.value })}
                            className="w-full border border-gray-100 p-2 text-sm focus:outline-none focus:border-[var(--color-ink)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-6">
                      <button 
                        type="button"
                        onClick={() => { setIsEditing(false); setErrorMsg(''); }}
                        className="px-4 py-2 border border-gray-200 text-gray-500 hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors text-[10px] uppercase tracking-widest font-semibold"
                        disabled={actionLoading}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-5 py-2 btn-richbrown text-white transition-colors text-[10px] uppercase tracking-widest font-semibold flex items-center gap-2"
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === 'account' && isChangingPassword && (
                  <form onSubmit={handleChangePassword}>
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <h2 className="text-xl font-serif text-[var(--color-ink)]">Change Password</h2>
                      <button 
                        type="button"
                        onClick={() => { setIsChangingPassword(false); setErrorMsg(''); }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {errorMsg && (
                      <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium">
                        {errorMsg}
                      </div>
                    )}

                    <div className="space-y-6 max-w-md">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">New Password</label>
                        <input 
                          type="password" 
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full border border-gray-200 p-2 text-sm focus:outline-none focus:border-[var(--color-ink)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Confirm New Password</label>
                        <input 
                          type="password" 
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-type new password"
                          className="w-full border border-gray-200 p-2 text-sm focus:outline-none focus:border-[var(--color-ink)]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-6">
                      <button 
                        type="button"
                        onClick={() => { setIsChangingPassword(false); setErrorMsg(''); }}
                        className="px-4 py-2 border border-gray-200 text-gray-500 hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors text-[10px] uppercase tracking-widest font-semibold"
                        disabled={actionLoading}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-5 py-2 btn-richbrown text-white transition-colors text-[10px] uppercase tracking-widest font-semibold"
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
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
                        <Link to="/collections" className="inline-block px-6 py-3 btn-richbrown text-white text-[10px] uppercase tracking-widest transition-colors">
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
                              <p className="font-sans font-medium text-sm text-[var(--color-ink)] mb-4"><span className="text-[10px] text-gray-400 uppercase tracking-wider mr-1">Starting from</span>{formatPrice(item.price)}</p>
                              
                              <button
                                onClick={() => guard(() => handleAddToInquiry(item))}
                                className="w-full text-center btn-richbrown text-white py-2 text-[10px] uppercase tracking-widest transition-colors mb-2"
                              >
                                Add to Inquiry
                              </button>
                              <Link
                                to={item.isCustom ? "/configurator" : `/product/${item.productId}`}
                                className="w-full text-center border border-gray-200 text-gray-500 py-2 text-[10px] uppercase tracking-widest hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors mt-auto"
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
                    <h2 className="text-xl font-serif text-[var(--color-ink)] mb-1">My Atelier Inquiries</h2>
                    <p className="text-xs text-gray-500 mb-6">Track real-time workshop slot checks and availability confirmations of your designs.</p>
                    
                    {ordersLoading ? (
                      <div className="py-12 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                    ) : orders.length === 0 ? (
                      <div className="py-16 text-center text-gray-500 bg-gray-50 border border-gray-100 border-dashed rounded-md">
                        <ShoppingBag size={32} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm mb-6">You haven't submitted any inquiries yet.</p>
                        <Link to="/collections" className="inline-block px-6 py-3 btn-richbrown text-white text-[10px] uppercase tracking-widest transition-colors">
                          Browse Collections
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {orders.map((order) => (
                          <div key={order._id} id={`inquiry-card-${order._id}`} className="border border-gray-100 rounded-lg overflow-hidden">
                            <div
                              className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4 cursor-pointer select-none"
                              onClick={() => toggleOrderExpanded(order._id)}
                            >
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Inquiry Sent</p>
                                <p className="text-sm font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Estimated Value</p>
                                <p className="text-sm font-semibold"><span className="text-[10px] text-gray-400 font-normal">Starting from </span>{formatPrice(order.totalPrice)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Inquiry Reference Code</p>
                                <p className="text-sm font-mono font-bold text-amber-700 flex items-center gap-2">
                                  {order.inquiryRef || 'INQ-PENDING'}
                                  {(order.unreadCount ?? 0) > 0 && (
                                    <span
                                      className="w-2 h-2 rounded-full bg-[var(--color-gold)] shrink-0"
                                      title={`${order.unreadCount} unread message${order.unreadCount === 1 ? '' : 's'} from PD Jewellers`}
                                    />
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 ml-4 shrink-0">
                                <span className={`px-3 py-1 text-[10px] uppercase tracking-wide rounded-full font-bold
                                  ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' : ''}
                                  ${order.status === 'availability_confirmed' ? 'bg-blue-100 text-blue-700' : ''}
                                  ${order.status === 'crafting' ? 'bg-yellow-100 text-[var(--color-gold-dark)]' : ''}
                                  ${order.status === 'ready' ? 'bg-teal-100 text-teal-700' : ''}
                                  ${order.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                                  ${order.status === 'declined' ? 'bg-red-100 text-red-700' : ''}
                                  ${order.status === 'ordered' ? 'bg-amber-100 text-amber-700' : ''}
                                `}>
                                  {STATUS_LABELS[order.status] ?? order.status.replace(/_/g, ' ')}
                                </span>
                                <ChevronDown
                                  size={16}
                                  className={`text-gray-400 transition-transform duration-200 ${isOrderExpanded(order._id) ? 'rotate-180' : 'rotate-0'}`}
                                />
                              </div>
                            </div>

                            {isOrderExpanded(order._id) && (
                              <>
                                {(order.status === 'pending' || order.status === 'availability_confirmed' || order.status === 'ordered') && (
                                  <div className="px-4 pt-4 flex justify-end">
                                    {order.status === 'pending' && (
                                      <button
                                        onClick={() => handleCancelInquiry(order._id)}
                                        disabled={cancellingOrderId === order._id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-40"
                                        title="Cancel this inquiry"
                                      >
                                        {cancellingOrderId === order._id ? (
                                          <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <Trash2 size={13} />
                                        )}
                                        Cancel Inquiry
                                      </button>
                                    )}
                                    {order.status === 'availability_confirmed' && (
                                      <button
                                        onClick={() => navigate(`/payment/${order._id}`)}
                                        className="px-4 py-2 btn-richbrown text-white text-[10px] uppercase tracking-widest rounded transition-colors"
                                      >
                                        Order Now
                                      </button>
                                    )}
                                    {order.status === 'ordered' && (
                                      <span className="text-[10px] uppercase tracking-widest text-amber-700 border border-amber-200 bg-amber-50 px-3 py-1.5 rounded font-bold">
                                        Order Placed
                                      </span>
                                    )}
                                  </div>
                                )}

                            {/* Inquiry Tracker */}
                            {order.status === 'declined' ? (
                              <div className="px-8 py-4 bg-red-50 border-b border-gray-100 text-xs text-red-700 italic font-semibold">
                                * The requested workshop slot or material selection has been marked as unavailable for your customization. Please contact customer care.
                              </div>
                            ) : (
                              <div className="px-8 py-6 border-b border-gray-100 bg-white">
                                <div className="relative">
                                  {/* Track Line */}
                                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-200 -translate-y-1/2"></div>
                                  <div
                                    className="absolute top-1/2 left-0 h-[2px] bg-[var(--color-gold)] -translate-y-1/2 transition-all duration-500"
                                    style={{
                                      width:
                                        order.status === 'pending' ? '0%' :
                                        order.status === 'availability_confirmed' ? '20%' :
                                        order.status === 'ordered' ? '40%' :
                                        order.status === 'crafting' ? '60%' :
                                        order.status === 'ready' ? '80%' :
                                        '100%'
                                    }}
                                  ></div>

                                  {/* Status Points */}
                                  <div className="relative flex justify-between">
                                    {[
                                      { id: 'pending', label: 'Pending Review' },
                                      { id: 'availability_confirmed', label: 'Confirmed' },
                                      { id: 'ordered', label: 'Ordered / Paid' },
                                      { id: 'crafting', label: 'Crafting' },
                                      { id: 'ready', label: 'Ready' },
                                      { id: 'completed', label: 'Collection / Handover' }
                                    ].map((step, index) => {
                                      const indexMap: Record<string, number> = {
                                        'pending': 0,
                                        'availability_confirmed': 1,
                                        'ordered': 2,
                                        'crafting': 3,
                                        'ready': 4,
                                        'completed': 5
                                      };
                                      const currentIdx = indexMap[order.status] ?? 0;
                                      const isActive = currentIdx >= index;

                                      return (
                                        <div key={step.id} className="flex flex-col items-center">
                                          <div className={`w-4 h-4 rounded-full border-2 bg-white z-10 transition-colors ${isActive ? 'border-[var(--color-gold)]' : 'border-gray-300'}`}>
                                            {isActive && <div className="w-2 h-2 bg-[var(--color-gold)] rounded-full mx-auto mt-[2px]"></div>}
                                          </div>
                                          <span className={`text-[9px] uppercase tracking-wider mt-3 font-bold text-center w-20 ${isActive ? 'text-[var(--color-ink)]' : 'text-gray-400'}`}>
                                            {step.label}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

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
                                    <p className="text-sm font-semibold"><span className="text-[10px] text-gray-400 font-normal">Starting from </span>{formatPrice(item.price)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="p-4 border-t border-gray-100">
                              <InquiryMessages
                                inquiryId={order._id}
                                messages={order.messages || []}
                                viewerRole="customer"
                                customerName={profileData?.name || user?.name}
                                token={user?.token}
                                onUpdated={updated =>
                                  setOrders(prev => prev.map(o => (o._id === order._id ? { ...o, ...updated } : o)))
                                }
                              />
                            </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'purchases' && (
                  <>
                    <h2 className="text-xl font-serif text-[var(--color-ink)] mb-1">Purchased Items</h2>
                    <p className="text-xs text-gray-500 mb-6">Orders you've paid for, along with their crafting progress.</p>

                    {purchasesLoading ? (
                      <div className="py-12 flex justify-center"><LoadingSpinner fullScreen={false} /></div>
                    ) : purchases.length === 0 ? (
                      <div className="py-16 text-center text-gray-500 bg-gray-50 border border-gray-100 border-dashed rounded-md">
                        <Package size={32} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm">You haven't purchased any items yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {purchases.map((purchase) => (
                          <div key={purchase._id} id={`purchase-card-${purchase._id}`} className="border border-gray-100 rounded-lg overflow-hidden">
                            {/* Header — always visible, full click target */}
                            <div
                              className="bg-gray-50 px-5 py-4 flex justify-between items-center flex-wrap gap-4 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                              onClick={() => togglePurchaseExpanded(purchase._id)}
                            >
                              <div className="grid grid-cols-3 flex-1 gap-4">
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Order Date</p>
                                  <p className="text-sm font-semibold">{new Date(purchase.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Total Paid</p>
                                  <p className="text-sm font-semibold">{formatExact(purchase.totalAmount)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Reference</p>
                                  <p className="text-sm font-mono font-bold text-amber-700">{purchase.inquiryRef}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 ml-4 shrink-0">
                                <span className="px-3 py-1 text-[10px] uppercase tracking-wide rounded-full font-bold bg-green-100 text-green-700">
                                  Paid
                                </span>
                                <ChevronDown
                                  size={16}
                                  className={`text-gray-400 transition-transform duration-200 ${isPurchaseExpanded(purchase._id) ? 'rotate-180' : 'rotate-0'}`}
                                />
                              </div>
                            </div>

                            {/* Collapsible detail */}
                            {isPurchaseExpanded(purchase._id) && (
                              <div className="border-t border-gray-100 p-4 space-y-4">
                                <p className="text-[10px] text-gray-400">
                                  Paid on {new Date(purchase.payment?.paidAt).toLocaleDateString()} via card ending {purchase.payment?.cardLast4}
                                  {' · '}Track crafting progress under{' '}
                                  <button onClick={() => setActiveTab('orders')} className="text-amber-700 hover:underline font-semibold">My Inquiries</button>.
                                </p>
                                {(purchase.items || []).map((item: any, idx: number) => {
                                  // Bespoke configurations have no catalog record to hang a
                                  // review on, so they get no review control. Older records
                                  // hold a `SKU-variant` key, so normalise before linking.
                                  const sku = skuOf(item.productId);
                                  const isReviewable = !!sku && !item.isCustom;
                                  const existingReview = isReviewable ? reviewForProduct(sku) : null;

                                  return (
                                    <div key={item.productId || idx} className="flex gap-4 items-center">
                                      <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-serif">{item.name}</p>
                                        <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                                        {isReviewable && (
                                          <Link
                                            to={`/product/${sku}`}
                                            className="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-amber-700 hover:text-amber-900 transition-colors"
                                          >
                                            <Star size={11} fill={existingReview ? 'currentColor' : 'none'} />
                                            {existingReview ? 'Edit Review' : 'Write a Review'}
                                          </Link>
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold">{formatExact(item.price)}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'reviews' && (
                  <div>
                    <h2 className="text-xl font-serif text-[var(--color-ink)] mb-1">Reviews</h2>
                    <div className="w-10 h-px bg-[var(--color-gold)] mb-6" />

                    {/* Success banner shown once, right after submitting */}
                    {reviewSubmitted && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 max-w-lg">
                        <CheckCircle size={18} className="text-green-600 shrink-0" />
                        <p className="text-sm text-green-700">Review submitted — pending approval before it appears publicly.</p>
                      </div>
                    )}

                    {/* Shop review — one per account. Product reviews are written
                        from the piece's own page and listed alongside it below. */}
                    {!siteReview && (
                      <div className="mb-8 max-w-lg">
                        <h3 className="text-[10px] tracking-widest uppercase text-gray-500 font-bold mb-1">Share Your Experience</h3>
                        <p className="text-xs text-gray-400 mb-4">
                          An overall review of PD Jewellers. To review a specific piece you own, open it from{' '}
                          <button onClick={() => setActiveTab('purchases')} className="text-amber-700 hover:underline font-semibold">Purchased Items</button>.
                        </p>

                        <div className="mb-4">
                          <label className="text-[10px] tracking-widest uppercase text-gray-400 block mb-2">Rating</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <button key={s} onClick={() => setReviewRating(s)} type="button">
                                <Star
                                  size={22}
                                  className={s <= reviewRating ? 'text-amber-400' : 'text-gray-300'}
                                  fill={s <= reviewRating ? 'currentColor' : 'none'}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="text-[10px] tracking-widest uppercase text-gray-400 block mb-1">Title</label>
                          <input
                            value={reviewTitle}
                            onChange={e => setReviewTitle(e.target.value)}
                            maxLength={120}
                            placeholder="Sum it up in a few words (optional)"
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="text-[10px] tracking-widest uppercase text-gray-400 block mb-1">Your Review</label>
                          <textarea
                            value={reviewText}
                            onChange={e => setReviewText(e.target.value)}
                            rows={3}
                            maxLength={600}
                            placeholder="Tell us about your experience..."
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-amber-400"
                          />
                          <p className="text-xs text-gray-400 text-right mt-0.5">{reviewText.length}/600</p>
                        </div>

                        <button
                          onClick={() => guard(handleSubmitReview)}
                          disabled={reviewSubmitting || !reviewRating || !reviewText.trim()}
                          className="px-6 py-2.5 btn-richbrown text-white text-xs tracking-widest uppercase transition-colors disabled:opacity-40"
                        >
                          {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                      </div>
                    )}

                    {/* Existing reviews */}
                    {myReviews.length > 0 && (
                      <div>
                        <h3 className="text-[10px] tracking-widest uppercase text-gray-500 font-bold mb-4">My Reviews</h3>
                        <div className="space-y-4">
                        {myReviews.map((review) => (
                          <div key={review._id} className="border border-gray-100 rounded-lg p-5">
                            {/* What the review is about — a purchased piece, or the shop itself */}
                            <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-100">
                              {review.product ? (
                                <>
                                  <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded overflow-hidden shrink-0">
                                    <img src={review.product.image} alt={review.product.name} className="w-full h-full object-cover mix-blend-multiply" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[9px] uppercase tracking-widest text-[var(--color-gold-dark)] font-bold">Product Review</p>
                                    <Link to={`/product/${review.product.id}`} className="text-sm font-serif text-[var(--color-ink)] hover:underline line-clamp-1">
                                      {review.product.name}
                                    </Link>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded flex items-center justify-center shrink-0">
                                    <Gem size={16} className="text-amber-600" />
                                  </div>
                                  <div>
                                    <p className="text-[9px] uppercase tracking-widest text-[var(--color-gold-dark)] font-bold">Shop Review</p>
                                    <p className="text-sm font-serif text-[var(--color-ink)]">PD Jewellers</p>
                                  </div>
                                </>
                              )}
                            </div>

                            {editingReviewId === review._id ? (
                              <div>
                                <div className="flex gap-1 mb-3">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <button key={s} type="button" onClick={() => setEditReviewForm(p => ({ ...p, rating: s }))}>
                                      <Star
                                        size={18}
                                        className={s <= editReviewForm.rating ? 'text-amber-400' : 'text-gray-200'}
                                        fill={s <= editReviewForm.rating ? 'currentColor' : 'none'}
                                      />
                                    </button>
                                  ))}
                                </div>
                                <input
                                  value={editReviewForm.title}
                                  onChange={e => setEditReviewForm(p => ({ ...p, title: e.target.value }))}
                                  maxLength={120}
                                  placeholder="Title (optional)"
                                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-400 mb-2"
                                />
                                <textarea
                                  value={editReviewForm.text}
                                  onChange={e => setEditReviewForm(p => ({ ...p, text: e.target.value }))}
                                  rows={3}
                                  maxLength={600}
                                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-amber-400 mb-3"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditReviewSave(review._id)}
                                    disabled={editReviewSaving || !editReviewForm.rating || !editReviewForm.text.trim()}
                                    className="px-4 py-1.5 btn-richbrown text-white text-xs tracking-widest uppercase transition-colors disabled:opacity-40"
                                  >
                                    {editReviewSaving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingReviewId(null)}
                                    className="px-4 py-1.5 border border-gray-200 text-xs tracking-widest uppercase hover:bg-gray-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <Star
                                        key={s}
                                        size={14}
                                        className={s <= review.rating ? 'text-amber-400' : 'text-gray-200'}
                                        fill={s <= review.rating ? 'currentColor' : 'none'}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => handleEditReview(review)} className="text-gray-400 hover:text-amber-600 transition-colors" title="Edit review">
                                      <Edit size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReview(review._id)}
                                      disabled={deletingReviewId === review._id}
                                      className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                                      title="Delete review"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                                {review.title && (
                                  <p className="text-sm font-serif text-[var(--color-ink)] mb-1">{review.title}</p>
                                )}
                                <p className="text-sm text-gray-700 italic mb-3">"{review.text}"</p>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-400">
                                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                                  </p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                    review.approved
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : 'bg-amber-50 text-amber-600 border-amber-200'
                                  }`}>
                                    {review.approved ? 'Published' : 'Pending Approval'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'configs' && (
                  <>
                    <h2 className="text-xl font-serif text-[var(--color-ink)] mb-6">Saved Designs</h2>
                    
                    {!profileData?.savedConfigurations || profileData.savedConfigurations.length === 0 ? (
                      <div className="py-16 text-center text-gray-500 bg-gray-50 border border-gray-100 border-dashed rounded-md">
                        <Palette size={32} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm mb-6">You haven't saved any custom designs yet.</p>
                        <Link to="/configurator" className="inline-block px-6 py-3 btn-richbrown text-white text-[10px] uppercase tracking-widest transition-colors">
                          Start Designing
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {profileData.savedConfigurations.map((config: any) => (
                          <div key={config._id} className="flex flex-col group border border-gray-100 rounded-lg overflow-hidden pb-4">
                            <div className="relative aspect-square bg-gray-50 mb-4 overflow-hidden flex items-center justify-center">
                              {config.thumbnail ? (
                                <img
                                  src={config.thumbnail}
                                  alt="Saved design preview"
                                  className="w-full h-full object-cover"
                                />
                              ) : config.type === 'ring' ? (
                                <Wand2 size={40} className="text-amber-300" />
                              ) : (
                                <Gem size={40} className="text-amber-300" />
                              )}
                              <button
                                onClick={() => handleDeleteConfiguration(config._id)}
                                disabled={deletingConfigId === config._id}
                                className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                title="Remove saved design"
                              >
                                {deletingConfigId === config._id ? (
                                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            </div>
                            <div className="px-4 text-center flex-1 flex flex-col">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold-dark)] mb-1 font-bold">
                                {config.type === 'ring' ? 'CUSTOM RING' : 'CUSTOM PENDANT'}
                              </p>
                              <h3 className="font-serif text-sm md:text-md mb-2 text-[var(--color-ink)] flex-1 capitalize">
                                {config.type === 'ring'
                                  ? `${config.metal} ${config.stone || ''} Ring`
                                  : `${config.metal} ${config.pendantShape || 'Standard'} Pendant`}
                              </h3>
                              <p className="font-sans font-medium text-sm text-[var(--color-ink)] mb-2"><span className="text-[10px] text-gray-400 uppercase tracking-wider mr-1">Starting from</span>{formatPrice(config.price)}</p>

                              <div className="flex flex-wrap justify-center gap-1 mb-4">
                                {config.metal && (
                                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{config.metal}</span>
                                )}
                                {config.type === 'ring' && config.stone && (
                                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{config.stone}</span>
                                )}
                                {config.type === 'ring' && config.ringSize && (
                                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{config.ringSize}</span>
                                )}
                                {config.type === 'pendant' && (
                                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{config.pendantShape || 'Standard'}</span>
                                )}
                                {config.engravingText && (
                                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full italic">"{config.engravingText}"</span>
                                )}
                              </div>

                              <button
                                onClick={() => guard(() => handleAddConfigToInquiry(config))}
                                className="w-full text-center btn-richbrown text-white py-2 text-[10px] uppercase tracking-widest transition-colors mb-2"
                              >
                                Add to Inquiry
                              </button>
                              <button
                                onClick={() => handleOpenInConfigurator(config)}
                                className="w-full text-center border border-gray-200 text-gray-500 py-2 text-[10px] uppercase tracking-widest hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors mt-auto"
                              >
                                Open in Configurator
                              </button>
                            </div>
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
      {showWarning && <AdminActionWarning onClose={dismiss} />}
    </div>
  );
}
