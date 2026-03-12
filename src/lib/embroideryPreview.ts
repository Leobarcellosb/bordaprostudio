/**
 * Client-side embroidery file parser and preview renderer.
 * Supports: PES, DST, JEF, EXP, XXX
 * Renders stitch paths on a Canvas and returns a PNG Blob.
 */

// ── Types ───────────────────────────────────────────────────────────────

interface Stitch {
  x: number;
  y: number;
  flags: number;
}

interface EmbroideryData {
  stitches: Stitch[];
  width: number;
  height: number;
  stitchCount: number;
  colorChanges: number;
  threadColors?: string[]; // Extracted thread colors from file (if available)
}

// Flags
const NORMAL = 0;
const JUMP = 1;
const TRIM = 2;
const COLOR_CHANGE = 4;
const END = 8;
const STOP = 16;

function isNonRenderingStitch(flags: number): boolean {
  return flags === JUMP || flags === TRIM || flags === STOP;
}

// ── Curated catalog palette — harmonious, high-contrast embroidery thread colors ──
// Modeled after popular Madeira / Isacord thread ranges
const CATALOG_PALETTE = [
  "#1B3A5C", // Navy blue
  "#C0392B", // Rich red
  "#27AE60", // Emerald green
  "#F39C12", // Golden amber
  "#8E44AD", // Deep purple
  "#2980B9", // Royal blue
  "#D35400", // Burnt orange
  "#16A085", // Teal green
  "#C2185B", // Raspberry
  "#5D4037", // Chocolate brown
  "#1565C0", // Cobalt blue
  "#E74C3C", // Scarlet
  "#2E7D32", // Forest green
  "#F57C00", // Tangerine
  "#7B1FA2", // Violet
  "#00838F", // Deep cyan
  "#AD1457", // Magenta
  "#33691E", // Olive green
  "#BF360C", // Rust
  "#4A148C", // Indigo
  "#00695C", // Dark teal
  "#FF6F00", // Warm amber
  "#1A237E", // Dark navy
  "#B71C1C", // Deep crimson
  "#004D40", // Dark emerald
  "#E65100", // Burnt sienna
  "#6A1B9A", // Plum
  "#0277BD", // Azure
  "#558B2F", // Sage green
  "#D84315", // Terra cotta
];

// Brother PEC thread color table (standard 64 colors, index 1-based)
// Reference: Brother PE-Design color chart
const BROTHER_THREAD_COLORS: string[] = [
  "#000000", // 0 - placeholder (not used)
  "#1a0a94", // 1  - Prussian Blue
  "#0f75bc", // 2  - Blue
  "#00934c", // 3  - Teal Green
  "#babdbd", // 4  - Corn Flower Blue
  "#ec0000", // 5  - Red
  "#e4995a", // 6  - Reddish Brown
  "#cc48ab", // 7  - Magenta
  "#fdc4fa", // 8  - Light Lilac
  "#dd00dd", // 9  - Violet
  "#5b32cc", // 10 - Blue Violet
  "#1899d6", // 11 - Ultramarine
  "#e4a945", // 12 - Light Brown
  "#ffd687", // 13 - Champagne
  "#e8e800", // 14 - Yellow Green
  "#bead00", // 15 - Dark Gold
  "#e79917", // 16 - Orange Yellow
  "#f06f24", // 17 - Orange
  "#a32700", // 18 - Brick Red
  "#de0726", // 19 - Wine Red
  "#000000", // 20 - Black
  "#a5a5a5", // 21 - Medium Grey
  "#ffffff", // 22 - White
  "#68c4e8", // 23 - Light Blue
  "#009dc5", // 24 - Peacock Blue
  "#fbe689", // 25 - Beige
  "#7b5623", // 26 - Sepia
  "#fee5d1", // 27 - Cream White
  "#e08552", // 28 - Pecan
  "#c5a88b", // 29 - Tawny Brown
  "#d1bfa6", // 30 - Khaki
  "#78cdaf", // 31 - Aquamarine
  "#22a54d", // 32 - Emerald Green
  "#006632", // 33 - Forest Green
  "#9acb46", // 34 - Grass Green
  "#8cc94c", // 35 - Lime Green
  "#f5f5dc", // 36 - Cream Yellow
  "#f0c300", // 37 - Yellow
  "#ff6347", // 38 - Tangerine
  "#c832cd", // 39 - Orchid Purple
  "#e5e5e5", // 40 - Light Grey
  "#f2a0b7", // 41 - Rose Pink
  "#eca6d4", // 42 - Orchid Pink
  "#f57baa", // 43 - Peony
  "#ffc864", // 44 - Light Orange
  "#ffc8c8", // 45 - Baby Pink
  "#36a5af", // 46 - Teal
  "#db7093", // 47 - Pale Violet Red
  "#d2691e", // 48 - Sienna
  "#7e9973", // 49 - Olive Drab
  "#ba7834", // 50 - Bronze
  "#e0a050", // 51 - Harvest Gold
  "#cca03e", // 52 - Gold
  "#c1c1c1", // 53 - Silver Grey
  "#cc0044", // 54 - Deep Rose
  "#d4ecff", // 55 - Pale Blue
  "#fffff0", // 56 - Ivory
  "#d09050", // 57 - Copper
  "#f0c0a0", // 58 - Salmon Pink
  "#7b5b3a", // 59 - Medium Brown
  "#a0522d", // 60 - Saddle Brown
  "#c0c0c0", // 61 - Gray
  "#808080", // 62 - Dark Gray
  "#505050", // 63 - Charcoal
  "#1a0a94", // 64 - Prussian Blue (wrap)
];

