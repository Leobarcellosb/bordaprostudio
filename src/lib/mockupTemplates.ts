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

/** Create a mask canvas from the base mockup alpha (fabric area) */
function createFabricMask(
  mockupImg: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  canvasSize: number,
): HTMLCanvasElement {
  const mask = document.createElement("canvas");
  mask.width = canvasSize;
  mask.height = canvasSize;
  const mCtx = mask.getContext("2d")!;

  // Start from base alpha
  mCtx.drawImage(mockupImg, x, y, w, h);
  // Convert to white solid while preserving alpha as mask
  mCtx.globalCompositeOperation = "source-in";
  mCtx.fillStyle = "#ffffff";
  mCtx.fillRect(0, 0, canvasSize, canvasSize);

  return mask;
}

/** Create color layer constrained by fabric mask */
function createFabricColorLayer(
  fabricMask: HTMLCanvasElement,
  colorHex: string,
): HTMLCanvasElement {
  const layer = document.createElement("canvas");
  layer.width = fabricMask.width;
  layer.height = fabricMask.height;
  const lCtx = layer.getContext("2d")!;

  lCtx.fillStyle = colorHex;
  lCtx.fillRect(0, 0, layer.width, layer.height);

  // Keep color only where mask exists
  lCtx.globalCompositeOperation = "destination-in";
  lCtx.drawImage(fabricMask, 0, 0);

  return layer;
}

/** Create a shadow-detail layer from base mockup to preserve folds/lighting depth */
function createShadowLayer(
  mockupImg: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  canvasSize: number,
): HTMLCanvasElement {
  const shadow = document.createElement("canvas");
  shadow.width = canvasSize;
  shadow.height = canvasSize;
  const sCtx = shadow.getContext("2d")!;

  sCtx.drawImage(mockupImg, x, y, w, h);
  return shadow;
}

/**
 * Render mockup using strict layer architecture:
 * base + masked fabric color (multiply) + shadow layer + embroidery.
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

  // 1) Constant neutral studio background
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, S, S);

  // 2) Product placement (stable framing)
  const imgRatio = mockupImg.width / mockupImg.height;
  let drawW = S * 0.85;
  let drawH = S * 0.85;
  if (imgRatio > 1) {
    drawH = drawW / imgRatio;
  } else {
    drawW = drawH * imgRatio;
  }
  const imgX = (S - drawW) / 2;
  const imgY = (S - drawH) / 2;

  // 3) Soft ground shadow (depth on surface)
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.10)";
  ctx.filter = "blur(18px)";
  ctx.beginPath();
  ctx.ellipse(
    S / 2,
    imgY + drawH * 0.93,
    drawW * 0.36,
    drawH * 0.06,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.filter = "none";
  ctx.restore();

  // 4) BASE IMAGE layer
  ctx.drawImage(mockupImg, imgX, imgY, drawW, drawH);

  // 5) FABRIC MASK + COLOR LAYER (multiply only on mask)
  if (colorHex !== "#FFFFFF") {
    const fabricMask = createFabricMask(mockupImg, imgX, imgY, drawW, drawH, S);
    const fabricColorLayer = createFabricColorLayer(fabricMask, colorHex);

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(fabricColorLayer, 0, 0);
    ctx.restore();
  }

  // 6) SHADOW LAYER from base to preserve folds/lighting details
  const shadowLayer = createShadowLayer(mockupImg, imgX, imgY, drawW, drawH, S);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.24;
  ctx.drawImage(shadowLayer, 0, 0);
  ctx.globalAlpha = 1;
  ctx.restore();

  // 7) EMBROIDERY LAYER
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

  ctx.globalAlpha = 0.94;
  ctx.drawImage(designImg, eX, eY, eW, eH);
  ctx.globalAlpha = 1;

  ctx.restore();
}

