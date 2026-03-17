/**
 * Client-side embroidery file parser and preview renderer.
 * Based on the proven open-source embroidery-viewer project by Leonardo Murça.
 * Reference: https://github.com/leomurca/embroidery-viewer (MIT License)
 *
 * Supports: PES, DST, JEF, EXP, XXX
 * Renders stitch paths on a Canvas and returns a PNG Blob.
 */

// ── Types ───────────────────────────────────────────────────────────────

export interface Stitch {
  x: number;
  y: number;
  flags: number;
  color: number;
}

export interface EmbroideryColor {
  r: number;
  g: number;
  b: number;
  name: string;
}

export interface EmbroideryPattern {
  stitches: Stitch[];
  colors: EmbroideryColor[];
  lastX: number;
  lastY: number;
  currentColorIndex: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// ── Stitch Flags (matching embroidery-viewer) ───────────────────────────

const NORMAL = 0;
const JUMP = 1;
const TRIM = 2;
const STOP = 4;
const END = 8;

// ── Pattern Builder ─────────────────────────────────────────────────────

function createPattern(): EmbroideryPattern {
  return {
    stitches: [],
    colors: [],
    lastX: 0,
    lastY: 0,
    currentColorIndex: 0,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };
}

function addColor(pattern: EmbroideryPattern, color: EmbroideryColor) {
  pattern.colors.push(color);
}

function addStitchAbs(pattern: EmbroideryPattern, x: number, y: number, flags: number, autoColorIndex: boolean) {
  if ((flags & END) === END) {
    calculateBoundingBox(pattern);
    fixColorCount(pattern);
    return;
  }
  if ((flags & STOP) === STOP && pattern.stitches.length === 0) return;
  if ((flags & STOP) === STOP && autoColorIndex) {
    pattern.currentColorIndex++;
  }
  pattern.stitches.push({ x, y, flags, color: pattern.currentColorIndex });
}

function addStitchRel(pattern: EmbroideryPattern, dx: number, dy: number, flags: number, autoColorIndex = false) {
  if (pattern.stitches.length !== 0) {
    const nx = pattern.lastX + dx;
    const ny = pattern.lastY + dy;
    pattern.lastX = nx;
    pattern.lastY = ny;
    addStitchAbs(pattern, nx, ny, flags, autoColorIndex);
  } else {
    pattern.lastX = dx;
    pattern.lastY = dy;
    addStitchAbs(pattern, dx, dy, flags, autoColorIndex);
  }
}

function calculateBoundingBox(pattern: EmbroideryPattern) {
  if (pattern.stitches.length === 0) {
    pattern.bottom = 1;
    pattern.right = 1;
    return;
  }
  pattern.left = Infinity;
  pattern.top = Infinity;
  pattern.right = -Infinity;
  pattern.bottom = -Infinity;

  for (const pt of pattern.stitches) {
    if (!(pt.flags & TRIM)) {
      if (pt.x < pattern.left) pattern.left = pt.x;
      if (pt.y < pattern.top) pattern.top = pt.y;
      if (pt.x > pattern.right) pattern.right = pt.x;
      if (pt.y > pattern.bottom) pattern.bottom = pt.y;
    }
  }
}

function moveToPositive(pattern: EmbroideryPattern) {
  for (const s of pattern.stitches) {
    s.x -= pattern.left;
    s.y -= pattern.top;
  }
  pattern.right -= pattern.left;
  pattern.left = 0;
  pattern.bottom -= pattern.top;
  pattern.top = 0;
}

function invertPatternVertical(pattern: EmbroideryPattern) {
  const tempTop = -pattern.top;
  for (const s of pattern.stitches) {
    s.y = -s.y;
  }
  pattern.top = -pattern.bottom;
  pattern.bottom = tempTop;
}

function fixColorCount(pattern: EmbroideryPattern) {
  let maxColorIndex = 0;
  for (const s of pattern.stitches) {
    if (s.color > maxColorIndex) maxColorIndex = s.color;
  }
  while (pattern.colors.length <= maxColorIndex) {
    // Use catalog fallback palette for missing colors
    const idx = pattern.colors.length % CATALOG_PALETTE.length;
    const cp = CATALOG_PALETTE[idx];
    pattern.colors.push(cp);
  }
  pattern.colors.splice(maxColorIndex + 1);
}

// ── Curated catalog fallback palette ────────────────────────────────────

const CATALOG_PALETTE: EmbroideryColor[] = [
  { r: 27, g: 58, b: 92, name: "Navy Blue" },
  { r: 192, g: 57, b: 43, name: "Rich Red" },
  { r: 39, g: 174, b: 96, name: "Emerald Green" },
  { r: 243, g: 156, b: 18, name: "Golden Amber" },
  { r: 142, g: 68, b: 173, name: "Deep Purple" },
  { r: 41, g: 128, b: 185, name: "Royal Blue" },
  { r: 211, g: 84, b: 0, name: "Burnt Orange" },
  { r: 22, g: 160, b: 133, name: "Teal Green" },
  { r: 194, g: 24, b: 91, name: "Raspberry" },
  { r: 93, g: 64, b: 55, name: "Chocolate Brown" },
  { r: 21, g: 101, b: 192, name: "Cobalt Blue" },
  { r: 231, g: 76, b: 60, name: "Scarlet" },
  { r: 46, g: 125, b: 50, name: "Forest Green" },
  { r: 245, g: 124, b: 0, name: "Tangerine" },
  { r: 123, g: 31, b: 162, name: "Violet" },
  { r: 0, g: 131, b: 143, name: "Deep Cyan" },
  { r: 173, g: 20, b: 87, name: "Magenta" },
  { r: 51, g: 105, b: 30, name: "Olive Green" },
  { r: 191, g: 54, b: 12, name: "Rust" },
  { r: 74, g: 20, b: 140, name: "Indigo" },
  { r: 0, g: 105, b: 92, name: "Dark Teal" },
  { r: 255, g: 111, b: 0, name: "Warm Amber" },
  { r: 26, g: 35, b: 126, name: "Dark Navy" },
  { r: 183, g: 28, b: 28, name: "Deep Crimson" },
  { r: 0, g: 77, b: 64, name: "Dark Emerald" },
  { r: 230, g: 81, b: 0, name: "Burnt Sienna" },
  { r: 106, g: 27, b: 154, name: "Plum" },
  { r: 2, g: 119, b: 189, name: "Azure" },
  { r: 85, g: 139, b: 47, name: "Sage Green" },
  { r: 216, g: 67, b: 21, name: "Terra Cotta" },
];

// ── PEC/PES Color Table (from embroidery-viewer) ────────────────────────

const PEC_COLORS: EmbroideryColor[] = [
  { r: 0, g: 0, b: 0, name: "Unknown" },
  { r: 14, g: 31, b: 124, name: "Prussian Blue" },
  { r: 10, g: 85, b: 163, name: "Blue" },
  { r: 0, g: 135, b: 119, name: "Teal Green" },
  { r: 75, g: 107, b: 175, name: "Cornflower Blue" },
  { r: 237, g: 23, b: 31, name: "Red" },
  { r: 209, g: 92, b: 0, name: "Reddish Brown" },
  { r: 145, g: 54, b: 151, name: "Magenta" },
  { r: 228, g: 154, b: 203, name: "Light Lilac" },
  { r: 145, g: 95, b: 172, name: "Lilac" },
  { r: 158, g: 214, b: 125, name: "Mint Green" },
  { r: 232, g: 169, b: 0, name: "Deep Gold" },
  { r: 254, g: 186, b: 53, name: "Orange" },
  { r: 255, g: 255, b: 0, name: "Yellow" },
  { r: 112, g: 188, b: 31, name: "Lime Green" },
  { r: 186, g: 152, b: 0, name: "Brass" },
  { r: 168, g: 168, b: 168, name: "Silver" },
  { r: 125, g: 111, b: 0, name: "Russet Brown" },
  { r: 255, g: 255, b: 179, name: "Cream Brown" },
  { r: 79, g: 85, b: 86, name: "Pewter" },
  { r: 0, g: 0, b: 0, name: "Black" },
  { r: 11, g: 61, b: 145, name: "Ultramarine" },
  { r: 119, g: 1, b: 118, name: "Royal Purple" },
  { r: 41, g: 49, b: 51, name: "Dark Gray" },
  { r: 42, g: 19, b: 1, name: "Dark Brown" },
  { r: 246, g: 74, b: 138, name: "Deep Rose" },
  { r: 178, g: 118, b: 36, name: "Light Brown" },
  { r: 252, g: 187, b: 197, name: "Salmon Pink" },
  { r: 254, g: 55, b: 15, name: "Vermillion" },
  { r: 240, g: 240, b: 240, name: "White" },
  { r: 106, g: 28, b: 138, name: "Violet" },
  { r: 168, g: 221, b: 196, name: "Seacrest" },
  { r: 37, g: 132, b: 187, name: "Sky Blue" },
  { r: 254, g: 179, b: 67, name: "Pumpkin" },
  { r: 255, g: 243, b: 107, name: "Cream Yellow" },
  { r: 208, g: 166, b: 96, name: "Khaki" },
  { r: 209, g: 84, b: 0, name: "Clay Brown" },
  { r: 102, g: 186, b: 73, name: "Leaf Green" },
  { r: 19, g: 74, b: 70, name: "Peacock Blue" },
  { r: 135, g: 135, b: 135, name: "Gray" },
  { r: 216, g: 204, b: 198, name: "Warm Gray" },
  { r: 67, g: 86, b: 7, name: "Dark Olive" },
  { r: 253, g: 217, b: 222, name: "Flesh Pink" },
  { r: 249, g: 147, b: 188, name: "Pink" },
  { r: 0, g: 56, b: 34, name: "Deep Green" },
  { r: 178, g: 175, b: 212, name: "Lavender" },
  { r: 104, g: 106, b: 176, name: "Wisteria Violet" },
  { r: 239, g: 227, b: 185, name: "Beige" },
  { r: 247, g: 56, b: 102, name: "Carmine" },
  { r: 181, g: 75, b: 100, name: "Amber Red" },
  { r: 19, g: 43, b: 26, name: "Olive Green" },
  { r: 199, g: 1, b: 86, name: "Dark Fuschia" },
  { r: 254, g: 158, b: 50, name: "Tangerine" },
  { r: 168, g: 222, b: 235, name: "Light Blue" },
  { r: 0, g: 103, b: 62, name: "Emerald Green" },
  { r: 78, g: 41, b: 144, name: "Purple" },
  { r: 47, g: 126, b: 32, name: "Moss Green" },
  { r: 255, g: 204, b: 204, name: "Flesh Pink" },
  { r: 255, g: 217, b: 17, name: "Harvest Gold" },
  { r: 9, g: 91, b: 166, name: "Electric Blue" },
  { r: 240, g: 249, b: 112, name: "Lemon Yellow" },
  { r: 227, g: 243, b: 91, name: "Fresh Green" },
  { r: 255, g: 153, b: 0, name: "Orange" },
  { r: 255, g: 240, b: 141, name: "Cream Yellow" },
  { r: 255, g: 200, b: 200, name: "Applique" },
];

// ── JEF Color Table (from embroidery-viewer) ────────────────────────────

const JEF_COLORS: EmbroideryColor[] = [
  { r: 0, g: 0, b: 0, name: "Black" },
  { r: 0, g: 0, b: 0, name: "Black" },
  { r: 255, g: 255, b: 255, name: "White" },
  { r: 255, g: 255, b: 23, name: "Yellow" },
  { r: 250, g: 160, b: 96, name: "Orange" },
  { r: 92, g: 118, b: 73, name: "Olive Green" },
  { r: 64, g: 192, b: 48, name: "Green" },
  { r: 101, g: 194, b: 200, name: "Sky" },
  { r: 172, g: 128, b: 190, name: "Purple" },
  { r: 245, g: 188, b: 203, name: "Pink" },
  { r: 255, g: 0, b: 0, name: "Red" },
  { r: 192, g: 128, b: 0, name: "Brown" },
  { r: 0, g: 0, b: 240, name: "Blue" },
  { r: 228, g: 195, b: 93, name: "Gold" },
  { r: 165, g: 42, b: 42, name: "Dark Brown" },
  { r: 213, g: 176, b: 212, name: "Pale Violet" },
  { r: 252, g: 242, b: 148, name: "Pale Yellow" },
  { r: 240, g: 208, b: 192, name: "Pale Pink" },
  { r: 255, g: 192, b: 0, name: "Peach" },
  { r: 201, g: 164, b: 128, name: "Beige" },
  { r: 155, g: 61, b: 75, name: "Wine Red" },
  { r: 160, g: 184, b: 204, name: "Pale Sky" },
  { r: 127, g: 194, b: 28, name: "Yellow Green" },
  { r: 185, g: 185, b: 185, name: "Silver Grey" },
  { r: 160, g: 160, b: 160, name: "Grey" },
  { r: 152, g: 214, b: 189, name: "Pale Aqua" },
  { r: 184, g: 240, b: 240, name: "Baby Blue" },
  { r: 54, g: 139, b: 160, name: "Powder Blue" },
  { r: 79, g: 131, b: 171, name: "Bright Blue" },
  { r: 56, g: 106, b: 145, name: "Slate Blue" },
  { r: 0, g: 32, b: 107, name: "Navy Blue" },
  { r: 229, g: 197, b: 202, name: "Salmon Pink" },
  { r: 249, g: 103, b: 107, name: "Coral" },
  { r: 227, g: 49, b: 31, name: "Burnt Orange" },
  { r: 226, g: 161, b: 136, name: "Cinnamon" },
  { r: 181, g: 148, b: 116, name: "Umber" },
  { r: 228, g: 207, b: 153, name: "Blonde" },
  { r: 225, g: 203, b: 0, name: "Sunflower" },
  { r: 225, g: 173, b: 212, name: "Orchid Pink" },
  { r: 195, g: 0, b: 126, name: "Peony Purple" },
  { r: 128, g: 0, b: 75, name: "Burgundy" },
  { r: 160, g: 96, b: 176, name: "Royal Purple" },
  { r: 192, g: 64, b: 32, name: "Cardinal Red" },
  { r: 202, g: 224, b: 192, name: "Opal Green" },
  { r: 137, g: 152, b: 86, name: "Moss Green" },
  { r: 0, g: 170, b: 0, name: "Meadow Green" },
  { r: 33, g: 138, b: 33, name: "Dark Green" },
  { r: 93, g: 174, b: 148, name: "Aquamarine" },
  { r: 76, g: 191, b: 143, name: "Emerald Green" },
  { r: 0, g: 119, b: 114, name: "Peacock Green" },
  { r: 112, g: 112, b: 112, name: "Dark Grey" },
  { r: 242, g: 255, b: 255, name: "Ivory White" },
  { r: 177, g: 88, b: 24, name: "Hazel" },
  { r: 203, g: 138, b: 7, name: "Toast" },
  { r: 247, g: 146, b: 123, name: "Salmon" },
  { r: 152, g: 105, b: 45, name: "Cocoa Brown" },
  { r: 162, g: 113, b: 72, name: "Sienna" },
  { r: 123, g: 85, b: 74, name: "Sepia" },
  { r: 79, g: 57, b: 70, name: "Dark Sepia" },
  { r: 82, g: 58, b: 151, name: "Violet Blue" },
  { r: 0, g: 0, b: 160, name: "Blue Ink" },
  { r: 0, g: 150, b: 222, name: "Solar Blue" },
  { r: 178, g: 221, b: 83, name: "Green Dust" },
  { r: 250, g: 143, b: 187, name: "Crimson" },
  { r: 222, g: 100, b: 158, name: "Floral Pink" },
  { r: 181, g: 80, b: 102, name: "Wine" },
  { r: 94, g: 87, b: 71, name: "Olive Drab" },
  { r: 76, g: 136, b: 31, name: "Meadow" },
  { r: 228, g: 220, b: 121, name: "Mustard" },
  { r: 203, g: 138, b: 26, name: "Yellow Ochre" },
  { r: 198, g: 170, b: 66, name: "Old Gold" },
  { r: 236, g: 176, b: 44, name: "Honeydew" },
  { r: 248, g: 128, b: 64, name: "Tangerine" },
  { r: 255, g: 229, b: 5, name: "Canary Yellow" },
  { r: 250, g: 122, b: 122, name: "Vermillion" },
  { r: 107, g: 224, b: 0, name: "Bright Green" },
  { r: 56, g: 108, b: 174, name: "Ocean Blue" },
  { r: 227, g: 196, b: 180, name: "Beige Grey" },
  { r: 227, g: 172, b: 129, name: "Bamboo" },
];

// ── Utility ─────────────────────────────────────────────────────────────

function rgbToHex(c: EmbroideryColor): string {
  return `#${((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1)}`;
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

// ── DataView wrapper (matches embroidery-viewer's jDataView) ────────────

class EmbroideryFileView {
  private view: DataView;
  private bytes: Uint8Array;
  private pos: number;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
    this.pos = 0;
  }

  get byteLength() { return this.view.byteLength; }

  tell() { return this.pos; }
  seek(p: number) { this.pos = p; }

  getUint8(): number {
    const v = this.bytes[this.pos];
    this.pos++;
    return v;
  }

  getInt8(): number {
    const v = this.view.getInt8(this.pos);
    this.pos++;
    return v;
  }

  getInt32(offset: number, littleEndian: boolean): number {
    const v = this.view.getInt32(offset, littleEndian);
    this.pos = offset + 4;
    return v;
  }

  getUint32(offset: number, littleEndian: boolean): number {
    const v = this.view.getUint32(offset, littleEndian);
    this.pos = offset + 4;
    return v;
  }
}

// ── PES Parser (ported from embroidery-viewer) ──────────────────────────

function parsePES(buffer: ArrayBuffer): EmbroideryPattern {
  const file = new EmbroideryFileView(buffer);
  const pattern = createPattern();

  // Verify magic
  const b0 = file.getUint8();
  const b1 = file.getUint8();
  const b2 = file.getUint8();
  const b3 = file.getUint8();
  if (String.fromCharCode(b0, b1, b2, b3) !== "#PES") {
    throw new Error("Not a PES file");
  }

  const pecStart = file.getInt32(8, true);

  // Read color table from PEC header
  file.seek(pecStart + 48);
  const numColors = file.getInt8() + 1;
  for (let i = 0; i < numColors; i++) {
    const colorIdx = file.getInt8();
    const safeIdx = ((colorIdx % 65) + 65) % 65; // Handle negative
    addColor(pattern, PEC_COLORS[safeIdx] || PEC_COLORS[0]);
  }

  // Read stitches from PEC data
  file.seek(pecStart + 532);
  readPecStitches(file, pattern);
  addStitchRel(pattern, 0, 0, END);

  moveToPositive(pattern);
  return pattern;
}

function readPecStitches(file: EmbroideryFileView, pattern: EmbroideryPattern) {
  while (file.tell() < file.byteLength) {
    let xOffset = file.getUint8();
    let yOffset = file.getUint8();

    // End stitch
    if (xOffset === 0xFF && yOffset === 0x00) {
      addStitchRel(pattern, 0, 0, END, true);
      break;
    }

    // Stop/color change stitch
    if (xOffset === 0xFE && yOffset === 0xB0) {
      file.getInt8(); // Skip extra byte
      addStitchRel(pattern, 0, 0, STOP, true);
      continue;
    }

    // Determine stitch type from flags
    let stitchType = NORMAL;
    if (xOffset & 0x80) {
      if (xOffset & 0x20) stitchType = TRIM;
      else if (xOffset & 0x10) stitchType = JUMP;
    }
    if (yOffset & 0x80) {
      if (yOffset & 0x20) stitchType = TRIM;
      else if (yOffset & 0x10) stitchType = JUMP;
    }

    // Decode coordinates (12-bit signed)
    if (xOffset & 0x80) {
      xOffset = ((xOffset & 0x0F) << 8) + yOffset;
      if (xOffset & 0x800) xOffset -= 0x1000;
      yOffset = file.getUint8();
    } else if (xOffset >= 0x40) {
      xOffset -= 0x80;
    }

    if (yOffset & 0x80) {
      yOffset = ((yOffset & 0x0F) << 8) + file.getUint8();
      if (yOffset & 0x800) yOffset -= 0x1000;
    } else if (yOffset > 0x3F) {
      yOffset -= 0x80;
    }

    addStitchRel(pattern, xOffset, yOffset, stitchType, true);
  }
}

// ── DST Parser (ported from embroidery-viewer) ──────────────────────────

function parseDST(buffer: ArrayBuffer): EmbroideryPattern {
  const file = new EmbroideryFileView(buffer);
  const pattern = createPattern();

  file.seek(512); // Skip DST header
  // Parse stitch data

  while (file.tell() < file.byteLength - 3) {
    const b = [file.getUint8(), file.getUint8(), file.getUint8()];

    let x = 0, y = 0;

    // Decode X movements (matching embroidery-viewer bit layout)
    if (b[0] & 0x01) x += 1;
    if (b[0] & 0x02) x -= 1;
    if (b[0] & 0x04) x += 9;
    if (b[0] & 0x08) x -= 9;
    if (b[1] & 0x01) x += 3;
    if (b[1] & 0x02) x -= 3;
    if (b[1] & 0x04) x += 27;
    if (b[1] & 0x08) x -= 27;
    if (b[2] & 0x04) x += 81;
    if (b[2] & 0x08) x -= 81;

    // Decode Y movements (note: embroidery-viewer uses + for 0x80, - for 0x40)
    if (b[0] & 0x80) y += 1;
    if (b[0] & 0x40) y -= 1;
    if (b[0] & 0x20) y += 9;
    if (b[0] & 0x10) y -= 9;
    if (b[1] & 0x80) y += 3;
    if (b[1] & 0x40) y -= 3;
    if (b[1] & 0x20) y += 27;
    if (b[1] & 0x10) y -= 27;
    if (b[2] & 0x20) y += 81;
    if (b[2] & 0x10) y -= 81;

    // Decode flags
    let flags = NORMAL;
    if (b[2] === 0xF3) {
      flags = END;
    } else if ((b[2] & 0xC3) === 0xC3) {
      // Color change: trim + stop
      flags = TRIM | STOP;
    } else if (b[2] & 0x80) {
      // Bit 7 in DST = jump/move stitch
      flags = JUMP;
    } else if (b[2] & 0x40) {
      flags = STOP;
    }

    addStitchRel(pattern, x, y, flags, true);

    if (flags === END) break;
  }

  addStitchRel(pattern, 0, 0, END, true);
  invertPatternVertical(pattern);
  moveToPositive(pattern);
  return pattern;
}

// ── EXP Parser (ported from embroidery-viewer) ──────────────────────────

function expDecode(input: number): number {
  return input > 128 ? -(~input & 0xFF) - 1 : input;
}

function parseEXP(buffer: ArrayBuffer): EmbroideryPattern {
  const file = new EmbroideryFileView(buffer);
  const pattern = createPattern();
  let index = 0;

  while (index < file.byteLength) {
    let flags = NORMAL;
    let b0 = file.getInt8();
    let b1 = file.getInt8();
    index += 2;

    if (b0 === -128) {
      if (b1 & 1) {
        b0 = file.getInt8();
        b1 = file.getInt8();
        index += 2;
        flags = STOP;
      } else if (b1 === 2 || b1 === 4) {
        b0 = file.getInt8();
        b1 = file.getInt8();
        index += 2;
        flags = TRIM;
      } else if (b1 === -128) {
        b0 = file.getInt8();
        b1 = file.getInt8();
        index += 2;
        b0 = 0;
        b1 = 0;
        flags = TRIM;
      }
    }

    addStitchRel(pattern, expDecode(b0), expDecode(b1), flags, true);
  }

  addStitchRel(pattern, 0, 0, END);
  invertPatternVertical(pattern);
  moveToPositive(pattern);
  return pattern;
}

// ── JEF Parser (ported from embroidery-viewer) ──────────────────────────

function jefDecode(byte: number): number {
  return byte >= 0x80 ? -(~byte & 0xFF) - 1 : byte;
}

function parseJEF(buffer: ArrayBuffer): EmbroideryPattern {
  const file = new EmbroideryFileView(buffer);
  const pattern = createPattern();

  file.seek(24);
  const colorCount = file.getInt32(file.tell(), true);
  const stitchCount = file.getInt32(file.tell(), true);
  file.seek(file.tell() + 84);

  // Read colors
  for (let i = 0; i < colorCount; i++) {
    const colorIndex = file.getUint32(file.tell(), true) % JEF_COLORS.length;
    addColor(pattern, JEF_COLORS[colorIndex]);
  }
  // Skip padding to align to 6 colors minimum
  file.seek(file.tell() + Math.max(0, (6 - colorCount)) * 4);

  // Read stitches
  let stitchesProcessed = 0;
  while (stitchesProcessed < stitchCount + 100) {
    const byte1 = file.getUint8();
    const byte2 = file.getUint8();

    let type = NORMAL;
    let db1 = byte1;
    let db2 = byte2;
    let isEnd = false;

    if (byte1 === 0x80) {
      if ((byte2 & 0x01) !== 0 || byte2 === 0x02 || byte2 === 0x04) {
        type = ((byte2 & 0x01) !== 0) ? STOP : TRIM;
        db1 = file.getUint8();
        db2 = file.getUint8();
      } else if (byte2 === 0x10) {
        type = END;
        db1 = 0;
        db2 = 0;
        isEnd = true;
      }
    }

    addStitchRel(pattern, jefDecode(db1), jefDecode(db2), type, true);
    if (isEnd) break;
    stitchesProcessed++;
  }

  invertPatternVertical(pattern);
  moveToPositive(pattern);
  return pattern;
}

// ── XXX Parser (Singer) ─────────────────────────────────────────────────

function parseXXX(buffer: ArrayBuffer): EmbroideryPattern {
  const file = new EmbroideryFileView(buffer);
  const pattern = createPattern();

  if (file.byteLength < 0x100) throw new Error("Invalid XXX file");

  let stitchOffset = 0x100;
  try {
    const offset = file.getUint32(0x20, true);
    if (offset > 0 && offset < file.byteLength) stitchOffset = offset;
  } catch { /* use default */ }

  file.seek(stitchOffset);

  while (file.tell() + 1 < file.byteLength) {
    const b0 = file.getUint8();
    const b1 = file.getUint8();

    if (b0 === 0x7F && b1 === 0x7F) {
      addStitchRel(pattern, 0, 0, STOP, true);
      // Skip 2 more bytes after color change
      if (file.tell() + 1 < file.byteLength) {
        file.getUint8();
        file.getUint8();
      }
      continue;
    }

    if (b0 === 0x7E && b1 === 0x7E) {
      addStitchRel(pattern, 0, 0, END);
      break;
    }

    const dx = b0 > 127 ? b0 - 256 : b0;
    const dy = b1 > 127 ? b1 - 256 : b1;

    if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
      addStitchRel(pattern, dx, dy, JUMP, true);
    } else {
      addStitchRel(pattern, dx, dy, NORMAL, true);
    }
  }