// Janome thread color table (used by JEF format)
// Reference: Janome Digitizer color chart
const JANOME_THREAD_COLORS: string[] = [
  "#000000", // 0  - Black
  "#000000", // 1  - Black
  "#1a1a1a", // 2  - Very Dark Grey
  "#404040", // 3  - Dark Grey
  "#808080", // 4  - Grey
  "#c0c0c0", // 5  - Silver
  "#ffffff", // 6  - White
  "#ff5797", // 7  - Pink
  "#d0006f", // 8  - Hot Pink
  "#cc0000", // 9  - Red
  "#850000", // 10 - Dark Red
  "#990033", // 11 - Wine Red
  "#f24a8a", // 12 - Rose
  "#ff6600", // 13 - Orange
  "#ffcc00", // 14 - Yellow
  "#e7a100", // 15 - Gold
  "#c9a227", // 16 - Old Gold
  "#826633", // 17 - Medium Brown
  "#4d2600", // 18 - Dark Brown
  "#a5682a", // 19 - Tan
  "#ceb68b", // 20 - Beige
  "#f5e1c8", // 21 - Cream
  "#bada55", // 22 - Yellow Green
  "#66cc33", // 23 - Light Green
  "#228b22", // 24 - Green
  "#006633", // 25 - Dark Green
  "#004d00", // 26 - Very Dark Green
  "#2e8b57", // 27 - Sea Green
  "#00b7a0", // 28 - Teal
  "#66cccc", // 29 - Light Teal
  "#87ceeb", // 30 - Sky Blue
  "#4169e1", // 31 - Blue
  "#003399", // 32 - Dark Blue
  "#000066", // 33 - Navy Blue
  "#7b68ee", // 34 - Medium Slate Blue
  "#663399", // 35 - Purple
  "#9933cc", // 36 - Violet
  "#9370db", // 37 - Medium Purple
  "#d8bfd8", // 38 - Lavender
  "#ffb6c1", // 39 - Light Pink
  "#f0e68c", // 40 - Light Yellow
  "#00ced1", // 41 - Aqua
  "#ff4500", // 42 - Red Orange
  "#f0c0a0", // 43 - Peach
  "#d2691e", // 44 - Sienna
  "#8b4513", // 45 - Saddle Brown
  "#bc8f8f", // 46 - Rosy Brown
  "#708090", // 47 - Slate Grey
  "#b0c4de", // 48 - Light Steel Blue
  "#daa520", // 49 - Goldenrod
  "#cd853f", // 50 - Peru
  "#556b2f", // 51 - Dark Olive Green
  "#6b8e23", // 52 - Olive Drab
  "#2f4f4f", // 53 - Dark Slate Grey
  "#191970", // 54 - Midnight Blue
  "#800080", // 55 - Deep Purple
  "#8b0000", // 56 - Dark Crimson
  "#ffd700", // 57 - Bright Gold
  "#32cd32", // 58 - Lime Green
  "#00bfff", // 59 - Deep Sky Blue
  "#ff1493", // 60 - Deep Pink
  "#ff69b4", // 61 - Hot Pink Light
  "#4682b4", // 62 - Steel Blue
  "#b22222", // 63 - Fire Brick
  "#deb887", // 64 - Burlywood
  "#f5deb3", // 65 - Wheat
  "#ffdead", // 66 - Navajo White
  "#ffe4e1", // 67 - Misty Rose
  "#e6e6fa", // 68 - Lavender Web
  "#98fb98", // 69 - Pale Green
  "#afeeee", // 70 - Pale Turquoise
  "#fffacd", // 71 - Lemon Chiffon
  "#faebd7", // 72 - Antique White
  "#cd5c5c", // 73 - Indian Red
  "#20b2aa", // 74 - Light Sea Green
  "#778899", // 75 - Light Slate Grey
  "#da70d6", // 76 - Orchid
  "#db7093", // 77 - Pale Violet Red
  "#48d1cc", // 78 - Medium Turquoise
];

