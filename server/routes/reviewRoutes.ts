import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { notifyAdmins } from '../utils/notify.js';

const router = express.Router();

// POST /api/reviews — authenticated user submits a shop review (one per user)
router.post('/', protect, async (req, res) => {
  try {
    const { rating, text } = req.body;
    if (!rating || !text?.trim()) {
      res.status(400).json({ error: 'rating and text required' });
      return;
    }
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'Database required to submit a review' });
      return;
    }

    const review = await Review.create({
      user: req.user._id,
      rating: Number(rating),
      text: text.trim(),
    });

    await notifyAdmins('new_review', `New review from ${req.user.name}`, '/admin?tab=reviews');

    res.status(201).json({ review });
  } catch (err: any) {
    if (err.code === 11000) { res.status(400).json({ error: 'You have already submitted a review' }); return; }
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /api/reviews/homepage — public, approved only, for Stories of Radiance
router.get('/homepage', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json({ reviews: [] });
      return;
    }
    const reviews = await Review.find({ approved: true })
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
    const reviews = await Review.find({ user: req.user._id }).lean();
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
    const { rating, text } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) { res.status(404).json({ error: 'Not found' }); return; }
    if (review.user.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (rating) review.rating = Number(rating);
    if (text?.trim()) review.text = text.trim();
    review.approved = false; // re-approval required after any edit
    await review.save();

    await notifyAdmins('new_review', `Review edited by ${req.user.name} — pending re-approval`, '/admin?tab=reviews');

    res.json({ review });
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
      .sort({ approved: 1, createdAt: -1 }) // unapproved first
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