  addStitchRel(pattern, 0, 0, END);
  moveToPositive(pattern);
  return pattern;
}

// ── VP3 Parser (Husqvarna Viking) ───────────────────────────────────────

function vp3ReadString(file: EmbroideryFileView): string {
  const len = (file.getUint8() << 8) | file.getUint8();
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(file.getUint8());
  return s;
}

function parseVP3(buffer: ArrayBuffer): EmbroideryPattern {
  const file = new EmbroideryFileView(buffer);
  const pattern = createPattern();

  if (file.byteLength < 256) throw new Error("Invalid VP3 file");

  // VP3 magic: "%vsm%"
  const magic = String.fromCharCode(file.getUint8(), file.getUint8(), file.getUint8(), file.getUint8(), file.getUint8());
  if (magic !== "%vsm%") throw new Error("Not a VP3 file");

  // Skip header to find color sections — scan for 0x00 0x01 0x00 pattern
  // VP3 stores colors as RGB in color sections, and stitches after each color header
  file.seek(0);
  const bytes = new Uint8Array(buffer);

  // Find all color+stitch sections by scanning for the section marker
  const colorSections: { r: number; g: number; b: number; offset: number }[] = [];

  // Simple scan: look for RGB color bytes followed by stitch data
  // VP3 structure: sections start with color info then stitch coordinates
  let pos = 256; // Skip past header

  // Fallback: parse as raw signed byte pairs treating sections by STOP markers
  file.seek(pos);
  let currentColor = 0;
  addColor(pattern, CATALOG_PALETTE[0]);

  while (file.tell() + 1 < file.byteLength) {
    const b0 = file.getUint8();
    const b1 = file.getUint8();

    // End marker
    if (b0 === 0x00 && b1 === 0x00) {
      const next = file.tell() < file.byteLength ? bytes[file.tell()] : 0;
      if (next === 0x00) {
        addStitchRel(pattern, 0, 0, END);
        break;
      }
    }

    // Color change marker (common VP3 pattern: large jump + specific flag bytes)
    if (b0 === 0x00 && (b1 === 0x03 || b1 === 0x01)) {
      currentColor++;
      if (currentColor >= pattern.colors.length) {
        addColor(pattern, CATALOG_PALETTE[currentColor % CATALOG_PALETTE.length]);
      }
      addStitchRel(pattern, 0, 0, STOP, false);
      pattern.currentColorIndex = currentColor;
      continue;
    }

    const dx = b0 > 127 ? b0 - 256 : b0;
    const dy = b1 > 127 ? b1 - 256 : b1;

    if (Math.abs(dx) > 80 || Math.abs(dy) > 80) {
      addStitchRel(pattern, dx, dy, JUMP, false);
    } else {
      addStitchRel(pattern, dx, dy, NORMAL, false);
    }
  }

  addStitchRel(pattern, 0, 0, END);
  invertPatternVertical(pattern);
  moveToPositive(pattern);
  return pattern;
}

