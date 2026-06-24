import express from 'express';
import Pricing from '../models/Pricing.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';

const router = express.Router();

const defaultPricing = {
  metalMultiplier_silver:    1,
  metalMultiplier_white:     13,
  metalMultiplier_gold:      18,
  metalMultiplier_rose:      13,
  metalMultiplier_platinum:  22,
  stonePrice_aquamarine:     65000,
  stonePrice_diamond:        95000,
  stonePrice_ruby:           145000,
  stonePrice_emerald:        120000,
  stonePrice_sapphire:       185000,
  stonePrice_padparadscha:   480000,
  stonePrice_moonstone:      45000,
  stonePrice_yellowsapphire: 75000,
  engravingPrice:            5000,
};

// Fields whose legacy default values indicate a pre-Phase2 document that needs migration.
const STALE_MARKERS: Partial<typeof defaultPricing> = {
  stonePrice_diamond: 380000,  // old "Diamond" price — replaced by White Ceylon Sapphire
  stonePrice_sapphire: 150000, // old generic "Ceylon Sapphire" — replaced by Royal Blue at 185000
};

// GET /api/pricing
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(defaultPricing);
    }
    let pricing = await Pricing.findOne();
    if (!pricing) {
      pricing = await Pricing.create(defaultPricing);
    } else {
      // One-time migration: if stale legacy values are detected, overwrite with new defaults.
      const needsMigration = Object.entries(STALE_MARKERS).some(
        ([k, v]) => (pricing as any)[k] === v
      );
      if (needsMigration) {
        Object.assign(pricing, defaultPricing);
        await pricing.save();
      }
    }
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT /api/pricing
router.put('/', protect, admin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }
    let pricing = await Pricing.findOne();
    if (!pricing) {
      pricing = new Pricing(req.body);
    } else {
      Object.assign(pricing, req.body);
    }
    const updatedPricing = await pricing.save();
    res.json(updatedPricing);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;

