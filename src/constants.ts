export const METALS = {
  silver:   { name: '925 Sterling Silver',       color: '#e4e4e4', metalness: 0.9,  roughness: 0.15, clearcoat: 0.3,  clearcoatRoughness: 0.2,  priceMultiplier: 1  },
  white:    { name: '18K White Gold',             color: '#eeecea', metalness: 1,    roughness: 0.04, clearcoat: 0.8,  clearcoatRoughness: 0.05, priceMultiplier: 13 },
  gold:     { name: '22K Yellow Gold (916 Gold)', color: '#d4a820', metalness: 1,    roughness: 0.04, clearcoat: 0.6,  clearcoatRoughness: 0.08, priceMultiplier: 18 },
  gold18k: { name: '18K Yellow Gold', color: '#F5C842', metalness: 1, roughness: 0.03, clearcoat: 0.85, clearcoatRoughness: 0.04, priceMultiplier: 13 },
  rose:     { name: '18K Rose Gold',              color: '#e89080', metalness: 1,    roughness: 0.05, clearcoat: 0.5,  clearcoatRoughness: 0.1,  priceMultiplier: 13 },
  platinum: { name: 'Platinum (Pt950)',            color: '#b8b8b4', metalness: 1,    roughness: 0.03, clearcoat: 1.0,  clearcoatRoughness: 0.03, priceMultiplier: 22 },
};

export const STONES = {
  aquamarine:    { name: 'Cornflower / Sky Blue Sapphire', color: '#6BA3C8', transmission: 0.9, ior: 1.76, thickness: 2, roughness: 0,    clearcoat: 1, price: 65000  },
  diamond:       { name: 'White Ceylon Sapphire',          color: '#f0f0f0', transmission: 0.95, ior: 1.76, thickness: 2, roughness: 0,   clearcoat: 1, price: 95000  },
  ruby:          { name: 'Crimson Ceylon Ruby',            color: '#c41230', transmission: 0.9, ior: 1.76, thickness: 2, roughness: 0,    clearcoat: 1, price: 145000 },
  emerald:       { name: 'Vibrant Emerald',                color: '#0a8a3c', transmission: 0.9, ior: 1.57, thickness: 2, roughness: 0,    clearcoat: 1, price: 120000 },
  sapphire:      { name: 'Royal Blue Ceylon Sapphire',     color: '#0a3d8f', transmission: 0.9, ior: 1.76, thickness: 2, roughness: 0,    clearcoat: 1, price: 185000 },
  padparadscha:  { name: 'Ceylon Padparadscha Sapphire',   color: '#FF7F50', transmission: 0.9, ior: 1.76, thickness: 2, roughness: 0,    clearcoat: 1, price: 480000 },
  moonstone:     { name: 'Premium Blue-Sheen Moonstone',   color: '#B0C4DE', transmission: 0.6, ior: 1.52, thickness: 2, roughness: 0.05, clearcoat: 1, price: 45000  },
  yellowsapphire:{ name: 'Yellow Ceylon Sapphire',         color: '#FFD166', transmission: 0.9, ior: 1.76, thickness: 2, roughness: 0,    clearcoat: 1, price: 75000  },
  tourmaline:  { name: 'Ceylon Violet Tourmaline',    color: '#5D2E8C', transmission: 0.9,  ior: 1.634, thickness: 2, roughness: 0,    clearcoat: 1, price: 55000  },
  amethyst:    { name: 'Purple Amethyst',              color: '#9B59B6', transmission: 0.9,  ior: 1.544, thickness: 2, roughness: 0,    clearcoat: 1, price: 35000  },
  spinel:      { name: 'Rose Spinel',                  color: '#E0306A', transmission: 0.9,  ior: 1.718, thickness: 2, roughness: 0,    clearcoat: 1, price: 95000  },
  alexandrite: { name: 'Alexandrite',                  color: '#2E7D55', transmission: 0.9,  ior: 1.746, thickness: 2, roughness: 0,    clearcoat: 1, price: 350000 },
  catseye:     { name: "Chrysoberyl Cat's Eye",        color: '#C8901A', transmission: 0.75, ior: 1.746, thickness: 2, roughness: 0.08, clearcoat: 1, price: 180000 },
  zircon:      { name: 'Blue Zircon',                  color: '#0098C9', transmission: 0.9,  ior: 1.930, thickness: 2, roughness: 0,    clearcoat: 1, price: 60000  },
};

// METALS and STONES double as pricing/display config: `priceMultiplier`, `price` and the
// human-readable `name` sit alongside the PBR fields. Spreading an entry straight onto a
// Three.js material makes it log "'priceMultiplier' is not a property of
// THREE.MeshPhysicalMaterial" on every build of the material, and quietly overwrites
// material.name with the display string. Strip them at the material boundary instead —
// the fields stay in the tables above, where PricingContext and the UI read them.
type NonMaterialKey = 'name' | 'price' | 'priceMultiplier';

