/**
 * Static-Asset Mockup Engine for Borda Pro.
 *
 * Architecture: Each product × color has a pre-approved static image.
 * No programmatic recoloring. Embroidery is composited on top.
 *
 * Pipeline:
 *   1. Load static product image for selected color
 *   2. Draw on canvas with studio background
 *   3. Composite embroidery design inside defined area
 *   4. Export
 */

// ─── Canvas constants ───────────────────────────────────────────────
export const CANVAS_SIZE = 1400;
export const CANVAS_BG = "#f4f4f6";

// ─── Types ──────────────────────────────────────────────────────────
export interface EmbroideryArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MockupTemplate {
  id: string;
  label: string;
  defaultScale: number;
  embroideryArea: EmbroideryArea;
  /** Color IDs that have approved static assets */
  availableColors: ColorId[];
}

// ─── Templates ──────────────────────────────────────────────────────
export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  {
    id: "pillow-cover",
    label: "Capa de Almofada",
    defaultScale: 0.75,
    embroideryArea: { x: 350, y: 300, width: 700, height: 700 },
    availableColors: ["branco", "preto", "bege", "rosa", "azul-bebe", "cinza", "vermelho", "marinho"],
  },
  {
    id: "baby-towel",
    label: "Toalha de Bebê",
    defaultScale: 0.75,
    embroideryArea: { x: 300, y: 350, width: 800, height: 500 },
    availableColors: ["branco", "preto", "bege", "rosa", "azul-bebe", "cinza", "vermelho", "marinho"],
  },
  {
    id: "dish-towel",
    label: "Pano de Prato",
    defaultScale: 0.75,
    embroideryArea: { x: 250, y: 350, width: 900, height: 500 },
    availableColors: ["branco", "preto", "bege", "rosa", "azul-bebe", "cinza", "vermelho", "marinho"],
  },
  {
    id: "baby-bib",
    label: "Babador",
    defaultScale: 0.70,
    embroideryArea: { x: 450, y: 550, width: 500, height: 400 },
    availableColors: ["branco", "preto", "bege", "rosa", "azul-bebe", "cinza", "vermelho", "marinho"],
  },
  {
    id: "baby-clothes",
    label: "Roupinha de Bebê",
    defaultScale: 0.70,
    embroideryArea: { x: 450, y: 380, width: 500, height: 500 },
    availableColors: ["branco", "preto", "bege", "rosa", "azul-bebe", "cinza", "vermelho", "marinho"],
  },
];

// ─── Colors ─────────────────────────────────────────────────────────
export const COLOR_IDS = [
  "branco", "preto", "bege", "rosa", "azul-bebe", "cinza", "vermelho", "marinho",
] as const;
export type ColorId = (typeof COLOR_IDS)[number];

export interface FabricColor {
  id: ColorId;
  label: string;
  hex: string;
}

export const FABRIC_COLORS: FabricColor[] = [
  { id: "branco",    label: "Branco",       hex: "#FFFFFF" },
  { id: "preto",     label: "Preto",        hex: "#1A1A1A" },
  { id: "bege",      label: "Bege/Cru",     hex: "#E8DCC8" },
  { id: "rosa",      label: "Rosa Claro",   hex: "#F4C2C2" },
  { id: "azul-bebe", label: "Azul Bebê",    hex: "#B5D8F7" },
  { id: "cinza",     label: "Cinza Mescla",  hex: "#B0B0B0" },
  { id: "vermelho",  label: "Vermelho",     hex: "#C41E3A" },
  { id: "marinho",   label: "Azul Marinho", hex: "#1B2A4A" },
];

// ─── Asset helpers ──────────────────────────────────────────────────

/** Get the static mockup image path for a product + color */
export const getMockupSrc = (productId: string, colorId: ColorId) =>
  `/mockups/${productId}-${colorId}.png`;

/** @deprecated Use getMockupSrc instead */
export const getMockupBaseSrc = (productId: string) =>
  `/mockups/${productId}-branco.png`;

/** Get available colors for a template (only those with approved assets) */
export function getAvailableColors(template: MockupTemplate): FabricColor[] {
  return FABRIC_COLORS.filter((c) => template.availableColors.includes(c.id));
}

// ─── Image loading ──────────────────────────────────────────────────

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Draw helpers ───────────────────────────────────────────────────

/** Compute draw rect to center-fit image at 85% of canvas */
function computeDrawRect(img: HTMLImageElement, canvasSize: number) {
  const ratio = img.width / img.height;
  let w = canvasSize * 0.85;
  let h = canvasSize * 0.85;
  if (ratio > 1) {
    h = w / ratio;
  } else {
    w = h * ratio;
  }
  return {
    x: (canvasSize - w) / 2,
    y: (canvasSize - h) / 2,
    w,
    h,
  };
}

// ─── Main render function ───────────────────────────────────────────

/**
 * Render a mockup using a static pre-approved product image + embroidery overlay.
 * No programmatic recoloring — the productImg already has the correct fabric color.
 */
export function renderMockup(
  ctx: CanvasRenderingContext2D,
  productImg: HTMLImageElement,
  designImg: HTMLImageElement | null,
  template: MockupTemplate,
  userScale: number,
  userOffsetX: number,
  userOffsetY: number,
  _colorHex?: string, // kept for backward compat, ignored
) {
  const S = CANVAS_SIZE;
  ctx.canvas.width = S;
  ctx.canvas.height = S;

  // ── Layer 0: Studio background ──
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, S, S);

  // ── Compute product placement ──
  const { x: dx, y: dy, w: dw, h: dh } = computeDrawRect(productImg, S);

  // ── Layer 1: Ground shadow ──
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.filter = "blur(20px)";
  ctx.beginPath();
  ctx.ellipse(S / 2, dy + dh * 0.95, dw * 0.35, dh * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = "none";
  ctx.restore();

  // ── Layer 2: Static product image (already the correct color) ──
  ctx.drawImage(productImg, dx, dy, dw, dh);

  // ── Layer 3: Embroidery ──
  if (!designImg) return;

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

  ctx.globalAlpha = 0.95;
  ctx.drawImage(designImg, eX, eY, eW, eH);
  ctx.globalAlpha = 1;

  ctx.restore();
}
