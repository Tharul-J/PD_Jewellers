// One-shot backfill: populate Product.weight (grams) for every product that
// predates the field, so the configurator can price metal as weight x rate
// instead of a ratio multiplier.
//
// Weight already exists in the catalogue, but only as prose inside the
// customer-facing description ("... Gold Weight: 4.46g."). This parses it out
// into the numeric field. The description text is left untouched.
//
// Usage:
//   npx tsx scripts/backfillProductWeight.ts

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../server/models/Product.js';

dotenv.config();

// Used when neither metalWeight nor the description yields a number. Matches
// DEFAULT_WEIGHT_G in the configurator so an unparsed product prices the same
// way a weightless one does at runtime.
const CATEGORY_DEFAULT_G: Record<string, number> = {
  ring: 4,
  pendant: 2.5,
};
const FALLBACK_DEFAULT_G = 3;

type Source = 'metalWeight' | 'description' | 'default';

// The dedicated field first — an admin who typed "5.2 g" there meant it.
const METAL_WEIGHT_RE = /([\d.]+)\s*g/i;

// Then the description. The labelled form is tried first so a stray "18g" chain
// length elsewhere in the sentence can't beat the actual "Gold Weight: 4.46g".
const DESC_LABELLED_RE = /(?:gold|metal)\s+weight[:\s]*([\d.]+)\s*g/i;
const DESC_LOOSE_RE = /([\d.]+)\s*g(?:rams?)?\b/i;

/** Parses the first sane gram figure out of a string, or null. */
function parseGrams(text: string | undefined, re: RegExp): number | null {
  if (!text) return null;
  const match = text.match(re);
  if (!match) return null;
  const grams = Number.parseFloat(match[1]);
  // A trailing-dot capture ("4.") parses fine but a non-positive or NaN value is
  // not a weight — fall through to the next strategy rather than storing it.
  if (!Number.isFinite(grams) || grams <= 0) return null;
  return Math.round(grams * 100) / 100;
}

function categoryDefault(category: string | undefined): number {
  const c = (category ?? '').toLowerCase().replace(/s$/, '');
  return CATEGORY_DEFAULT_G[c] ?? FALLBACK_DEFAULT_G;
}

/** Resolves a product's weight and where the number came from. */
function resolveWeight(p: { metalWeight?: string; description?: string; category?: string }): {
  weight: number;
  source: Source;
} {
  const fromField = parseGrams(p.metalWeight, METAL_WEIGHT_RE);
  if (fromField !== null) return { weight: fromField, source: 'metalWeight' };

  const fromLabel = parseGrams(p.description, DESC_LABELLED_RE);
  if (fromLabel !== null) return { weight: fromLabel, source: 'description' };

  const fromLoose = parseGrams(p.description, DESC_LOOSE_RE);
  if (fromLoose !== null) return { weight: fromLoose, source: 'description' };

  return { weight: categoryDefault(p.category), source: 'default' };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set — nothing to migrate.');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected.\n');

  // $in [null] also catches documents written before the field existed.
  const pending = await Product.find({
    $or: [{ weight: 0 }, { weight: { $in: [null] } }, { weight: { $exists: false } }],
  });

  console.log(`${pending.length} product(s) need a weight.\n`);

  const counts: Record<Source, number> = { metalWeight: 0, description: 0, default: 0 };

  for (const product of pending) {
    const { weight, source } = resolveWeight(product);
    product.weight = weight;
    await product.save();
    counts[source] += 1;
    console.log(`[BACKFILL] ${product.id} ${product.name} — weight: ${weight}g ${source}`);
  }

  const remaining = await Product.countDocuments({
    $or: [{ weight: 0 }, { weight: { $in: [null] } }, { weight: { $exists: false } }],
  });

  console.log('\n── Summary ───────────────────────────────');
  console.log(`updated:      ${pending.length}`);
  console.log(`  metalWeight: ${counts.metalWeight}`);
  console.log(`  description: ${counts.description}`);
  console.log(`  default:     ${counts.default}`);
  console.log(`still weightless after run: ${remaining}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Backfill failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
