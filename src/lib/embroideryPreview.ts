/**
 * Client-side embroidery file parser and preview renderer.
 * Supports: PES, DST, JEF, EXP, XXX
 * Renders stitch paths on an OffscreenCanvas and returns a PNG Blob.
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
}

// Flags
const NORMAL = 0;
const MOVE = 1;   // jump / move without stitching
const TRIM = 2;
const COLOR_CHANGE = 4;
const END = 8;

// Default thread palette (rich embroidery colors)
const THREAD_PALETTE = [
  "#1a1a2e", "#e94560", "#0f3460", "#16213e", "#e23e57",
  "#00b4d8", "#6a0572", "#ab83a1", "#d4a373", "#588157",
  "#e07a5f", "#3d405b", "#81b29a", "#f2cc8f", "#264653",
  "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#606c38",
  "#283618", "#dda15e", "#bc6c25", "#6b705c", "#a5a58d",
  "#b5838d", "#ffb4a2", "#6d6875", "#e5989b", "#b5179e",
  "#7209b7", "#560bad", "#480ca8", "#3a0ca3", "#3f37c9",
  "#4361ee", "#4895ef", "#4cc9f0", "#f72585", "#7400b8",
];

// ── PES Parser ──────────────────────────────────────────────────────────

function parsePES(buffer: ArrayBuffer): EmbroideryData {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Verify magic "#PES"
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== "#PES") throw new Error("Not a PES file");

  // Read PEC offset (at byte 8, little-endian 32-bit)
  const pecOffset = view.getUint32(8, true);
  
  // PEC block: skip the PEC header to get to stitch data
  // PEC header is 532 bytes after the PEC start marker
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
      // End of stitches
      stitches.push({ x, y, flags: END });
      break;
    }

    if (b1 === 0xFE && b2 === 0xB0) {
      // Color change
      colorChanges++;
      stitches.push({ x, y, flags: COLOR_CHANGE });
      i += 3; // skip the color change byte
      continue;
    }

    let dx = 0, dy = 0;
    let flags = NORMAL;

    if (b1 & 0x80) {
      // 12-bit x value
      if (i + 2 >= buffer.byteLength) break;
      dx = ((b1 & 0x0F) << 8) | b2;
      if (b1 & 0x20) dx -= 4096;
      if (b1 & 0x10) flags = MOVE;
      i += 2;
      const b3 = bytes[i];
      if (b3 & 0x80) {
        if (i + 1 >= buffer.byteLength) break;
        const b4 = bytes[i + 1];
        dy = ((b3 & 0x0F) << 8) | b4;
        if (b3 & 0x20) dy -= 4096;
        if (b3 & 0x10) flags = MOVE;
        i += 2;
      } else {
        dy = b3 & 0x7F;
        if (b3 & 0x40) dy -= 128;
        i += 1;
      }
    } else {
      dx = b1 & 0x7F;
      if (b1 & 0x40) dx -= 128;
      if (b2 & 0x80) {
        if (i + 2 >= buffer.byteLength) break;
        const b3 = bytes[i + 2];
        dy = ((b2 & 0x0F) << 8) | b3;
        if (b2 & 0x20) dy -= 4096;
        if (b2 & 0x10) flags = MOVE;
        i += 3;
      } else {
        dy = b2 & 0x7F;
        if (b2 & 0x40) dy -= 128;
        i += 2;
      }
    }

    x += dx;
    y += dy;
    stitches.push({ x, y, flags });
  }

  return buildResult(stitches, colorChanges);
}

// ── DST Parser (Tajima) ─────────────────────────────────────────────────

function parseDST(buffer: ArrayBuffer): EmbroideryData {
  const bytes = new Uint8Array(buffer);
  // DST header is 512 bytes
  const headerEnd = 512;
  if (buffer.byteLength < headerEnd + 3) throw new Error("Invalid DST file");

  const stitches: Stitch[] = [];
  let x = 0, y = 0;
  let colorChanges = 0;

  for (let i = headerEnd; i + 2 < buffer.byteLength; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];

    // End code
    if (b2 & 0x40) {
      // Possible stop/end
      if (b0 === 0x00 && b1 === 0x00 && (b2 & 0xF3) === 0xF3) {
        stitches.push({ x, y, flags: END });
        break;
      }
    }

    let dx = 0, dy = 0;
    let flags = NORMAL;

    // Decode X
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

    // Decode Y
    if (b0 & 0x80) dy += 1;
    if (b0 & 0x40) dy -= 1;
    if (b0 & 0x20) dy += 9;
    if (b0 & 0x10) dy -= 9;
    if (b1 & 0x80) dy += 3;
    if (b1 & 0x40) dy -= 3;
    if (b1 & 0x20) dy += 27;
    if (b1 & 0x10) dy -= 27;
    if (b2 & 0x20) dy += 81;
    if (b2 & 0x10) dy -= 81;

    // Check flags
    if (b2 & 0x80) {
      if (b2 & 0x40) {
        flags = COLOR_CHANGE;
        colorChanges++;
      } else {
        flags = MOVE;
      }
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

    // Color change: 0x80 0x01 followed by 0x00 0x00
    if (b0 === 0x80 && b1 === 0x01) {
      colorChanges++;
      stitches.push({ x, y, flags: COLOR_CHANGE });
      i += 2; // skip the 0x00 0x00 after color change
      continue;
    }

    // Move: 0x80 0x04
    if (b0 === 0x80 && b1 === 0x04) {
      i += 2;
      if (i + 1 >= buffer.byteLength) break;
      const dx = bytes[i] > 127 ? bytes[i] - 256 : bytes[i];
      const dy = bytes[i + 1] > 127 ? bytes[i + 1] - 256 : bytes[i + 1];
      x += dx;
      y += dy;
      stitches.push({ x, y, flags: MOVE });
      continue;
    }

    // End
    if (b0 === 0x80 && b1 === 0x80) {
      stitches.push({ x, y, flags: END });
      break;
    }

    // 0x80 prefix for other control codes
    if (b0 === 0x80) {
      continue;
    }

    const dx = b0 > 127 ? b0 - 256 : b0;
    const dy = b1 > 127 ? b1 - 256 : b1;
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

  // JEF header: offset to stitch data at byte 24
  const stitchOffset = view.getInt32(24, true);
  if (stitchOffset <= 0 || stitchOffset >= buffer.byteLength) {
    throw new Error("Invalid JEF stitch offset");
  }

  const bytes = new Uint8Array(buffer);
  const stitches: Stitch[] = [];
  let x = 0, y = 0;
  let colorChanges = 0;

  for (let i = stitchOffset; i + 1 < buffer.byteLength; i += 2) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];

    // End
    if (b0 === 0x80 && b1 === 0x01) {
      stitches.push({ x, y, flags: END });
      break;
    }

    // Color change
    if (b0 === 0x80 && b1 === 0x02) {
      colorChanges++;
      stitches.push({ x, y, flags: COLOR_CHANGE });
      continue;
    }

    // Move / trim
    if (b0 === 0x80 && b1 === 0x10) {
      i += 2;
      if (i + 1 >= buffer.byteLength) break;
      const dx = bytes[i] > 127 ? bytes[i] - 256 : bytes[i];
      const dy = bytes[i + 1] > 127 ? bytes[i + 1] - 256 : bytes[i + 1];
      x += dx;
      y += dy;
      stitches.push({ x, y, flags: MOVE });
      continue;
    }

    // Normal stitch
    const dx = b0 > 127 ? b0 - 256 : b0;
    const dy = b1 > 127 ? b1 - 256 : b1;
    x += dx;
    y += dy;
    stitches.push({ x, y, flags: NORMAL });
  }

  return buildResult(stitches, colorChanges);
}

// ── XXX Parser (Singer) ─────────────────────────────────────────────────

function parseXXX(buffer: ArrayBuffer): EmbroideryData {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  if (buffer.byteLength < 0x100) throw new Error("Invalid XXX file");

  // XXX stitch data offset is stored at byte 0x20
  let stitchOffset = 0x100; // default
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
      // Color change
      colorChanges++;
      stitches.push({ x, y, flags: COLOR_CHANGE });
      i += 2; // skip extra bytes
      continue;
    }

    if (b0 === 0x7E && b1 === 0x7E) {
      // End
      stitches.push({ x, y, flags: END });
      break;
    }

    const dx = b0 > 127 ? b0 - 256 : b0;
    const dy = b1 > 127 ? b1 - 256 : b1;

    // Large move
    if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
      x += dx;
      y += dy;
      stitches.push({ x, y, flags: MOVE });
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

  // Normalize coordinates
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

  // Draw stitches
  let colorIndex = 0;
  ctx.lineWidth = Math.max(1.2, size / 500);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let pathStarted = false;

  for (let i = 0; i < data.stitches.length; i++) {
    const s = data.stitches[i];
    const sx = s.x * scale + offsetX;
    const sy = s.y * scale + offsetY;

    if (s.flags === END) {
      if (pathStarted) {
        ctx.stroke();
        pathStarted = false;
      }
      break;
    }

    if (s.flags === COLOR_CHANGE) {
      if (pathStarted) {
        ctx.stroke();
        pathStarted = false;
      }
      colorIndex++;
      continue;
    }

    if (s.flags === MOVE || s.flags === TRIM) {
      if (pathStarted) {
        ctx.stroke();
        pathStarted = false;
      }
      continue;
    }

    // Normal stitch
    if (!pathStarted) {
      ctx.beginPath();
      ctx.strokeStyle = THREAD_PALETTE[colorIndex % THREAD_PALETTE.length];
      // Move to previous normal stitch or current position
      const prev = findPrevNormal(data.stitches, i);
      if (prev) {
        ctx.moveTo(prev.x * scale + offsetX, prev.y * scale + offsetY);
      } else {
        ctx.moveTo(sx, sy);
      }
      pathStarted = true;
    }

    ctx.lineTo(sx, sy);
  }

  if (pathStarted) ctx.stroke();

  return canvas;
}

function findPrevNormal(stitches: Stitch[], index: number): Stitch | null {
  for (let i = index - 1; i >= 0; i--) {
    if (stitches[i].flags === NORMAL) return stitches[i];
    if (stitches[i].flags === COLOR_CHANGE || stitches[i].flags === END) return null;
  }
  return null;
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
 * Returns a PNG blob and metadata, or null if parsing fails.
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
    const data = parser(buffer);

    if (data.stitches.length < 5) return null;

    const canvas = renderToCanvas(data, imageSize);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) return null;

    // Convert from stitch units to approximate mm (1 unit ≈ 0.1mm for most formats)
    const unitToMm = ext === "dst" ? 0.1 : 0.1;

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
