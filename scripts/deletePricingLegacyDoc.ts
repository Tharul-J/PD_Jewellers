// One-off: removes the pre-migration flat-field Pricing document.
//
// The pricings collection held two documents: the live one (metals/stones/
// upgrades arrays) and the original flat-field document from before the Phase-2
// migration (metalMultiplier_silver, stonePrice_ruby, ...). Nothing reads the
// second one today, because Pricing.findOne() happens to return the live one
// first — but that order is not guaranteed. If it ever flipped, the GET handler
// would see a document with no metals array, treat it as old-format, and run
// migrateFromFlatFields, resetting every pricePerGram to 0.
//
// Safe to leave in tree: it matches one specific _id, refuses to touch a
// document that has a metals array, and writes a JSON backup of the whole
// collection before deleting anything.
//
// Usage:
//   npx tsx scripts/deletePricingLegacyDoc.ts --dry-run   (inspect + back up only)
//   npx tsx scripts/deletePricingLegacyDoc.ts             (back up, then delete)

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const LEGACY_ID = '6a37d4f3cca2e4e585ec749f';
const DRY_RUN = process.argv.includes('--dry-run');

function backupDir(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return path.join(process.cwd(), `_backup_pricings_${stamp}`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const col = mongoose.connection.db!.collection('pricings');

  const all = await col.find({}).toArray();
  console.log(`pricings collection holds ${all.length} document(s):`);
  for (const d of all) {
    console.log(
      `  _id=${d._id} metals=${Array.isArray(d.metals) ? `array(${d.metals.length})` : 'MISSING'} ` +
      `flatFields=${Object.keys(d).filter(k => k.startsWith('metalMultiplier_')).length}`
    );
  }

  // ── Backup first, always — even on a dry run ──────────────────────────────
  // mongodump is not installed in this environment, so this writes the same
  // content as JSON. Restore with insertMany() after JSON.parse().
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'pricings.json');
  fs.writeFileSync(file, JSON.stringify(all, null, 2));

  // Prove the backup is readable and complete before touching anything.
  const readBack = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(readBack) || readBack.length !== all.length) {
    console.error('Backup verification FAILED — refusing to delete.');
    process.exit(1);
  }
  console.log(`\nbackup written and verified: ${file} (${readBack.length} document(s))`);

  // ── Locate the target ─────────────────────────────────────────────────────
  let target;
  try {
    target = await col.findOne({ _id: new mongoose.Types.ObjectId(LEGACY_ID) });
  } catch {
    console.error(`${LEGACY_ID} is not a valid ObjectId.`);
    process.exit(1);
  }

  if (!target) {
    console.log(`\n${LEGACY_ID} not found — already deleted. Nothing to do.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // Guard: a document carrying a metals array is a live pricing document,
  // whatever its _id. Never delete one.
  if (Array.isArray(target.metals)) {
    console.error(`\nREFUSING: ${LEGACY_ID} has a metals array — that is a live document, not the legacy one.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\ntarget ${LEGACY_ID} confirmed legacy (no metals array).`);
  console.log('  top-level keys:', Object.keys(target).join(', '));

  if (DRY_RUN) {
    console.log('\n--dry-run: backup taken, nothing deleted.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const result = await col.deleteOne({ _id: target._id, metals: { $exists: false } });
  console.log(`\ndeletedCount: ${result.deletedCount}`);

  const remaining = await col.find({}).toArray();
  console.log(`pricings now holds ${remaining.length} document(s):`);
  for (const d of remaining) {
    console.log(`  _id=${d._id} metals=${Array.isArray(d.metals) ? `array(${d.metals.length})` : 'MISSING'}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
