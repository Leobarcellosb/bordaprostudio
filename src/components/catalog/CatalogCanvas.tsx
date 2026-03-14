import { forwardRef } from "react";

export type LayoutType = "clean-grid" | "elegant-minimal" | "whatsapp-practical";

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
}

interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface HeaderLayoutResult {
  titleLines: string[];
  wrapped: boolean;
  truncated: boolean;
  titleFontSize: number;
  subtitleFontSize: number;
  lineHeight: number;
  titleWidth: number;
  titleHeight: number;
  subtitleHeight: number;
  totalHeight: number;
}

const formatDimensions = (w: number | null, h: number | null) => {
  if (!w || !h) return null;
  return `${w}×${h} mm`;
};

const formatStitches = (count: number | null) => {
  if (!count) return null;
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k pts` : `${count} pts`;
};

const formatSizes: Record<ExportFormat, { width: number; height: number }> = {
  pdf: { width: 595, height: 842 },
  instagram: { width: 1080, height: 1080 },
  whatsapp: { width: 540, height: 960 },
};

const safeInsetsMap: Record<ExportFormat, SafeInsets> = {
  pdf: { top: 32, right: 32, bottom: 32, left: 32 },
  instagram: { top: 56, right: 56, bottom: 56, left: 56 },
  whatsapp: { top: 24, right: 24, bottom: 24, left: 24 },
};

const headerFrameHeights: Record<ExportFormat, number> = {
  pdf: 118,
  instagram: 200,
  whatsapp: 126,
};

const createMeasureContext = () => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
};

const measureTextWidth = (
  text: string,
  fontSize: number,
  fontWeight: number,
  ctx: CanvasRenderingContext2D | null
) => {
  if (!ctx) return text.length * fontSize * 0.56;
  ctx.font = `${fontWeight} ${fontSize}px DM Sans, sans-serif`;
  return ctx.measureText(text).width;
};

const fitTextWithEllipsis = (
  rawText: string,
  maxWidth: number,
  fontSize: number,
  fontWeight: number,
  ctx: CanvasRenderingContext2D | null
) => {
  if (measureTextWidth(rawText, fontSize, fontWeight, ctx) <= maxWidth) return rawText;

  const ellipsis = "…";
  let lo = 0;
  let hi = rawText.length;

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = `${rawText.slice(0, mid).trimEnd()}${ellipsis}`;
    const candidateWidth = measureTextWidth(candidate, fontSize, fontWeight, ctx);

    if (candidateWidth <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return `${rawText.slice(0, Math.max(0, lo)).trimEnd()}${ellipsis}`;
};

const buildWrappedTitleLines = (
  title: string,
  maxWidth: number,
  fontSize: number,
  maxLines: number,
  ctx: CanvasRenderingContext2D | null
) => {
  const cleanText = title.replace(/\s+/g, " ").trim();
  const words = cleanText ? cleanText.split(" ") : ["Catálogo"];

  const lines: string[] = [];
  let current = "";
  let wrapped = false;
  let truncated = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;

    if (measureTextWidth(candidate, fontSize, 700, ctx) <= maxWidth) {
      current = candidate;
      continue;
    }

    wrapped = true;

    if (!current) {
      const clippedWord = fitTextWithEllipsis(word, maxWidth, fontSize, 700, ctx);
      lines.push(clippedWord);
      truncated = clippedWord !== word;

      if (lines.length >= maxLines || truncated) {
        return { lines, wrapped: true, truncated: true };
      }

      continue;
    }

    if (lines.length === maxLines - 1) {
      const remaining = [word, ...words.slice(i + 1)].join(" ");
      lines.push(fitTextWithEllipsis(`${current} ${remaining}`, maxWidth, fontSize, 700, ctx));
      truncated = true;
      return { lines, wrapped: true, truncated };
    }

    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines);
    visible[maxLines - 1] = fitTextWithEllipsis(visible[maxLines - 1], maxWidth, fontSize, 700, ctx);
    return { lines: visible, wrapped: true, truncated: true };
  }

  return { lines, wrapped: wrapped || lines.length > 1, truncated };
};

const computeHeaderLayout = ({
  title,
  subtitle,
  format,
  contentWidth,
  headerFrameHeight,
}: {
  title: string;
  subtitle?: string;
  format: ExportFormat;
  contentWidth: number;
  headerFrameHeight: number;
}): HeaderLayoutResult => {
  const ctx = createMeasureContext();
  const maxTitleLines = 2;
  const preferredTitleFont = format === "instagram" ? 56 : format === "whatsapp" ? 24 : 22;
  const minTitleFont = format === "instagram" ? 30 : 16;
  const subtitleFontSize = format === "instagram" ? 20 : 10;
  const subtitleGap = subtitle ? (format === "instagram" ? 12 : 6) : 0;
  const innerVerticalAllowance = format === "instagram" ? 16 : 12;
  const maxHeight = Math.max(1, headerFrameHeight - innerVerticalAllowance);

  for (let fontSize = preferredTitleFont; fontSize >= minTitleFont; fontSize -= 2) {
    const titleLayout = buildWrappedTitleLines(title || "Catálogo", contentWidth, fontSize, maxTitleLines, ctx);
    const lineHeight = Math.round(fontSize * 1.15);
    const titleHeight = titleLayout.lines.length * lineHeight;
    const subtitleHeight = subtitle ? Math.round(subtitleFontSize * 1.25) : 0;
    const totalHeight = titleHeight + subtitleGap + subtitleHeight;

    if (totalHeight <= maxHeight) {
      const titleWidth = Math.max(
        ...titleLayout.lines.map((line) => measureTextWidth(line, fontSize, 700, ctx)),
        0
      );

      return {
        titleLines: titleLayout.lines,
        wrapped: titleLayout.wrapped,
        truncated: titleLayout.truncated,
        titleFontSize: fontSize,
        subtitleFontSize,
        lineHeight,
        titleWidth,
        titleHeight,
        subtitleHeight,
        totalHeight,
      };
    }
  }

  const fallbackSize = minTitleFont;
  const fallbackLayout = buildWrappedTitleLines(title || "Catálogo", contentWidth, fallbackSize, maxTitleLines, ctx);
  const fallbackLines = [...fallbackLayout.lines];

  if (fallbackLines.length === 0) fallbackLines.push("Catálogo");
  fallbackLines[fallbackLines.length - 1] = fitTextWithEllipsis(
    fallbackLines[fallbackLines.length - 1],
    contentWidth,
    fallbackSize,
    700,
    ctx
  );

  const fallbackLineHeight = Math.round(fallbackSize * 1.15);
  const fallbackTitleHeight = fallbackLines.length * fallbackLineHeight;
  const fallbackSubtitleHeight = subtitle ? Math.round(subtitleFontSize * 1.25) : 0;
  const fallbackTotalHeight = fallbackTitleHeight + subtitleGap + fallbackSubtitleHeight;

  return {
    titleLines: fallbackLines,
    wrapped: true,
    truncated: true,
    titleFontSize: fallbackSize,
    subtitleFontSize,
    lineHeight: fallbackLineHeight,
    titleWidth: Math.max(...fallbackLines.map((line) => measureTextWidth(line, fallbackSize, 700, ctx)), 0),
    titleHeight: fallbackTitleHeight,
    subtitleHeight: fallbackSubtitleHeight,
    totalHeight: fallbackTotalHeight,
  };
};

export function getCatalogFormatSize(format: ExportFormat) {
  return formatSizes[format];
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
  const size = formatSizes[format];
  const insets = safeInsetsMap[format];
  const contentWidth = size.width - insets.left - insets.right;
  const headerFrameHeight = headerFrameHeights[format];
  const layout = computeHeaderLayout({ title, subtitle, format, contentWidth, headerFrameHeight });

  return {
    titleWidth: Math.round(layout.titleWidth),
    titleHeight: layout.titleHeight,
    headerFrameSize: headerFrameHeight,
    wrapped: layout.wrapped,
    truncated: layout.truncated,
    finalFontSize: layout.titleFontSize,
    safeArea: {
      left: insets.left,
      right: insets.right,
      top: insets.top,
      bottom: insets.bottom,
    },
  };
}

/* ---------- Layout: Clean Grid ---------- */
const CleanGridLayout = ({
  designs,
  format,
}: {
  designs: CatalogDesign[];
  format: ExportFormat;
}) => {
  const isInstagram = format === "instagram";
  const columns = isInstagram ? 1 : 2;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: isInstagram ? 18 : 12, height: "100%" }}>
      {designs.map((d) => {
        const meta = [d.hoop_size, formatDimensions(d.width_mm, d.height_mm), formatStitches(d.stitch_count)]
          .filter(Boolean)
          .join(" · ");

        return (
          <div
            key={d.id}
            data-export-check="item"
            style={{
              display: "flex",
              gap: isInstagram ? 16 : 10,
              minHeight: isInstagram ? 214 : 118,
              borderRadius: 14,
              border: "1px solid hsl(var(--border) / 0.6)",
              background: "hsl(var(--card))",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: isInstagram ? 228 : 92,
                flexShrink: 0,
                background: "hsl(var(--muted) / 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {d.cover_image ? (
                <img src={d.cover_image} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
              ) : (
                <span style={{ fontSize: isInstagram ? 34 : 20, opacity: 0.25 }}>🧵</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, padding: isInstagram ? "16px 18px" : "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: isInstagram ? 8 : 4 }}>
              <p
                style={{
                  margin: 0,
                  color: "hsl(var(--foreground))",
                  fontWeight: 700,
                  fontSize: isInstagram ? 27 : 11,
                  lineHeight: 1.2,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {d.name}
              </p>

              {d.category_name && (
                <p
                  style={{
                    margin: 0,
                    color: "hsl(var(--primary))",
                    fontWeight: 600,
                    fontSize: isInstagram ? 14 : 9,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {d.category_name}
                </p>
              )}

              <p
                style={{
                  margin: 0,
                  color: "hsl(var(--muted-foreground))",
                  fontSize: isInstagram ? 14 : 8,
                  lineHeight: 1.35,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {meta || "Sem metadados"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Layout: Elegant Minimal ---------- */
const ElegantMinimalLayout = ({
  designs,
  format,
}: {
  designs: CatalogDesign[];
  format: ExportFormat;
}) => {
  const isInstagram = format === "instagram";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isInstagram ? 14 : 10, height: "100%" }}>
      {designs.map((d) => {
        const meta = [d.hoop_size, formatDimensions(d.width_mm, d.height_mm), formatStitches(d.stitch_count)]
          .filter(Boolean)
          .join(" · ");

        return (
          <div
            key={d.id}
            data-export-check="item"
            style={{
              display: "flex",
              gap: isInstagram ? 14 : 10,
              borderRadius: 12,
              border: "1px solid hsl(var(--border) / 0.6)",
              background: "hsl(var(--card))",
              overflow: "hidden",
              minHeight: isInstagram ? 218 : 112,
            }}
          >
            <div
              style={{
                width: isInstagram ? 222 : 88,
                flexShrink: 0,
                background: "hsl(var(--muted) / 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {d.cover_image ? (
                <img src={d.cover_image} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
              ) : (
                <span style={{ fontSize: isInstagram ? 34 : 18, opacity: 0.25 }}>🧵</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, padding: isInstagram ? "18px 18px 18px 0" : "10px 12px 10px 0", display: "flex", flexDirection: "column", justifyContent: "center", gap: isInstagram ? 8 : 4 }}>
              <p
                style={{
                  margin: 0,
                  color: "hsl(var(--foreground))",
                  fontWeight: 700,
                  fontSize: isInstagram ? 27 : 11,
                  lineHeight: 1.2,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {d.name}
              </p>

              {d.category_name && (
                <p
                  style={{
                    margin: 0,
                    color: "hsl(var(--primary))",
                    fontWeight: 600,
                    fontSize: isInstagram ? 14 : 9,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {d.category_name}
                </p>
              )}

              <p
                style={{
                  margin: 0,
                  color: "hsl(var(--muted-foreground))",
                  fontSize: isInstagram ? 14 : 8,
                  lineHeight: 1.35,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {meta || "Sem metadados"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Layout: WhatsApp Practical ---------- */
const WhatsAppPracticalLayout = ({
  designs,
  format,
}: {
  designs: CatalogDesign[];
  format: ExportFormat;
}) => {
  const isInstagram = format === "instagram";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isInstagram ? 12 : 8, height: "100%" }}>
      {designs.map((d, i) => {
        const meta = [d.hoop_size, formatDimensions(d.width_mm, d.height_mm), formatStitches(d.stitch_count)]
          .filter(Boolean)
          .join(" · ");

        return (
          <div
            key={d.id}
            data-export-check="item"
            style={{
              display: "flex",
              gap: isInstagram ? 12 : 8,
              alignItems: "center",
              borderRadius: 12,
              border: "1px solid hsl(var(--border) / 0.6)",
              background: "hsl(var(--card))",
              padding: isInstagram ? 12 : 8,
              minHeight: isInstagram ? 150 : 74,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: isInstagram ? 126 : 56,
                height: isInstagram ? 126 : 56,
                flexShrink: 0,
                borderRadius: 10,
                background: "hsl(var(--muted) / 0.4)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {d.cover_image ? (
                <img src={d.cover_image} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
              ) : (
                <span style={{ fontSize: isInstagram ? 26 : 16, opacity: 0.25 }}>🧵</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <p
                style={{
                  margin: 0,
                  color: "hsl(var(--foreground))",
                  fontWeight: 700,
                  fontSize: isInstagram ? 21 : 10,
                  lineHeight: 1.25,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {String(i + 1).padStart(2, "0")}. {d.name}
              </p>

              <p
                style={{
                  margin: 0,
                  marginTop: isInstagram ? 6 : 3,
                  color: "hsl(var(--muted-foreground))",
                  fontSize: isInstagram ? 13 : 8,
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {meta || "Sem metadados"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const layoutMap: Record<LayoutType, React.FC<{ designs: CatalogDesign[]; format: ExportFormat }>> = {
  "clean-grid": CleanGridLayout,
  "elegant-minimal": ElegantMinimalLayout,
  "whatsapp-practical": WhatsAppPracticalLayout,
};

export const CatalogCanvas = forwardRef<HTMLDivElement, CatalogCanvasProps>(
  ({ title, subtitle, designs, layout, format, pageIndex = 0 }, ref) => {
    const LayoutComponent = layoutMap[layout];
    const size = formatSizes[format];
    const isFirstPage = pageIndex === 0;
    const safeInsets = safeInsetsMap[format];
    const contentWidth = size.width - safeInsets.left - safeInsets.right;
    const headerFrameHeight = headerFrameHeights[format];
    const headerLayout = computeHeaderLayout({
      title: title || "Catálogo",
      subtitle,
      format,
      contentWidth,
      headerFrameHeight,
    });

    return (
      <div
        ref={ref}
        style={{
          width: size.width,
          height: size.height,
          paddingTop: safeInsets.top,
          paddingRight: safeInsets.right,
          paddingBottom: safeInsets.bottom,
          paddingLeft: safeInsets.left,
          fontFamily: "'DM Sans', sans-serif",
          background: "linear-gradient(140deg, hsl(var(--muted) / 0.35) 0%, hsl(var(--background)) 100%)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {isFirstPage && (
          <div
            data-export-check="header"
            style={{
              height: headerFrameHeight,
              minHeight: headerFrameHeight,
              maxHeight: headerFrameHeight,
              marginBottom: format === "instagram" ? 18 : 12,
              paddingBottom: format === "instagram" ? 12 : 8,
              borderBottom: "1px solid hsl(var(--border) / 0.8)",
              overflow: "visible",
              boxSizing: "border-box",
            }}
          >
            <h1
              data-export-check="title"
              style={{
                margin: 0,
                color: "hsl(var(--foreground))",
                fontWeight: 800,
                fontSize: headerLayout.titleFontSize,
                lineHeight: `${headerLayout.lineHeight}px`,
                letterSpacing: "-0.01em",
                overflow: "visible",
              }}
            >
              {headerLayout.titleLines.map((line, index) => (
                <span key={`${line}-${index}`} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </h1>

            {subtitle && (
              <p
                style={{
                  margin: 0,
                  marginTop: format === "instagram" ? 10 : 6,
                  color: "hsl(var(--muted-foreground))",
                  fontSize: headerLayout.subtitleFontSize,
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: format === "instagram" ? 2 : 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <LayoutComponent designs={designs} format={format} />
        </div>

        <div
          style={{
            marginTop: format === "instagram" ? 18 : 12,
            paddingTop: format === "instagram" ? 10 : 8,
            borderTop: "1px solid hsl(var(--border) / 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <p style={{ margin: 0, fontSize: format === "instagram" ? 12 : 8, color: "hsl(var(--muted-foreground))" }}>
            {designs.length} {designs.length !== 1 ? "matrizes" : "matriz"}
          </p>
          <p style={{ margin: 0, fontSize: format === "instagram" ? 12 : 8, color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>
            Borda Pro
          </p>
        </div>
      </div>
    );
  }
);

CatalogCanvas.displayName = "CatalogCanvas";

/* ---------- Pagination helpers ---------- */
export function getDesignsPerPage(layout: LayoutType, format: string): number {
  if (format === "instagram") {
    return layout === "clean-grid" ? 2 : layout === "elegant-minimal" ? 2 : 3;
  }
  if (format === "whatsapp") {
    return layout === "clean-grid" ? 4 : layout === "elegant-minimal" ? 5 : 8;
  }
  // PDF (A4)
  return layout === "clean-grid" ? 6 : layout === "elegant-minimal" ? 5 : 8;
}

export function paginateDesigns(designs: CatalogDesign[], perPage: number): CatalogDesign[][] {
  const pages: CatalogDesign[][] = [];
  for (let i = 0; i < designs.length; i += perPage) {
    pages.push(designs.slice(i, i + perPage));
  }
  return pages.length ? pages : [[]];
}