// ── PES Parser ──────────────────────────────────────────────────────────

function parsePES(buffer: ArrayBuffer): EmbroideryData {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== "#PES") throw new Error("Not a PES file");

  const pecOffset = view.getUint32(8, true);

  // Extract PEC thread color list from PEC header
  // PEC header: offset+48 = number of colors, then color index bytes
  const threadColors: string[] = [];
  try {
    const numColors = bytes[pecOffset + 48] + 1; // stored as count-1
    for (let c = 0; c < numColors && c < 64; c++) {
      const colorIdx = bytes[pecOffset + 49 + c];
      if (colorIdx > 0 && colorIdx < BROTHER_THREAD_COLORS.length) {
        threadColors.push(BROTHER_THREAD_COLORS[colorIdx]);
      } else {
        threadColors.push(CATALOG_PALETTE[c % CATALOG_PALETTE.length]);
      }
    }
  } catch {
    // Color extraction failed — will use fallback palette
  }

  const pecStart = pecOffset + 532;
  if (pecStart >= buffer.byteLength) throw new Error("Invalid PES: PEC data out of bounds");

  const stitches: Stitch[] = [];
  let x = 0, y = 0;
  let i = pecStart;
  let colorChanges = 0;

  while (i < buffer.byteLength - 1) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];

    if (b1 === 0xFF && b2 === 0x00) {
      stitches.push({ x, y, flags: END });
      break;
    }

    if (b1 === 0xFE && b2 === 0xB0) {
      colorChanges++;
      stitches.push({ x, y, flags: COLOR_CHANGE });
      i += 3;
      continue;
    }

    let dx = 0, dy = 0;
    let commandBitsX = 0;
    let commandBitsY = 0;

    if (b1 & 0x80) {
      if (i + 2 >= buffer.byteLength) break;
      dx = ((b1 & 0x0F) << 8) | b2;
      if (dx & 0x800) dx -= 0x1000;
      commandBitsX = b1 & 0x30;
      i += 2;

      const b3 = bytes[i];
      if (b3 & 0x80) {
        if (i + 1 >= buffer.byteLength) break;
        const b4 = bytes[i + 1];
        dy = ((b3 & 0x0F) << 8) | b4;
        if (dy & 0x800) dy -= 0x1000;
        commandBitsY = b3 & 0x30;
        i += 2;
      } else {
        dy = b3;
        if (dy > 63) dy -= 128;
        i += 1;
      }
    } else {
      dx = b1;
      if (dx > 63) dx -= 128;

      if (b2 & 0x80) {
        if (i + 2 >= buffer.byteLength) break;
        const b3 = bytes[i + 2];
        dy = ((b2 & 0x0F) << 8) | b3;
        if (dy & 0x800) dy -= 0x1000;
        commandBitsY = b2 & 0x30;
        i += 3;
      } else {
        dy = b2;
        if (dy > 63) dy -= 128;
        i += 2;
      }
    }

    let flags = NORMAL;
    if ((commandBitsX & 0x20) || (commandBitsY & 0x20)) {
      flags = TRIM;
    } else if ((commandBitsX & 0x10) || (commandBitsY & 0x10)) {
      flags = JUMP;
    }

    x += dx;
    y += dy;
    stitches.push({ x, y, flags });
  }

  const result = buildResult(stitches, colorChanges);
  if (threadColors.length > 0) {
    result.threadColors = threadColors;
  }
  return result;
}

