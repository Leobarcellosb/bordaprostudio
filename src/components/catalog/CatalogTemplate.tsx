import { forwardRef } from "react";

/* ══════════════════════════════════════════════
   CatalogTemplate — Single source of truth
   Used identically for preview AND export.
   Pure HTML/CSS, no canvas drawing.
   ══════════════════════════════════════════════ */

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

/* ── Format dimensions (px) ── */
const FORMAT_SIZES: Record<ExportFormat, { width: number; height: number }> = {
  pdf: { width: 595, height: 842 },
  whatsapp: { width: 540, height: 960 },
  instagram: { width: 1080, height: 1080 },
};

/* ── Responsive scale factors per format ── */
const SCALE: Record<ExportFormat, {
  padding: number;
  titleFont: number;
  subtitleFont: number;
  nameFont: number;
  metaFont: number;
  catFont: number;
  imgSize: number;
  itemGap: number;
  cardPad: number;
}> = {
  pdf: {
    padding: 28,
    titleFont: 18,
    subtitleFont: 10,
    nameFont: 11,
    metaFont: 8,
    catFont: 8,
    imgSize: 50,
    itemGap: 8,
    cardPad: 8,
  },
  whatsapp: {
    padding: 24,
    titleFont: 18,
    subtitleFont: 10,
    nameFont: 12,
    metaFont: 9,
    catFont: 9,
    imgSize: 50,
    itemGap: 8,
    cardPad: 8,
  },
  instagram: {
    padding: 48,
    titleFont: 36,
    subtitleFont: 16,
    nameFont: 20,
    metaFont: 13,
    catFont: 12,
    imgSize: 80,
    itemGap: 12,
    cardPad: 12,
  },
};

/* ── Helpers ── */
const fmtDim = (w: number | null, h: number | null) =>
  w && h ? `${w}×${h} mm` : null;

const fmtStitch = (c: number | null) => {
  if (!c) return null;
  return c >= 1000 ? `${(c / 1000).toFixed(1)}k pts` : `${c} pts`;
};

