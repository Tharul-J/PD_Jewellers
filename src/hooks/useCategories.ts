import { useCallback, useMemo, useState } from 'react';
import {
  BASE_CATEGORIES,
  deriveCategories,
  normalize,
  readStoredCategories,
  writeStoredCategories,
} from '../lib/categories';

/**
 * The shared category list, derived from the products passed in plus the base and
 * admin-added sets. Pass whatever product list the caller already has — the list
 * re-derives whenever those products change, so a newly tagged category shows up
 * on its own.
 */
export function useCategories(products: { category?: string }[]) {
  // Admin-added categories live in localStorage, so a write there has to invalidate
  // the memo the same way a change to the product list does.
  const [revision, setRevision] = useState(0);

  const categories = useMemo(() => deriveCategories(products), [products, revision]);

  /** Returns false when the name is empty or already exists under any casing. */
  const addCategory = useCallback((name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const label = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    const stored = readStoredCategories();
    const taken = [...BASE_CATEGORIES, ...stored, ...products.map(p => p.category ?? '')]
      .some(c => c && normalize(c) === normalize(label));
    if (taken) return false;
    writeStoredCategories([...stored, label]);
    setRevision(r => r + 1);
    return true;
  }, [products]);

  /**
   * Only clears the admin-added entry. A category still tagged on products is
   * re-derived from them on the next render, which is why callers block removal
   * while any product uses it.
   */
  const removeCategory = useCallback((name: string) => {
    writeStoredCategories(readStoredCategories().filter(c => normalize(c) !== normalize(name)));
    setRevision(r => r + 1);
  }, []);

  return { categories, addCategory, removeCategory };
}
