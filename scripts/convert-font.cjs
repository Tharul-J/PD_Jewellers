// Converts a TTF/OTF font file to Three.js typeface.json format
// Usage: node scripts/convert-font.cjs input.ttf output.typeface.json
'use strict';
const opentype = require('../node_modules/opentype.js/dist/opentype.js');
const fs = require('fs');

function convert(inputPath, outputPath) {
  const raw  = fs.readFileSync(inputPath);
  const buf  = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const font = opentype.parse(buf);
  const scale = 1000 / font.unitsPerEm;

  const ascender  = Math.round(font.ascender  * scale);
  const descender = Math.round(font.descender * scale);

  const result = {
    glyphs: {},
    familyName:  (font.names.fullName && font.names.fullName.en) || 'Font',
    ascender,
    descender,
    underlinePosition:  Math.round((font.tables.post ? font.tables.post.underlinePosition  : -100) * scale),
    underlineThickness: Math.round((font.tables.post ? font.tables.post.underlineThickness :   50) * scale),
    boundingBox: { yMin: descender, yMax: ascender, xMin: 0, xMax: 1000 },
    resolution: 1000,
    original_font_information: {}
  };

  // Cover printable ASCII + a few common extras
  for (let code = 32; code <= 126; code++) {
    const char  = String.fromCharCode(code);
    const glyph = font.charToGlyph(char);
    if (!glyph) continue;

    const ha = Math.round(glyph.advanceWidth * scale);

    // Use glyph.path (raw y-up font coordinates), NOT getPath() which flips y for screen
    let o = '';
    for (const cmd of glyph.path.commands) {
      switch (cmd.type) {
        case 'M':
          o += `m ${Math.round(cmd.x * scale)} ${Math.round(cmd.y * scale)} `;
          break;
        case 'L':
          o += `l ${Math.round(cmd.x * scale)} ${Math.round(cmd.y * scale)} `;
          break;
        case 'Q':
          o += `q ${Math.round(cmd.x1 * scale)} ${Math.round(cmd.y1 * scale)} ${Math.round(cmd.x * scale)} ${Math.round(cmd.y * scale)} `;
          break;
        case 'C':
          o += `b ${Math.round(cmd.x1 * scale)} ${Math.round(cmd.y1 * scale)} ${Math.round(cmd.x2 * scale)} ${Math.round(cmd.y2 * scale)} ${Math.round(cmd.x * scale)} ${Math.round(cmd.y * scale)} `;
          break;
        case 'Z':
          o += 'z ';
          break;
      }
    }

    result.glyphs[char] = { ha, x_min: 0, x_max: ha, o: o.trim() };
  }

  fs.writeFileSync(outputPath, JSON.stringify(result));
  console.log(`OK: ${outputPath} (${Object.keys(result.glyphs).length} glyphs, ascender=${ascender})`);
}

convert(process.argv[2], process.argv[3]);
