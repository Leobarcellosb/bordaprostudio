import { forwardRef } from "react";

export type LayoutType = "clean-grid" | "elegant-minimal" | "whatsapp-practical";

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
  format: "pdf" | "instagram" | "whatsapp";
  pageIndex?: number;
}

const formatDimensions = (w: number | null, h: number | null) => {
  if (!w || !h) return null;
  return `${w}×${h} mm`;
};

const formatStitches = (count: number | null) => {
  if (!count) return null;
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k pts` : `${count} pts`;
};

/* ---------- Layout: Clean Grid (2 cols) ---------- */
const CleanGridLayout = ({ designs }: { designs: CatalogDesign[] }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1 }}>
    {designs.map((d) => (
      <div key={d.id} style={{ display: "flex", flexDirection: "column", background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid #f0f0f0" }}>
        <div style={{ aspectRatio: "1", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {d.cover_image ? (
            <img src={d.cover_image} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
          ) : (
            <span style={{ fontSize: 28, opacity: 0.2 }}>🧵</span>
          )}
        </div>
        <div style={{ padding: 10, overflow: "hidden" }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#1f2937", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 }}>{d.name}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
            {d.hoop_size && <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "#f3e8ff", color: "#7c3aed", fontWeight: 500 }}>{d.hoop_size}</span>}
            {formatDimensions(d.width_mm, d.height_mm) && (
              <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "#f3f4f6", color: "#6b7280" }}>{formatDimensions(d.width_mm, d.height_mm)}</span>
            )}
            {formatStitches(d.stitch_count) && (
              <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "#f3f4f6", color: "#6b7280" }}>{formatStitches(d.stitch_count)}</span>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ---------- Layout: Elegant Minimal (horizontal cards) ---------- */
const ElegantMinimalLayout = ({ designs }: { designs: CatalogDesign[] }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
    {designs.map((d) => (
      <div key={d.id} style={{ display: "flex", gap: 12, background: "#fff", borderRadius: 8, border: "1px solid #f0f0f0", overflow: "hidden" }}>
        <div style={{ width: 90, height: 90, flexShrink: 0, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {d.cover_image ? (
            <img src={d.cover_image} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
          ) : (
            <span style={{ fontSize: 22, opacity: 0.2 }}>🧵</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: "10px 12px 10px 0", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#1f2937", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 }}>{d.name}</p>
          {d.category_name && <p style={{ fontSize: 9, color: "#7c3aed", fontWeight: 500, margin: 0 }}>{d.category_name}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
            {d.hoop_size && <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "#f3e8ff", color: "#7c3aed", fontWeight: 500 }}>{d.hoop_size}</span>}
            {formatDimensions(d.width_mm, d.height_mm) && (
              <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "#f3f4f6", color: "#6b7280" }}>{formatDimensions(d.width_mm, d.height_mm)}</span>
            )}
            {formatStitches(d.stitch_count) && (
              <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "#f3f4f6", color: "#6b7280" }}>{formatStitches(d.stitch_count)}</span>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ---------- Layout: WhatsApp Practical (compact list) ---------- */
const WhatsAppPracticalLayout = ({ designs }: { designs: CatalogDesign[] }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
    {designs.map((d, i) => (
      <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 8, padding: 8, border: "1px solid #f0f0f0" }}>
        <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 6, background: "#f9fafb", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {d.cover_image ? (
            <img src={d.cover_image} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
          ) : (
            <span style={{ fontSize: 16, opacity: 0.2 }}>🧵</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#1f2937", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
            {String(i + 1).padStart(2, "0")}. {d.name}
          </p>
          <p style={{ fontSize: 8, color: "#9ca3af", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
            {[d.hoop_size, formatDimensions(d.width_mm, d.height_mm), formatStitches(d.stitch_count)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
    ))}
  </div>
);

const layoutMap: Record<LayoutType, React.FC<{ designs: CatalogDesign[] }>> = {
  "clean-grid": CleanGridLayout,
  "elegant-minimal": ElegantMinimalLayout,
  "whatsapp-practical": WhatsAppPracticalLayout,
};

const formatSizes: Record<string, { width: number; height: number }> = {
  pdf: { width: 595, height: 842 },
  instagram: { width: 540, height: 540 },
  whatsapp: { width: 540, height: 960 },
};

export const CatalogCanvas = forwardRef<HTMLDivElement, CatalogCanvasProps>(
  ({ title, subtitle, designs, layout, format, pageIndex = 0 }, ref) => {
    const LayoutComponent = layoutMap[layout];
    const size = formatSizes[format];
    const isFirstPage = pageIndex === 0;
    const padding = format === "instagram" ? 32 : format === "whatsapp" ? 24 : 32;

    // Adaptive title font size
    const baseTitleSize = format === "instagram" ? 18 : 20;
    const titleSize = title.length > 40 ? baseTitleSize - 3 : title.length > 25 ? baseTitleSize - 1 : baseTitleSize;

    return (
      <div
        ref={ref}
        style={{
          width: size.width,
          height: size.height,
          padding,
          fontFamily: "'DM Sans', sans-serif",
          background: "linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Header - only on first page */}
        {isFirstPage && (
          <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
            <h1 style={{
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.25,
              fontSize: titleSize,
              margin: 0,
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{
                color: "#9ca3af",
                marginTop: 4,
                fontSize: 10,
                lineHeight: 1.3,
                wordWrap: "break-word",
                overflowWrap: "break-word",
                margin: 0,
                marginTop: 4,
              }}>
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Designs */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <LayoutComponent designs={designs} />
        </div>

        {/* Footer */}
        <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <p style={{ fontSize: 8, color: "#d1d5db", margin: 0 }}>
            {designs.length} {designs.length !== 1 ? "matrizes" : "matriz"}
          </p>
          <p style={{ fontSize: 8, color: "#d1d5db", fontWeight: 500, margin: 0 }}>Borda Pro</p>
        </div>
      </div>
    );
  }
);

CatalogCanvas.displayName = "CatalogCanvas";

/* ---------- Pagination helpers ---------- */
export function getDesignsPerPage(layout: LayoutType, format: string): number {
  if (format === "instagram") {
    return layout === "clean-grid" ? 4 : layout === "elegant-minimal" ? 3 : 4;
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
