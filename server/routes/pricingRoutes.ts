import express from 'express';
import Pricing from '../models/Pricing.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';

const router = express.Router();

// ── Phase 2 canonical defaults ────────────────────────────────────────────────
// pricePerGram is LKR per gram and starts at 0 for every metal: a live gold rate
// is the admin's to enter, and the old ratio multipliers carried no absolute rate
// to convert from, so there is nothing to derive. 0 renders a zero metal line
// rather than a wrong one.
export const DEFAULT_METALS = [
  { key: 'silver',    displayName: '925 Sterling Silver',        pricePerGram: 0, color: '#e4e4e4' },
  { key: 'white',     displayName: '18K White Gold',              pricePerGram: 0, color: '#eeecea' },
  { key: 'gold',      displayName: '22K Yellow Gold (916 Gold)',  pricePerGram: 0, color: '#d4a820' },
  { key: 'rose',      displayName: '18K Rose Gold',               pricePerGram: 0, color: '#e89080' },
  { key: 'platinum',  displayName: 'Platinum (Pt950)',             pricePerGram: 0, color: '#b8b8b4' },
];

// Mirrors src/constants.ts METALS, so an admin swatch matches the 3D material.
const METAL_COLOR_BY_KEY: Record<string, string> = {
  ...Object.fromEntries(DEFAULT_METALS.map(m => [m.key, m.color])),
  gold18k: '#F5C842',
};

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

// Stones an admin added by hand have a generated key that no map can know, so
// they're matched on display name as a second pass before the grey fallback.
const STONE_COLOR_BY_NAME: Record<string, string> = {
  'Cornflower / Sky Blue Sapphire': '#6BA3C8',
  'White Ceylon Sapphire':          '#f0f0f0',
  'Crimson Ceylon Ruby':            '#c41230',
  'Vibrant Emerald':                '#0a8a3c',
  'Royal Blue Ceylon Sapphire':     '#0a3d8f',
  'Ceylon Padparadscha Sapphire':   '#FF7F50',
  'Premium Blue-Sheen Moonstone':   '#B0C4DE',
  'Yellow Ceylon Sapphire':         '#FFD166',
  'Ceylon Pink Sapphire':           '#E88AAD',
};

const FALLBACK_STONE_COLOR = '#cccccc';

const DEFAULT_ENGRAVING = 5000;

/**
 * Pins which document an unqualified `findOne()` resolves to: oldest first, so
 * the semantic is "the first pricing document ever created wins".
 *
 * The collection is meant to hold exactly one document, but it held two for
 * months (the live one plus a pre-migration flat-field leftover, since deleted
 * by scripts/deletePricingLegacyDoc.ts). An unsorted findOne() returns natural
 * order, which is not a guarantee — had it flipped, the GET handler would have
 * read a document with no metals array, judged it old-format, and reset every
 * pricePerGram to 0.
 *
 * Sorted on `_id` rather than `createdAt`: an ObjectId leads with a creation
 * timestamp so it orders the same way, but it is always present and unique,
 * giving a total order with no ties. `createdAt` comes from the timestamps
 * option and the root schema is strict:false, so a hand-inserted or legacy
 * document can lack it entirely and sort unpredictably.
 */
const PRICING_DOC_SORT = { _id: 1 } as const;

export const DEFAULT_UPGRADES = [
  { key: 'engraving', name: 'Engraving', price: DEFAULT_ENGRAVING },
];

/**
 * Adds a `color` to any stone entry missing one, by key then by display name.
 *
 * A previously stored FALLBACK_STONE_COLOR counts as missing: it was assigned by
 * an earlier backfill that had no entry for that stone, never chosen by an admin,
 * so a real colour now known for it should win.
 */
function withStoneColors(stones: any[]): any[] {
  return (stones ?? []).map(s => {
    const known = STONE_COLOR_BY_KEY[s?.key] || STONE_COLOR_BY_NAME[s?.displayName];
    const saved = s?.color && s.color.toLowerCase() !== FALLBACK_STONE_COLOR ? s.color : null;
    return { ...s, color: saved || known || FALLBACK_STONE_COLOR };
  });
}

