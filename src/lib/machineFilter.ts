import { db } from "@/lib/db";

// Compatibilidade de bastidor por DIMENSÃO (não por string de hoop_size).
// ESPELHA as funções SQL hoop_dimensions / design_fits_hoop (fonte de verdade
// no banco). hoop_size do DESIGN não importa mais — só width_mm/height_mm dele
// vs as dimensões do bastidor do perfil.
export const HOOP_DIMENSIONS: Record<string, { w: number; h: number }> = {
  "10x10": { w: 100, h: 100 },
  "13x18": { w: 130, h: 180 },
  "14cm": { w: 140, h: 140 },
  "16cm": { w: 160, h: 160 },
  "18cm": { w: 180, h: 180 },
  "large": { w: 200, h: 200 }, // PROVISÓRIO — espelha o valor da SQL hoop_dimensions
};

/**
 * Cabe a matriz no bastidor? Considera rotação. FAIL-OPEN: sem dimensão do
 * design OU hoop desconhecido/não-setado → true (mostra). Esconder por falta de
 * dado é pior que mostrar incompatível.
 */
export function designFitsHoop(
  designW: number | null | undefined,
  designH: number | null | undefined,
  hoopSize: string | null | undefined,
): boolean {
  if (designW == null || designH == null) return true; // sem dimensão → mostra
  const hoop = HOOP_DIMENSIONS[(hoopSize ?? "").toLowerCase().trim()];
  if (!hoop) return true; // hoop desconhecido/não-setado → mostra tudo
  const dMin = Math.min(designW, designH), dMax = Math.max(designW, designH);
  const hMin = Math.min(hoop.w, hoop.h), hMax = Math.max(hoop.w, hoop.h);
  return dMin <= hMin && dMax <= hMax;
}

/**
 * Filters design IDs to only those that have files in the given format.
 * Returns a Set of valid design IDs.
 */
export async function filterDesignsByFormat(designIds: string[], machineFormat: string | null): Promise<Set<string>> {
  if (!machineFormat || designIds.length === 0) return new Set(designIds);

  const { data: files } = await db
    .from("kit_arquivos")
    .select("design_id")
    .in("design_id", designIds)
    .ilike("format", machineFormat);

  return new Set((files || []).map((f: any) => f.design_id));
}

/**
 * Filters an array of designs by machine hoop size and format.
 * Returns filtered designs array.
 */
export async function filterDesignsByMachine(
  designs: any[],
  machineHoopSize: string | null,
  machineFormat: string | null
): Promise<any[]> {
  let filtered = designs;

  // Compatibilidade de bastidor por DIMENSÃO (rotação + fail-open) — não mais
  // string match em hoop_size. Requer width_mm/height_mm no design (callers
  // devem selecioná-los); sem eles, designFitsHoop é fail-open (mostra).
  if (machineHoopSize) {
    filtered = filtered.filter((d: any) => designFitsHoop(d.width_mm, d.height_mm, machineHoopSize));
  }

  // Filter by format (requires DB check)
  if (machineFormat && filtered.length > 0) {
    const ids = filtered.map((d: any) => d.id);
    const validIds = await filterDesignsByFormat(ids, machineFormat);
    filtered = filtered.filter((d: any) => validIds.has(d.id));
  }

  return filtered;
}
