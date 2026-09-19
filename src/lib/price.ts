export const formatPrice = (v: number | string | undefined | null): string =>
  `LKR ${Number(v || 0).toLocaleString('en-US')}`;

// Grand totals, pre-quote. SRS: exact prices cannot be quoted.
export const formatIndicative = (v: number | string | undefined | null): string =>
  `Starting from ${formatPrice(v)}`;

// Line items within an estimate.
export const formatEstimate = (v: number | string | undefined | null): string =>
  `Est. ${formatPrice(v)}`;

// Committed/transactional amounts (payments, receipts). Exact by design.
export const formatExact = formatPrice;

export const INDICATIVE_NOTE =
  'Indicative only. Each piece is handcrafted; the final price is confirmed after inquiry.';

// ── Size price adjustment ────────────────────────────────────────────────────
// Deliberately separate from the geometry/AR scale maps in Configurator.tsx and
// ARTryOnModal.tsx: those size a mesh on screen, these price the extra metal a
// larger piece takes. Index-based, so the default size is the anchor and lands
// on exactly 1.00 by construction.

const RING_SIZES = ['US 4', 'US 5', 'US 6', 'US 7', 'US 8', 'US 9'] as const;
export const DEFAULT_RING_SIZE = 'US 7';

const PENDANT_SIZES = ['small', 'medium', 'large'] as const;
export const DEFAULT_PENDANT_SIZE = 'medium';

const RING_PRICE_STEP = 0.025;    // 2.5% per size step
const PENDANT_PRICE_STEP = 0.05;  // 5% per size step

/** US 4 .925 · US 5 .950 · US 6 .975 · US 7 1.000 · US 8 1.025 · US 9 1.050 */
export function ringSizePriceMultiplier(size: string): number {
  const index = RING_SIZES.indexOf(size as typeof RING_SIZES[number]);
  const anchor = RING_SIZES.indexOf(DEFAULT_RING_SIZE);
  if (index < 0) return 1;
  return 1 + (index - anchor) * RING_PRICE_STEP;
}

/** Small .95 · Medium 1.00 · Large 1.05 */
export function pendantSizePriceMultiplier(size: string): number {
  const index = PENDANT_SIZES.indexOf(size as typeof PENDANT_SIZES[number]);
  const anchor = PENDANT_SIZES.indexOf(DEFAULT_PENDANT_SIZE);
  if (index < 0) return 1;
  return 1 + (index - anchor) * PENDANT_PRICE_STEP;
}

/** Size multiplier for either model type, so callers needn't branch. */
export function sizePriceMultiplier(modelType: 'ring' | 'pendant', size: string): number {
  return modelType === 'ring' ? ringSizePriceMultiplier(size) : pendantSizePriceMultiplier(size);
}

// ── Indicative price ─────────────────────────────────────────────────────────

/**
 * Metal weight in grams assumed when a configurator piece has none recorded.
 *
 * Related to, but not the same as, the backfill script's category buckets: those
 * classify a whole catalogue (earrings, chains, bangles) and put the ring family
 * at 4.5g, whereas these two cover only the configurator's own ring and pendant
 * builds. Changing one does not change the other.
 */
export const DEFAULT_WEIGHT_G = { ring: 4, pendant: 2.5 } as const;

export interface PriceInput {
  modelType: 'ring' | 'pendant';
  /** Making charge before size adjustment. */
  basePrice: number;
  /** Grams. 0 or undefined falls back to DEFAULT_WEIGHT_G[modelType]. */
  weight?: number;
  sizeMultiplier: number;
  /** LKR per gram for the selected metal. 0 until an admin sets a rate. */
  pricePerGram: number;
  /** Centre stone, charged on rings only. */
  stonePrice?: number;
  /** Charged only when the caller says engraving applies. */
  engravingPrice?: number;
}

export interface PriceBreakdown {
  metal: number;
  making: number;
  stone: number;
  engraving: number;
}

/**
 * The single indicative-price formula, shared by the configurator and the
 * product page so the two cannot drift apart again (they previously did — the
 * product page never applied the size multiplier).
 *
 * Metal is priced by weight rather than as a ratio of the making charge, so a
 * gold-rate change is one admin edit instead of a re-derived multiplier.
 *
 * LKR is whole-number: each line is rounded on its own and the total is the sum
 * of the rounded lines, so a displayed breakdown always adds up to its total.
 */
export function computeConfiguratorPrice(input: PriceInput): {
  total: number;
  breakdown: PriceBreakdown;
} {
  const { modelType, basePrice, weight, sizeMultiplier, pricePerGram } = input;

  // A larger piece takes more metal, so weight — not the rate — carries the size.
  const effectiveWeight = (weight || DEFAULT_WEIGHT_G[modelType]) * sizeMultiplier;

  const metal = Math.round(effectiveWeight * (pricePerGram || 0));
  const making = Math.round(basePrice * sizeMultiplier);
  // Stones are a per-piece item, but a larger setting takes a larger stone.
  const stone = modelType === 'ring' ? Math.round((input.stonePrice ?? 0) * sizeMultiplier) : 0;
  // Engraving is labour on a fixed text, so it does not scale with size.
  const engraving = Math.round(input.engravingPrice ?? 0);

  return {
    total: metal + making + stone + engraving,
    breakdown: { metal, making, stone, engraving },
  };
}