/** Same treatment for metals — key map, then the shared grey fallback. */
function withMetalColors(metals: any[]): any[] {
  return (metals ?? []).map(m => {
    const saved = m?.color && m.color.toLowerCase() !== FALLBACK_STONE_COLOR ? m.color : null;
    return { ...m, color: saved || METAL_COLOR_BY_KEY[m?.key] || FALLBACK_STONE_COLOR };
  });
}

/**
 * Read-time migration of a metals array from the ratio `multiplier` to an LKR
 * `pricePerGram`, mirroring the flat-field migration above.
 *
 * An entry carrying the old field gets `pricePerGram: 0` and loses `multiplier`
 * entirely. Nothing is derived from the old value — see DEFAULT_METALS. Entries
 * already migrated are returned untouched, so this is idempotent and safe to run
 * on every GET.
 */
function withPricePerGram(metals: any[]): any[] {
  return (metals ?? []).map(m => {
    const { multiplier: _legacy, ...rest } = m ?? {};
    return {
      ...rest,
      pricePerGram: typeof m?.pricePerGram === 'number' ? m.pricePerGram : 0,
    };
  });
}

/** True when any entry still carries `multiplier`, or lacks a numeric `pricePerGram`. */
function metalsNeedPriceMigration(metals: any[]): boolean {
  return (metals ?? []).some(
    m => m?.multiplier !== undefined || typeof m?.pricePerGram !== 'number'
  );
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
  // The legacy flat metalMultiplier_* fields are deliberately dropped, not
  // converted: they were ratios against silver with no absolute per-gram rate
  // behind them, so there is no arithmetic that turns one into an LKR/g figure.
  const metals = DEFAULT_METALS.map(m => ({
    key: m.key,
    displayName: m.displayName,
    pricePerGram: m.pricePerGram,
    color: m.color,
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

    // Use lean() so we can read old flat fields even if they're not in the current schema.
    // Sorted — see PRICING_DOC_SORT.
    const raw = await Pricing.findOne().sort(PRICING_DOC_SORT).lean() as Record<string, any> | null;

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

    // Already new format — backfill colours and the upgrades array if this
    // document predates them, then persist the backfill so it happens once.
    const stones   = withStoneColors(raw.stones);
    const metals   = withMetalColors(withPricePerGram(raw.metals));
    const upgrades = withUpgrades(raw.upgrades, raw.engravingPrice);

    // Compare against the resolved values so a stone stuck on the grey fallback
    // is rewritten too, not just one with no colour field at all.
    const changed = (before: any[] = [], after: any[] = []) =>
      after.some((entry, i) => entry.color !== before[i]?.color);

    const needsBackfill =
      !Array.isArray(raw.upgrades) || raw.upgrades.length === 0 ||
      changed(raw.stones, stones) ||
      changed(raw.metals, metals) ||
      metalsNeedPriceMigration(raw.metals);

    if (needsBackfill) {
      // $set on the whole metals array replaces the subdocuments outright, so the
      // legacy `multiplier` key is gone from the stored doc, not just the response.
      await Pricing.updateOne({ _id: raw._id }, { $set: { stones, metals, upgrades } });
    }

    return res.json({ ...raw, stones, metals, upgrades });
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

    // Same sort as the GET, so a read and a write can never pick different
    // documents — see PRICING_DOC_SORT.
    let pricing = await Pricing.findOne().sort(PRICING_DOC_SORT);

    if (!pricing) {
      const nextUpgrades = withUpgrades(upgrades, engravingPrice ?? DEFAULT_ENGRAVING);
      pricing = new Pricing({
        metals:         withMetalColors(withPricePerGram(metals ?? DEFAULT_METALS)),
        stones:         withStoneColors(stones ?? DEFAULT_STONES),
        upgrades:       nextUpgrades,
        engravingPrice: engravingFromUpgrades(nextUpgrades, engravingPrice ?? DEFAULT_ENGRAVING),
      });
    } else {
      if (metals         != null) pricing.metals         = withMetalColors(withPricePerGram(metals));
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
