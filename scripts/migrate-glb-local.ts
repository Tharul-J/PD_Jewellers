// One-shot migration: move ConfigurableModel GLBs off Cloudinary onto
// public/glb-models/, so production doesn't burn Cloudinary bandwidth/storage
// credits serving files that can just as well ship with the app.
//
// Dry-run by default — prints the proposed filename mapping and the orphan-
// deletion plan, then exits without touching anything. Pass --yes to execute.
//
// Usage:
//   npx tsx scripts/migrate-glb-local.ts          (dry run)
//   npx tsx scripts/migrate-glb-local.ts --yes     (download + update DB + delete orphans)

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ConfigurableModel from '../server/models/ConfigurableModel.js';

dotenv.config();

const EXECUTE = process.argv.includes('--yes');
const ROOT = process.cwd();
const GLB_ROOT = path.join(ROOT, 'public', 'glb-models');

// Filler words stripped from a model's `name` before deriving its filename.
const FILLER = new Set(['design', 'style', 'model', 'new']);

function subfolderFor(category: string | undefined): string {
  if (!category) return '';
  const c = category.toLowerCase().trim();
  return c.endsWith('s') ? c : `${c}s`;
}

// "Ring Style 4" -> "ring4" ; "Pendant Heart" -> "pendant-heart"
function baseNameFor(name: string): string {
  const tokens = name.toLowerCase().split(/\s+/).filter(Boolean).filter((t) => !FILLER.has(t));
  let numSuffix = '';
  if (tokens.length > 1 && /^\d+$/.test(tokens[tokens.length - 1])) {
    numSuffix = tokens.pop() as string;
  }
  const base = tokens.join('-') || 'model';
  return numSuffix ? `${base}${numSuffix}` : base;
}

