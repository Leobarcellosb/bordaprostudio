/**
 * Standardized mockup template system.
 * All coordinates are in pixels relative to a 1400×1400 canvas.
 */

export const CANVAS_SIZE = 1400;
export const CANVAS_BG = "#F4F4F4";

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
    defaultScale: 0.7,
    embroideryArea: { x: 350, y: 490, width: 700, height: 560 },
  },
  {
    id: "dish-towel",
    label: "Pano de Prato",
    defaultScale: 0.65,
    embroideryArea: { x: 280, y: 420, width: 840, height: 560 },
  },
  {
    id: "baby-bib",
    label: "Babador",
    defaultScale: 0.6,
    embroideryArea: { x: 420, y: 560, width: 560, height: 420 },
  },
  {
    id: "baby-clothes",
    label: "Roupinha de Bebê",
    defaultScale: 0.55,
    embroideryArea: { x: 420, y: 350, width: 560, height: 560 },
  },
  {
    id: "pillow-cover",
    label: "Capa de Almofada",
    defaultScale: 0.7,
    embroideryArea: { x: 350, y: 350, width: 700, height: 700 },
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

/** Build asset path for product + color variant */
export const getMockupSrc = (productId: string, colorId: ColorId) =>
  `/mockups/${productId}-${colorId}.png`;

/**
 * Render mockup onto a canvas at standard CANVAS_SIZE.
 * Embroidery is placed inside the template's embroideryArea using contain logic,
 * offset and scaled by user adjustments.
 */
export function renderMockup(
  ctx: CanvasRenderingContext2D,
  mockupImg: HTMLImageElement,
  designImg: HTMLImageElement | null,
  template: MockupTemplate,
  userScale: number,   // 0-200, default 100
  userOffsetX: number, // -100 to 100
  userOffsetY: number, // -100 to 100
) {
  const S = CANVAS_SIZE;
  ctx.canvas.width = S;
  ctx.canvas.height = S;

  // 1. Clear with standard background
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, S, S);

  // 2. Draw product image centered (contain within canvas)
  const imgRatio = mockupImg.width / mockupImg.height;
  let drawW = S, drawH = S;
  if (imgRatio > 1) { drawH = S / imgRatio; } else { drawW = S * imgRatio; }
  const imgX = (S - drawW) / 2;
  const imgY = (S - drawH) / 2;
  ctx.drawImage(mockupImg, imgX, imgY, drawW, drawH);

  // 3. Overlay embroidery inside embroideryArea
  if (!designImg) return;

  const area = template.embroideryArea;
  const scaleFactor = (userScale / 100) * template.defaultScale;

  // Contain the design within the area
  const designRatio = designImg.width / designImg.height;
  let eW = area.width * scaleFactor;
  let eH = eW / designRatio;
  if (eH > area.height * scaleFactor) {
    eH = area.height * scaleFactor;
    eW = eH * designRatio;
  }

  // Center within area + user offset (offset range maps to ±15% of area dimension)
  const offsetPxX = (userOffsetX / 100) * area.width * 0.15;
  const offsetPxY = (userOffsetY / 100) * area.height * 0.15;

  const eX = area.x + (area.width - eW) / 2 + offsetPxX;
  const eY = area.y + (area.height - eH) / 2 + offsetPxY;

  // Clip to embroidery area so design never bleeds outside
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();

  ctx.globalAlpha = 0.92;
  ctx.drawImage(designImg, eX, eY, eW, eH);
  ctx.globalAlpha = 1;

  ctx.restore();
}
