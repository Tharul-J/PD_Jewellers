import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { uploadBannerToCloudinary, deleteImageFromCloudinary } from '../utils/cloudinaryStorage.js';

const BANNER_FOLDER = 'pd-jewellers/categories';

/** Must stay in step with `normalize` in src/lib/categories.ts. */
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The built-ins, in the fixed order they render in. Mirrors BASE_CATEGORIES. */
const DEFAULT_CATEGORIES = ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Bridal'];

/**
 * The banners that ship with the app, keyed by normalized name. These used to be
 * a hardcoded map in Collections.tsx, which meant the storefront looked banners
 * up by name while the admin read `bannerImage` — so an uploaded banner never
 * reached the storefront and a shipped one never reached the admin list. They
 * live here now and are backfilled onto the rows, making `bannerImage` the one
 * source of truth for both.
 *
 * Values are root-relative paths served from public/banners; an admin upload
 * stores an absolute Cloudinary URL instead. Both render as-is in an <img src>,
 * so nothing downstream needs to tell them apart.
 */
const DEFAULT_BANNERS: Record<string, string> = {
  rings: '/banners/Rings_Banner.png',
  necklaces: '/banners/Necklaces_Banner.png',
  earrings: '/banners/Earrings_Banner.png',
  bracelets: '/banners/Bracelets_Banner.png',
  pendants: '/banners/Pendants_Banner.png',
  bridal: '/banners/Bridal_Banner.png',
  mens: '/banners/Mens_Banner.png',
};

/**
 * Creates any missing built-in, plus a row for every category the live catalog
 * already uses. Idempotent, and safe to call on each GET: categories used to be
 * derived from products and browser localStorage, so the first call after this
 * feature ships is what migrates the existing set into the collection.
 */
const ensureSeeded = async (): Promise<void> => {
  const existing = await Category.find({}, 'key bannerImage').lean();
  const known = new Set(existing.map(c => c.key));

  const pending: { name: string; key: string; isDefault: boolean; order: number; bannerImage: string }[] = [];

  DEFAULT_CATEGORIES.forEach((name, index) => {
    const key = normalize(name);
    if (known.has(key)) return;
    known.add(key);
    pending.push({ name, key, isDefault: true, order: index, bannerImage: DEFAULT_BANNERS[key] ?? '' });
  });

  // Whatever products are actually tagged with, so nothing in the catalog is
  // dropped from the admin list just because it was never added by hand.
  const used: string[] = await Product.distinct('category');
  for (const name of used) {
    if (!name || !name.trim()) continue;
    const key = normalize(name);
    if (!key || known.has(key)) continue;
    known.add(key);
    pending.push({ name, key, isDefault: false, order: 1000, bannerImage: DEFAULT_BANNERS[key] ?? '' });
  }

  if (pending.length > 0) {
    // ordered:false so one duplicate from a concurrent request cannot abort the rest.
    await Category.insertMany(pending, { ordered: false }).catch(() => { /* raced, fine */ });
  }

  // Rows that predate DEFAULT_BANNERS were created with an empty bannerImage, so
  // their banner only ever existed in the storefront's old name→path map. Adopt
  // the shipped path once. Strictly `bannerImage: ''` — an admin's Cloudinary
  // upload must never be clobbered on the next request.
  const backfill = existing.filter(c => !c.bannerImage && DEFAULT_BANNERS[c.key]);
  if (backfill.length > 0) {
    await Category.bulkWrite(
      backfill.map(c => ({
        updateOne: {
          filter: { key: c.key, $or: [{ bannerImage: '' }, { bannerImage: { $exists: false } }] },
          update: { $set: { bannerImage: DEFAULT_BANNERS[c.key] } },
        },
      })),
      { ordered: false }
    ).catch(() => { /* raced, fine */ });
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // Offline: the built-ins still let the storefront and product form render,
      // banners included — those are local files and do not need the database.
      res.json(
        DEFAULT_CATEGORIES.map((name, index) => {
          const key = normalize(name);
          return {
            _id: `default-${key}`,
            name,
            key,
            isDefault: true,
            bannerImage: DEFAULT_BANNERS[key] ?? '',
            bannerPublicId: '',
            order: index,
          };
        })
      );
      return;
    }
    await ensureSeeded();
    const categories = await Category.find({}).sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Create a category, optionally with a banner image
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for category management' });
      return;
    }
    const name = (req.body.name ?? '').trim();
    if (!name) {
      res.status(400).json({ message: 'Category name is required' });
      return;
    }
    const key = normalize(name);
    if (!key) {
      res.status(400).json({ message: 'Category name must contain letters or numbers' });
      return;
    }
    if (await Category.findOne({ key })) {
      res.status(409).json({ message: `"${name}" already exists` });
      return;
    }

    const category = new Category({ name, key, isDefault: false, order: 1000 });

    if (req.file) {
      const uploaded = await uploadBannerToCloudinary(req.file.buffer, BANNER_FOLDER, `${key}-${Date.now()}`);
      if (!uploaded) {
        res.status(502).json({ message: 'Banner upload failed. Please try again.' });
        return;
      }
      category.bannerImage = uploaded.url;
      category.bannerPublicId = uploaded.publicId;
    }

    const created = await category.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Rename a category and/or replace its banner
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for category management' });
      return;
    }
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    const previousName = category.name;
    let productsUpdated = 0;

    const nextName = (req.body.name ?? '').trim();
    if (nextName && nextName !== previousName) {
      const nextKey = normalize(nextName);
      if (!nextKey) {
        res.status(400).json({ message: 'Category name must contain letters or numbers' });
        return;
      }
      // Another row already holding this key would break the unique index, and
      // would silently merge two categories' products.
      const clash = await Category.findOne({ key: nextKey, _id: { $ne: category._id } });
      if (clash) {
        res.status(409).json({ message: `"${nextName}" already exists` });
        return;
      }
      category.name = nextName;
      category.key = nextKey;
    }

    if (req.file) {
      const uploaded = await uploadBannerToCloudinary(
        req.file.buffer,
        BANNER_FOLDER,
        `${category.key}-${Date.now()}`
      );
      if (!uploaded) {
        res.status(502).json({ message: 'Banner upload failed. Please try again.' });
        return;
      }
      const staleBannerId = category.bannerPublicId;
      category.bannerImage = uploaded.url;
      category.bannerPublicId = uploaded.publicId;
      // Destroy only after the replacement is in hand, so a failed upload never
      // leaves the category with no banner at all.
      if (staleBannerId && staleBannerId !== uploaded.publicId) {
        await deleteImageFromCloudinary(staleBannerId);
      }
    }

    const updated = await category.save();

    // Products link to a category by its name string, so a rename orphans every
    // product still tagged with the old one — and the admin list counts products
    // by that same string. Cascade in the same request and report the count.
    if (updated.name !== previousName) {
      const result = await Product.updateMany(
        { category: previousName },
        { $set: { category: updated.name } }
      );
      productsUpdated = result.modifiedCount ?? 0;
    }

    res.json({ category: updated, productsUpdated });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ message: 'Database required for category management' });
      return;
    }
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }
    if (category.isDefault) {
      res.status(403).json({ message: `"${category.name}" is a default category and cannot be deleted` });
      return;
    }
    const inUse = await Product.countDocuments({ category: category.name });
    if (inUse > 0) {
      res.status(409).json({
        message: `"${category.name}" is used by ${inUse} product${inUse === 1 ? '' : 's'} — reassign them first`,
      });
      return;
    }
    if (category.bannerPublicId) {
      await deleteImageFromCloudinary(category.bannerPublicId);
    }
    await category.deleteOne();
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};