// Resolves collisions against `used` (pre-seeded with whatever's already on
// disk in that subfolder, so we never silently overwrite an existing file —
// e.g. the hardcoded ring1-5.glb fallback set referenced outside MongoDB).
function resolveCollision(base: string, used: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${n}`;
    n++;
  }
  used.add(candidate);
  return candidate;
}

// Scans known source files for hardcoded /glb-models/... references so the
// orphan-cleanup pass never deletes a file that's only referenced in code,
// not in MongoDB (e.g. Configurator.tsx's DEFAULT_RING_STYLES offline fallback,
// modelController.ts's LOCAL_RING_SEEDS).
function findHardcodedGlbReferences(): Set<string> {
  const candidateFiles = [
    'src/pages/Configurator.tsx',
    'src/components/RingModels.tsx',
    'src/utils/modelLoader.ts',
    'server/controllers/modelController.ts',
  ];
  const found = new Set<string>();
  for (const rel of candidateFiles) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    const re = /\/glb-models\/[A-Za-z0-9/_.-]+\.glb/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) found.add(m[0]);
  }
  return found;
}

function listGlbFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listGlbFilesRecursive(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) out.push(full);
  }
  return out;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in .env — aborting.');
    process.exit(1);
  }

  console.log(`[db] Connecting to MongoDB...`);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`[db] Connected.`);

  const allDocs = await ConfigurableModel.find({});
  const cloudDocs = allDocs.filter((d) => d.glbUrl.startsWith('http'));
  const localSkippedCount = allDocs.length - cloudDocs.length;

  if (cloudDocs.length === 0) {
    console.log(`No Cloudinary-hosted models found. Migrated 0 models, skipped ${localSkippedCount} already-local.`);
  } else {
    // Seed per-subfolder "used filename" sets from whatever's already on disk,
    // so a derived name never collides with a pre-existing file.
    const usedBySubfolder = new Map<string, Set<string>>();
    const getUsed = (subfolder: string) => {
      if (!usedBySubfolder.has(subfolder)) {
        const dir = path.join(GLB_ROOT, subfolder);
        const existing = fs.existsSync(dir)
          ? fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.glb')).map((f) => f.replace(/\.glb$/i, ''))
          : [];
        usedBySubfolder.set(subfolder, new Set(existing));
      }
      return usedBySubfolder.get(subfolder)!;
    };

    type Mapping = { doc: (typeof cloudDocs)[number]; subfolder: string; filename: string; localPath: string; diskPath: string };
    const mappings: Mapping[] = cloudDocs.map((doc) => {
      const subfolder = subfolderFor(doc.category);
      const base = baseNameFor(doc.name);
      const finalBase = resolveCollision(base, getUsed(subfolder));
      const filename = `${finalBase}.glb`;
      const localPath = subfolder ? `/glb-models/${subfolder}/${filename}` : `/glb-models/${filename}`;
      const diskPath = subfolder ? path.join(GLB_ROOT, subfolder, filename) : path.join(GLB_ROOT, filename);
      return { doc, subfolder, filename, localPath, diskPath };
    });

    console.log(`\nProposed mapping (${mappings.length} model${mappings.length === 1 ? '' : 's'}):`);
    for (const m of mappings) {
      console.log(`  ${m.doc.name}  [${m.doc.category}]`);
      console.log(`    ${m.doc.glbUrl}`);
      console.log(`    -> ${m.localPath}`);
    }

    if (!EXECUTE) {
      console.log(`\nDry run only — re-run with --yes to download and update MongoDB.`);
    } else {
      let migrated = 0;
      for (const m of mappings) {
        const res = await fetch(m.doc.glbUrl);
        if (!res.ok) {
          console.error(`✗ ${m.doc.name}: fetch failed (${res.status} ${res.statusText}) for ${m.doc.glbUrl}`);
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        fs.mkdirSync(path.dirname(m.diskPath), { recursive: true });
        fs.writeFileSync(m.diskPath, buf);

        const oldUrl = m.doc.glbUrl;
        m.doc.glbUrl = m.localPath;
        await m.doc.save();

        console.log(`✓ ${m.doc.name}: ${oldUrl} → ${m.localPath}`);
        migrated++;
      }
      console.log(`\nMigrated ${migrated} models, skipped ${localSkippedCount} already-local.`);
    }
  }

  // ── Step 3b: orphan cleanup ──────────────────────────────────────────────
  // Re-read DB state (post-update if we just executed) and cross-reference
  // against every .glb on disk. A file referenced only by hardcoded frontend/
  // backend fallback source (not MongoDB) is still protected — see
  // findHardcodedGlbReferences().
  const freshDocs = await ConfigurableModel.find({});
  const referencedLocalPaths = new Set(
    freshDocs.map((d) => d.glbUrl).filter((u) => u.startsWith('/glb-models/'))
  );
  const hardcodedRefs = findHardcodedGlbReferences();

  const allDiskFiles = listGlbFilesRecursive(GLB_ROOT);
  const orphans = allDiskFiles.filter((abs) => {
    const rel = '/' + path.relative(path.join(ROOT, 'public'), abs).split(path.sep).join('/');
    return !referencedLocalPaths.has(rel) && !hardcodedRefs.has(rel);
  });

  if (orphans.length === 0) {
    console.log(`\nNo orphaned GLB files found.`);
  } else {
    console.log(`\nOrphaned GLB files (not referenced by MongoDB or hardcoded fallbacks):`);
    for (const f of orphans) console.log(`  ${f}`);

    if (!EXECUTE) {
      console.log(`\nDry run only — re-run with --yes to delete these.`);
    } else {
      for (const f of orphans) {
        fs.unlinkSync(f);
        console.log(`🗑 Deleted orphan: ${f}`);
      }
    }
  }

  await mongoose.disconnect();

  if (EXECUTE) {
    console.log(`
✅ All models migrated to local. You can now:
   1. Go to Cloudinary dashboard → Media Library → 3d_models folder
   2. Delete all files there to free up credits
   3. The admin upload flow still works for NEW uploads during demo
`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
