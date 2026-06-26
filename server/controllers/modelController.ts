import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ConfigurableModel from '../models/ConfigurableModel.js';

let mockModelsSeed: Array<{ _id: string; name: string; category: string; basePrice: number; glbUrl: string; isActive: boolean; createdAt?: string }> = [];

// Local files that ship with the project — seeded to DB on first startup
const LOCAL_RING_SEEDS = [
  { name: 'Ring Style 1', glbUrl: '/glb-models/rings/ring1.glb', category: 'ring', basePrice: 25000 },
  { name: 'Ring Style 2', glbUrl: '/glb-models/rings/ring2.glb', category: 'ring', basePrice: 25000 },
  { name: 'Ring Style 3', glbUrl: '/glb-models/rings/ring3.glb', category: 'ring', basePrice: 30000 },
  { name: 'Ring Style 4', glbUrl: '/glb-models/rings/ring4.glb', category: 'ring', basePrice: 25000 },
  { name: 'Ring Style 5', glbUrl: '/glb-models/rings/ring5.glb', category: 'ring', basePrice: 25000 },
];

// @desc    Get all configurable models
// @route   GET /api/models
// @access  Public
export const getModels = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json(mockModelsSeed);
      return;
    }

    let models = await ConfigurableModel.find({});

    // One-time migration: seed local ring files if none of the new local URLs are in DB yet.
    // This clears stale entries from old sessions (RI*.glb or old /uploads/) and seeds fresh.
    const localUrls = new Set(LOCAL_RING_SEEDS.map(s => s.glbUrl));
    const alreadySeeded = models.some(m => localUrls.has(m.glbUrl));
    if (!alreadySeeded) {
      await ConfigurableModel.deleteMany({ category: 'ring' });
      await ConfigurableModel.insertMany(LOCAL_RING_SEEDS);
      models = await ConfigurableModel.find({});
      console.log('[Models] Seeded 5 local ring models (replaced stale entries).');
    }

    res.json(models);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new configurable model
// @route   POST /api/models
// @access  Private/Admin
export const createModel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, glbUrl, category, basePrice } = req.body;

    if (mongoose.connection.readyState !== 1) {
      const newM = {
        _id: 'model-' + Date.now(),
        name,
        glbUrl: glbUrl || '',
        category,
        basePrice,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      mockModelsSeed.push(newM);
      res.status(201).json(newM);
      return;
    }

    const model = new ConfigurableModel({
      name,
      glbUrl,
      category,
      basePrice,
    });

    const createdModel = await model.save();
    res.status(201).json(createdModel);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Update a configurable model's details
// @route   PUT /api/models/:id
// @access  Private/Admin
export const updateModel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, basePrice, glbUrl } = req.body;
    if (mongoose.connection.readyState !== 1) {
      const idx = mockModelsSeed.findIndex(m => m._id === req.params.id);
      if (idx === -1) { res.status(404).json({ message: 'Model not found' }); return; }
      if (name !== undefined) mockModelsSeed[idx].name = name;
      if (category !== undefined) mockModelsSeed[idx].category = category;
      if (basePrice !== undefined) mockModelsSeed[idx].basePrice = basePrice;
      if (glbUrl !== undefined) mockModelsSeed[idx].glbUrl = glbUrl;
      res.json(mockModelsSeed[idx]);
      return;
    }
    const model = await ConfigurableModel.findById(req.params.id);
    if (!model) { res.status(404).json({ message: 'Model not found' }); return; }
    if (name !== undefined) model.name = name;
    if (category !== undefined) model.category = category;
    if (basePrice !== undefined) model.basePrice = Number(basePrice);
    if (glbUrl !== undefined) model.glbUrl = glbUrl;
    const updated = await model.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Update a configurable model status
// @route   PUT /api/models/:id/status
// @access  Private/Admin
export const updateModelStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database not connected' });
      return;
    }
    const model = await ConfigurableModel.findById(req.params.id);

    if (model) {
      model.isActive = req.body.isActive;
      const updatedModel = await model.save();
      res.json(updatedModel);
    } else {
      res.status(404).json({ message: 'Model not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Delete a configurable model
// @route   DELETE /api/models/:id
// @access  Private/Admin
export const deleteModel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database not connected' });
      return;
    }
    const model = await ConfigurableModel.findByIdAndDelete(req.params.id);

    if (model) {
      res.json({ message: 'Model removed' });
    } else {
      res.status(404).json({ message: 'Model not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
