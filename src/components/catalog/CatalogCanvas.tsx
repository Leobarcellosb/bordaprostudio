import { forwardRef } from "react";

export type LayoutType = "compact-list";

type ExportFormat = "pdf" | "instagram" | "whatsapp";

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

interface CatalogCanvasProps {
  title: string;
  subtitle?: string;
  designs: CatalogDesign[];
  layout: LayoutType;
  format: ExportFormat;
  pageIndex?: number;
  /** Show colored debug guides for alignment validation (preview only) */
  debug?: boolean;
}

/* ── Geometry constants ── */

const FORMAT_SIZE: Record<ExportFormat, { width: number; height: number }> = {
  pdf: { width: 595, height: 842 },
  instagram: { width: 1080, height: 1080 },
  whatsapp: { width: 540, height: 960 },
};

const CONTENT_MAX_W = 900;

const TOP_PAD: Record<ExportFormat, number> = {
  pdf: 120,
  instagram: 120,
  whatsapp: 120,
};

const SIDE_PAD: Record<ExportFormat, number> = {
  pdf: 32,
  instagram: 60,
  whatsapp: 28,
};

const HEADER_GAP: Record<ExportFormat, number> = {
  pdf: 8,
  instagram: 8,
  whatsapp: 8,
};

const HEADER_BOTTOM: Record<ExportFormat, number> = {
  pdf: 40,
  instagram: 40,
  whatsapp: 40,
};

const FOOTER_H: Record<ExportFormat, number> = {
  pdf: 28,
  instagram: 40,
  whatsapp: 28,
};

const ITEM_H: Record<ExportFormat, number> = {
  pdf: 60,
  instagram: 115,
  whatsapp: 60,
};

const ITEM_GAP: Record<ExportFormat, number> = {
  pdf: 16,
  instagram: 18,
  whatsapp: 16,
};

const IMG_SIZE: Record<ExportFormat, number> = {
  pdf: 48,
  instagram: 90,
  whatsapp: 48,
};

const TITLE_FONT: Record<ExportFormat, number> = {
  pdf: 18,
  instagram: 42,
  whatsapp: 20,
};

const SUBTITLE_FONT: Record<ExportFormat, number> = {
  pdf: 10,
  instagram: 18,
  whatsapp: 11,
};

const NAME_FONT: Record<ExportFormat, number> = {
  pdf: 11,
  instagram: 24,
  whatsapp: 13,
};

const META_FONT: Record<ExportFormat, number> = {
  pdf: 8,
  instagram: 14,
  whatsapp: 9,
};

const CAT_FONT: Record<ExportFormat, number> = {
  pdf: 8,
  instagram: 13,
  whatsapp: 9,
};

/* ── Helpers ── */

const fmtDim = (w: number | null, h: number | null) =>
  w && h ? `${w}×${h} mm` : null;

const fmtStitch = (c: number | null) => {
  if (!c) return null;
  return c >= 1000 ? `${(c / 1000).toFixed(1)}k pts` : `${c} pts`;
};

/* ── Pagination ── */

export function getDesignsPerPage(_layout: LayoutType, format: string): number {
  const f = format as ExportFormat;
  const size = FORMAT_SIZE[f] || FORMAT_SIZE.pdf;
  const topPad = TOP_PAD[f] || 80;
  const sidePad = SIDE_PAD[f] || 32;
  const headerEstimate = 60; // title + subtitle approximate
  const headerBottom = HEADER_BOTTOM[f] || 40;
  const footerH = FOOTER_H[f] || 28;
  const itemH = ITEM_H[f] || 70;
  const gap = ITEM_GAP[f] || 20;
  const bottomPad = sidePad;

  const contentH = size.height - topPad - headerEstimate - headerBottom - footerH - bottomPad - 12;
  const n = Math.max(1, Math.floor((contentH + gap) / (itemH + gap)));
  return n;
}

export function paginateDesigns(designs: CatalogDesign[], perPage: number): CatalogDesign[][] {
  const pages: CatalogDesign[][] = [];
  for (let i = 0; i < designs.length; i += perPage) {
    pages.push(designs.slice(i, i + perPage));
  }
  return pages.length ? pages : [[]];
}

export function getCatalogFormatSize(format: ExportFormat) {
  return FORMAT_SIZE[format];
}

export function getCatalogHeaderDebug({
  title,
  subtitle,
  format,
}: {
  title: string;
  subtitle?: string;
  format: ExportFormat;
}) {
  return {
    titleLength: title.length,
    hasSubtitle: !!subtitle,
    format,
    titleFont: TITLE_FONT[format],
  };
}

/* ── Item Card ── */