// ── DST Parser (Tajima) ─────────────────────────────────────────────────

function parseDST(buffer: ArrayBuffer): EmbroideryData {
  const bytes = new Uint8Array(buffer);
  const headerEnd = 512;
  if (buffer.byteLength < headerEnd + 3) throw new Error("Invalid DST file");

  const stitches: Stitch[] = [];
  let x = 0, y = 0;
  let colorChanges = 0;

  for (let i = headerEnd; i + 2 < buffer.byteLength; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const command = b2 & 0xC3;

    if (b0 === 0x00 && b1 === 0x00 && command === 0xF3) {
      stitches.push({ x, y, flags: END });
      break;
    }

    let dx = 0, dy = 0;

    // Decode X using DST bit layout
    if (b0 & 0x01) dx += 1;
    if (b0 & 0x02) dx -= 1;
    if (b0 & 0x04) dx += 9;
    if (b0 & 0x08) dx -= 9;
    if (b1 & 0x01) dx += 3;
    if (b1 & 0x02) dx -= 3;
    if (b1 & 0x04) dx += 27;
    if (b1 & 0x08) dx -= 27;
    if (b2 & 0x01) dx += 81;
    if (b2 & 0x02) dx -= 81;

    // Decode Y using DST bit layout
    if (b0 & 0x80) dy -= 1;
    if (b0 & 0x40) dy += 1;
    if (b0 & 0x20) dy -= 9;
    if (b0 & 0x10) dy += 9;
    if (b1 & 0x80) dy -= 3;
    if (b1 & 0x40) dy += 3;
    if (b1 & 0x20) dy -= 27;
    if (b1 & 0x10) dy += 27;
    if (b2 & 0x20) dy -= 81;
    if (b2 & 0x10) dy += 81;

    let flags = NORMAL;
    if (command === 0xC3) {
      flags = COLOR_CHANGE;
      colorChanges++;
    } else if (command === 0x83) {
      flags = (dx === 0 && dy === 0) ? TRIM : JUMP;
    } else if (command === 0x43) {
      flags = STOP;
    }

    x += dx;
    y += dy;
    stitches.push({ x, y, flags });
  }

  return buildResult(stitches, colorChanges);
}

// ── EXP Parser (Melco/Bernina) ──────────────────────────────────────────

function parseEXP(buffer: ArrayBuffer): EmbroideryData {
  const bytes = new Uint8Array(buffer);
  const stitches: Stitch[] = [];
  let x = 0, y = 0;
  let colorChanges = 0;

  for (let i = 0; i + 1 < buffer.byteLength; i += 2) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];

    if (b0 === 0x80 && b1 === 0x01) {
      colorChanges++;
      stitches.push({ x, y, flags: COLOR_CHANGE });
      i += 2;
      continue;
    }

    if (b0 === 0x80 && b1 === 0x04) {
      i += 2;
      if (i + 1 >= buffer.byteLength) break;
      const dx = bytes[i] > 127 ? bytes[i] - 256 : bytes[i];
      const dy = bytes[i + 1] > 127 ? -(bytes[i + 1] - 256) : -bytes[i + 1];
      x += dx;
      y += dy;
      stitches.push({ x, y, flags: JUMP });
      continue;
    }

    if (b0 === 0x80 && b1 === 0x02) {
      stitches.push({ x, y, flags: STOP });
      continue;
    }

    if (b0 === 0x80 && b1 === 0x80) {
      stitches.push({ x, y, flags: END });
      break;
    }

    if (b0 === 0x80) {
      continue;
    }

    const dx = b0 > 127 ? b0 - 256 : b0;
    const dy = b1 > 127 ? -(b1 - 256) : -b1;
    x += dx;
    y += dy;
    stitches.push({ x, y, flags: NORMAL });
  }

  return buildResult(stitches, colorChanges);
}

