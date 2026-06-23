import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { MOCK_PRODUCTS } from '../../src/data/products.js';

const CATEGORY_PREFIX: Record<string, string> = {
  Rings: 'RI', Necklaces: 'NE', Earrings: 'ES', Bracelets: 'BR', Pendants: 'PE',
  Bridal: 'BRL', Mens: 'MNS',
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.json(MOCK_PRODUCTS);
      return;
    }
    const products = await Product.find({}).sort({ dateAdded: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Get single product by SKU id
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const product = MOCK_PRODUCTS.find(p => p.id === req.params.id);
      if (product) {
        res.json(product);
      } else {
        res.status(404).json({ message: 'Product not found' });
      }
      return;
    }
    const product = await Product.findOne({ id: req.params.id });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for product management' });
      return;
    }
    const { name, category, description, price, image, karatage, hasStones } = req.body;
    const prefix = CATEGORY_PREFIX[category] || 'PR';
    const id = `${prefix}${Date.now()}`;
    const product = new Product({
      id,
      name,
      category,
      description: description || '',
      price: Number(price),
      image: image || '',
      karatage: karatage || '',
      hasStones: !!hasStones,
      dateAdded: new Date().toISOString().split('T')[0],
    });
    const created = await product.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for product management' });
      return;
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    const { name, category, description, price, image, karatage, hasStones } = req.body;
    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (image !== undefined) product.image = image;
    if (karatage !== undefined) product.karatage = karatage;
    if (hasStones !== undefined) product.hasStones = hasStones;
    const updated = await product.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for product management' });
      return;
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