// ── HUS Parser (Husqvarna) ───────────────────────────────────────────────

function parseHUS(buffer: ArrayBuffer): EmbroideryPattern {
  const file = new EmbroideryFileView(buffer);
  const pattern = createPattern();

  if (file.byteLength < 0x100) throw new Error("Invalid HUS file");

  // HUS magic check
  file.seek(0);
  const magic = file.getUint32(0, true);
  if (magic !== 0x00C8AF5C && magic !== 0x00C8AF5D) {
    // Try parsing as generic stitch data anyway
  }

  // Read header: offset to stitch data
  file.seek(8);
  const numStitches = file.getInt32(file.tell(), true);
  const numColors = file.getInt32(file.tell(), true);

  // Read color indices
  const colorOffset = file.tell();
  for (let i = 0; i < Math.min(numColors, 64); i++) {
    const colorIdx = file.getUint8() % CATALOG_PALETTE.length;
    addColor(pattern, CATALOG_PALETTE[colorIdx]);
  }
  if (pattern.colors.length === 0) {
    addColor(pattern, CATALOG_PALETTE[0]);
  }

  // Find stitch data — typically after header + color table
  const stitchDataOffset = colorOffset + numColors * 2;
  if (stitchDataOffset >= file.byteLength) {
    // Fallback: scan from position 0x100
    file.seek(0x100);
  } else {
    file.seek(stitchDataOffset);
  }

  let stitchesRead = 0;
  const maxStitches = Math.min(numStitches + 100, 500000);

  while (file.tell() + 1 < file.byteLength && stitchesRead < maxStitches) {
    const b0 = file.getUint8();
    const b1 = file.getUint8();

    // End marker
    if (b0 === 0xFF && b1 === 0xFF) {
      addStitchRel(pattern, 0, 0, END);
      break;
    }

    // Color change
    if (b0 === 0x80 && (b1 & 0x01)) {
      addStitchRel(pattern, 0, 0, STOP, true);
      if (file.tell() + 1 < file.byteLength) {
        file.getUint8();
        file.getUint8();
      }
      stitchesRead++;
      continue;
    }

    // Trim/jump
    if (b0 === 0x80 && (b1 === 0x02 || b1 === 0x04)) {
      const nb0 = file.tell() < file.byteLength ? file.getUint8() : 0;
      const nb1 = file.tell() < file.byteLength ? file.getUint8() : 0;
      const dx = nb0 > 127 ? nb0 - 256 : nb0;
      const dy = nb1 > 127 ? nb1 - 256 : nb1;
      addStitchRel(pattern, dx, dy, TRIM, true);
      stitchesRead++;
      continue;
    }

    const dx = b0 > 127 ? b0 - 256 : b0;
    const dy = b1 > 127 ? b1 - 256 : b1;

    if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
      addStitchRel(pattern, dx, dy, JUMP, true);
    } else {
      addStitchRel(pattern, dx, dy, NORMAL, true);
    }
    stitchesRead++;
  }

  addStitchRel(pattern, 0, 0, END);
  invertPatternVertical(pattern);
  moveToPositive(pattern);
  return pattern;
}

