import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";

/* ══════════════════════════════════════════════════════════════
   CatalogTemplate — Deterministic Canvas Renderer
   
   Single source of truth for preview AND export.
   Uses HTML5 Canvas with absolute positioning.
   Text is measured before drawing — no CSS truncation.
   ══════════════════════════════════════════════════════════════ */

export type ExportFormat = "pdf" | "instagram" | "whatsapp";

export interface CatalogDesign {
  id: string;
  name: string;
  cover_image: string | null;
  hoop_size: string | null;
  width_mm: number | null;
  height_mm: number | null;
  stitch_count: number | null;
  category_name?: string | null;
}

export interface CatalogTemplateProps {
  title: string;
  subtitle?: string;
  designs: CatalogDesign[];
  format: ExportFormat;
  pageIndex?: number;
  totalPages?: number;
  debug?: boolean;
}

/* ── Format dimensions (px at 1x) ── */
const FORMAT_SIZES: Record<ExportFormat, { width: number; height: number }> = {
  pdf: { width: 595, height: 842 },       // A4 at 72dpi
  whatsapp: { width: 540, height: 960 },   // Portrait
  instagram: { width: 1080, height: 1080 }, // Square
};

/* ── Layout constants per format ── */
interface LayoutConfig {
  padding: number;
  titleFont: number;
  subtitleFont: number;
  nameFont: number;
  metaFont: number;
  catFont: number;
  footerFont: number;
  imgSize: number;
  itemHeight: number;
  itemGap: number;
  textGap: number;       // gap between image and text in item row
  headerBottomGap: number;
  separatorY: number;     // will be calculated dynamically
}

const LAYOUTS: Record<ExportFormat, LayoutConfig> = {
  pdf: {
    padding: 32,
    titleFont: 20,
    subtitleFont: 10,
    nameFont: 11,
    metaFont: 8,
    catFont: 8,
    footerFont: 8,
    imgSize: 52,
    itemHeight: 66,
    itemGap: 6,
    textGap: 12,
    headerBottomGap: 16,
    separatorY: 0,
  },
  whatsapp: {
    padding: 28,
    titleFont: 22,
    subtitleFont: 12,
    nameFont: 13,
    metaFont: 9,
    catFont: 9,
    footerFont: 9,
    imgSize: 54,
    itemHeight: 70,
    itemGap: 7,
    textGap: 14,
    headerBottomGap: 18,
    separatorY: 0,
  },
  instagram: {
    padding: 48,
    titleFont: 38,
    subtitleFont: 20,
    nameFont: 22,
    metaFont: 15,
    catFont: 14,
    footerFont: 13,
    imgSize: 80,
    itemHeight: 100,
    itemGap: 10,
    textGap: 18,
    headerBottomGap: 24,
    separatorY: 0,
  },
};

/* ── Text helpers ── */

/** Wrap text to fit maxWidth, return array of lines (max maxLines). Last line gets ellipsis if truncated. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const w = ctx.measureText(test).width;

    if (w > maxWidth && current) {
      lines.push(current);
      current = word;

      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  // If we ran out of lines but still have words, add ellipsis to last line
  if (lines.length >= maxLines) {
    const lastLine = lines[maxLines - 1];
    // Check if there's remaining text
    const usedWords = lines.join(" ").split(/\s+/).length;
    if (usedWords < words.length) {
      // Trim last line to fit with ellipsis
      let trimmed = lastLine;
      while (ctx.measureText(trimmed + "…").width > maxWidth && trimmed.length > 1) {
        trimmed = trimmed.slice(0, -1).trimEnd();
      }
      lines[maxLines - 1] = trimmed + "…";
    }
    lines.length = maxLines;
  }

  return lines;
}

/** Format dimensions */
const fmtDim = (w: number | null, h: number | null) =>
  w && h ? `${w}×${h} mm` : null;

/** Format stitch count */
const fmtStitch = (c: number | null) => {
  if (!c) return null;
  return c >= 1000 ? `${(c / 1000).toFixed(1)}k pts` : `${c} pts`;
};

