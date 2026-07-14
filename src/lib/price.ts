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