// ── EMB Parser (Wilcom / generic) ───────────────────────────────────────
// EMB is a proprietary format (Wilcom). Full parsing requires understanding
// Wilcom's compound document structure. This parser handles a simplified
// stitch-data extraction for common EMB files. Complex EMB files with
// embedded objects may not render perfectly.

function parseEMB(buffer: ArrayBuffer): EmbroideryPattern {
  const file = new EmbroideryFileView(buffer);
  const pattern = createPattern();

  if (file.byteLength < 128) throw new Error("Invalid EMB file");

  // EMB files vary greatly. Try to detect stitch data region.
  // Many EMB files store stitch data as signed-byte pairs.
  const bytes = new Uint8Array(buffer);

  // Look for a likely stitch data start by scanning for consistent
  // small-value byte pairs (typical stitch movements are small)
  let dataStart = 0;
  const searchStart = Math.min(512, Math.floor(file.byteLength * 0.1));

  for (let i = searchStart; i < Math.min(file.byteLength - 64, 8192); i++) {
    // Check if we find a run of plausible stitch data (small signed values)
    let plausible = 0;
    for (let j = 0; j < 32 && (i + j * 2 + 1) < file.byteLength; j++) {
      const a = bytes[i + j * 2];
      const b = bytes[i + j * 2 + 1];
      const da = a > 127 ? a - 256 : a;
      const db = b > 127 ? b - 256 : b;
      if (Math.abs(da) <= 80 && Math.abs(db) <= 80 && (da !== 0 || db !== 0)) {
        plausible++;
      }
    }
    if (plausible >= 20) {
      dataStart = i;
      break;
    }
  }

  if (dataStart === 0) {
    // Fallback: start after a minimal header
    dataStart = Math.min(256, file.byteLength);
  }

  addColor(pattern, CATALOG_PALETTE[0]);
  file.seek(dataStart);

  let stitchesRead = 0;
  let consecutiveZeros = 0;

  while (file.tell() + 1 < file.byteLength && stitchesRead < 500000) {
    const b0 = file.getUint8();
    const b1 = file.getUint8();

    // End detection: multiple consecutive zero pairs
    if (b0 === 0 && b1 === 0) {
      consecutiveZeros++;
      if (consecutiveZeros >= 4) break;
      continue;
    }
    consecutiveZeros = 0;

    // Color change heuristic
    if (b0 === 0x80 && (b1 & 0x01)) {
      addStitchRel(pattern, 0, 0, STOP, true);
      if (file.tell() + 1 < file.byteLength) {
        file.getUint8();
        file.getUint8();
      }
      stitchesRead++;
      continue;
    }

    // Trim/jump heuristic
    if (b0 === 0x80 && (b1 === 0x02 || b1 === 0x04)) {
      const nb0 = file.tell() < file.byteLength ? file.getUint8() : 0;
      const nb1 = file.tell() < file.byteLength ? file.getUint8() : 0;
      const dx = nb0 > 127 ? nb0 - 256 : nb0;
      const dy = nb1 > 127 ? nb1 - 256 : nb1;
      addStitchRel(pattern, dx, dy, TRIM, true);
      stitchesRead++;
      continue;
    }

    const dx = b0 > 127 ? b0 - 256 : b0;
    const dy = b1 > 127 ? b1 - 256 : b1;

    if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
      addStitchRel(pattern, dx, dy, JUMP, true);
    } else {
      addStitchRel(pattern, dx, dy, NORMAL, true);
    }
    stitchesRead++;
  }

  addStitchRel(pattern, 0, 0, END);
  invertPatternVertical(pattern);
  moveToPositive(pattern);
  return pattern;
}

