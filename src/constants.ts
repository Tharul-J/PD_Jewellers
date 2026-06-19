export const METALS = {
  silver: { name: 'Sterling Silver', color: '#f0f0f0', metalness: 1, roughness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.1, priceMultiplier: 1 },
  gold: { name: '22K Yellow Gold', color: '#ffe599', metalness: 1, roughness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.1, priceMultiplier: 18 },
  rose: { name: '18K Rose Gold', color: '#f4a498', metalness: 1, roughness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.1, priceMultiplier: 14 },
};

export const STONES = {
  aquamarine: { name: 'Aquamarine', color: '#a1c6e8', transmission: 0.9, ior: 1.57, thickness: 2, roughness: 0, clearcoat: 1, price: 45000 },
  diamond: { name: 'Diamond', color: '#ffffff', transmission: 1, ior: 2.4, thickness: 2, roughness: 0, clearcoat: 1, price: 380000 },
  ruby: { name: 'Ruby', color: '#e0115f', transmission: 0.9, ior: 1.76, thickness: 2, roughness: 0, clearcoat: 1, price: 95000 },
  emerald: { name: 'Emerald', color: '#50c878', transmission: 0.9, ior: 1.57, thickness: 2, roughness: 0, clearcoat: 1, price: 110000 },
  sapphire: { name: 'Ceylon Sapphire', color: '#0f52ba', transmission: 0.9, ior: 1.76, thickness: 2, roughness: 0, clearcoat: 1, price: 150000 },
};

export const FONTS = {
  helvetiker: { name: 'Modern Sans', url: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_regular.typeface.json' },
  helvetiker_bold: { name: 'Modern Bold', url: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json' },
  optimer_italic: { name: 'Elegant Serif Italic', url: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/optimer_italic.typeface.json' },
  pacifico: { name: 'Cursive (Pacifico)', url: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/gentilis_italic.typeface.json' },
  greatvibes: { name: 'Cursive (Great Vibes)', url: 'https://cdn.jsdelivr.net/npm/three/examples/fonts/droid_serif_italic.typeface.json' },
};
