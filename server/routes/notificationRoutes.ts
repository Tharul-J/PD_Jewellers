import express from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import Message from '../models/Message.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/notifications — recent 20 + accurate unread counts (total + per type)
router.get('/', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json({ notifications: [], unreadCount: 0, unreadByType: {}, unreadMessages: 0 });
      return;
    }
    const [notifications, typeCounts, unreadMessages] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 }).limit(20).lean(),
      Notification.aggregate([
        { $match: { recipient: req.user._id, read: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      // Counted from the Message collection rather than from notifications:
      // readBy is the authoritative per-message read state, and it survives the
      // bell being cleared.
      Message.countDocuments({ recipients: req.user._id, readBy: { $ne: req.user._id } }),
    ]);

    const unreadByType = typeCounts.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {} as Record<string, number>);

    const unreadCount = typeCounts.reduce((sum, { count }) => sum + count, 0);

    res.json({ notifications, unreadCount, unreadByType, unreadMessages });
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e });
  }
});

// PATCH /api/notifications/read — mark all read
router.patch('/read', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json({ ok: true });
      return;
    }
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e });
  }
});

// PATCH /api/notifications/read/:type — mark read for a single type only
router.patch('/read/:type', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json({ ok: true });
      return;
    }
    await Notification.updateMany(
      { recipient: req.user._id, type: req.params.type, read: false },
      { read: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Server Error', error: e });
  }
});

export default router;