// ── Rendering Modes ─────────────────────────────────────────────────────

export type PreviewMode = "commercial" | "technical";

interface RenderOptions {
  mode?: PreviewMode;
  size?: number;
}

// Build color-block polylines for efficient batch rendering
interface Segment { x: number; y: number }
interface ColorBlock { color: EmbroideryColor; paths: Segment[][] }

function buildColorBlocks(pattern: EmbroideryPattern, scale: number, offsetX: number, offsetY: number): ColorBlock[] {
  const blocks: ColorBlock[] = [];
  let curColor = pattern.colors[pattern.stitches[0].color] || CATALOG_PALETTE[0];
  let curPaths: Segment[][] = [];
  let curPath: Segment[] = [];

  for (let i = 0; i < pattern.stitches.length; i++) {
    const s = pattern.stitches[i];
    const sColor = pattern.colors[s.color] || CATALOG_PALETTE[s.color % CATALOG_PALETTE.length];

    if (i > 0 && (sColor.r !== curColor.r || sColor.g !== curColor.g || sColor.b !== curColor.b)) {
      if (curPath.length > 0) { curPaths.push(curPath); curPath = []; }
      if (curPaths.length > 0) { blocks.push({ color: curColor, paths: curPaths }); curPaths = []; }
      curColor = sColor;
    }

    if (s.flags === JUMP || s.flags === TRIM || s.flags === (TRIM | STOP) ||
        (s.flags & STOP) === STOP || s.flags === END) {
      if (curPath.length > 0) { curPaths.push(curPath); curPath = []; }
      continue;
    }

    const sx = (s.x - pattern.left) * scale + offsetX;
    const sy = (s.y - pattern.top) * scale + offsetY;

    if (curPath.length === 0) {
      curPath.push({ x: sx, y: sy });
      continue;
    }

    const prev = curPath[curPath.length - 1];
    const dx = sx - prev.x;
    const dy = sy - prev.y;
    if (dx * dx + dy * dy < 0.25) continue;

    curPath.push({ x: sx, y: sy });
  }

  if (curPath.length > 0) curPaths.push(curPath);
  if (curPaths.length > 0) blocks.push({ color: curColor, paths: curPaths });

  return blocks;
}

