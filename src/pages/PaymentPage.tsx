import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Lock, CheckCircle, ShieldAlert } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

declare global {
  interface Window { PasswordCredential: any; }
}

export default function PaymentPage() {
  const { inquiryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inquiry, setInquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState({ cardNumber: '', expiry: '', cvv: '', cardHolder: '' });
  const [saveCard, setSaveCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !inquiryId) return;
    const fetchInquiry = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${inquiryId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Inquiry not found');
        if (data.status !== 'availability_confirmed') {
          throw new Error('This inquiry is not confirmed for ordering.');
        }
        setInquiry(data);
      } catch (err: any) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInquiry();
  }, [user, inquiryId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === 'cardNumber') value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    if (name === 'expiry') value = value.replace(/\D/g, '').slice(0, 4).replace(/(.{2})/, '$1/');
    if (name === 'cvv') value = value.replace(/\D/g, '').slice(0, 3);
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.cardNumber || !form.expiry || !form.cvv || !form.cardHolder) {
      setError('Please fill all fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ inquiryId, cardHolder: form.cardHolder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment failed');
      setSuccess(true);

      // Never persist the CVV — it's the one field PCI-DSS forbids storing
      // post-authorization. Only the card number/name go into the browser's
      // native save prompt, and only if the user opted in.
      if (saveCard && 'credentials' in navigator && window.PasswordCredential) {
        try {
          const cred = new window.PasswordCredential({
            id: form.cardNumber.replace(/\s/g, ''),
            password: '',
            name: form.cardHolder,
          });
          await navigator.credentials.store(cred);
        } catch {
          // silent — credential API not supported or user dismissed
        }
      }

      setTimeout(() => navigate('/profile?tab=purchases'), 2200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] px-4">
        <div className="max-w-md w-full bg-white border border-gray-100 rounded-lg p-8 text-center">
          <ShieldAlert size={32} className="mx-auto mb-4 text-rose-500" />
          <h2 className="text-xl font-serif text-[var(--color-ink)] mb-2">Unable to Proceed</h2>
          <p className="text-sm text-gray-500 mb-6">{loadError}</p>
          <Link to="/profile?tab=orders" className="inline-block px-6 py-3 btn-richbrown text-white text-[10px] uppercase tracking-widest transition-colors">
            Back to My Inquiries
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif text-[var(--color-ink)] mb-2">Order Confirmed</h2>
          <p className="text-gray-500 text-sm">Redirecting to your purchased items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-lg p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Lock size={16} className="text-[var(--color-gold-dark)]" />
          <span className="text-[10px] tracking-widest uppercase text-gray-500">Secure Payment</span>
        </div>
        <h1 className="text-xl font-serif text-[var(--color-ink)] mb-1">Complete Your Order</h1>
        <div className="w-10 h-px bg-[var(--color-gold)] mb-6" />

        {inquiry && (
          <div className="mb-6 border border-gray-100 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              <span>Inquiry Reference</span>
              <span className="font-mono font-bold text-amber-700">{inquiry.inquiryRef}</span>
            </div>
            <div className="space-y-1 mt-2">
              {(inquiry.orderItems || []).map((item: any, idx: number) => (
                <p key={idx} className="text-xs text-gray-600 truncate">{item.name}</p>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-sm font-semibold text-[var(--color-ink)]">Rs. {Number(inquiry.totalPrice || 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 mb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <CreditCard size={28} className="mb-4 text-amber-400" />
          <p className="text-lg tracking-[0.2em] font-mono mb-3">
            {form.cardNumber || '•••• •••• •••• ••••'}
          </p>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{form.cardHolder || 'CARD HOLDER'}</span>
            <span>{form.expiry || 'MM/YY'}</span>
          </div>
        </div>

        {[
          { label: 'Card Holder Name', name: 'cardHolder', placeholder: 'As on card', autoComplete: 'cc-name' },
          { label: 'Card Number', name: 'cardNumber', placeholder: '1234 5678 9012 3456', autoComplete: 'cc-number' },
          { label: 'Expiry Date', name: 'expiry', placeholder: 'MM/YY', autoComplete: 'cc-exp' },
          { label: 'CVV', name: 'cvv', placeholder: '•••', autoComplete: 'cc-csc' },
        ].map(f => (
          <div key={f.name} className="mb-4">
            <label className="block text-[10px] tracking-widest uppercase text-gray-400 mb-1">{f.label}</label>
            <input
              name={f.name}
              value={form[f.name as keyof typeof form]}
              onChange={handleChange}
              placeholder={f.placeholder}
              type={f.name === 'cvv' ? 'password' : 'text'}
              autoComplete={f.autoComplete}
              className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        ))}

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={saveCard}
            onChange={e => setSaveCard(e.target.checked)}
            className="w-4 h-4 accent-amber-600"
          />
          <span className="text-xs text-gray-500">Save card details for future payments</span>
        </label>

        {error && <p className="text-rose-600 text-xs mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full btn-richbrown text-white text-xs tracking-widest uppercase py-3.5 rounded transition-colors disabled:opacity-50"
        >
          {submitting ? 'Processing...' : 'Confirm Payment'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
          <Lock size={11} /> SSL encrypted &middot; Demo environment
        </p>
      </div>
    </div>
  );
}
