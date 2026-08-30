import { useCallback, useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdminGuard } from '../hooks/useAdminGuard';
import AdminActionWarning from './AdminActionWarning';
import { skuOf } from '../lib/sku';

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

/** Brand gold — the single primary-action colour across recent components. */
const GOLD = '#B8860B';

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size} fill={s <= value ? 'currentColor' : 'none'} className={s <= value ? '' : 'text-gray-300'} />
      ))}
    </div>
  );
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { user } = useAuth();
  const { guard, showWarning, dismiss } = useAdminGuard();

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myReview, setMyReview] = useState<any>(null);
  const [hasPurchased, setHasPurchased] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ rating: 0, title: '', text: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const loadApproved = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews/product/${productId}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews ?? []);
    } catch {
      // leave the list empty — the section simply shows its empty state
    }
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadApproved().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadApproved]);

  // Eligibility is two questions — did they buy it, and have they already
  // written about it — answered by the endpoints that already exist.
  useEffect(() => {
    if (!user) {
      setMyReview(null);
      setHasPurchased(false);
      return;
    }
    let cancelled = false;
    const auth = { Authorization: `Bearer ${user.token}` };

    (async () => {
      try {
        const [reviewsRes, purchasesRes] = await Promise.all([
          fetch('/api/reviews/mine', { headers: auth }),
          fetch('/api/purchases/my', { headers: auth }),
        ]);
        if (cancelled) return;

        if (reviewsRes.ok) {
          const data = await reviewsRes.json();
          const mine = (data.reviews ?? []).find((r: any) => r.product?.id === productId);
          setMyReview(mine ?? null);
        }
        if (purchasesRes.ok) {
          const purchases = await purchasesRes.json();
          // Purchases may hold a bare SKU or an older `SKU-variant` key.
          setHasPurchased(
            (purchases ?? []).some((p: any) =>
              (p.items ?? []).some((item: any) => skuOf(item?.productId) === productId)
            )
          );
        }
      } catch {
        // offline — the write controls stay hidden, the public list still shows
      }
    })();

    return () => { cancelled = true; };
  }, [user, productId]);

  const openForm = () => {
    setForm({
      rating: myReview?.rating ?? 0,
      title: myReview?.title ?? '',
      text: myReview?.text ?? '',
    });
    setError('');
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.rating || !form.text.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(myReview ? `/api/reviews/${myReview._id}` : '/api/reviews', {
        method: myReview ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ ...form, product: productId, reviewType: 'product' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save review');
      setMyReview(data.review);
      setIsFormOpen(false);
      setJustSaved(true);
      // An edit drops back to pending, so it leaves the approved list too.
      await loadApproved();
    } catch (err: any) {
      setError(err.message || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  return (
    <div className="mt-24 border-t border-stone-200/60 pt-16">
      <div className="text-center mb-12">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#cca150] font-bold">Owner Testimony</span>
        <h2 className="text-2xl font-serif text-stone-900 mt-1">Customer Reviews</h2>
        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#cca150] to-transparent mx-auto mt-4" />
        {reviews.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <StarRow value={Math.round(average)} size={16} />
            <span className="text-xs text-stone-500">
              {average.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Write / edit controls — only for verified purchasers */}
        {user && hasPurchased && (
          <div className="mb-8">
            {!isFormOpen ? (
              <div className="flex items-center justify-between gap-4 flex-wrap bg-white border border-stone-100 rounded-xl p-5">
                <div>
                  <p className="text-sm font-serif text-stone-900">
                    {myReview ? 'You reviewed this piece' : 'You own this piece'}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {myReview
                      ? myReview.approved
                        ? 'Your review is published.'
                        : 'Your review is pending approval.'
                      : 'Share how it has worn for you.'}
                  </p>
                </div>
                <button
                  onClick={openForm}
                  style={{ backgroundColor: GOLD }}
                  className="text-white px-5 py-2.5 uppercase tracking-widest text-xs font-bold transition-opacity hover:opacity-90 rounded-lg"
                >
                  {myReview ? 'Edit Review' : 'Write a Review'}
                </button>
              </div>
            ) : (
              <div className="bg-white border border-stone-100 rounded-xl p-6">
                <h3 className="text-sm font-serif text-stone-900 mb-4">
                  {myReview ? 'Edit your review' : `Review the ${productName}`}
                </h3>

                <label className="block text-[10px] tracking-widest uppercase text-stone-400 mb-2">Rating</label>
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" onClick={() => setForm(p => ({ ...p, rating: s }))}>
                      <Star
                        size={22}
                        className={s <= form.rating ? 'text-amber-400' : 'text-gray-300'}
                        fill={s <= form.rating ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                </div>

                <label className="block text-[10px] tracking-widest uppercase text-stone-400 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  maxLength={120}
                  placeholder="Sum it up in a few words (optional)"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-amber-400"
                />

                <label className="block text-[10px] tracking-widest uppercase text-stone-400 mb-1">Your Review</label>
                <textarea
                  value={form.text}
                  onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                  rows={4}
                  maxLength={600}
                  placeholder="How does it wear? How was the craftsmanship?"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-amber-400"
                />
                <p className="text-xs text-stone-400 text-right mt-0.5 mb-4">{form.text.length}/600</p>

                {error && <p className="text-rose-600 text-xs mb-3">{error}</p>}

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => guard(handleSave)}
                    disabled={saving || !form.rating || !form.text.trim()}
                    style={{ backgroundColor: GOLD }}
                    className="text-white px-5 py-2.5 uppercase tracking-widest text-xs font-bold transition-opacity hover:opacity-90 rounded-lg disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : myReview ? 'Update Review' : 'Submit Review'}
                  </button>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="border border-stone-200 text-stone-600 px-5 py-2.5 uppercase tracking-widest text-xs font-bold hover:bg-stone-50 transition-colors rounded-lg"
                  >
                    Cancel
                  </button>
                  <p className="text-[10px] text-stone-400">
                    {myReview ? 'Edits return the review to pending approval.' : 'Published once approved by our team.'}
                  </p>
                </div>
              </div>
            )}

            {justSaved && !isFormOpen && (
              <p className="text-xs text-green-700 mt-3">
                Thank you — your review is awaiting approval and will appear here once published.
              </p>
            )}
          </div>
        )}

        {/* Approved reviews */}
        {loading ? (
          <p className="text-center text-xs text-stone-400 py-10">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-stone-200 rounded-2xl bg-white/40">
            <MessageSquare size={28} strokeWidth={1} className="mx-auto mb-3 text-stone-300" />
            <p className="text-sm text-stone-600 font-serif">No reviews yet</p>
            <p className="text-xs text-stone-400 mt-1">Be the first to share your experience with this piece.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review._id} className="bg-white border border-stone-100 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-sm font-bold text-stone-800">{review.user?.name || 'Verified Customer'}</p>
                    <p className="text-[10px] uppercase tracking-widest text-[#cca150] font-bold mt-0.5">Verified Purchase</p>
                  </div>
                  <StarRow value={review.rating} />
                </div>
                {review.title && <h4 className="font-serif text-stone-900 mb-1">{review.title}</h4>}
                <p className="text-sm text-stone-600 leading-relaxed italic">"{review.text}"</p>
                <p className="text-[10px] text-stone-400 mt-3">
                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showWarning && <AdminActionWarning onClose={dismiss} />}
    </div>
  );
}
