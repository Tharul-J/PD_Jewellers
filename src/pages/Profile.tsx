import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';
import { LogOut, User as UserIcon, Settings, Heart, ShoppingBag, Trash2, Palette, Edit, Lock, Camera, Phone, MapPin, Check, X } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { METALS, STONES, FONTS } from '../constants';

const PRESET_AVATARS = [
  { name: 'Emerald Monarch', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200' },
  { name: 'Golden Aura', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { name: 'Pearl Elegance', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
  { name: 'Royal Ruby', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200' },
  { name: 'Sapphire Breeze', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200' },
  { name: 'Onyx Classic', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
];

const STATUS_LABELS: Record<string, string> = {
  pending:                'Pending Review',
  availability_confirmed: 'Confirmed',
  crafting:               'Crafting',
  completed:              'Collection / Handover',
  declined:               'Declined',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const { wishlist, toggleWishlistItem, isLoading: isWishlistLoading } = useWishlist();
  const { addToCart, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'account' | 'wishlist' | 'orders' | 'configs'>('account');
  
  const [orders, setOrders] = useState<any[]>([]);

  const [ordersLoading, setOrdersLoading] = useState(false);

  // Edit / password modes
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile Form States
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
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
      setEditAvatar(profileData.avatar || '');
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
          avatar: editAvatar,
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
    if (activeTab === 'orders' && user) {
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
  }, [activeTab, user]);

  const handleAddToInquiry = (item: any) => {
    addToCart({ id: item.productId, name: item.name, price: Number(item.price), image: item.image });
    setIsCartOpen(false);
    navigate('/inquiry');
  };

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
              <div className="mb-8 flex flex-col items-center md:items-start text-center md:text-left">
                {profileData?.avatar ? (
                  <img 
                    src={profileData.avatar} 
                    alt={profileData.name} 
                    className="w-24 h-24 rounded-full object-cover border-2 border-[var(--color-gold)] mb-4 shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[var(--color-ink)] to-gray-700 flex items-center justify-center text-white text-3xl font-serif border-2 border-[var(--color-gold)] mb-4 shadow-sm">
                    {(profileData?.name || user?.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <h1 className="text-2xl font-serif text-[var(--color-ink)] break-words w-full">{profileData?.name || user?.name}</h1>
                <p className="text-gray-500 mt-2 text-sm break-all w-full">{profileData?.email || user?.email}</p>
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
                  <ShoppingBag size={16} /> My Inquiries
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
                
                {activeTab === 'account' && !isEditing && !isChangingPassword && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                      <h2 className="text-xl font-serif text-[var(--color-ink)]">Account Details</h2>
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
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Full Name</label>
                        <p className="text-[var(--color-ink)] font-medium border-b border-gray-100 pb-2">{profileData?.name || user?.name}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Email Address</label>
                        <p className="text-[var(--color-ink)] font-medium border-b border-gray-100 pb-2">{profileData?.email || user?.email}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Phone Number</label>
                        <p className="text-[var(--color-ink)] font-medium border-b border-gray-100 pb-2">{profileData?.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Account Type</label>
                        <p className="text-[var(--color-ink)] font-medium border-b border-gray-100 pb-2 capitalize">{user?.role || 'Customer'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Member Since</label>
                        <p className="text-[var(--color-ink)] font-medium border-b border-gray-100 pb-2">
                          {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-8 mt-8">
                      <h3 className="text-md font-serif text-[var(--color-ink)] mb-4 flex items-center gap-2"><MapPin size={16} className="text-gray-400" /> Default Delivery Address</h3>
                      {profileData?.address?.street || profileData?.address?.city || profileData?.address?.state ? (
                        <div className="bg-gray-50 p-4 rounded-sm border border-gray-100 text-sm text-gray-700 space-y-1">
                          <p className="font-semibold text-[var(--color-ink)]">{profileData.name || user?.name}</p>
                          <p>{profileData.address.street}</p>
                          <p>{profileData.address.city}, {profileData.address.state} {profileData.address.zip}</p>
                          <p className="uppercase font-semibold tracking-wider text-[10px] text-gray-500 mt-1">{profileData.address.country}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No delivery address saved yet. Update your profile to add an address.</p>
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

                    {/* Avatar Selection */}
                    <div className="mb-8">
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Select Profile Icon</label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                        {PRESET_AVATARS.map((p) => {
                          const isSelected = editAvatar === p.url;
                          return (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => setEditAvatar(p.url)}
                              className={`relative rounded-full aspect-square overflow-hidden border-2 transition-all p-0.5 ${isSelected ? 'border-[var(--color-gold)] scale-105 shadow-md' : 'border-transparent opacity-75 hover:opacity-100'}`}
                              title={p.name}
                            >
                              <img src={p.url} alt={p.name} className="w-full h-full rounded-full object-cover" />
                              {isSelected && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                                  <Check size={14} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Or Avatar Image URL</label>
                        <input 
                          type="text" 
                          value={editAvatar}
                          onChange={(e) => setEditAvatar(e.target.value)}
                          placeholder="https://example.com/your-image.jpg"
                          className="w-full border border-gray-200 p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-[var(--color-ink)] transition-colors"
                        />
                      </div>
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
                          placeholder="e.g. +1 (555) 019-9234"
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
                        className="px-5 py-2 bg-[var(--color-ink)] hover:bg-black text-white transition-colors text-[10px] uppercase tracking-widest font-semibold flex items-center gap-2"
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
                        className="px-5 py-2 bg-[var(--color-ink)] hover:bg-black text-white transition-colors text-[10px] uppercase tracking-widest font-semibold"
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
                              <p className="font-sans font-medium text-sm text-[var(--color-ink)] mb-4">Rs. {Number(item.price).toLocaleString()}</p>
                              
                              <button
                                onClick={() => handleAddToInquiry(item)}
                                className="w-full text-center bg-[var(--color-ink)] text-white py-2 text-[10px] uppercase tracking-widest hover:bg-black transition-colors mb-2"
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
                        <Link to="/collections" className="inline-block px-6 py-3 bg-[var(--color-ink)] text-white text-[10px] uppercase tracking-widest hover:bg-black transition-colors">
                          Browse Collections
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {orders.map((order) => (
                          <div key={order._id} className="border border-gray-100 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Inquiry Sent</p>
                                <p className="text-sm font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Estimated Value</p>
                                <p className="text-sm font-semibold">Rs. {Number(order.totalPrice || 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Inquiry Reference Code</p>
                                <p className="text-sm font-mono font-bold text-amber-700">{order.inquiryRef || 'INQ-PENDING'}</p>
                              </div>
                              <div>
                                <span className={`px-3 py-1 text-[10px] uppercase tracking-wide rounded-full font-bold
                                  ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' : ''}
                                  ${order.status === 'availability_confirmed' ? 'bg-blue-100 text-blue-700' : ''}
                                  ${order.status === 'crafting' ? 'bg-yellow-100 text-[var(--color-gold-dark)]' : ''}
                                  ${order.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                                  ${order.status === 'declined' ? 'bg-red-100 text-red-700' : ''}
                                `}>
                                  {STATUS_LABELS[order.status] ?? order.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                            
                            {/* Inquiry Tracker */}
                            {order.status !== 'declined' ? (
                              <div className="px-8 py-6 border-b border-gray-100 bg-white">
                                <div className="relative">
                                  {/* Track Line */}
                                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-200 -translate-y-1/2"></div>
                                  <div 
                                    className="absolute top-1/2 left-0 h-[2px] bg-[var(--color-gold)] -translate-y-1/2 transition-all duration-500"
                                    style={{
                                      width: 
                                        order.status === 'pending' ? '0%' :
                                        order.status === 'availability_confirmed' ? '33.33%' :
                                        order.status === 'crafting' ? '66.66%' :
                                        '100%'
                                    }}
                                  ></div>

                                  {/* Status Points */}
                                  <div className="relative flex justify-between">
                                    {[
                                      { id: 'pending', label: 'Pending Review' },
                                      { id: 'availability_confirmed', label: 'Confirmed' },
                                      { id: 'crafting', label: 'Crafting' },
                                      { id: 'completed', label: 'Collection / Handover' }
                                    ].map((step, index) => {
                                      const indexMap: Record<string, number> = {
                                        'pending': 0,
                                        'availability_confirmed': 1,
                                        'crafting': 2,
                                        'completed': 3
                                      };
                                      const currentIdx = indexMap[order.status] ?? 0;
                                      const isActive = currentIdx >= index;
                                        
                                      return (
                                        <div key={step.id} className="flex flex-col items-center">
                                          <div className={`w-4 h-4 rounded-full border-2 bg-white z-10 transition-colors ${isActive ? 'border-[var(--color-gold)]' : 'border-gray-300'}`}>
                                            {isActive && <div className="w-2 h-2 bg-[var(--color-gold)] rounded-full mx-auto mt-[2px]"></div>}
                                          </div>
                                          <span className={`text-[9px] uppercase tracking-wider mt-3 font-bold text-center w-24 ${isActive ? 'text-[var(--color-ink)]' : 'text-gray-400'}`}>
                                            {step.label}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="px-8 py-4 bg-red-50 border-b border-gray-100 text-xs text-red-700 italic font-semibold">
                                * The requested workshop slot or material selection has been marked as unavailable for your customization. Please contact customer care.
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
                                    <p className="text-sm font-semibold">Rs. {Number(item.price).toLocaleString()}</p>
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
                              <p className="font-semibold">Rs. {Number(config.price).toLocaleString()}</p>
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
                            
                            <button
                              onClick={() => {
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
                              }}
                              className="block w-full text-center border border-[var(--color-gold)] text-[var(--color-gold-dark)] py-2 text-[10px] uppercase tracking-widest hover:bg-[var(--color-gold)] hover:text-white transition-colors"
                            >
                              Open in Configurator
                            </button>
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
