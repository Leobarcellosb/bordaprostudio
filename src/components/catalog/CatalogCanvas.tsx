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

const SAFE_PAD: Record<ExportFormat, number> = {
  pdf: 32,
  instagram: 60,
  whatsapp: 28,
};

// Fixed pixel heights for each section per format
const HEADER_H: Record<ExportFormat, number> = {
  pdf: 80,
  instagram: 160,
  whatsapp: 90,
};

const FOOTER_H: Record<ExportFormat, number> = {
  pdf: 28,
  instagram: 40,
  whatsapp: 28,
};

const ITEM_H: Record<ExportFormat, number> = {
  pdf: 78,
  instagram: 180,
  whatsapp: 88,
};

const ITEM_GAP: Record<ExportFormat, number> = {
  pdf: 8,
  instagram: 16,
  whatsapp: 10,
};

const IMG_SIZE: Record<ExportFormat, number> = {
  pdf: 62,
  instagram: 148,
  whatsapp: 72,
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
  pdf: 10,
  instagram: 22,
  whatsapp: 12,
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
  const pad = SAFE_PAD[f] || 32;
  const headerH = HEADER_H[f] || 80;
  const footerH = FOOTER_H[f] || 28;
  const itemH = ITEM_H[f] || 78;
  const gap = ITEM_GAP[f] || 8;

  const contentH = size.height - pad * 2 - headerH - footerH - 12; // 12 = header/footer margins
  // items + gaps: n*itemH + (n-1)*gap <= contentH
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
    headerHeight: HEADER_H[format],
    titleFont: TITLE_FONT[format],
  };
}

/* ── Item Card (fixed geometry) ── */

const ItemCard = ({ d, format, index, debug }: { d: CatalogDesign; format: ExportFormat; index: number; debug?: boolean }) => {
  const imgSz = IMG_SIZE[format];
  const itemH_px = ITEM_H[format];
  const nameFnt = NAME_FONT[format];
  const metaFnt = META_FONT[format];
  const catFnt = CAT_FONT[format];
  const innerPadH = format === "instagram" ? 16 : 8;
  const innerPadV = format === "instagram" ? 14 : 6;
  const textAreaWidth = `calc(100% - ${imgSz + innerPadH * 2}px)`;

  const meta = [d.hoop_size, fmtDim(d.width_mm, d.height_mm), fmtStitch(d.stitch_count)]
    .filter(Boolean)
    .join(" · ");

  const dbg = (color: string) => debug ? `2px dashed ${color}` : undefined;

  return (
    <div
      data-export-check="item"
      style={{
        height: itemH_px,
        maxHeight: itemH_px,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        borderRadius: format === "instagram" ? 16 : 10,
        border: debug ? "2px dashed #f97316" : "1px solid rgba(128,128,128,0.15)",
        background: "white",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Fixed image box */}
      <div
        style={{
          width: imgSz,
          minWidth: imgSz,
          maxWidth: imgSz,
          height: "100%",
          background: "#f3f3f3",
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
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            crossOrigin="anonymous"
          />
        ) : (
          <span style={{ fontSize: format === "instagram" ? 32 : 18, opacity: 0.2 }}>🧵</span>
        )}
      </div>

      {/* Fixed text area */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: textAreaWidth,
          padding: `${innerPadV}px ${innerPadH}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: format === "instagram" ? 6 : 3,
          overflow: "hidden",
          boxSizing: "border-box",
          outline: dbg("#10b981"),
        }}
      >
        {/* Design name: max 2 lines, ellipsis */}
        <div
          style={{
            margin: 0,
            color: "#1a1a1a",
            fontWeight: 700,
            fontSize: nameFnt,
            lineHeight: 1.25,
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

        {/* Category: 1 line */}
        {d.category_name && (
          <div
            style={{
              margin: 0,
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

        {/* Metadata: 1 line */}
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
    const pad = SAFE_PAD[format];
    const headerH = HEADER_H[format];
    const footerH = FOOTER_H[format];
    const itemGap = ITEM_GAP[format];
    const isFirstPage = pageIndex === 0;
    const titleFnt = TITLE_FONT[format];
    const subtitleFnt = SUBTITLE_FONT[format];

    // Adaptive title font: shrink if too long
    const effectiveTitleFont =
      title.length > 50
        ? Math.round(titleFnt * 0.65)
        : title.length > 35
        ? Math.round(titleFnt * 0.78)
        : title.length > 22
        ? Math.round(titleFnt * 0.88)
        : titleFnt;

    return (
      <div
        ref={ref}
        style={{
          width: size.width,
          height: size.height,
          padding: pad,
          fontFamily: "'DM Sans', Arial, sans-serif",
          background: "linear-gradient(160deg, #f8f7f4 0%, #ffffff 100%)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ── HEADER FRAME (fixed height) ── */}
        {isFirstPage && (
          <div
            data-export-check="header"
            style={{
              height: headerH,
              minHeight: headerH,
              maxHeight: headerH,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              borderBottom: "2px solid #e5e5e5",
              marginBottom: format === "instagram" ? 16 : 8,
              paddingBottom: format === "instagram" ? 8 : 4,
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
                  marginTop: format === "instagram" ? 8 : 4,
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
          </div>
        )}

        {/* ── CONTENT AREA (flex: 1, items stacked) ── */}
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

        {/* ── FOOTER FRAME (fixed height) ── */}
        <div
          style={{
            height: footerH,
            minHeight: footerH,
            maxHeight: footerH,
            marginTop: format === "instagram" ? 12 : 6,
            paddingTop: format === "instagram" ? 8 : 4,
            borderTop: "1px solid #e5e5e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            overflow: "hidden",
            boxSizing: "border-box",
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
    );
  }
);

CatalogCanvas.displayName = "CatalogCanvas";
