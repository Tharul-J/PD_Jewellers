import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    address: '',
    city: '',
    postalCode: '',
    country: 'us'
  });

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please log in to complete your checkout.");
      return;
    }
    setIsProcessing(true);

    try {
      // Create backend format
      const orderItems = items.map(item => ({
        productId: item.id.toString(), // Ensuring it's a string
        name: item.name,
        price: item.price,
        image: item.image,
        category: 'Purchase',
        isCustom: item.id.toString().startsWith('custom')
      }));

      const shippingAddress = {
        fullName: `${formData.firstName} ${formData.lastName}`,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
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
          totalPrice: cartTotal + 50
        })
      });

      if (response.ok) {
        clearCart();
        setOrderComplete(true);
      } else {
        const errorData = await response.json();
        alert(`Checkout failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("An error occurred during checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (orderComplete) {
     return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-serif mb-4 text-center">Order Confirmed!</h1>
          <p className="opacity-60 mb-8 max-w-md text-center">
            Thank you for your purchase. Your order is now being processed. You can track its status in your profile.
          </p>
          <Link 
            to="/profile" 
            className="bg-[var(--color-ink)] text-white px-8 py-3 uppercase tracking-widest text-xs hover:bg-[#333] transition-colors"
          >
            View Order Status
          </Link>
        </div>
     );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-serif mb-6">Your Bag is Empty</h1>
        <p className="opacity-60 mb-8 max-w-md text-center">
          You haven't added any items to your bag yet. Discover our curated collections to find your perfect piece.
        </p>
        <Link 
          to="/collections" 
          className="bg-[var(--color-ink)] text-white px-8 py-3 uppercase tracking-widest text-xs hover:bg-[#333] transition-colors"
        >
          Explore Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col lg:flex-row gap-16">
      <div className="lg:w-3/5">
        <h1 className="text-4xl font-serif mb-10">Secure Checkout</h1>
        
        <form onSubmit={handleCheckout} className="space-y-12">
          {/* Contact Info */}
          <section>
            <h2 className="text-xs uppercase tracking-[0.15em] font-semibold mb-6 flex justify-between items-center border-b border-[rgba(26,26,26,0.1)] pb-4">
              <span>Contact Information</span>
              <span className="opacity-50 text-[10px]">Step 1 of 3</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First Name" className="col-span-1 p-3 bg-white border border-[rgba(26,26,26,0.1)] text-sm focus:outline-none focus:border-[var(--color-ink)]" required />
              <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last Name" className="col-span-1 p-3 bg-white border border-[rgba(26,26,26,0.1)] text-sm focus:outline-none focus:border-[var(--color-ink)]" required />
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address" className="col-span-2 p-3 bg-white border border-[rgba(26,26,26,0.1)] text-sm focus:outline-none focus:border-[var(--color-ink)]" required />
            </div>
          </section>

          {/* Shipping Info */}
          <section>
            <h2 className="text-xs uppercase tracking-[0.15em] font-semibold mb-6 flex justify-between items-center border-b border-[rgba(26,26,26,0.1)] pb-4">
              <span>Shipping Details</span>
              <span className="opacity-50 text-[10px]">Step 2 of 3</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="Address line 1" className="col-span-2 p-3 bg-white border border-[rgba(26,26,26,0.1)] text-sm focus:outline-none focus:border-[var(--color-ink)]" required />
              <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="City" className="col-span-1 p-3 bg-white border border-[rgba(26,26,26,0.1)] text-sm focus:outline-none focus:border-[var(--color-ink)]" required />
              <input type="text" name="postalCode" value={formData.postalCode} onChange={handleInputChange} placeholder="Postal Code" className="col-span-1 p-3 bg-white border border-[rgba(26,26,26,0.1)] text-sm focus:outline-none focus:border-[var(--color-ink)]" required />
              <select name="country" value={formData.country} onChange={handleInputChange} className="col-span-2 p-3 bg-white border border-[rgba(26,26,26,0.1)] text-sm focus:outline-none focus:border-[var(--color-ink)] text-gray-500 opacity-70">
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
                <option value="ca">Canada</option>
                <option value="eu">Europe</option>
              </select>
            </div>
          </section>

          {/* Payment Info */}
          <section>
            <h2 className="text-xs uppercase tracking-[0.15em] font-semibold mb-6 flex justify-between items-center border-b border-[rgba(26,26,26,0.1)] pb-4">
              <span>Payment</span>
              <span className="opacity-50 text-[10px]">Step 3 of 3</span>
            </h2>
            <div className="p-4 bg-white border border-[rgba(26,26,26,0.1)] relative">
              <p className="text-xs text-center opacity-60 my-6">Payment processing is simulated. Click Place Order to confirm.</p>
              <div className="grid grid-cols-2 gap-4 opacity-50 pointer-events-none">
                <input type="text" placeholder="Card Number" className="col-span-2 p-3 bg-[var(--color-paper)] text-sm border border-[rgba(26,26,26,0.1)]" disabled />
                <input type="text" placeholder="MM/YY" className="col-span-1 p-3 bg-[var(--color-paper)] text-sm border border-[rgba(26,26,26,0.1)]" disabled />
                <input type="text" placeholder="CVC" className="col-span-1 p-3 bg-[var(--color-paper)] text-sm border border-[rgba(26,26,26,0.1)]" disabled />
              </div>
            </div>
          </section>

          {!user && (
            <p className="text-red-500 text-xs mt-2">* Please log in to complete checkout.</p>
          )}

          <button 
             type="submit" 
             disabled={isProcessing || !user}
             className="w-full relative flex items-center justify-center bg-[var(--color-ink)] text-white py-4 uppercase tracking-[0.2em] text-xs font-semibold hover:bg-black transition-colors shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <LoadingSpinner fullScreen={false} /> : `Simulate Payment · ${(cartTotal + 50).toLocaleString()}`}
          </button>
        </form>
      </div>

      {/* Order Summary Sidebar */}
      <div className="lg:w-2/5">
        <div className="bg-white p-8 border border-[rgba(26,26,26,0.1)] sticky top-24 shadow-sm">
          <h2 className="text-xl font-serif mb-6 border-b border-[rgba(26,26,26,0.1)] pb-4">Order Summary</h2>
          
          <div className="space-y-6 mb-8 overflow-y-auto max-h-[40vh] pr-2">
            {items.map(item => (
              <div key={item.id} className="flex gap-4">
                <div className="w-16 h-16 bg-[var(--color-paper)] rounded overflow-hidden flex-shrink-0">
                  <img src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover mix-blend-multiply" />
                </div>
                <div className="flex-1 text-sm">
                  <h3 className="font-semibold uppercase tracking-widest text-[10px] mb-1">{item.name}</h3>
                  <p className="opacity-60 text-xs mb-2">Qty: {item.quantity}</p>
                  <p className="font-serif">${item.price.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-6 border-t border-[rgba(26,26,26,0.1)] text-sm">
            <div className="flex justify-between opacity-60">
              <span>Subtotal</span>
              <span>${cartTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between opacity-60">
              <span>Shipping</span>
              <span>$50.00</span>
            </div>
            <div className="flex justify-between font-serif text-xl border-t border-[rgba(26,26,26,0.1)] pt-4 mt-4">
              <span>Total</span>
              <span>${(cartTotal + 50).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
