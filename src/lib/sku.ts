// Cart items encode the chosen variant into their id
// (`RI001-gold-diamond-US 7-plain`) so two configurations of the same piece stay
// separate lines in the inquiry. Orders copied that id straight into
// `productId`, so a purchased item's productId is either a bare SKU (added from
// the collections grid) or a variant key (added from a product page).
//
// Product SKUs are `PREFIX + digits` and never contain a dash, so the segment
// before the first dash is always the SKU. New orders store the bare SKU; this
// keeps the records written before that fix resolvable.
export const skuOf = (productId: string | undefined | null): string =>
  String(productId ?? '').split('-')[0];