/* ── Pagination helpers ── */
export function getDesignsPerPage(format: ExportFormat): number {
  const size = FORMAT_SIZES[format];
  const s = SCALE[format];
  // Estimate available height: total - top padding - header (~60px) - header bottom margin (24) - footer (24) - bottom padding
  const headerEstimate = s.titleFont + 20 + (s.subtitleFont + 8) + 24;
  const footerH = 24;
  const available = size.height - s.padding - headerEstimate - footerH - s.padding;
  const itemH = s.imgSize + s.cardPad * 2; // approximate card height
  const perItem = itemH + s.itemGap;
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

/* ── Item Row ── */
const ItemRow = ({
  d,
  index,
  format,
  debug,
}: {
  d: CatalogDesign;
  index: number;
  format: ExportFormat;
  debug?: boolean;
}) => {
  const s = SCALE[format];
  const meta = [d.hoop_size, fmtDim(d.width_mm, d.height_mm), fmtStitch(d.stitch_count)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: s.cardPad + 4,
        padding: s.cardPad,
        borderRadius: 8,
        border: debug ? "2px solid red" : "1px solid #e8e8e8",
        background: "#fff",
        boxSizing: "border-box" as const,
      }}
    >
      {/* Image */}
      <div
        style={{
          width: s.imgSize,
          height: s.imgSize,
          minWidth: s.imgSize,
          borderRadius: 6,
          background: "#f5f5f5",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          outline: debug ? "2px solid blue" : undefined,
        }}
      >
        {d.cover_image ? (
          <img
            src={d.cover_image}
            alt={d.name}
            crossOrigin="anonymous"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain" as const,
              objectPosition: "center",
            }}
          />
        ) : (
          <span style={{ fontSize: s.imgSize * 0.4, opacity: 0.25 }}>🧵</span>
        )}
      </div>

      {/* Text content — takes remaining width */}
      <div
        style={{
          flex: 1,
          minWidth: 0, // critical for text wrapping in flex
          display: "flex",
          flexDirection: "column",
          gap: 3,
          outline: debug ? "2px solid green" : undefined,
        }}
      >
        {/* Title — wraps to 2 lines, then ellipsis */}
        <div
          style={{
            fontSize: s.nameFont,
            fontWeight: 700,
            color: "#1a1a1a",
            lineHeight: 1.35,
            /* Multi-line clamp */
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
            textOverflow: "ellipsis",
            /* Allow wrapping */
            whiteSpace: "normal" as const,
            wordBreak: "break-word" as const,
            overflowWrap: "break-word" as const,
            textAlign: "left" as const,
            outline: debug ? "1px dashed orange" : undefined,
          }}
        >
          {String(index + 1).padStart(2, "0")}. {d.name}
        </div>

        {/* Category badge */}
        {d.category_name && (
          <div
            style={{
              fontSize: s.catFont,
              fontWeight: 600,
              color: "#7c3aed",
              lineHeight: 1.2,
              whiteSpace: "nowrap" as const,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {d.category_name}
          </div>
        )}

        {/* Metadata */}
        {meta && (
          <div
            style={{
              fontSize: s.metaFont,
              color: "#999",
              lineHeight: 1.3,
              whiteSpace: "nowrap" as const,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {meta}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Main Template ── */
export const CatalogTemplate = forwardRef<HTMLDivElement, CatalogTemplateProps>(
  ({ title, subtitle, designs, format, pageIndex = 0, totalPages, debug = false }, ref) => {
    const size = FORMAT_SIZES[format];
    const s = SCALE[format];
    const isFirstPage = pageIndex === 0;

    return (
      <div
        ref={ref}
        style={{
          width: size.width,
          height: size.height,
          padding: s.padding,
          fontFamily: "'DM Sans', 'Segoe UI', Arial, sans-serif",
          background: "linear-gradient(160deg, #f8f7f4 0%, #ffffff 100%)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box" as const,
          overflow: "hidden",
          position: "relative" as const,
          outline: debug ? "3px solid magenta" : undefined,
        }}
      >
        {/* ── Header (first page only) ── */}
        {isFirstPage && (
          <div
            style={{
              marginBottom: 16,
              flexShrink: 0,
              outline: debug ? "2px dashed red" : undefined,
            }}
          >
            <div
              style={{
                fontSize: title.length > 40 ? s.titleFont * 0.72 : title.length > 28 ? s.titleFont * 0.85 : s.titleFont,
                fontWeight: 800,
                color: "#1a1a1a",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                /* Title can wrap to 2 lines */
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "normal" as const,
                wordBreak: "break-word" as const,
                textAlign: "left" as const,
              }}
            >
              {title || "Catálogo"}
            </div>

            {subtitle && (
              <div
                style={{
                  fontSize: s.subtitleFont,
                  color: "#888",
                  lineHeight: 1.3,
                  marginTop: 4,
                  whiteSpace: "nowrap" as const,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {subtitle}
              </div>
            )}

            <div style={{ borderBottom: "2px solid #e5e5e5", marginTop: 10 }} />
          </div>
        )}

        {/* ── Items ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: s.itemGap,
            overflow: "hidden",
          }}
        >
          {designs.map((d, i) => {
            const globalIndex = i + pageIndex * designs.length;
            return (
              <ItemRow
                key={d.id}
                d={d}
                index={globalIndex}
                format={format}
                debug={debug}
              />
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            flexShrink: 0,
            marginTop: 8,
            paddingTop: 4,
            borderTop: "1px solid #e5e5e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: format === "instagram" ? 12 : 8,
            color: "#aaa",
          }}
        >
          <span>
            {designs.length} {designs.length !== 1 ? "matrizes" : "matriz"}
            {totalPages && totalPages > 1 && ` · Página ${pageIndex + 1} de ${totalPages}`}
          </span>
          <span style={{ fontWeight: 600 }}>Borda Pro</span>
        </div>
      </div>
    );
  }
);

CatalogTemplate.displayName = "CatalogTemplate";
