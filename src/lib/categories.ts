// Category names are compared loosely so 'Mens', 'mens' and "Men's" collapse to one key.
export const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const BASE_CATEGORIES = ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Bridal'];

const STORAGE_KEY = 'pd_product_categories';

/** A category row as stored on the server. */
export interface Category {
  _id: string;
  name: string;
  key: string;
  isDefault: boolean;
  bannerImage: string;
  bannerPublicId: string;
  order: number;
}

/**
 * Legacy store. Categories now live in MongoDB; this is read once on the admin's
 * next visit so hand-added categories that never got tagged onto a product are
 * migrated up rather than lost, then cleared.
 */
export function readStoredCategories(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string' && !!c.trim()) : [];
  } catch { return []; }
}

export function writeStoredCategories(categories: string[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(categories)); } catch { /* private mode */ }
}

/** Drops the legacy store once its contents have been migrated to the server. */
export function clearStoredCategories(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
}

/**
 * The app's single category list — every dropdown, tab bar, filter and the style
 * quiz render this, so a category added through the admin appears everywhere.
 *
 * Base categories keep their fixed order; everything else (admin-added, plus any
 * value the live catalog actually uses) is appended alphabetically. De-duped
 * case-insensitively, keeping the first spelling seen.
 */
export function deriveCategories(products: { category?: string }[]): string[] {
  const seen = new Set(BASE_CATEGORIES.map(normalize));
  const extras: string[] = [];

  // Products come first so the catalog's own spelling wins the de-dupe: a hand-typed
  // "mens" must not shadow the "Mens" that products are actually tagged with.
  for (const c of [...products.map(p => p.category), ...readStoredCategories()]) {
    if (!c) continue;
    const key = normalize(c);
    if (seen.has(key)) continue;
    seen.add(key);
    extras.push(c);
  }

  extras.sort((a, b) => a.localeCompare(b));
  return [...BASE_CATEGORIES, ...extras];
}
