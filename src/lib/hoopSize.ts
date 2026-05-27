/**
 * Classify embroidery hoop size based on design dimensions.
 * Uses the largest side (max of width, height) in mm.
 */
export function classifyHoopSize(widthMm: number | null | undefined, heightMm: number | null | undefined): string | null {
  if (widthMm == null || heightMm == null) return null;
  const maxSide = Math.max(widthMm, heightMm);
  if (maxSide <= 100) return "10x10";
  if (maxSide <= 140) return "14cm";
  if (maxSide <= 160) return "16cm";
  if (maxSide <= 180) return "13x18";
  if (maxSide <= 200) return "18cm";
  return "large";
}