const ItemCard = ({ d, format, index, debug }: { d: CatalogDesign; format: ExportFormat; index: number; debug?: boolean }) => {
  const imgSz = IMG_SIZE[format];
  const itemH_px = ITEM_H[format];
  const nameFnt = NAME_FONT[format];
  const metaFnt = META_FONT[format];
  const catFnt = CAT_FONT[format];
  const cardPad = 20;

  const meta = [d.hoop_size, fmtDim(d.width_mm, d.height_mm), fmtStitch(d.stitch_count)]
    .filter(Boolean)
    .join(" · ");

  const dbg = (color: string) => debug ? `2px dashed ${color}` : undefined;

  return (
    <div
      data-export-check="item"
      style={{
        minHeight: itemH_px,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: cardPad,
        gap: cardPad,
        borderRadius: 10,
        border: debug ? "2px dashed #f97316" : "1px solid rgba(128,128,128,0.15)",
        background: "white",
        boxSizing: "border-box",
      }}
    >
      {/* Fixed image box */}
      <div
        style={{
          width: imgSz,
          minWidth: imgSz,
          maxWidth: imgSz,
          height: imgSz,
          minHeight: imgSz,
          maxHeight: imgSz,
          background: "#f3f3f3",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
          outline: dbg("#3b82f6"),
        }}
      >
        {d.cover_image ? (
          <img
            src={d.cover_image}
            alt={d.name}
            style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center" }}
            crossOrigin="anonymous"
          />
        ) : (
          <span style={{ fontSize: format === "instagram" ? 32 : 18, opacity: 0.2 }}>🧵</span>
        )}
      </div>

      {/* Text area */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
          boxSizing: "border-box",
          outline: dbg("#10b981"),
        }}
      >
        <div
          style={{
            margin: 0,
            marginBottom: 6,
            color: "#1a1a1a",
            fontWeight: 700,
            fontSize: nameFnt,
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            wordBreak: "break-word" as const,
          }}
        >
          {String(index + 1).padStart(2, "0")}. {d.name}
        </div>

        {d.category_name && (
          <div
            style={{
              margin: 0,
              marginBottom: 6,
              color: "#7c3aed",
              fontWeight: 600,
              fontSize: catFnt,
              lineHeight: 1.2,
              whiteSpace: "nowrap" as const,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {d.category_name}
          </div>
        )}

        <div
          style={{
            margin: 0,
            color: "#888",
            fontSize: metaFnt,
            lineHeight: 1.3,
            whiteSpace: "nowrap" as const,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {meta || "—"}
        </div>
      </div>
    </div>
  );
};

/* ── Main Canvas ── */

export const CatalogCanvas = forwardRef<HTMLDivElement, CatalogCanvasProps>(
  ({ title, subtitle, designs, layout: _layout, format, pageIndex = 0, debug = false }, ref) => {
    const size = FORMAT_SIZE[format];
    const topPad = TOP_PAD[format];
    const sidePad = SIDE_PAD[format];
    const footerH = FOOTER_H[format];
    const itemGap = ITEM_GAP[format];
    const isFirstPage = pageIndex === 0;
    const titleFnt = TITLE_FONT[format];
    const subtitleFnt = SUBTITLE_FONT[format];
    const headerGap = HEADER_GAP[format];
    const headerBottom = HEADER_BOTTOM[format];

    const effectiveTitleFont =
      title.length > 50
        ? Math.round(titleFnt * 0.65)
        : title.length > 35
        ? Math.round(titleFnt * 0.78)
        : title.length > 22
        ? Math.round(titleFnt * 0.88)
        : titleFnt;

    const contentMaxW = Math.min(CONTENT_MAX_W, size.width - sidePad * 2);

    return (
      <div
        ref={ref}
        style={{
          width: size.width,
          height: size.height,
          paddingTop: topPad,
          paddingBottom: sidePad,
          paddingLeft: sidePad,
          paddingRight: sidePad,
          fontFamily: "'DM Sans', Arial, sans-serif",
          background: "linear-gradient(160deg, #f8f7f4 0%, #ffffff 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Inner content wrapper with max-width */}
        <div style={{ width: "100%", maxWidth: contentMaxW, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          {/* ── HEADER ── */}
          {isFirstPage && (
            <div
              data-export-check="header"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                marginBottom: headerBottom,
                overflow: "hidden",
                boxSizing: "border-box",
                outline: debug ? "2px dashed #ef4444" : undefined,
              }}
            >
              <div
                data-export-check="title"
                style={{
                  margin: 0,
                  color: "#1a1a1a",
                  fontWeight: 800,
                  fontSize: effectiveTitleFont,
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const,
                  wordBreak: "break-word" as const,
                }}
              >
                {title || "Catálogo"}
              </div>

              {subtitle && (
                <div
                  style={{
                    margin: 0,
                    marginTop: headerGap,
                    color: "#888",
                    fontSize: subtitleFnt,
                    lineHeight: 1.3,
                    whiteSpace: "nowrap" as const,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {subtitle}
                </div>
              )}

              <div style={{ borderBottom: "2px solid #e5e5e5", marginTop: 12 }} />
            </div>
          )}

          {/* ── CONTENT AREA ── */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: itemGap,
              overflow: "hidden",
            }}
          >
            {designs.map((d, i) => (
              <ItemCard key={d.id} d={d} format={format} index={i + pageIndex * designs.length} debug={debug} />
            ))}
          </div>

          {/* ── FOOTER ── */}
          <div
            style={{
              height: footerH,
              minHeight: footerH,
              maxHeight: footerH,
              marginTop: 12,
              paddingTop: 4,
              borderTop: "1px solid #e5e5e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              overflow: "hidden",
              boxSizing: "border-box",
              outline: debug ? "2px dashed #8b5cf6" : undefined,
            }}
          >
            <span style={{ fontSize: format === "instagram" ? 13 : 8, color: "#aaa" }}>
              {designs.length} {designs.length !== 1 ? "matrizes" : "matriz"}
              {pageIndex > 0 && ` · Página ${pageIndex + 1}`}
            </span>
            <span style={{ fontSize: format === "instagram" ? 13 : 8, color: "#aaa", fontWeight: 600 }}>
              Borda Pro
            </span>
          </div>
        </div>
      </div>
    );
  }
);

CatalogCanvas.displayName = "CatalogCanvas";
