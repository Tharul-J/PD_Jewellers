// Category names are compared loosely so 'Mens', 'mens' and "Men's" collapse to one key.
export const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const BASE_CATEGORIES = ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Bridal'];

// The catalog is the source of truth for which categories exist: admins can add one
// (stored in localStorage) and tag products with it, so anything the live products use
// has to show up alongside the base set. Shared by the Collections tabs and the style quiz
// so both offer exactly the same choices.
export function deriveCategories(products: { category?: string }[]): string[] {
  const fromStorage: string[] = (() => {
    try {
      const stored = localStorage.getItem('pd_product_categories');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  })();
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const c of [...BASE_CATEGORIES, ...fromStorage, ...products.map(p => p.category).filter(Boolean) as string[]]) {
    const key = normalize(c);
    if (!seen.has(key)) { seen.add(key); merged.push(c); }
  }
  return merged;
}
