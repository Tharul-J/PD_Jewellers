import express from 'express';
import Pricing from '../models/Pricing.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';

const router = express.Router();

// ── Phase 2 canonical defaults ────────────────────────────────────────────────
export const DEFAULT_METALS = [
  { key: 'silver',    displayName: '925 Sterling Silver',        multiplier: 1  },
  { key: 'white',     displayName: '18K White Gold',              multiplier: 13 },
  { key: 'gold',      displayName: '22K Yellow Gold (916 Gold)',  multiplier: 18 },
  { key: 'rose',      displayName: '18K Rose Gold',               multiplier: 13 },
  { key: 'platinum',  displayName: 'Platinum (Pt950)',             multiplier: 22 },
];

export const DEFAULT_STONES = [
  { key: 'aquamarine',     displayName: 'Cornflower / Sky Blue Sapphire', price: 65000,  color: '#6BA3C8' },
  { key: 'diamond',        displayName: 'White Ceylon Sapphire',           price: 95000,  color: '#f0f0f0' },
  { key: 'ruby',           displayName: 'Crimson Ceylon Ruby',             price: 145000, color: '#c41230' },
  { key: 'emerald',        displayName: 'Vibrant Emerald',                 price: 120000, color: '#0a8a3c' },
  { key: 'sapphire',       displayName: 'Royal Blue Ceylon Sapphire',      price: 185000, color: '#0a3d8f' },
  { key: 'padparadscha',   displayName: 'Ceylon Padparadscha Sapphire',    price: 480000, color: '#FF7F50' },
  { key: 'moonstone',      displayName: 'Premium Blue-Sheen Moonstone',    price: 45000,  color: '#B0C4DE' },
  { key: 'yellowsapphire', displayName: 'Yellow Ceylon Sapphire',          price: 75000,  color: '#FFD166' },
];

// Fallback swatches for stone keys that aren't in DEFAULT_STONES (mirrors src/constants.ts STONES)
const STONE_COLOR_BY_KEY: Record<string, string> = {
  ...Object.fromEntries(DEFAULT_STONES.map(s => [s.key, s.color])),
  tourmaline:  '#5D2E8C',
  amethyst:    '#9B59B6',
  spinel:      '#E0306A',
  alexandrite: '#2E7D55',
  catseye:     '#C8901A',
  zircon:      '#0098C9',
};

const FALLBACK_STONE_COLOR = '#cccccc';

const DEFAULT_ENGRAVING = 5000;

export const DEFAULT_UPGRADES = [
  { key: 'engraving', name: 'Engraving', price: DEFAULT_ENGRAVING },
];

/** Adds a `color` to any stone entry missing one, using the known key map. */
function withStoneColors(stones: any[]): any[] {
  return (stones ?? []).map(s => ({
    ...s,
    color: s?.color || STONE_COLOR_BY_KEY[s?.key] || FALLBACK_STONE_COLOR,
  }));
}

/** Seeds the upgrades array from the legacy flat engravingPrice when it's empty. */
function withUpgrades(upgrades: any[] | undefined, engravingPrice: number): any[] {
  if (Array.isArray(upgrades) && upgrades.length > 0) return upgrades;
  return [{ key: 'engraving', name: 'Engraving', price: engravingPrice ?? DEFAULT_ENGRAVING }];
}

/** The configurator still reads the flat engravingPrice — derive it from the upgrades list. */
function engravingFromUpgrades(upgrades: any[], fallback: number): number {
  const found = (upgrades ?? []).find(u => /engrav/i.test(u?.name ?? '') || u?.key === 'engraving');
  return typeof found?.price === 'number' ? found.price : fallback;
}

// Migrates an old flat-field document to the new array format.
// Preserves any admin-edited values that are valid, corrects known stale values.
function migrateFromFlatFields(old: Record<string, any>) {
  const metals = DEFAULT_METALS.map(m => ({
    key: m.key,
    displayName: m.displayName,
    multiplier: typeof old[`metalMultiplier_${m.key}`] === 'number'
      ? old[`metalMultiplier_${m.key}`]
      : m.multiplier,
  }));

  const stones = DEFAULT_STONES.map(s => {
    let price: number =
      typeof old[`stonePrice_${s.key}`] === 'number'
        ? old[`stonePrice_${s.key}`]
        : s.price;

    // Fix known stale legacy prices that were never Phase-2 migrated
    if (s.key === 'aquamarine'     && price > 100000)  price = s.price;  // e.g. 475 000 → 65 000
    if (s.key === 'diamond'        && price === 380000) price = s.price;  // old "Diamond" placeholder
    if (s.key === 'sapphire'       && price === 150000) price = s.price;  // old generic Ceylon
    if (s.key === 'moonstone'      && price > 100000)  price = s.price;  // e.g. 245 000 → 45 000
    if (s.key === 'yellowsapphire' && price > 100000)  price = s.price;  // e.g. 175 000 → 75 000

    return { key: s.key, displayName: s.displayName, price, color: s.color };
  });

  // Stale engraving price (old system used LKR 45 000; Phase 2 canonical is LKR 5 000)
  const rawEngraving = typeof old.engravingPrice === 'number' ? old.engravingPrice : DEFAULT_ENGRAVING;
  const engravingPrice = rawEngraving > 20000 ? DEFAULT_ENGRAVING : rawEngraving;

  return { metals, stones, engravingPrice, upgrades: withUpgrades(undefined, engravingPrice) };
}

