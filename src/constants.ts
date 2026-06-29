export const METALS = {
  silver:   { name: '925 Sterling Silver',       color: '#e4e4e4', metalness: 0.9,  roughness: 0.15, clearcoat: 0.3,  clearcoatRoughness: 0.2,  priceMultiplier: 1  },
  white:    { name: '18K White Gold',             color: '#eeecea', metalness: 1,    roughness: 0.04, clearcoat: 0.8,  clearcoatRoughness: 0.05, priceMultiplier: 13 },
  gold:     { name: '22K Yellow Gold (916 Gold)', color: '#d4a820', metalness: 1,    roughness: 0.04, clearcoat: 0.6,  clearcoatRoughness: 0.08, priceMultiplier: 18 },
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
};

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
};

// The Tag pendant builds 3D letters via font.generateShapes(); thin serif outlines
// fragment into self-intersecting contours there, so these are hidden on Tag ONLY.
// They remain available for Standard/Heart pendants (Text3D path) and ring engraving.
export const TAG_HIDDEN_FONTS: Array<keyof typeof FONTS> = ['cinzel', 'cormorant', 'playfair'];

// Cursive scripts are never offered on ring engraving — that selector keeps the
// original serif/sans set unchanged.
export const CURSIVE_FONTS: Array<keyof typeof FONTS> = ['pacifico', 'lobster'];

// Pacifico's wide brush glyphs overlap into an illegible blob on the Standard/Heart
// Text3D path (advance-width layout + the -0.08 letterSpacing), measured at ~the same
// overlap as Dancing Script, so it stays Tag-only. Lobster's connected script remains
// legible on Text3D, so it is allowed on all pendant shapes (and is NOT in this list).
export const TAG_ONLY_FONTS: Array<keyof typeof FONTS> = ['pacifico'];

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
  // Tag pendant: hide the serifs that fragment; keep sans + both cursive scripts.
  if (pendantShape === 'tag') {
    return all.filter((k) => !TAG_HIDDEN_FONTS.includes(k));   // poppins, helvetica, pacifico, lobster
  }
  // Standard / Heart pendants: everything except the Tag-only cursive (Pacifico).
  return all.filter((k) => !TAG_ONLY_FONTS.includes(k));        // serifs + sans + lobster
}
