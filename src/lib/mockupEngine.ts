/**
 * Professional Layered Mockup Engine for Borda Pro.
 *
 * Architecture per product:
 *   1. base_light  — white/neutral product with original lighting
 *   2. fabric_mask — alpha mask defining fabric-only area
 *   3. shadow_map  — fold/depth darkness from base (extracted automatically)
 *   4. highlight_map — specular/fold highlights (extracted automatically)
 *   5. embroidery_area — metadata rectangle
 *
 * Color pipeline:
 *   final = background
 *         + base_light
 *         + fabric_color_layer (multiply, masked)
 *         + shadow_map (multiply, low alpha)
 *         + highlight_map (screen, low alpha)
 *         + embroidery_layer (clipped to area)
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
}

// ─── Templates ──────────────────────────────────────────────────────
export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  {
    id: "pillow-cover",
    label: "Capa de Almofada",
    defaultScale: 0.75,
    embroideryArea: { x: 350, y: 300, width: 700, height: 700 },
  },
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
    defaultScale: 0.70,
    embroideryArea: { x: 450, y: 550, width: 500, height: 400 },
  },
  {
    id: "baby-clothes",
    label: "Roupinha de Bebê",
    defaultScale: 0.70,
    embroideryArea: { x: 450, y: 380, width: 500, height: 500 },
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
export const getMockupBaseSrc = (productId: string) =>
  `/mockups/${productId}-branco.png`;

// ─── Internal off-screen canvas helpers ─────────────────────────────

/** Load an image as a promise */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

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

/**
 * Create a fabric mask from the base image alpha channel.
 * Returns a canvas with white pixels wherever the base had non-transparent pixels.
 */
function buildFabricMask(
  baseImg: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
  size: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  // Draw base to get its alpha
  ctx.drawImage(baseImg, dx, dy, dw, dh);

  // Replace all visible pixels with solid white (keeps alpha intact)
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  return c;
}

/**
 * Create a color layer: solid color clipped to the fabric mask shape.
 */
function buildColorLayer(
  mask: HTMLCanvasElement,
  colorHex: string,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = mask.width;
  c.height = mask.height;
  const ctx = c.getContext("2d")!;

  // Fill entire canvas with desired color
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, c.width, c.height);

  // Keep color only inside the mask
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);

  return c;
}

/**
 * Extract shadow map from the base image.
 * We use the base image itself — its dark tones represent folds & shadows.
 */
function buildShadowMap(
  baseImg: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
  size: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(baseImg, dx, dy, dw, dh);
  return c;
}

/**
 * Extract highlight map from the base image.
 * We invert the base to get bright areas as highlights, then apply screen blend later.
 */
function buildHighlightMap(
  baseImg: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
  size: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  ctx.drawImage(baseImg, dx, dy, dw, dh);

  // Invert: difference with white gives us highlights as bright values
  ctx.globalCompositeOperation = "difference";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  return c;
}

// ─── Main render function ───────────────────────────────────────────

export function renderMockup(
  ctx: CanvasRenderingContext2D,
  baseImg: HTMLImageElement,
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

  // ── Layer 0: Studio background ──
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, S, S);

  // ── Compute product placement ──
  const { x: dx, y: dy, w: dw, h: dh } = computeDrawRect(baseImg, S);

  // ── Layer 1: Ground shadow ──
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.filter = "blur(20px)";
  ctx.beginPath();
  ctx.ellipse(S / 2, dy + dh * 0.95, dw * 0.35, dh * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = "none";
  ctx.restore();

  // ── Layer 2: Base product image ──
  ctx.drawImage(baseImg, dx, dy, dw, dh);

  // ── Layer 3: Fabric color (multiply blend, masked) ──
  if (colorHex !== "#FFFFFF") {
    const mask = buildFabricMask(baseImg, dx, dy, dw, dh, S);
    const colorLayer = buildColorLayer(mask, colorHex);

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(colorLayer, 0, 0);
    ctx.restore();
  }

  // ── Layer 4: Shadow map (multiply, subtle) ──
  // Re-applies fold/shadow depth on top of the tinted product
  const shadowMap = buildShadowMap(baseImg, dx, dy, dw, dh, S);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.18;
  ctx.drawImage(shadowMap, 0, 0);
  ctx.restore();

  // ── Layer 5: Highlight map (screen, subtle) ──
  // Restores specular highlights and bright fold edges
  const highlightMap = buildHighlightMap(baseImg, dx, dy, dw, dh, S);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.10;
  ctx.drawImage(highlightMap, 0, 0);
  ctx.restore();

  // ── Layer 6: Embroidery ──
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
