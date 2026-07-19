import * as THREE from 'three';

// Grayscale height map from the engraving string. Mid-grey (#808080) = untouched metal
// surface; dark (#1a1a1a) letters = recessed. Fed to a material's bumpMap so the letters
// read as incised into the band's own gold surface (no separate coloured text mesh).
export function makeEngravingBump(
  text: string,
  opts?: { sizeMul?: number; fontFamily?: string; mirror?: boolean }
): THREE.CanvasTexture | null {
  const clean = (text ?? '').trim();
  if (!clean) return null;                       // empty field → no bump, clean band

  const w = 1024, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);   // neutral surface height

  if (opts?.mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); } // flip if UVs read backwards

  const family = opts?.fontFamily ?? 'Georgia, serif';
  const sizeMul = opts?.sizeMul ?? 1;
  let px = Math.floor(h * 0.5 * sizeMul);
  ctx.fillStyle = '#1a1a1a';                     // recessed letters
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // auto-fit so a big multiplier / long text never overflows the canvas
  ctx.font = `bold ${px}px ${family}`;
  const maxW = w * 0.9;
  while (ctx.measureText(clean).width > maxW && px > 8) {
    px -= 4; ctx.font = `bold ${px}px ${family}`;
  }
  ctx.fillText(clean, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;           // data texture, not sRGB
  tex.anisotropy = 8; tex.needsUpdate = true;
  return tex;
}

// Map a configurator FONT STYLE key → a real CSS font family for the canvas. Only
// "Cormorant Garamond" and "Inter" are actually loaded as web fonts (src/index.css); the
// rest fall back to a matching generic (serif / sans / cursive) so FONT STYLE still visibly
// switches the engraved face even where the exact Three.js typeface isn't a web font.
const FONT_FAMILY: Record<string, string> = {
  cinzel:     "'Cinzel', 'Cormorant Garamond', serif",
  cormorant:  "'Cormorant Garamond', serif",
  playfair:   "'Playfair Display', 'Cormorant Garamond', serif",
  poppins:    "'Poppins', 'Inter', sans-serif",
  helvetiker: "'Inter', Arial, sans-serif",
  pacifico:   "'Pacifico', cursive",
  lobster:    "'Lobster', cursive",
};

export function engravingFontFamily(key?: string): string {
  return (key && FONT_FAMILY[key]) || 'Georgia, serif';
}
