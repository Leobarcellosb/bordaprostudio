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

/* ---------- Layout: Clean Grid (2×3 per page) ---------- */
const CleanGridLayout = ({ designs }: { designs: CatalogDesign[] }) => (
  <div className="grid grid-cols-2 gap-4 flex-1">
    {designs.map((d) => (
      <div key={d.id} className="flex flex-col bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm">
        <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
          {d.cover_image ? (
            <img src={d.cover_image} alt={d.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <span className="text-3xl opacity-20">🧵</span>
          )}
        </div>
        <div className="p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{d.name}</p>
          <div className="flex flex-wrap gap-1">
            {d.hoop_size && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">{d.hoop_size}</span>}
            {formatDimensions(d.width_mm, d.height_mm) && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{formatDimensions(d.width_mm, d.height_mm)}</span>
            )}
            {formatStitches(d.stitch_count) && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{formatStitches(d.stitch_count)}</span>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ---------- Layout: Elegant Minimal (1 per row) ---------- */
const ElegantMinimalLayout = ({ designs }: { designs: CatalogDesign[] }) => (
  <div className="flex flex-col gap-4 flex-1">
    {designs.map((d) => (
      <div key={d.id} className="flex gap-4 bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
        <div className="w-28 h-28 shrink-0 bg-gray-50 flex items-center justify-center overflow-hidden">
          {d.cover_image ? (
            <img src={d.cover_image} alt={d.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <span className="text-2xl opacity-20">🧵</span>
          )}
        </div>
        <div className="flex-1 py-3 pr-3 flex flex-col justify-center gap-1">
          <p className="text-sm font-semibold text-gray-800 leading-tight">{d.name}</p>
          {d.category_name && <p className="text-[10px] text-purple-600 font-medium">{d.category_name}</p>}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {d.hoop_size && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">{d.hoop_size}</span>}
            {formatDimensions(d.width_mm, d.height_mm) && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{formatDimensions(d.width_mm, d.height_mm)}</span>
            )}
            {formatStitches(d.stitch_count) && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{formatStitches(d.stitch_count)}</span>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ---------- Layout: WhatsApp Practical (compact list) ---------- */
const WhatsAppPracticalLayout = ({ designs }: { designs: CatalogDesign[] }) => (
  <div className="flex flex-col gap-2 flex-1">
    {designs.map((d, i) => (
      <div key={d.id} className="flex items-center gap-3 bg-white rounded-lg p-2 border border-gray-100">
        <div className="w-16 h-16 shrink-0 rounded-md bg-gray-50 overflow-hidden flex items-center justify-center">
          {d.cover_image ? (
            <img src={d.cover_image} alt={d.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <span className="text-lg opacity-20">🧵</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{String(i + 1).padStart(2, "0")}. {d.name}</p>
          <p className="text-[9px] text-gray-500 mt-0.5">
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
  pdf: { width: 595, height: 842 }, // A4 proportional
  instagram: { width: 540, height: 540 },
  whatsapp: { width: 540, height: 960 },
};

export const CatalogCanvas = forwardRef<HTMLDivElement, CatalogCanvasProps>(
  ({ title, subtitle, designs, layout, format, pageIndex = 0 }, ref) => {
    const LayoutComponent = layoutMap[layout];
    const size = formatSizes[format];
    const isFirstPage = pageIndex === 0;

    return (
      <div
        ref={ref}
        className="bg-gradient-to-br from-gray-50 to-white flex flex-col"
        style={{
          width: size.width,
          height: size.height,
          padding: format === "whatsapp" ? 20 : 28,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header - only on first page */}
        {isFirstPage && (
          <div className="mb-4 pb-3 border-b border-gray-200">
            <h1
              className="font-bold text-gray-900 leading-tight"
              style={{ fontSize: format === "instagram" ? 20 : 22 }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-500 mt-1" style={{ fontSize: 11 }}>
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Designs */}
        <LayoutComponent designs={designs} />

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[9px] text-gray-400">
            {designs.length} {designs.length !== 1 ? "matrizes" : "matriz"}
          </p>
          <p className="text-[9px] text-gray-400 font-medium">Borda Pro</p>
        </div>
      </div>
    );
  }
);

CatalogCanvas.displayName = "CatalogCanvas";

/* ---------- Pagination helpers ---------- */
export function getDesignsPerPage(layout: LayoutType, format: string): number {
  if (format === "instagram") {
    return layout === "clean-grid" ? 4 : layout === "elegant-minimal" ? 3 : 6;
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
