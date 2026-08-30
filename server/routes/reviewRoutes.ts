import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Purchase from '../models/Purchase.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { notifyAdmins, notifyUser } from '../utils/notify.js';
import { skuOf } from '../../src/lib/sku.js';

const router = express.Router();

// Products are addressed by their SKU (Product.id, e.g. "RI001") throughout the
// app — that's the URL param, the catalog lookup key, and what purchases record
// in items[].productId. Reviews store the ObjectId ref, so every entry point has
// to accept the SKU and resolve it here.
const resolveProduct = async (identifier: string) => {
  if (!identifier) return null;
  const bySku = await Product.findOne({ id: identifier });
  if (bySku) return bySku;
  if (mongoose.isValidObjectId(identifier)) return Product.findById(identifier);
  // Older records hold a variant key rather than a bare SKU — see skuOf.
  const sku = skuOf(identifier);
  if (sku && sku !== identifier) return Product.findOne({ id: sku });
  return null;
};

// A review is only allowed on a product the user actually bought. Purchases
// record either the bare SKU (new orders, and anything added from the
// collections grid) or a `SKU-variant` key (orders placed from a product page
// before that was fixed), so both shapes have to be matched.
const hasPurchased = async (userId: string, sku: string) => {
  const escaped = sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !!(await Purchase.findOne({
    user: userId,
    $or: [
      { 'items.productId': sku },
      { 'items.productId': { $regex: `^${escaped}-` } },
    ],
  }));
};

// POST /api/reviews — a site review (one per user) or a product review
// (one per product per user, purchased products only)
router.post('/', protect, async (req, res) => {
  let productDoc: any = null;
  try {
    const { rating, title, text, product, reviewType } = req.body;
    if (!rating || !text?.trim()) {
      res.status(400).json({ error: 'rating and text required' });
      return;
    }
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'Database required to submit a review' });
      return;
    }

    const isProductReview = reviewType === 'product' || !!product;

    if (isProductReview) {
      if (!product) {
        res.status(400).json({ error: 'product is required for a product review' });
        return;
      }
      productDoc = await resolveProduct(String(product));
      if (!productDoc) { res.status(404).json({ error: 'Product not found' }); return; }
      if (!(await hasPurchased(req.user._id, productDoc.id))) {
        res.status(403).json({ error: 'You can only review items you have purchased' });
        return;
      }
    }

    // Duplicates are scoped to (user, product, reviewType), never to user alone:
    // a site review and a product review are different subjects, and so are two
    // different products. Having one must never block writing another.
    const duplicate = await Review.findOne({
      user: req.user._id,
      product: productDoc ? productDoc._id : null,
      // Reviews written before `reviewType` existed carry no such field. They
      // are site reviews, so they still have to occupy the site-review slot.
      reviewType: productDoc ? 'product' : { $in: ['site', null] },
    });
    if (duplicate) {
      res.status(400).json({
        error: productDoc
          ? 'You have already reviewed this item'
          : 'You have already submitted a site review',
      });
      return;
    }

    const created = await Review.create({
      user: req.user._id,
      product: productDoc ? productDoc._id : null,
      reviewType: productDoc ? 'product' : 'site',
      rating: Number(rating),
      title: title?.trim() || '',
      text: text.trim(),
    });

    const review = await Review.findById(created._id).populate('product', 'id name image').lean();

    await notifyAdmins(
      'new_review',
      productDoc
        ? `New review from ${req.user.name} on ${productDoc.name}`
        : `New review from ${req.user.name}`,
      '/admin?tab=reviews'
    );

    res.status(201).json({ review });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({
        error: productDoc
          ? 'You have already reviewed this item'
          : 'You have already submitted a site review',
      });
      return;
    }
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /api/reviews/product/:productId — public, approved reviews for one product
router.get('/product/:productId', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json({ reviews: [] });
      return;
    }
    const productDoc = await resolveProduct(req.params.productId);
    if (!productDoc) { res.json({ reviews: [] }); return; }

    const reviews = await Review.find({ product: productDoc._id, approved: true })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reviews });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/reviews/homepage — public, approved only, for Stories of Radiance
router.get('/homepage', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json({ reviews: [] });
      return;
    }
    // Stories of Radiance is about the house, so product reviews stay out of it.
    const reviews = await Review.find({ approved: true, product: null })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    res.json({ reviews });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/reviews/mine — user checks if they have pending/submitted reviews
router.get('/mine', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json({ reviews: [] });
      return;
    }
    const reviews = await Review.find({ user: req.user._id })
      .populate('product', 'id name image')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reviews });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// PATCH /api/reviews/:id — user edits their own review; any edit requires re-approval
router.patch('/:id', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'Database required' });
      return;
    }
    const { rating, title, text } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) { res.status(404).json({ error: 'Not found' }); return; }
    if (review.user.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // `product` and `reviewType` are deliberately not editable — the subject of
    // a review is purchase-verified at creation, not repointable afterwards.
    if (rating) review.rating = Number(rating);
    if (title !== undefined) review.title = String(title).trim();
    if (text?.trim()) review.text = text.trim();
    review.approved = false; // re-approval required after any edit
    await review.save();

    await notifyAdmins('new_review', `Review edited by ${req.user.name} — pending re-approval`, '/admin?tab=reviews');

    const populated = await Review.findById(review._id).populate('product', 'id name image').lean();

    res.json({ review: populated });
  } catch {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// DELETE /api/reviews/mine/:id — user deletes their own review (any status)
// Registered before the admin DELETE /:id below for clarity, though the two
// never actually collide: this path always has two segments (mine/<id>).
router.delete('/mine/:id', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'Database required' });
      return;
    }
    const review = await Review.findById(req.params.id);
    if (!review) { res.status(404).json({ error: 'Not found' }); return; }
    if (review.user.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/reviews — admin: all reviews for moderation
router.get('/', protect, admin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json({ reviews: [] });
      return;
    }
    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('product', 'id name image')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reviews });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// PATCH /api/reviews/:id/approve — admin approves/rejects
router.patch('/:id/approve', protect, admin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'Database required' });
      return;
    }
    const { approved } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id, { approved }, { new: true }
    );
    if (!review) { res.status(404).json({ error: 'Not found' }); return; }

    // Approval is the moment the author's review becomes public — tell them.
    if (approved) {
      await notifyUser(
        review.user.toString(),
        'review_approved',
        'Your review has been approved and is now published.',
        '/profile?tab=reviews'
      );
    }

    res.json({ review });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// DELETE /api/reviews/:id — admin deletes
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'Database required' });
      return;
    }
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
