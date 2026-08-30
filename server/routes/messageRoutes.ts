import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { notifyUser } from '../utils/notify.js';

const router = express.Router();

const dbDown = (res: express.Response) =>
  res.status(503).json({ message: 'Database not connected' });

/** Trims to a preview length for notification text. */
const preview = (s: string, max = 60) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

// ── POST /api/messages — compose and send (admin) ────────────────────────────
router.post('/', protect, admin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return dbDown(res);

    const { subject, body, type, recipientIds } = req.body as {
      subject?: string; body?: string; type?: string; recipientIds?: string[];
    };

    if (!subject?.trim())  return res.status(400).json({ message: 'Subject is required' });
    if (!body?.trim())     return res.status(400).json({ message: 'Message body is required' });
    if (type !== 'individual' && type !== 'announcement') {
      return res.status(400).json({ message: 'Type must be "individual" or "announcement"' });
    }
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ message: 'At least one recipient is required' });
    }
    if (type === 'individual' && recipientIds.length > 1) {
      return res.status(400).json({ message: 'An individual message takes exactly one recipient' });
    }

    // De-duplicate, drop malformed ids, then confirm the users actually exist —
    // a stale id from the admin's cached list must not create a dead recipient.
    const uniqueIds = [...new Set(recipientIds)].filter(id => mongoose.isValidObjectId(id));
    const found = await User.find({ _id: { $in: uniqueIds } }, '_id');
    if (found.length === 0) {
      return res.status(400).json({ message: 'None of the selected recipients exist' });
    }

    const message = await Message.create({
      sender: req.user._id,
      subject: subject.trim(),
      body: body.trim(),
      type,
      recipients: found.map(u => u._id),
      readBy: [],
    });

    // Best-effort: a notification failure must not fail an already-sent message.
    await Promise.all(
      found.map(u =>
        notifyUser(String(u._id), 'new_message', `New message: ${preview(subject.trim())}`, '/profile?tab=messages')
      )
    );

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email')
      .lean();

    res.status(201).json(populated);
  } catch (e) {
    console.error('[Messages POST]', e);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ── GET /api/messages/mine — the signed-in user's inbox ──────────────────────
// Registered before '/:id' so "mine" is never read as an id.
router.get('/mine', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json({ messages: [] });

    const messages = await Message.find({ recipients: req.user._id })
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const mine = String(req.user._id);

    res.json({
      messages: messages.map(m => ({
        _id: m._id,
        sender: m.sender,
        subject: m.subject,
        body: m.body,
        type: m.type,
        createdAt: m.createdAt,
        isRead: (m.readBy ?? []).some(id => String(id) === mine),
      })),
      unreadCount: messages.filter(m => !(m.readBy ?? []).some(id => String(id) === mine)).length,
    });
  } catch (e) {
    console.error('[Messages GET /mine]', e);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ── GET /api/messages — sent-message list (admin) ────────────────────────────
router.get('/', protect, admin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ messages: [], page: 1, pages: 0, total: 0 });
    }

    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const [total, docs] = await Promise.all([
      Message.countDocuments({}),
      Message.find({})
        .populate('sender', 'name email')
        // The recipient arrays can be large, so they're counted here rather than
        // populated — the detail route resolves the names when one is opened.
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      messages: docs.map(m => ({
        _id: m._id,
        sender: m.sender,
        subject: m.subject,
        body: m.body,
        type: m.type,
        createdAt: m.createdAt,
        recipientCount: (m.recipients ?? []).length,
        readCount: (m.readBy ?? []).length,
      })),
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (e) {
    console.error('[Messages GET]', e);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ── GET /api/messages/:id — full detail with delivery stats (admin) ──────────
router.get('/:id', protect, admin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return dbDown(res);
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = await Message.findById(req.params.id)
      .populate('sender', 'name email')
      .populate('recipients', 'name email')
      .lean();

    if (!message) return res.status(404).json({ message: 'Message not found' });

    const readIds = new Set((message.readBy ?? []).map(id => String(id)));

    res.json({
      ...message,
      recipients: (message.recipients ?? []).map((r: any) => ({
        _id: r._id,
        name: r.name,
        email: r.email,
        read: readIds.has(String(r._id)),
      })),
      recipientCount: (message.recipients ?? []).length,
      readCount: readIds.size,
    });
  } catch (e) {
    console.error('[Messages GET /:id]', e);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ── PATCH /api/messages/:id/read — recipient marks as read ───────────────────
router.patch('/:id/read', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return dbDown(res);
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Scoped to the caller's own recipient entry, so one user cannot mark
    // another's message read.
    const updated = await Message.findOneAndUpdate(
      { _id: req.params.id, recipients: req.user._id },
      { $addToSet: { readBy: req.user._id } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'Message not found' });

    res.json({ _id: updated._id, isRead: true });
  } catch (e) {
    console.error('[Messages PATCH /:id/read]', e);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ── DELETE /api/messages/:id — hard delete (admin) ───────────────────────────
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return dbDown(res);
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const deleted = await Message.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Message not found' });

    res.json({ message: 'Message deleted' });
  } catch (e) {
    console.error('[Messages DELETE]', e);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
