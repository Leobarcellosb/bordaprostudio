/**
 * Standardized mockup template system.
 * All coordinates are in pixels relative to a 1400×1400 canvas.
 */

export const CANVAS_SIZE = 1400;
export const CANVAS_BG = "#f4f4f4";

export interface EmbroideryArea {
  /** Left edge in px */
  x: number;
  /** Top edge in px */
  y: number;
  /** Width in px */
  width: number;
  /** Height in px */
  height: number;
}

export interface MockupTemplate {
  id: string;
  label: string;
  /** Default embroidery scale (0-1, where 1 = fill entire area) */
  defaultScale: number;
  /** Embroidery bounding box in 1400×1400 canvas coordinates */
  embroideryArea: EmbroideryArea;
}

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  {
    id: "baby-towel",
    label: "Toalha de Bebê",
    defaultScale: 0.75,
    embroideryArea: { x: 300, y: 350, width: 800, height: 500 },
  },
  {
    id: "dish-towel",
    label: "Pano de Prato",
    defaultScale: 0.75,
    embroideryArea: { x: 250, y: 350, width: 900, height: 500 },
  },
  {
    id: "baby-bib",
    label: "Babador",
    defaultScale: 0.7,
    embroideryArea: { x: 450, y: 550, width: 500, height: 400 },
  },
  {
    id: "baby-clothes",
    label: "Roupinha de Bebê",
    defaultScale: 0.7,
    embroideryArea: { x: 450, y: 380, width: 500, height: 500 },
  },
  {
    id: "pillow-cover",
    label: "Capa de Almofada",
    defaultScale: 0.75,
    embroideryArea: { x: 350, y: 300, width: 700, height: 700 },
  },
];

export const COLOR_IDS = ["branco", "preto", "bege", "rosa", "azul-bebe", "cinza", "vermelho", "marinho"] as const;
export type ColorId = (typeof COLOR_IDS)[number];

export const FABRIC_COLORS: { id: ColorId; label: string; hex: string }[] = [
  { id: "branco", label: "Branco", hex: "#FFFFFF" },
  { id: "preto", label: "Preto", hex: "#1A1A1A" },
  { id: "bege", label: "Bege/Cru", hex: "#E8DCC8" },
  { id: "rosa", label: "Rosa Claro", hex: "#F4C2C2" },
  { id: "azul-bebe", label: "Azul Bebê", hex: "#B5D8F7" },
  { id: "cinza", label: "Cinza Mescla", hex: "#B0B0B0" },
  { id: "vermelho", label: "Vermelho", hex: "#C41E3A" },
  { id: "marinho", label: "Azul Marinho", hex: "#1B2A4A" },
];

/** Build asset path — always use the WHITE base for uniform composition */
export const getMockupBaseSrc = (productId: string) =>
  `/mockups/${productId}-branco.png`;

/** @deprecated Use getMockupBaseSrc + tinting instead */
export const getMockupSrc = (productId: string, colorId: ColorId) =>
  `/mockups/${productId}-${colorId}.png`;

/** Detect if a color is "dark" (needs special rendering) */
function isDarkColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.3;
}

/**
 * Apply fabric color tint to the base (white) mockup image.
 * Dark colors get extra brightness to preserve texture detail.
 */
function applyColorTint(
  ctx: CanvasRenderingContext2D,
  mockupImg: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  hex: string,
) {
  if (hex === "#FFFFFF") return;

  const dark = isDarkColor(hex);
  const offscreen = document.createElement("canvas");
  offscreen.width = ctx.canvas.width;
  offscreen.height = ctx.canvas.height;
  const oCtx = offscreen.getContext("2d")!;

  // Draw product
  oCtx.drawImage(mockupImg, x, y, w, h);

  // Multiply tint
  oCtx.globalCompositeOperation = "multiply";
  oCtx.fillStyle = hex;
  oCtx.fillRect(x, y, w, h);

  // Clip to product alpha
  oCtx.globalCompositeOperation = "destination-in";
  oCtx.drawImage(mockupImg, x, y, w, h);

  // Brightness lift — stronger for dark fabrics
  const screenAlpha = dark ? 0.30 : 0.15;
  oCtx.globalCompositeOperation = "screen";
  oCtx.globalAlpha = screenAlpha;
  oCtx.fillStyle = "#ffffff";
  oCtx.fillRect(x, y, w, h);
  oCtx.globalAlpha = 1;
  oCtx.globalCompositeOperation = "destination-in";
  oCtx.drawImage(mockupImg, x, y, w, h);

  // Composite tinted product onto main canvas
  ctx.drawImage(offscreen, 0, 0);

  // Rim light for dark products — subtle edge glow
  if (dark) {
    applyRimLight(ctx, mockupImg, x, y, w, h);
  }
}