// ── JEF Parser (Janome) ─────────────────────────────────────────────────

function parseJEF(buffer: ArrayBuffer): EmbroideryData {
  const view = new DataView(buffer);
  if (buffer.byteLength < 116) throw new Error("Invalid JEF file");

  const stitchOffset = view.getInt32(0, true);
  if (stitchOffset <= 0 || stitchOffset >= buffer.byteLength) {
    throw new Error("Invalid JEF stitch offset");
  }

  const colorCount = Math.max(0, view.getInt32(24, true));
  const threadColors: string[] = [];
  const colorTableOffset = 116;

  for (let c = 0; c < colorCount; c++) {
    const offset = colorTableOffset + c * 4;
    if (offset + 4 > stitchOffset || offset + 4 > buffer.byteLength) break;

    const colorIndex = view.getInt32(offset, true);
    if (colorIndex > 0 && colorIndex < PEC_THREAD_COLORS.length) {
      threadColors.push(PEC_THREAD_COLORS[colorIndex]);
    } else {
      threadColors.push(CATALOG_PALETTE[Math.abs(colorIndex) % CATALOG_PALETTE.length]);
    }
  }

  const bytes = new Uint8Array(buffer);
  const stitches: Stitch[] = [];
  let x = 0, y = 0;
  let colorChanges = 0;

  for (let i = stitchOffset; i + 1 < buffer.byteLength; i += 2) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];

    if (b0 === 0x80 && b1 === 0x01) {
      stitches.push({ x, y, flags: END });
      break;
    }

    if (b0 === 0x80 && b1 === 0x02) {
      colorChanges++;
      stitches.push({ x, y, flags: COLOR_CHANGE });
      continue;
    }

    if (b0 === 0x80 && b1 === 0x04) {
      stitches.push({ x, y, flags: STOP });
      continue;
    }

    if (b0 === 0x80 && (b1 === 0x10 || b1 === 0x20)) {
      i += 2;
      if (i + 1 >= buffer.byteLength) break;
      const dx = bytes[i] > 127 ? bytes[i] - 256 : bytes[i];
      const dy = bytes[i + 1] > 127 ? bytes[i + 1] - 256 : bytes[i + 1];
      x += dx;
      y -= dy; // JEF Y is inverted
      stitches.push({ x, y, flags: b1 === 0x20 ? TRIM : JUMP });
      continue;
    }

    if (b0 === 0x80) {
      continue;
    }

    const dx = b0 > 127 ? b0 - 256 : b0;
    const dy = b1 > 127 ? b1 - 256 : b1;
    x += dx;
    y -= dy; // JEF Y is inverted
    stitches.push({ x, y, flags: NORMAL });
  }

  const result = buildResult(stitches, colorChanges);
  if (threadColors.length > 0) {
    result.threadColors = threadColors;
  }
  return result;
}

// ── XXX Parser (Singer) ─────────────────────────────────────────────────

