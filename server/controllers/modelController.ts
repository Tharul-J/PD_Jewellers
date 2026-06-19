import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ConfigurableModel from '../models/ConfigurableModel.js';

// @desc    Get all configurable models
// @route   GET /api/models
// @access  Public
export const getModels = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json([]);
      return;
    }
    const models = await ConfigurableModel.find({});
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
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database not connected' });
      return;
    }
    const { name, glbUrl, category, basePrice } = req.body;

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
