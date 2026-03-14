/**
 * CatalogCanvas — Backward-compatible re-export layer.
 * The real template lives in CatalogTemplate.tsx.
 * This file keeps existing imports working.
 */
export type { CatalogDesign } from "./CatalogTemplate";
export type { ExportFormat } from "./CatalogTemplate";
/** @deprecated Layout is no longer configurable — kept for backward compat */
export type LayoutType = "compact-list";
export {
  CatalogTemplate as CatalogCanvas,
  getDesignsPerPage as getDesignsPerPageNew,
  paginateDesigns,
  getCatalogFormatSize,
} from "./CatalogTemplate";

// Legacy adapters — the old API accepted (layout, format), new one only needs format
import { getDesignsPerPage as _getPerPage } from "./CatalogTemplate";

export function getDesignsPerPage(_layout: string, format: string): number {
  return _getPerPage(format as any);
}

// Legacy header debug — kept for export flow compatibility
export function getCatalogHeaderDebug({ title, subtitle, format }: { title: string; subtitle?: string; format: string }) {
  return { titleLength: title.length, hasSubtitle: !!subtitle, format };
}
