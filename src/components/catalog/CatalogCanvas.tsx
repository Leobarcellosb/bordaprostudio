/**
 * CatalogCanvas — Backward-compatible re-export layer.
 * The real template lives in CatalogTemplate.tsx.
 */
export type { CatalogDesign } from "./CatalogTemplate";
export type { ExportFormat } from "./CatalogTemplate";
export type { CatalogTemplateHandle } from "./CatalogTemplate";
/** @deprecated Layout is no longer configurable */
export type LayoutType = "compact-list";
export {
  CatalogTemplate as CatalogCanvas,
  getDesignsPerPage as getDesignsPerPageNew,
  paginateDesigns,
  getCatalogFormatSize,
} from "./CatalogTemplate";

import { getDesignsPerPage as _getPerPage } from "./CatalogTemplate";

export function getDesignsPerPage(_layout: string, format: string): number {
  return _getPerPage(format as any);
}

export function getCatalogHeaderDebug({ title, subtitle, format }: { title: string; subtitle?: string; format: string }) {
  return { titleLength: title.length, hasSubtitle: !!subtitle, format };
}