/* ── Pagination ── */
export function getDesignsPerPage(format: ExportFormat): number {
  const size = FORMAT_SIZES[format];
  const L = LAYOUTS[format];
  // Header area estimate
  const headerH = L.titleFont + 8 + (L.subtitleFont + 6) + L.headerBottomGap + 2; // title + subtitle + gap + separator
  const footerH = L.footerFont + 16;
  const available = size.height - L.padding * 2 - headerH - footerH;
  const perItem = L.itemHeight + L.itemGap;
  return Math.max(1, Math.floor(available / perItem));
}

export function paginateDesigns(designs: CatalogDesign[], perPage: number): CatalogDesign[][] {
  const pages: CatalogDesign[][] = [];
  for (let i = 0; i < designs.length; i += perPage) {
    pages.push(designs.slice(i, i + perPage));
  }
  return pages.length ? pages : [[]];
}

export function getCatalogFormatSize(format: ExportFormat) {
  return FORMAT_SIZES[format];
}

/* ── Image cache ── */
const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(img); // still resolve, we'll draw placeholder
    img.src = src;
  });
}

/* ── Main draw function ── */
async function drawCatalog(
  canvas: HTMLCanvasElement,
  props: CatalogTemplateProps
) {
  const { title, subtitle, designs, format, pageIndex = 0, totalPages } = props;
  const size = FORMAT_SIZES[format];
  const L = LAYOUTS[format];
  const scale = format === "instagram" ? 1 : 2; // render at 2x for sharpness (1x for instagram which is already 1080)

  canvas.width = size.width * scale;
  canvas.height = size.height * scale;
  canvas.style.width = `${size.width}px`;
  canvas.style.height = `${size.height}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#f8f7f4";
  ctx.fillRect(0, 0, size.width, size.height);

  const pad = L.padding;
  const contentW = size.width - pad * 2;
  let cursorY = pad;
  const isFirstPage = pageIndex === 0;

  /* ── Header (first page only) ── */
  if (isFirstPage) {
    // Title
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `800 ${L.titleFont}px "DM Sans", "Segoe UI", Arial, sans-serif`;
    const titleLines = wrapText(ctx, title || "Catálogo", contentW, 2);
    for (const line of titleLines) {
      cursorY += L.titleFont;
      ctx.fillText(line, pad, cursorY);
      cursorY += 4; // line gap
    }
    cursorY += 4;

    // Subtitle
    if (subtitle) {
      ctx.fillStyle = "#888888";
      ctx.font = `400 ${L.subtitleFont}px "DM Sans", "Segoe UI", Arial, sans-serif`;
      const subLines = wrapText(ctx, subtitle, contentW, 1);
      for (const line of subLines) {
        cursorY += L.subtitleFont;
        ctx.fillText(line, pad, cursorY);
        cursorY += 2;
      }
      cursorY += 6;
    }

    // Separator
    cursorY += 4;
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, cursorY);
    ctx.lineTo(size.width - pad, cursorY);
    ctx.stroke();
    cursorY += L.headerBottomGap;
  }

  /* ── Item rows ── */
  const textX = pad + L.imgSize + L.textGap;
  const textMaxW = contentW - L.imgSize - L.textGap;

  // Preload images
  const imagePromises = designs.map((d) =>
    d.cover_image ? loadImage(d.cover_image) : Promise.resolve(null)
  );
  const images = await Promise.all(imagePromises);

  for (let i = 0; i < designs.length; i++) {
    const d = designs[i];
    const globalIndex = i + pageIndex * designs.length;
    const rowY = cursorY;

    // Check if row would exceed page
    if (rowY + L.itemHeight > size.height - pad - L.footerFont - 16) break;

    // Card background
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1;
    roundRect(ctx, pad, rowY, contentW, L.itemHeight, 8);

    // Image box
    const imgX = pad + 8;
    const imgY = rowY + (L.itemHeight - L.imgSize) / 2;
    ctx.fillStyle = "#f5f5f5";
    roundRect(ctx, imgX, imgY, L.imgSize, L.imgSize, 6);

    // Draw image
    const img = images[i];
    if (img && img.naturalWidth > 0) {
      // Contain fit
      const aspect = img.naturalWidth / img.naturalHeight;
      let drawW = L.imgSize - 4;
      let drawH = L.imgSize - 4;
      if (aspect > 1) {
        drawH = drawW / aspect;
      } else {
        drawW = drawH * aspect;
      }
      const dx = imgX + (L.imgSize - drawW) / 2;
      const dy = imgY + (L.imgSize - drawH) / 2;
      ctx.drawImage(img, dx, dy, drawW, drawH);
    } else {
      // Placeholder emoji
      ctx.fillStyle = "#cccccc";
      ctx.font = `${L.imgSize * 0.35}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText("🧵", imgX + L.imgSize / 2, imgY + L.imgSize / 2 + L.imgSize * 0.12);
      ctx.textAlign = "left";
    }

    // Title (2-line wrap)
    let textCursorY = rowY + 8 + L.nameFont;
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `700 ${L.nameFont}px "DM Sans", "Segoe UI", Arial, sans-serif`;
    const prefix = `${String(globalIndex + 1).padStart(2, "0")}. `;
    const fullTitle = prefix + d.name;
    const nameLines = wrapText(ctx, fullTitle, textMaxW - 16, 2);
    for (const line of nameLines) {
      ctx.fillText(line, textX, textCursorY);
      textCursorY += L.nameFont + 3;
    }

    // Category
    if (d.category_name) {
      ctx.fillStyle = "#7c3aed";
      ctx.font = `600 ${L.catFont}px "DM Sans", "Segoe UI", Arial, sans-serif`;
      ctx.fillText(d.category_name, textX, textCursorY);
      textCursorY += L.catFont + 3;
    }

    // Metadata
    const meta = [d.hoop_size, fmtDim(d.width_mm, d.height_mm), fmtStitch(d.stitch_count)]
      .filter(Boolean)
      .join(" · ");
    if (meta) {
      ctx.fillStyle = "#999999";
      ctx.font = `400 ${L.metaFont}px "DM Sans", "Segoe UI", Arial, sans-serif`;
      ctx.fillText(meta, textX, textCursorY);
    }

    cursorY += L.itemHeight + L.itemGap;
  }

  /* ── Footer ── */
  const footerY = size.height - pad;
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, footerY - L.footerFont - 8);
  ctx.lineTo(size.width - pad, footerY - L.footerFont - 8);
  ctx.stroke();

  ctx.fillStyle = "#aaaaaa";
  ctx.font = `400 ${L.footerFont}px "DM Sans", "Segoe UI", Arial, sans-serif`;
  const countText = `${designs.length} ${designs.length !== 1 ? "matrizes" : "matriz"}${
    totalPages && totalPages > 1 ? ` · Página ${pageIndex + 1} de ${totalPages}` : ""
  }`;
  ctx.fillText(countText, pad, footerY - 2);

  ctx.font = `600 ${L.footerFont}px "DM Sans", "Segoe UI", Arial, sans-serif`;
  const brandText = "Borda Pro";
  const brandW = ctx.measureText(brandText).width;
  ctx.fillText(brandText, size.width - pad - brandW, footerY - 2);
}

/* ── Rounded rect helper ── */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/* ══════════════════════════════════════════════════
   React Component — wraps canvas, re-draws on prop change
   ══════════════════════════════════════════════════ */

export interface CatalogTemplateHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

export const CatalogTemplate = forwardRef<CatalogTemplateHandle, CatalogTemplateProps>(
  (props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }));

    const draw = useCallback(async () => {
      if (!canvasRef.current) return;
      await drawCatalog(canvasRef.current, props);
    }, [props]);

    useEffect(() => {
      draw();
    }, [draw]);

    const size = FORMAT_SIZES[props.format];

    return (
      <canvas
        ref={canvasRef}
        style={{
          width: size.width,
          height: size.height,
          display: "block",
        }}
      />
    );
  }
);

CatalogTemplate.displayName = "CatalogTemplate";
