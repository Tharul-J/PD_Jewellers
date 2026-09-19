// One-shot backfill: populate Product.weight (grams) for every product that
// predates the field, so the configurator can price metal as weight x rate
// instead of a ratio multiplier.
//
// Weight already exists in the catalogue, but only as prose inside the
// customer-facing description ("... Gold Weight: 4.46g."). This parses it out
// into the numeric field. The description text is left untouched.
//
// Usage:
//   npx tsx scripts/backfillProductWeight.ts                        (fill weightless products)
//   npx tsx scripts/backfillProductWeight.ts --fix-defaults         (re-resolve only fallback-weighted ones)
//   ... add --dry-run to either to print the plan without writing.

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../server/models/Product.js';

dotenv.config();

// Used when neither metalWeight nor the description yields a number.
//
// Ordered, and matched as substrings: the first entry whose pattern appears wins.
// Order is load-bearing — "earrings" contains "ring", so the earring bucket has
// to be tested before the ring family or every pair of studs prices as a ring.
const WEIGHT_BUCKETS: Array<{ patterns: string[]; grams: number }> = [
  { patterns: ['earring', 'ear'],           grams: 1.5 },
  { patterns: ['necklace', 'chain'],        grams: 8 },
  { patterns: ['bangle', 'bracelet'],       grams: 12 },
  { patterns: ['pendant'],                  grams: 2.5 },
  { patterns: ['ring', 'bridal', 'engagement'], grams: 4.5 },
];
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

function matchBucket(text: string | undefined): number | null {
  const t = (text ?? '').toLowerCase();
  if (!t) return null;
  for (const bucket of WEIGHT_BUCKETS) {
    if (bucket.patterns.some(p => t.includes(p))) return bucket.grams;
  }
  return null;
}

/**
 * Category first, then the product name.
 *
 * The name is not a nicety: this catalogue has categories that name an audience
 * rather than an item type ("Mens", "Teen", "Bridal"), and "Mens" holds both a
 * ring and a pendant — so no category rule can be right for both. The item type
 * is in the name ("Mens Pendant Blue Silver"), so that is where we look next.
 *
 * Returns null when neither names a type, leaving the caller on the generic
 * fallback rather than inventing a number from an audience label.
 */
function categoryDefault(category: string | undefined, name?: string): {
  grams: number;
  specific: boolean;
} {
  const fromCategory = matchBucket(category);
  if (fromCategory !== null) return { grams: fromCategory, specific: true };

  const fromName = matchBucket(name);
  if (fromName !== null) return { grams: fromName, specific: true };

  return { grams: FALLBACK_DEFAULT_G, specific: false };
}

/** Resolves a product's weight and where the number came from. */
function resolveWeight(p: {
  metalWeight?: string;
  description?: string;
  category?: string;
  name?: string;
}): { weight: number; source: Source; specific?: boolean } {
  const fromField = parseGrams(p.metalWeight, METAL_WEIGHT_RE);
  if (fromField !== null) return { weight: fromField, source: 'metalWeight' };

  const fromLabel = parseGrams(p.description, DESC_LABELLED_RE);
  if (fromLabel !== null) return { weight: fromLabel, source: 'description' };

  const fromLoose = parseGrams(p.description, DESC_LOOSE_RE);
  if (fromLoose !== null) return { weight: fromLoose, source: 'description' };

  const { grams, specific } = categoryDefault(p.category, p.name);
  return { weight: grams, source: 'default', specific };
}

const WEIGHTLESS = {
  // $in [null] also catches documents written before the field existed.
  $or: [{ weight: 0 }, { weight: { $in: [null] } }, { weight: { $exists: false } }],
};

/**
 * Re-resolves only the products left on the generic fallback.
 *
 * Deliberately narrow: it matches `weight === FALLBACK_DEFAULT_G` exactly, so a
 * weight parsed from metalWeight or a description is never reconsidered, and it
 * writes only when the buckets now yield a *specific* type. A product whose
 * category and name both name no item type keeps the fallback and is listed for
 * a human to set by hand.
 */
async function fixDefaults(dryRun: boolean) {
  const candidates = await Product.find({ weight: FALLBACK_DEFAULT_G });
  console.log(`${candidates.length} product(s) sitting on the ${FALLBACK_DEFAULT_G}g fallback.\n`);

  let updated = 0;
  const unresolved: string[] = [];

  for (const product of candidates) {
    // Re-parse from scratch: if a description gained a gram figure since the
    // first run, that real number should win over any bucket.
    const { weight, source, specific } = resolveWeight(product);

    if (source === 'default' && !specific) {
      unresolved.push(`${product.id} (${product.category}) ${product.name}`);
      continue;
    }
    if (weight === product.weight) continue;

    console.log(
      `[${dryRun ? 'DRY-RUN' : 'FIX'}] ${product.id} ${product.name} — ` +
      `${product.weight}g -> ${weight}g (${source}${specific ? ', by type' : ''})`
    );
    if (!dryRun) {
      product.weight = weight;
      await product.save();
    }
    updated += 1;
  }

  console.log('\n── Summary ───────────────────────────────');
  console.log(`${dryRun ? 'would update' : 'updated'}: ${updated}`);
  if (unresolved.length > 0) {
    console.log(`\nleft on the ${FALLBACK_DEFAULT_G}g fallback — set these by hand in the admin form:`);
    for (const u of unresolved) console.log(`  · ${u}`);
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set — nothing to migrate.');
    process.exit(1);
  }

  const dryRun = process.argv.includes('--dry-run');
  const mode = process.argv.includes('--fix-defaults') ? 'fix-defaults' : 'backfill';

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected. mode=${mode}${dryRun ? ' (dry run)' : ''}\n`);

  if (mode === 'fix-defaults') {
    await fixDefaults(dryRun);
    await mongoose.disconnect();
    process.exit(0);
  }

  const pending = await Product.find(WEIGHTLESS);

  console.log(`${pending.length} product(s) need a weight.\n`);

  const counts: Record<Source, number> = { metalWeight: 0, description: 0, default: 0 };

  for (const product of pending) {
    const { weight, source } = resolveWeight(product);
    counts[source] += 1;
    console.log(`[${dryRun ? 'DRY-RUN' : 'BACKFILL'}] ${product.id} ${product.name} — weight: ${weight}g ${source}`);
    if (dryRun) continue;
    product.weight = weight;
    await product.save();
  }

  const remaining = await Product.countDocuments(WEIGHTLESS);

  console.log('\n── Summary ───────────────────────────────');
  console.log(`${dryRun ? 'would update' : 'updated'}:      ${pending.length}`);
  console.log(`  metalWeight: ${counts.metalWeight}`);
  console.log(`  description: ${counts.description}`);
  console.log(`  default:     ${counts.default}`);
  console.log(`still weightless${dryRun ? '' : ' after run'}: ${remaining}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Backfill failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