function parseXXX(buffer: ArrayBuffer): EmbroideryData {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  if (buffer.byteLength < 0x100) throw new Error("Invalid XXX file");

  let stitchOffset = 0x100;
  try {
    const offset = view.getUint32(0x20, true);
    if (offset > 0 && offset < buffer.byteLength) stitchOffset = offset;
  } catch {
    // use default
  }

  const stitches: Stitch[] = [];
  let x = 0, y = 0;
  let colorChanges = 0;

  for (let i = stitchOffset; i + 1 < buffer.byteLength; i += 2) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];

    if (b0 === 0x7F && b1 === 0x7F) {
      colorChanges++;
      stitches.push({ x, y, flags: COLOR_CHANGE });
      i += 2;
      continue;
    }

    if (b0 === 0x7E && b1 === 0x7E) {
      stitches.push({ x, y, flags: END });
      break;
    }

    const dx = b0 > 127 ? b0 - 256 : b0;
    const dy = b1 > 127 ? b1 - 256 : b1;

    if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
      x += dx;
      y += dy;
      stitches.push({ x, y, flags: JUMP });
    } else {
      x += dx;
      y += dy;
      stitches.push({ x, y, flags: NORMAL });
    }
  }

  return buildResult(stitches, colorChanges);
}

// ── Helpers ─────────────────────────────────────────────────────────────

function buildResult(stitches: Stitch[], colorChanges: number): EmbroideryData {
  if (stitches.length === 0) throw new Error("No stitches found");

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let stitchCount = 0;

  for (const s of stitches) {
    if (s.flags === NORMAL) stitchCount++;
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
  }

  // Normalize coordinates to start at 0,0
  for (const s of stitches) {
    s.x -= minX;
    s.y -= minY;
  }

  return {
    stitches,
    width: maxX - minX,
    height: maxY - minY,
    stitchCount,
    colorChanges,
  };
}

function suppressLikelyJumpLines(data: EmbroideryData): EmbroideryData {
  const stepDistances: number[] = [];
  let prevNormal: Stitch | null = null;

  for (const stitch of data.stitches) {
    if (stitch.flags !== NORMAL) {
      prevNormal = null;
      continue;
    }

    if (prevNormal) {
      stepDistances.push(Math.hypot(stitch.x - prevNormal.x, stitch.y - prevNormal.y));
    }

    prevNormal = stitch;
  }

  if (stepDistances.length < 12) return data;

  const sorted = [...stepDistances].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)] || median;
  const diagonal = Math.hypot(data.width, data.height);
  const jumpThreshold = Math.max(14, median * 5, p90 * 1.8, diagonal * 0.09);

  let previousIndex = -1;
  let normalCount = 0;

  for (let i = 0; i < data.stitches.length; i++) {
    const current = data.stitches[i];
    if (current.flags !== NORMAL) {
      previousIndex = -1;
      continue;
    }

    if (previousIndex >= 0) {
      const prev = data.stitches[previousIndex];
      const distance = Math.hypot(current.x - prev.x, current.y - prev.y);

      if (distance > jumpThreshold) {
        current.flags = JUMP;
        previousIndex = -1;
        continue;
      }
    }

    normalCount++;
    previousIndex = i;
  }

  data.stitchCount = normalCount;
  return data;
}

// ── Quality Validation ─────────────────────────────────────────────────

function validatePreviewQuality(data: EmbroideryData): boolean {
  // Must have a meaningful number of normal stitches
  if (data.stitchCount < 20) return false;

  // Design must have non-trivial dimensions
  if (data.width < 5 || data.height < 5) return false;

  // Calculate the ratio of normal stitches to total entries
  const totalEntries = data.stitches.length;
  const normalRatio = data.stitchCount / totalEntries;
  
  // If almost all stitches are jumps/moves, the preview will look broken
  if (normalRatio < 0.15) return false;

  // Check for degenerate aspect ratio (extremely thin lines)
  const aspectRatio = Math.max(data.width, data.height) / Math.min(data.width, data.height);
  if (aspectRatio > 50) return false;

  // Check that stitches aren't all clustered in a tiny area with huge outliers
  // by sampling variance
  const normalStitches = data.stitches.filter(s => s.flags === NORMAL);
  if (normalStitches.length > 10) {
    const xs = normalStitches.map(s => s.x);
    const ys = normalStitches.map(s => s.y);
    xs.sort((a, b) => a - b);
    ys.sort((a, b) => a - b);
    // Check that the middle 80% of stitches cover a reasonable area
    const p10 = Math.floor(xs.length * 0.1);
    const p90 = Math.floor(xs.length * 0.9);
    const innerWidth = xs[p90] - xs[p10];
    const innerHeight = ys[p90] - ys[p10];
    // If the inner 80% is <5% of total bounds, outliers are dominating
    if (data.width > 0 && data.height > 0) {
      const coverage = (innerWidth / data.width) * (innerHeight / data.height);
      if (coverage < 0.01) return false;
    }
  }

  return true;
}

