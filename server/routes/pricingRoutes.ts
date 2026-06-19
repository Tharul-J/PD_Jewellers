import express from 'express';
import Pricing from '../models/Pricing.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';

const router = express.Router();

const defaultPricing = {
  metalMultiplier_silver: 1,
  metalMultiplier_gold: 18,
  metalMultiplier_rose: 14,
  stonePrice_aquamarine: 45000,
  stonePrice_diamond: 380000,
  stonePrice_ruby: 95000,
  stonePrice_emerald: 110000,
  stonePrice_sapphire: 150000,
  engravingPrice: 5000,
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

