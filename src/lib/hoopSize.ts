/**
 * Classify embroidery hoop size based on design dimensions.
 * Uses the largest side (max of width, height) in mm.
 */
export function classifyHoopSize(widthMm: number | null | undefined, heightMm: number | null | undefined): string | null {
  if (widthMm == null || heightMm == null) return null;
  const maxSide = Math.max(widthMm, heightMm);
  if (maxSide <= 100) return "10x10 cm";
  if (maxSide <= 140) return "14 cm";
  if (maxSide <= 160) return "16 cm";
  if (maxSide <= 180) return "13x18 cm";
  if (maxSide <= 200) return "18 cm";
  return "large";
}

export const HOOP_SIZE_OPTIONS = [
  "10x10 cm",
  "14 cm",
  "16 cm",
  "13x18 cm",
  "18 cm",
  "large",
] as const;
