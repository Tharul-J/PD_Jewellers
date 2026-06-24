import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FileText, ClipboardCheck, ArrowLeft, Phone, Calendar, Truck, Landmark, Mail, User } from 'lucide-react';

export default function Inquiry() {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [inquiryCreated, setInquiryCreated] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    notes: '',
    collectionType: 'pickup' // 'pickup' | 'delivery'
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please log in to submit your inquiry.");
      return;
    }
    setIsProcessing(true);

    try {
      const orderItems = items.map(item => ({
        productId: item.id.toString(),
        name: item.name,
        price: item.price,
        image: item.image,
        category: 'Inquiry',
        isCustom: item.id.toString().startsWith('custom')
      }));

      const shippingAddress = {
        fullName: formData.fullName,
        address: formData.address || 'Pickup Selected',
        city: formData.city || 'Colombo',
        postalCode: formData.postalCode || '00000',
        country: formData.collectionType === 'pickup' ? 'In-Store Pickup' : 'Home Delivery',
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          orderItems,
          shippingAddress,
          totalPrice: cartTotal
        })
      });

      if (response.ok) {
        const createdData = await response.json();
        setInquiryCreated(createdData);
        clearCart();
      } else {
        const errorData = await response.json();
        alert(`Inquiry failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Inquiry error:", error);
      alert("An error occurred during submitting your inquiry.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (inquiryCreated) {
     return (
        <div className="min-h-[75vh] flex flex-col items-center justify-center px-6 pt-32 pb-24 bg-gray-50/50">
          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-8 border border-amber-200 animate-pulse">
            <ClipboardCheck size={36} />
          </div>
          <h1 className="text-4xl font-serif mb-3 text-center text-stone-900">Inquiry Received</h1>
          <p className="opacity-70 mb-8 max-w-md text-center text-sm font-sans leading-relaxed">
            Thank you. Your custom inquiry has been successfully forwarded to the PD Jewellers system administration for review.
          </p>

          <div className="bg-white border border-amber-200/80 p-8 rounded-2xl shadow-sm max-w-md w-full mb-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500" />
            <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Inquiry Reference Number</span>
            <div className="text-3xl font-mono font-black text-amber-700 tracking-wider my-3">
              {inquiryCreated.inquiryRef || 'INQ-PENDING'}
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed max-w-xs mx-auto">
              Save this reference number to easily track status. We will check craftsman slot and material availability and get back shortly.
            </p>
          </div>

          <div className="flex gap-4">
            <Link 
              to="/profile" 
              className="btn-richbrown text-white px-8 py-4 uppercase tracking-[0.22em] text-[10px] font-bold transition-colors rounded-xl shadow-lg shadow-stone-950/10"
            >
              Track Status in Profile
            </Link>
            <Link 
              to="/collections" 
              className="bg-white border border-stone-200 text-stone-700 px-8 py-4 uppercase tracking-[0.22em] text-[10px] font-bold hover:bg-stone-50 transition-colors rounded-xl"
            >
              Return to Catalog
            </Link>
          </div>
        </div>
     );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 pt-32 pb-24">
        <h1 className="text-4xl font-serif mb-4 text-stone-900">Your Inquiry List is Empty</h1>
        <p className="opacity-60 mb-8 max-w-sm text-center text-sm">
          Add luxury handcrafted or bespoke products to start an official inquiry.
        </p>
        <Link 
          to="/collections" 
          className="btn-richbrown text-white px-8 py-4 uppercase tracking-widest text-[10px] font-bold transition-colors rounded-xl shadow-md"
        >
          Explore Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-gray-50/30">
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-16">
        <div className="lg:w-3/5">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#cca150] hover:underline mb-8">
            <ArrowLeft size={14} /> Back to Atelier Home
          </Link>
          
          <h1 className="text-4xl font-serif mb-2 text-stone-900">Atelier Custom Inquiry</h1>
          <p className="text-sm text-stone-500 mb-10">
            Submit a bespoke order or check availability for luxury items. One of our master jewellers will review parameters instantly.
          </p>
          
          <form onSubmit={handleInquirySubmit} className="space-y-10">
            {/* Contact Information */}
            <section className="bg-white border border-stone-100 p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-6">
              <h2 className="text-xs uppercase tracking-[0.15em] font-extrabold text-[#cca150] border-b border-stone-100 pb-3 flex items-center gap-2">
                <User size={14} /> <span>Contact Information</span>
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1.5">Authorized Name</label>
                  <input 
                    type="text" 
                    name="fullName" 
                    value={formData.fullName} 
                    onChange={handleInputChange} 
                    placeholder="e.g. Tharul Senanayake" 
                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors shadow-inner" 
                    required 
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1.5">Direct Line (Telephone)</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleInputChange} 
                    placeholder="e.g. +94 77 123 4567" 
                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors shadow-inner" 
                    required 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    placeholder="tharul2002@gmail.com" 
                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors shadow-inner" 
                    required 
                  />
                </div>
              </div>
            </section>

            {/* Collection Method Preference */}
            <section className="bg-white border border-stone-100 p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-6">
              <h2 className="text-xs uppercase tracking-[0.15em] font-extrabold text-[#cca150] border-b border-stone-100 pb-3 flex items-center gap-2">
                <Truck size={14} /> <span>Availability & Preferred Collection</span>
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, collectionType: 'pickup' })}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    formData.collectionType === 'pickup'
                      ? 'border-amber-600 bg-amber-50/10'
                      : 'border-stone-200 hover:border-stone-400 bg-stone-50/30'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs uppercase tracking-wide text-stone-900">In-Store VIP Pickup</span>
                    <Landmark size={18} className={formData.collectionType === 'pickup' ? 'text-amber-600' : 'text-stone-400'} />
                  </div>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    Collect directly from our Atelier showroom in Colombo after availability verification review.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, collectionType: 'delivery' })}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    formData.collectionType === 'delivery'
                      ? 'border-amber-600 bg-amber-50/10'
                      : 'border-stone-200 hover:border-stone-400 bg-stone-50/30'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs uppercase tracking-wide text-stone-900">Premium Insured Delivery</span>
                    <Truck size={18} className={formData.collectionType === 'delivery' ? 'text-amber-600' : 'text-stone-400'} />
                  </div>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    Secure armored courier dispatch across all Sri Lankan provinces once mastercraft is complete.
                  </p>
                </button>
              </div>

              {formData.collectionType === 'delivery' && (
                <div className="grid grid-cols-2 gap-4 pt-4 animate-in fade-in slide-in-from-top-1">
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1.5">Delivery Address</label>
                    <input 
                      type="text" 
                      name="address" 
                      value={formData.address} 
                      onChange={handleInputChange} 
                      placeholder="Street, suite number" 
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors shadow-inner" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1.5">City</label>
                    <input 
                      type="text" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleInputChange} 
                      placeholder="Colombo / Kandy" 
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors shadow-inner" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1.5">Postal Zip Code</label>
                    <input 
                      type="text" 
                      name="postalCode" 
                      value={formData.postalCode} 
                      onChange={handleInputChange} 
                      placeholder="00100" 
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors shadow-inner" 
                      required 
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Customizer specific Notes or Questions */}
            <section className="bg-white border border-stone-100 p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-6">
              <h2 className="text-xs uppercase tracking-[0.15em] font-extrabold text-[#cca150] border-b border-stone-100 pb-3 flex items-center gap-2">
                <FileText size={14} /> <span>Atelier Special Instruction Notes</span>
              </h2>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1.5">Bespoke instructions / inquiries</label>
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleInputChange} 
                  rows={4}
                  placeholder="e.g. Kindly request checking if 22K Solid Gold is currently in stock for crafting or if sizing could be adjusted to precisely US 7.5. Also interested in matching studs." 
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-amber-500 transition-colors shadow-inner resize-none leading-relaxed" 
                />
              </div>
            </section>

            <button 
               type="submit" 
               disabled={isProcessing || !user}
               className="w-full btn-richbrown text-white py-5 uppercase tracking-[0.22em] text-[11px] font-extrabold transition-colors shadow-xl rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? <LoadingSpinner fullScreen={false} /> : "Transmit Official Inquiry to Admin"}
            </button>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:w-2/5">
          <div className="bg-white p-8 border border-stone-100/80 sticky top-32 shadow-sm rounded-2xl">
            <h2 className="text-lg font-serif mb-6 border-b border-stone-100 pb-4 text-stone-900">Inquiry Manifest</h2>
            
            <div className="space-y-6 mb-8 overflow-y-auto max-h-[40vh] pr-2">
              {items.map(item => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover mix-blend-multiply" />
                  </div>
                  <div className="flex-1 text-sm">
                    <h3 className="font-bold uppercase tracking-wider text-[10px] text-stone-800 mb-1">{item.name}</h3>
                    <p className="text-[9px] text-stone-400 uppercase tracking-widest font-mono">
                      {item.options?.material} {item.options?.stone && `· Stone: ${item.options.stone}`} {item.options?.size && `· Size: ${item.options.size}`}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-400 text-xs">Qty: {item.quantity}</span>
                      <span className="font-serif font-semibold text-stone-900 text-xs">Est. Rs. {Number(item.price).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-stone-100">
              <div className="flex justify-between text-xs text-stone-500">
                <span>Total Items</span>
                <span>{items.reduce((acc, it) => acc + it.quantity, 0)} Units</span>
              </div>
              <div className="flex justify-between font-serif text-lg text-stone-900 pt-1 border-t border-stone-100">
                <span>Total Est. Value</span>
                <div className="text-right">
                  <span className="block text-[9px] text-stone-400 font-sans tracking-widest uppercase mb-0.5">Starting from</span>
                  <span className="font-semibold">Rs. {cartTotal.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-[9px] text-stone-400 font-sans leading-relaxed text-center italic mt-2">
                * Handcrafting, duty, and secure armored delivery premiums are computed inside the admin quotation review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
