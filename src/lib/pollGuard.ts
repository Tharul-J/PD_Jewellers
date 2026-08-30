import { useEffect } from 'react';

/**
 * Shared guard for background polling.
 *
 * Polls that replace state while someone is typing, or reading an open modal,
 * are disruptive: the refetch re-renders the tree underneath them. Every poll
 * in the app checks `shouldPausePolling()` before its tick, and merges rather
 * than replaces its list so unchanged rows keep their identity.
 */

type Listener = () => void;

// A counter, not a boolean — nested overlays (a modal opened over a drawer)
// must not let the inner one's close re-enable polling for the outer.
let overlayCount = 0;
const idleListeners = new Set<Listener>();

export const beginOverlay = (): void => { overlayCount += 1; };

export const endOverlay = (): void => {
  overlayCount = Math.max(0, overlayCount - 1);
  if (overlayCount === 0) {
    idleListeners.forEach(listener => {
      try { listener(); } catch { /* a bad listener must not block the rest */ }
    });
  }
};

export const isOverlayOpen = (): boolean => overlayCount > 0;

/** True while focus sits in something the user can type into or change. */
export const isEditingField = (): boolean => {
  if (typeof document === 'undefined') return false;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
};

export const shouldPausePolling = (): boolean => isOverlayOpen() || isEditingField();

/** Registers an overlay for as long as `open` is true. */
export function useOverlayGuard(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    beginOverlay();
    return endOverlay;
  }, [open]);
}

/**
 * Runs `onIdle` when the last overlay closes, so a paused poll refreshes
 * immediately instead of waiting out the remainder of its interval.
 */
export function useResumeOnOverlayClose(onIdle: () => void): void {
  useEffect(() => {
    idleListeners.add(onIdle);
    return () => { idleListeners.delete(onIdle); };
  }, [onIdle]);
}

/**
 * Merges a freshly fetched list into the previous one by `_id`.
 *
 * Unchanged items keep their exact previous object, and an entirely unchanged
 * list returns the previous array itself — so React can skip the update rather
 * than re-rendering every row on each poll. Order follows the incoming list.
 */
export function mergeById<T extends { _id?: string | number }>(prev: T[], next: T[]): T[] {
  if (prev.length === 0) return next;

  const previousById = new Map(prev.map(item => [String(item._id), item]));
  let changed = prev.length !== next.length;

  const merged = next.map((item, index) => {
    const existing = previousById.get(String(item._id));
    if (!existing) { changed = true; return item; }
    if (JSON.stringify(existing) === JSON.stringify(item)) {
      if (prev[index] !== existing) changed = true; // same item, new position
      return existing;
    }
    changed = true;
    return { ...existing, ...item };
  });

  return changed ? merged : prev;
}