export function materialProps<T extends object>(config: T): Omit<T, NonMaterialKey> {
  const { name: _name, price: _price, priceMultiplier: _priceMultiplier, ...rest } =
    config as Record<string, unknown>;
  return rest as Omit<T, NonMaterialKey>;
}

export const FONTS = {
  cinzel:     { name: 'Cinzel',             url: '/fonts/cinzel_regular.typeface.json',             boldUrl: '/fonts/cinzel_bold.typeface.json' },
  cormorant:  { name: 'Cormorant Garamond', url: '/fonts/cormorant_garamond_regular.typeface.json', boldUrl: '/fonts/cormorant_garamond_bold.typeface.json' },
  playfair:   { name: 'Playfair Display',   url: '/fonts/playfair_display_regular.typeface.json',   boldUrl: '/fonts/playfair_display_bold.typeface.json' },
  poppins:    { name: 'Poppins',            url: '/fonts/poppins_regular.typeface.json',             boldUrl: '/fonts/poppins_bold.typeface.json' },
  helvetiker: { name: 'Helvetica',          url: '/fonts/helvetiker_regular.typeface.json',          boldUrl: '/fonts/helvetiker_bold.typeface.json' },
  // Cursive scripts — single weight, so bold reuses the regular face. Chunky strokes
  // survive generateShapes() (the Tag's cut-through path) where thin serifs fragment.
  pacifico:   { name: 'Pacifico',           url: '/fonts/pacifico.typeface.json',                    boldUrl: '/fonts/pacifico.typeface.json' },
  lobster:    { name: 'Lobster',            url: '/fonts/lobster_regular.typeface.json',             boldUrl: '/fonts/lobster_regular.typeface.json' },
  // Great Vibes / Satisfy: single-weight Google Fonts scripts (no bold master exists),
  // same reused-face pattern as Pacifico/Lobster above.
  great_vibes: { name: 'Great Vibes',       url: '/fonts/great_vibes_regular.typeface.json',         boldUrl: '/fonts/great_vibes_regular.typeface.json' },
  satisfy:     { name: 'Satisfy',           url: '/fonts/satisfy_regular.typeface.json',              boldUrl: '/fonts/satisfy_regular.typeface.json' },
  montserrat:  { name: 'Montserrat',        url: '/fonts/montserrat_regular.typeface.json',           boldUrl: '/fonts/montserrat_bold.typeface.json' },
};

// The Tag pendant builds 3D letters via font.generateShapes(); thin serif outlines
// fragment into self-intersecting contours there, so these are hidden on Tag ONLY.
// They remain available for Standard/Heart pendants (Text3D path) and ring engraving.
export const TAG_HIDDEN_FONTS: Array<keyof typeof FONTS> = ['cinzel', 'cormorant', 'playfair'];

// Cursive scripts are never offered on ring engraving — that selector keeps the
// original serif/sans set unchanged.
export const CURSIVE_FONTS: Array<keyof typeof FONTS> = ['pacifico', 'lobster', 'great_vibes', 'satisfy'];

// Pacifico's wide brush glyphs overlap into an illegible blob on the Standard/Heart
// Text3D path (advance-width layout + the -0.08 letterSpacing), measured at ~the same
// overlap as Dancing Script, so it stays Tag-only. Lobster's connected script remains
// legible on Text3D, so it is allowed on all pendant shapes (and is NOT in this list).
// Great Vibes / Satisfy measured at a similar overlap magnitude to Pacifico (~0.14-0.17
// units at "SAM", vs Lobster's ~0.06) — same swash-collision risk, so tag-only too.
export const TAG_ONLY_FONTS: Array<keyof typeof FONTS> = ['pacifico', 'great_vibes', 'satisfy'];

// Cursive scripts (Lobster, Pacifico) ship only one weight, so their boldUrl reuses the
// regular face — toggling Bold loads the identical file and produces no visual change.
// The UI should disable the Bold control for these rather than let it silently no-op.
export function fontHasBoldFace(key: keyof typeof FONTS): boolean {
  return FONTS[key].boldUrl !== FONTS[key].url;
}

// Font keys visible in the selector for a given context (model type + pendant shape).
export function visibleFontKeys(
  modelType: 'ring' | 'pendant',
  pendantShape: 'standard' | 'heart' | 'tag',
): Array<keyof typeof FONTS> {
  const all = Object.keys(FONTS) as Array<keyof typeof FONTS>;
  // Ring engraving: unchanged — original serif/sans set, no cursive scripts.
  if (modelType === 'ring') {
    return all.filter((k) => !CURSIVE_FONTS.includes(k));
  }
  // Tag pendant: hide the serifs that fragment; keep sans + all four cursive scripts.
  if (pendantShape === 'tag') {
    return all.filter((k) => !TAG_HIDDEN_FONTS.includes(k));   // poppins, helvetica, montserrat, pacifico, lobster, great_vibes, satisfy
  }
  // Standard / Heart pendants: everything except the Tag-only cursives (Pacifico, Great Vibes, Satisfy).
  return all.filter((k) => !TAG_ONLY_FONTS.includes(k));        // serifs + sans + montserrat + lobster
}
