import express from 'express';
import mongoose from 'mongoose';
import SiteConfig from '../models/SiteConfig.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── GET /api/config/configurator-status — public, polled on configurator mount ──
router.get('/configurator-status', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // Fail open — if DB is down, don't block users
      return res.json({ configuratorEnabled: true });
    }

    let config = await SiteConfig.findOne();
    if (!config) {
      config = await SiteConfig.create({ configuratorEnabled: true });
    }
    res.json({ configuratorEnabled: config.configuratorEnabled });
  } catch (error) {
    console.error('[Config GET]', error);
    res.json({ configuratorEnabled: true });
  }
});

// ── PATCH /api/config/configurator-status — admin only ───────────────────────
router.patch('/configurator-status', protect, admin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    const { enabled } = req.body as { enabled?: boolean };
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: '`enabled` must be a boolean' });
    }

    let config = await SiteConfig.findOne();
    if (!config) {
      config = new SiteConfig({ configuratorEnabled: enabled });
    } else {
      config.configuratorEnabled = enabled;
    }
    await config.save();
    res.json({ configuratorEnabled: config.configuratorEnabled });
  } catch (error) {
    console.error('[Config PATCH]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
