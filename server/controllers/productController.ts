import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Purchase from '../models/Purchase.js';
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
    // dateAdded is a 'YYYY-MM-DD' string that defaults to '' on legacy rows, so
    // createdAt breaks ties and keeps undated products in a stable newest-first order.
    const products = await Product.find({}).sort({ dateAdded: -1, createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Best sellers for the homepage, topped up with newest products
// @route   GET /api/products/featured?limit=8
// @access  Public
export const getFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '8'), 10) || 8, 1), 24);

  try {
    if (mongoose.connection.readyState !== 1) {
      res.json(MOCK_PRODUCTS.slice(0, limit));
      return;
    }

    // Purchases record either a bare SKU or an older `SKU-variant` key, so the
    // grouping key is the segment before the first dash — SKUs never contain one.
    const bestSellers = await Purchase.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.isCustom': { $ne: true } } },
      {
        $project: {
          sku: { $arrayElemAt: [{ $split: [{ $ifNull: ['$items.productId', ''] }, '-'] }, 0] },
        },
      },
      { $match: { sku: { $nin: ['', null] } } },
      { $group: { _id: '$sku', sold: { $sum: 1 } } },
      { $sort: { sold: -1 } },
      { $limit: limit },
    ]);

    const rankBySku = new Map<string, number>(bestSellers.map((r: any) => [r._id, r.sold]));
    const soldProducts = rankBySku.size
      ? await Product.find({ id: { $in: [...rankBySku.keys()] } })
      : [];

    // A SKU can be purchased and later deleted from the catalog, so order by the
    // sales count of the products that still exist rather than by the raw ranking.
    soldProducts.sort((a, b) => (rankBySku.get(b.id) ?? 0) - (rankBySku.get(a.id) ?? 0));

    // Early on there are few or no purchases — top up with the newest products.
    if (soldProducts.length < limit) {
      const filler = await Product.find({ id: { $nin: soldProducts.map(p => p.id) } })
        .sort({ dateAdded: -1, createdAt: -1 })
        .limit(limit - soldProducts.length);
      res.json([...soldProducts, ...filler]);
      return;
    }

    res.json(soldProducts);
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
    const { name, category, description, price, image, karatage, metalWeight, hasStones } = req.body;
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
      metalWeight: metalWeight || '',
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
    const { name, category, description, price, image, karatage, metalWeight, hasStones } = req.body;
    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (image !== undefined) product.image = image;
    if (karatage !== undefined) product.karatage = karatage;
    if (metalWeight !== undefined) product.metalWeight = metalWeight;
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