function drawPaths(ctx: CanvasRenderingContext2D, paths: Segment[][], style: string, width: number, alpha: number) {
  ctx.lineWidth = width;
  ctx.strokeStyle = style;
  ctx.globalAlpha = alpha;
  for (const path of paths) {
    if (path.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let j = 1; j < path.length; j++) {
      ctx.lineTo(path[j].x, path[j].y);
    }
    ctx.stroke();
  }
}

// ── Commercial Renderer (transparent, elegant, delicate) ────────────────

function renderCommercial(pattern: EmbroideryPattern, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Transparent background — no fill
  ctx.clearRect(0, 0, size, size);

  if (pattern.stitches.length < 2) return canvas;

  const padding = size * 0.06;
  const drawArea = size - padding * 2;
  const pw = pattern.right - pattern.left;
  const ph = pattern.bottom - pattern.top;
  const scale = Math.min(pw > 0 ? drawArea / pw : 1, ph > 0 ? drawArea / ph : 1);
  const offsetX = padding + (drawArea - pw * scale) / 2;
  const offsetY = padding + (drawArea - ph * scale) / 2;

  // Fine, delicate thread — resembles real embroidery
  const baseThickness = Math.max(0.6, Math.min(1.2, size / 600));

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const blocks = buildColorBlocks(pattern, scale, offsetX, offsetY);

  for (const block of blocks) {
    const hex = rgbToHex(block.color);
    const darkerHex = shadeColor(hex, -15);
    const highlightHex = shadeColor(hex, 50);

    // Subtle shadow for depth — very light
    drawPaths(ctx, block.paths, darkerHex, baseThickness * 1.15, 0.12);
    // Main thread stroke — slightly transparent for natural overlap blending
    drawPaths(ctx, block.paths, hex, baseThickness, 0.85);
    // Fine sheen highlight
    drawPaths(ctx, block.paths, highlightHex, baseThickness * 0.25, 0.1);
  }

  ctx.globalAlpha = 1.0;
  return canvas;
}

