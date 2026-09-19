import express from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import User from '../models/User.js';
import ConfigurableModel from '../models/ConfigurableModel.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

const TOP_N = 3;

/**
 * Resolves a configurator style key to a display name.
 *
 * Two forms exist. The configurator builds ids as `db-<ObjectId>` for an
 * admin-managed ConfigurableModel, and falls back to the hardcoded
 * `ring-style-N` when the models endpoint returns nothing. Saved designs store
 * whichever was active, so both have to be understood here.
 */
async function styleNames(keys: string[]): Promise<Record<string, string>> {
  const names: Record<string, string> = {};

  const objectIds: mongoose.Types.ObjectId[] = [];
  for (const key of keys) {
    if (key.startsWith('db-')) {
      const raw = key.slice(3);
      if (mongoose.Types.ObjectId.isValid(raw)) objectIds.push(new mongoose.Types.ObjectId(raw));
    } else {
      const n = /(\d+)\s*$/.exec(key);
      names[key] = n ? `Ring Style ${n[1]}` : key;
    }
  }

  if (objectIds.length > 0) {
    const models = await ConfigurableModel.find({ _id: { $in: objectIds } }).select('name').lean();
    for (const m of models) names[`db-${String(m._id)}`] = m.name;
  }

  // A style whose model was deleted still has saves pointing at it; show the raw
  // key rather than dropping the row, so the count stays explainable.
  for (const key of keys) if (!names[key]) names[key] = key;

  return names;
}

/**
 * Wishlist entries are embedded on the user and denormalised, holding a copy of
 * the name/image from when the item was added. Grouped on productId, which holds
 * Product.id (the business id, e.g. "RI008") rather than the ObjectId — hence the
 * lookup on `id`. The stored copy is the fallback for a product since deleted, so
 * the row still renders with a label instead of vanishing.
 */
function wishlistAggregate() {
  return User.aggregate([
    { $unwind: '$wishlist' },
    { $match: { 'wishlist.productId': { $nin: [null, ''] } } },
    {
      $group: {
        _id: '$wishlist.productId',
        count: { $sum: 1 },
        name: { $first: '$wishlist.name' },
        image: { $first: '$wishlist.image' },
      },
    },
    // _id breaks ties so equal counts return in a stable order run to run.
    { $sort: { count: -1, _id: 1 } },
    { $limit: TOP_N },
    { $lookup: { from: 'products', localField: '_id', foreignField: 'id', as: 'product' } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        count: 1,
        name: { $ifNull: [{ $first: '$product.name' }, '$name'] },
        image: { $ifNull: [{ $first: '$product.image' }, '$image'] },
      },
    },
  ]);
}

/**
 * There is no SavedDesign collection: saved designs live in the embedded
 * User.savedConfigurations array, and the only field tying one to a base style is
 * `ringStyle`. Pendant saves carry no style key, so this reflects ring designs
 * only. Counting is kept separate from thumbnail fetching so that a save with no
 * thumbnail still counts toward its style's total.
 */
function groupedStylesAggregate() {
  return User.aggregate([
    { $unwind: '$savedConfigurations' },
    { $match: { 'savedConfigurations.ringStyle': { $nin: [null, ''] } } },
    { $group: { _id: '$savedConfigurations.ringStyle', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: TOP_N },
  ]);
}

/**
 * One representative thumbnail per style, newest first.
 *
 * A style has no artwork of its own — its GLB cannot be shown in an `<img>` — so
 * the image is a per-save canvas snapshot stored as a data URL (~33KB each).
 * All the wanted styles are resolved in a single pass rather than one query per
 * style, and only the top few keys are ever requested, which keeps both the round
 * trips and the response size down.
 */
async function styleThumbnails(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};

  const rows = await User.aggregate([
    { $unwind: '$savedConfigurations' },
    {
      $match: {
        'savedConfigurations.ringStyle': { $in: keys },
        'savedConfigurations.thumbnail': { $nin: [null, ''] },
      },
    },
    { $sort: { 'savedConfigurations.createdAt': -1 } },
    {
      $group: {
        _id: '$savedConfigurations.ringStyle',
        thumbnail: { $first: '$savedConfigurations.thumbnail' },
      },
    },
  ]);

  return Object.fromEntries(rows.map(r => [r._id as string, r.thumbnail as string]));
}

// @desc    Top products/designs for the dashboard insight cards
// @route   GET /api/admin/dashboard-highlights
// @access  Private/Admin
router.get('/dashboard-highlights', protect, admin, async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    // The three sources are independent, so they are issued together rather than
    // awaited one after another. The database is remote here (~170ms per round
    // trip), which dominates the response time — three sequential queries cost
    // three times as much wall clock as three concurrent ones.
    const [viewedResult, wishlistResult, groupedResult] = await Promise.allSettled([
      Product.find({ views: { $gt: 0 } })
        .sort({ views: -1 })
        .limit(TOP_N)
        .select('id name image views')
        .lean(),
      wishlistAggregate(),
      groupedStylesAggregate(),
    ]);

    // ── Most viewed ──────────────────────────────────────────────────────────
    let topViewed: any[] = [];
    if (viewedResult.status === 'fulfilled') {
      topViewed = viewedResult.value.map(p => ({
        id: p.id, name: p.name, image: p.image, views: p.views ?? 0,
      }));
    } else {
      console.warn('[dashboard-highlights] topViewed unavailable:', viewedResult.reason);
    }

    // ── Most wishlisted ──────────────────────────────────────────────────────
    // Wishlist entries are embedded on the user and denormalised, holding a copy
    // of the name/image at the time of adding. Grouped on productId, which holds
    // Product.id (the business id, e.g. "RI008") rather than the ObjectId — hence
    // the lookup on `id`. The stored copy is the fallback for a product that has
    // since been deleted, so the count still renders with a label.
    let topWishlisted: any[] = [];
    if (wishlistResult.status === 'fulfilled') {
      topWishlisted = wishlistResult.value;
    } else {
      console.warn('[dashboard-highlights] topWishlisted unavailable:', wishlistResult.reason);
    }

    // ── Popular configurator designs ─────────────────────────────────────────
    // There is no SavedDesign collection: saved designs live in the embedded
    // User.savedConfigurations array, and the only field tying one to a base
    // style is `ringStyle`. Pendant saves carry no style key at all, so this
    // reflects ring designs only.
    let topConfiguratorStyles: any[] = [];
    if (groupedResult.status !== 'fulfilled') {
      console.warn('[dashboard-highlights] topConfiguratorStyles unavailable:', groupedResult.reason);
    } else {
      try {
        const grouped = groupedResult.value;
        const keys = grouped.map(g => g._id as string);

        // Names and thumbnails both depend on the grouping, but not on each
        // other, so they go out together as one more round trip rather than two.
        const [names, thumbs] = await Promise.all([styleNames(keys), styleThumbnails(keys)]);

        topConfiguratorStyles = grouped.map(g => ({
          id: g._id,
          name: names[g._id] ?? g._id,
          image: thumbs[g._id] ?? '',
          count: g.count,
        }));
      } catch (err) {
        console.warn('[dashboard-highlights] topConfiguratorStyles unavailable:', err);
      }
    }

    res.json({ topViewed, topWishlisted, topConfiguratorStyles });
  } catch (error) {
    console.error('[dashboard-highlights]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