// ── Color Selection ─────────────────────────────────────────────────────

/**
 * Get the effective color palette for rendering.
 * Priority: embedded thread colors > curated catalog palette.
 * Ensures adjacent colors always have good contrast.
 */
function getEffectivePalette(data: EmbroideryData): string[] {
  if (data.threadColors && data.threadColors.length > 0) {
    // Validate extracted colors — skip if they look broken (all same, all black/white)
    const unique = new Set(data.threadColors);
    const hasVariety = unique.size > 1;
    const notAllDark = data.threadColors.some(c => {
      const r = parseInt(c.slice(1, 3), 16);
      const g = parseInt(c.slice(3, 5), 16);
      const b = parseInt(c.slice(5, 7), 16);
      return (r + g + b) > 100;
    });
    if (hasVariety && notAllDark) {
      return data.threadColors;
    }
  }
  return CATALOG_PALETTE;
}

// ── Renderer ────────────────────────────────────────────────────────────

function renderToCanvas(data: EmbroideryData, size: number = 800): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const padding = size * 0.08;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  if (data.stitches.length < 2) return canvas;

  // Calculate scale to fit in canvas with padding
  const drawArea = size - padding * 2;
  const scaleX = data.width > 0 ? drawArea / data.width : 1;
  const scaleY = data.height > 0 ? drawArea / data.height : 1;
  const scale = Math.min(scaleX, scaleY);

  // Center offset
  const offsetX = padding + (drawArea - data.width * scale) / 2;
  const offsetY = padding + (drawArea - data.height * scale) / 2;

  const palette = getEffectivePalette(data);

  // Draw stitches with thicker lines for polished catalog look
  let colorIndex = 0;
  const baseWidth = Math.max(1.8, size / 350);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let i = 0;
  while (i < data.stitches.length) {
    const s = data.stitches[i];
    if (s.flags === END) break;

    if (s.flags === COLOR_CHANGE) {
      colorIndex++;
      i++;
      continue;
    }

    if (isNonRenderingStitch(s.flags)) {
      i++;
      continue;
    }

    // Start a new path segment for consecutive normal stitches
    ctx.beginPath();
    ctx.strokeStyle = palette[colorIndex % palette.length];
    ctx.lineWidth = baseWidth;

    // Move to current stitch position
    const sx = s.x * scale + offsetX;
    const sy = s.y * scale + offsetY;
    ctx.moveTo(sx, sy);

    i++;
    // Continue drawing connected normal stitches
    while (i < data.stitches.length) {
      const next = data.stitches[i];
      if (next.flags !== NORMAL) break;
      ctx.lineTo(next.x * scale + offsetX, next.y * scale + offsetY);
      i++;
    }

    ctx.stroke();
  }

  return canvas;
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

const FORMAT_PARSERS: Record<string, (buf: ArrayBuffer) => EmbroideryData> = {
  pes: parsePES,
  dst: parseDST,
  jef: parseJEF,
  exp: parseEXP,
  xxx: parseXXX,
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
    const data = suppressLikelyJumpLines(parser(buffer));

    if (data.stitchCount < 5) return null;

    // Quality gate: don't produce previews that look broken
    if (!validatePreviewQuality(data)) {
      console.warn(`Embroidery preview quality check failed for ${format} — skipping auto-preview`);
      return null;
    }

    const canvas = renderToCanvas(data, imageSize);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) return null;

    // Convert from stitch units to approximate mm (1 unit ≈ 0.1mm for most formats)
    const unitToMm = 0.1;

    return {
      blob,
      metadata: {
        widthMm: Math.round(data.width * unitToMm * 10) / 10,
        heightMm: Math.round(data.height * unitToMm * 10) / 10,
        stitchCount: data.stitchCount,
        colorChanges: data.colorChanges,
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