// ── Technical Renderer (white background, thick, for stitch analysis) ───

function renderTechnical(pattern: EmbroideryPattern, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Solid white background for analysis
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  if (pattern.stitches.length < 2) return canvas;

  const padding = size * 0.08;
  const drawArea = size - padding * 2;
  const pw = pattern.right - pattern.left;
  const ph = pattern.bottom - pattern.top;
  const scale = Math.min(pw > 0 ? drawArea / pw : 1, ph > 0 ? drawArea / ph : 1);
  const offsetX = padding + (drawArea - pw * scale) / 2;
  const offsetY = padding + (drawArea - ph * scale) / 2;

  const baseThickness = Math.max(2.0, size / 200);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const blocks = buildColorBlocks(pattern, scale, offsetX, offsetY);

  for (const block of blocks) {
    const hex = rgbToHex(block.color);
    const darkerHex = shadeColor(hex, -25);
    const highlightHex = shadeColor(hex, 70);

    drawPaths(ctx, block.paths, darkerHex, baseThickness * 1.3, 0.45);
    drawPaths(ctx, block.paths, hex, baseThickness, 1.0);
    drawPaths(ctx, block.paths, highlightHex, baseThickness * 0.4, 0.3);
  }

  ctx.globalAlpha = 1.0;
  return canvas;
}