// ── GET /api/pricing ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        metals: DEFAULT_METALS,
        stones: DEFAULT_STONES,
        upgrades: DEFAULT_UPGRADES,
        engravingPrice: DEFAULT_ENGRAVING,
      });
    }

    // Use lean() so we can read old flat fields even if they're not in the current schema
    const raw = await Pricing.findOne().lean() as Record<string, any> | null;

    if (!raw) {
      const created = await Pricing.create({
        metals: DEFAULT_METALS,
        stones: DEFAULT_STONES,
        upgrades: DEFAULT_UPGRADES,
        engravingPrice: DEFAULT_ENGRAVING,
      });
      return res.json(created);
    }

    // Detect old flat-field format: missing metals array OR empty array with flat fields present
    const isOldFormat =
      !Array.isArray(raw.metals) ||
      raw.metals.length === 0 && typeof raw.metalMultiplier_silver === 'number';

    if (isOldFormat) {
      const migrated = migrateFromFlatFields(raw);

      // Atomically replace with new format + strip old fields
      await Pricing.updateOne(
        { _id: raw._id },
        {
          $set: migrated,
          $unset: {
            metalMultiplier_silver:    '',
            metalMultiplier_white:     '',
            metalMultiplier_gold:      '',
            metalMultiplier_rose:      '',
            metalMultiplier_platinum:  '',
            stonePrice_aquamarine:     '',
            stonePrice_diamond:        '',
            stonePrice_ruby:           '',
            stonePrice_emerald:        '',
            stonePrice_sapphire:       '',
            stonePrice_padparadscha:   '',
            stonePrice_moonstone:      '',
            stonePrice_yellowsapphire: '',
          },
        }
      );

      return res.json(migrated);
    }

    // Already new format — backfill stone colours and the upgrades array if this
    // document predates them, then persist the backfill so it happens once.
    const stones   = withStoneColors(raw.stones);
    const upgrades = withUpgrades(raw.upgrades, raw.engravingPrice);

    const needsBackfill =
      !Array.isArray(raw.upgrades) || raw.upgrades.length === 0 ||
      (raw.stones ?? []).some((s: any) => !s?.color);

    if (needsBackfill) {
      await Pricing.updateOne({ _id: raw._id }, { $set: { stones, upgrades } });
    }

    return res.json({ ...raw, stones, upgrades });
  } catch (error) {
    console.error('[Pricing GET]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ── PUT /api/pricing — replace full pricing document ─────────────────────────
router.put('/', protect, admin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    const { metals, stones, upgrades, engravingPrice } = req.body as {
      metals?: typeof DEFAULT_METALS;
      stones?: typeof DEFAULT_STONES;
      upgrades?: typeof DEFAULT_UPGRADES;
      engravingPrice?: number;
    };

    let pricing = await Pricing.findOne();

    if (!pricing) {
      const nextUpgrades = withUpgrades(upgrades, engravingPrice ?? DEFAULT_ENGRAVING);
      pricing = new Pricing({
        metals:         metals ?? DEFAULT_METALS,
        stones:         withStoneColors(stones ?? DEFAULT_STONES),
        upgrades:       nextUpgrades,
        engravingPrice: engravingFromUpgrades(nextUpgrades, engravingPrice ?? DEFAULT_ENGRAVING),
      });
    } else {
      if (metals         != null) pricing.metals         = metals;
      if (stones         != null) pricing.stones         = withStoneColors(stones);
      if (engravingPrice != null) pricing.engravingPrice = engravingPrice;
      if (upgrades       != null) {
        pricing.upgrades      = upgrades;
        pricing.engravingPrice = engravingFromUpgrades(upgrades, pricing.engravingPrice);
      }
    }

    const saved = await pricing.save();
    res.json(saved);
  } catch (error) {
    console.error('[Pricing PUT]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
