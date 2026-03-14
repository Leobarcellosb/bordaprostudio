/**
 * @deprecated Use @/lib/mockupEngine instead. This file re-exports for backward compatibility.
 */
export {
  CANVAS_SIZE,
  CANVAS_BG,
  MOCKUP_TEMPLATES,
  FABRIC_COLORS,
  COLOR_IDS,
  getMockupBaseSrc,
  renderMockup,
  loadImage,
  type EmbroideryArea,
  type MockupTemplate,
  type ColorId,
  type FabricColor,
} from "./mockupEngine";

/** @deprecated */
export const getMockupSrc = (productId: string, colorId: string) =>
  `/mockups/${productId}-${colorId}.png`;
