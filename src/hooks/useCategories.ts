import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Category,
  clearStoredCategories,
  deriveCategories,
  normalize,
  readStoredCategories,
} from '../lib/categories';

interface MutationResult {
  ok: boolean;
  message?: string;
  productsUpdated?: number;
}

/**
 * The shared category list, served from /api/categories.
 *
 * Categories used to be assembled in the browser from a hardcoded array plus
 * localStorage, which meant an admin-added category existed only on the machine
 * that added it and could not carry a banner image. They are now rows in Mongo;
 * the server seeds the built-ins and anything the catalog is already tagged with.
 *
 * `products` is still accepted: it is the offline fallback, so the dropdowns and
 * filters keep working against the live catalog when the API is unreachable.
 * Pass `token` on admin screens to enable the mutations.
 */
export function useCategories(products: { category?: string }[], token?: string) {
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * True while a category edit is open with unsaved changes, until the next
   * successful save or an explicit cancel.
   *
   * A background refetch (another tab's poll, a window-focus refresh, or the
   * mount race when the admin switches tabs) replaces `categoryList` wholesale.
   * Without this guard it would land underneath an open editor and the admin's
   * typed name would be replaced by the stored one.
   *
   * A ref, not state: marking the list dirty must not itself trigger a render.
   * It is also why `isEditingField()` from pollGuard is not enough here —
   * clicking Save moves focus off the input before the request resolves, so the
   * focus check stops protecting exactly during the window that matters.
   */
  const listDirty = useRef(false);

  const markDirty = useCallback(() => { listDirty.current = true; }, []);
  const clearDirty = useCallback(() => { listDirty.current = false; }, []);

  /** `force` bypasses the dirty guard — only a save should adopt server state. */
  const refresh = useCallback(async (force = false): Promise<void> => {
    if (listDirty.current && !force) return;
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error(String(res.status));
      const data: Category[] = await res.json();
      if (listDirty.current && !force) return; // dirtied while in flight
      setCategoryList(data);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // One-time lift of categories that only ever existed in this browser. Needs an
  // admin token to POST, so it runs on the admin screen and nowhere else.
  const migrated = useRef(false);
  useEffect(() => {
    if (!token || !loaded || failed || migrated.current) return;
    const leftovers = readStoredCategories();
    if (leftovers.length === 0) { migrated.current = true; return; }
    migrated.current = true;
    void (async () => {
      const known = new Set(categoryList.map(c => c.key));
      const pending = leftovers.filter(name => !known.has(normalize(name)));
      for (const name of pending) {
        const body = new FormData();
        body.append('name', name);
        // A 409 here just means the server already had it — either way it is safe to drop.
        await fetch('/api/categories', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
        }).catch(() => undefined);
      }
      clearStoredCategories();
      if (pending.length > 0) await refresh(true);
    })();
  }, [token, loaded, failed, categoryList, refresh]);

  /**
   * Names only, in server order. Falls back to the derived list while the first
   * fetch is in flight or after it fails, so no consumer renders an empty list.
   */
  const categories = useMemo(() => {
    if (failed || (!loaded && categoryList.length === 0)) return deriveCategories(products);
    if (categoryList.length === 0) return deriveCategories(products);
    return categoryList.map(c => c.name);
  }, [categoryList, loaded, failed, products]);

  const addCategory = useCallback(async (name: string, banner?: File | null): Promise<MutationResult> => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, message: 'Category name is required' };
    if (!token) return { ok: false, message: 'Not authorised' };
    const label = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

    const body = new FormData();
    body.append('name', label);
    if (banner) body.append('banner', banner);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: data?.message ?? 'Could not add category' };
      await refresh(true);
      return { ok: true };
    } catch {
      return { ok: false, message: 'Network error' };
    }
  }, [token, refresh]);

  const updateCategory = useCallback(async (
    id: string,
    changes: { name?: string; banner?: File | null }
  ): Promise<MutationResult> => {
    if (!token) return { ok: false, message: 'Not authorised' };

    const body = new FormData();
    if (changes.name !== undefined) body.append('name', changes.name.trim());
    if (changes.banner) body.append('banner', changes.banner);

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: data?.message ?? 'Could not save category' };

      // The response is what was actually stored, so adopt it as the new source
      // of truth and drop the flag. On failure the flag stays set and the unsaved
      // edit survives for a retry instead of being replaced by the next refetch.
      const saved: Category = data.category;
      setCategoryList(prev => prev.map(c => (c._id === saved._id ? saved : c)));
      clearDirty();
      return { ok: true, productsUpdated: data.productsUpdated ?? 0 };
    } catch {
      return { ok: false, message: 'Network error' };
    }
  }, [token, clearDirty]);

  const removeCategory = useCallback(async (id: string): Promise<MutationResult> => {
    if (!token) return { ok: false, message: 'Not authorised' };
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: data?.message ?? 'Could not delete category' };
      await refresh(true);
      return { ok: true };
    } catch {
      return { ok: false, message: 'Network error' };
    }
  }, [token, refresh]);

  return {
    categories,
    categoryList,
    loading: !loaded,
    offline: failed,
    addCategory,
    updateCategory,
    removeCategory,
    refresh,
    markDirty,
    clearDirty,
  };
}