// ── Unified render entry point ──────────────────────────────────────────

function renderToCanvas(pattern: EmbroideryPattern, options: RenderOptions = {}): HTMLCanvasElement {
  const { mode = "commercial", size = 800 } = options;
  return mode === "technical"
    ? renderTechnical(pattern, size)
    : renderCommercial(pattern, size);
}

// ── Quality Validation ─────────────────────────────────────────────────

function validatePreviewQuality(pattern: EmbroideryPattern): boolean {
  const normalStitches = pattern.stitches.filter(s => s.flags === NORMAL);
  if (normalStitches.length < 20) return false;

  const patternWidth = pattern.right - pattern.left;
  const patternHeight = pattern.bottom - pattern.top;
  if (patternWidth < 5 || patternHeight < 5) return false;

  const normalRatio = normalStitches.length / pattern.stitches.length;
  if (normalRatio < 0.15) return false;

  const aspectRatio = Math.max(patternWidth, patternHeight) / Math.min(patternWidth, patternHeight);
  if (aspectRatio > 50) return false;

  return true;
}

// ── Public API ──────────────────────────────────────────────────────────

export interface EmbroideryMetadata {
  widthMm: number;
  heightMm: number;
  stitchCount: number;
  colorChanges: number;
}

export interface EmbroideryPreviewResult {
  blob: Blob;
  metadata: EmbroideryMetadata;
}

type Parser = (buffer: ArrayBuffer) => EmbroideryPattern;

const FORMAT_PARSERS: Record<string, Parser> = {
  pes: parsePES,
  dst: parseDST,
  jef: parseJEF,
  exp: parseEXP,
  xxx: parseXXX,
  vp3: parseVP3,
  hus: parseHUS,
  emb: parseEMB,
};

/**
 * Generate a preview image from an embroidery file.
 * Returns a PNG blob and metadata, or null if parsing fails or quality is too low.
 */
export async function generateEmbroideryPreview(
  file: Blob,
  format: string,
  imageSize: number = 800
): Promise<EmbroideryPreviewResult | null> {
  const ext = format.toLowerCase().replace(".", "");
  const parser = FORMAT_PARSERS[ext];
  if (!parser) return null;

  try {
    const buffer = await file.arrayBuffer();
    const pattern = parser(buffer);

    if (!validatePreviewQuality(pattern)) {
      console.warn(`Embroidery preview quality check failed for ${format} — skipping auto-preview`);
      return null;
    }

    const canvas = renderToCanvas(pattern, { mode: "commercial", size: imageSize });
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) return null;

    const patternWidth = pattern.right - pattern.left;
    const patternHeight = pattern.bottom - pattern.top;
    const normalStitches = pattern.stitches.filter(s => s.flags === NORMAL).length;
    const colorChanges = new Set(pattern.stitches.map(s => s.color)).size - 1;

    // Convert from stitch units to approximate mm (1 unit ≈ 0.1mm for most formats)
    const unitToMm = 0.1;

    return {
      blob,
      metadata: {
        widthMm: Math.round(patternWidth * unitToMm * 10) / 10,
        heightMm: Math.round(patternHeight * unitToMm * 10) / 10,
        stitchCount: normalStitches,
        colorChanges: Math.max(0, colorChanges),
      },
    };
  } catch (err) {
    console.warn(`Embroidery preview generation failed for ${format}:`, err);
    return null;
  }
}

/** Check if a format is supported for preview generation */
export function isPreviewSupported(format: string): boolean {
  return format.toLowerCase().replace(".", "") in FORMAT_PARSERS;
}

/**
 * Parse an embroidery file buffer and return the pattern object.
 * Used by the interactive EmbroideryViewer component.
 */
export function parseEmbroideryFile(buffer: ArrayBuffer, format: string): EmbroideryPattern | null {
  const ext = format.toLowerCase().replace(".", "");
  const parser = FORMAT_PARSERS[ext];
  if (!parser) return null;
  try {
    return parser(buffer);
  } catch (err) {
    console.warn(`Failed to parse ${format}:`, err);
    return null;
  }
}