/**
 * Subtle rim/edge light for dark products.
 * Creates a faint bright outline so the product separates from any background.
 */
function applyRimLight(
  ctx: CanvasRenderingContext2D,
  mockupImg: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const rim = document.createElement("canvas");
  rim.width = ctx.canvas.width;
  rim.height = ctx.canvas.height;
  const rCtx = rim.getContext("2d")!;

  // Draw product silhouette slightly expanded (2px blur spread)
  rCtx.shadowColor = "rgba(255, 255, 255, 0.35)";
  rCtx.shadowBlur = 6;
  rCtx.drawImage(mockupImg, x, y, w, h);

  // Subtract the original product shape → leaves only the edge glow
  rCtx.globalCompositeOperation = "destination-out";
  rCtx.shadowColor = "transparent";
  rCtx.shadowBlur = 0;
  rCtx.drawImage(mockupImg, x, y, w, h);

  ctx.drawImage(rim, 0, 0);
}

/**
 * Render mockup onto a canvas at standard CANVAS_SIZE.
 * Uses the WHITE base mockup and tints it to the selected color.
 * Dark fabrics get rim light + brightness boost.
 * Embroidery on dark fabrics gets contrast/brightness enhancement.
 */
export function renderMockup(
  ctx: CanvasRenderingContext2D,
  mockupImg: HTMLImageElement,
  designImg: HTMLImageElement | null,
  template: MockupTemplate,
  userScale: number,
  userOffsetX: number,
  userOffsetY: number,
  colorHex: string = "#FFFFFF",
) {
  const S = CANVAS_SIZE;
  ctx.canvas.width = S;
  ctx.canvas.height = S;

  // 1. Neutral light background
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, S, S);

  // 2. Product sizing (85% inset for breathing room)
  const imgRatio = mockupImg.width / mockupImg.height;
  let drawW = S * 0.85, drawH = S * 0.85;
  if (imgRatio > 1) { drawH = drawW / imgRatio; } else { drawW = drawH * imgRatio; }
  const imgX = (S - drawW) / 2;
  const imgY = (S - drawH) / 2;

  // 3. Soft drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.10)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 16;
  ctx.drawImage(mockupImg, imgX, imgY, drawW, drawH);
  ctx.restore();

  // 4. Color tint (with dark-fabric enhancements)
  applyColorTint(ctx, mockupImg, imgX, imgY, drawW, drawH, colorHex);

  // 5. Embroidery overlay
  if (!designImg) return;

  const dark = isDarkColor(colorHex);
  const area = template.embroideryArea;
  const scaleFactor = (userScale / 100) * template.defaultScale;

  const designRatio = designImg.width / designImg.height;
  let eW = area.width * scaleFactor;
  let eH = eW / designRatio;
  if (eH > area.height * scaleFactor) {
    eH = area.height * scaleFactor;
    eW = eH * designRatio;
  }

  const offsetPxX = (userOffsetX / 100) * area.width * 0.15;
  const offsetPxY = (userOffsetY / 100) * area.height * 0.15;
  const eX = area.x + (area.width - eW) / 2 + offsetPxX;
  const eY = area.y + (area.height - eH) / 2 + offsetPxY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();

  if (dark) {
    // Draw embroidery with enhanced brightness on dark fabrics
    const eOff = document.createElement("canvas");
    eOff.width = S;
    eOff.height = S;
    const eCtx = eOff.getContext("2d")!;

    eCtx.drawImage(designImg, eX, eY, eW, eH);

    // Boost brightness +15%
    eCtx.globalCompositeOperation = "screen";
    eCtx.globalAlpha = 0.15;
    eCtx.fillStyle = "#ffffff";
    eCtx.fillRect(eX, eY, eW, eH);
    eCtx.globalAlpha = 1;

    // Boost contrast via overlay
    eCtx.globalCompositeOperation = "overlay";
    eCtx.globalAlpha = 0.12;
    eCtx.drawImage(designImg, eX, eY, eW, eH);
    eCtx.globalAlpha = 1;

    // Clip to original design alpha
    eCtx.globalCompositeOperation = "destination-in";
    eCtx.drawImage(designImg, eX, eY, eW, eH);

    ctx.globalAlpha = 0.95;
    ctx.drawImage(eOff, 0, 0);
    ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 0.92;
    ctx.drawImage(designImg, eX, eY, eW, eH);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
