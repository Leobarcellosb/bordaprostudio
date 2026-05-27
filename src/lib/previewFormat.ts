/**
 * Prioridade de formato para RENDERIZAÇÃO visual da matriz (geração de
 * cover_image a partir do arquivo de bordado).
 *
 * Importante: esta lista NÃO afeta a lógica de download. Para download, o
 * usuário continua escolhendo o formato compatível com a máquina dele.
 *
 * Por que PES primeiro: o parser de PES preserva metadados de cor com
 * fidelidade alta — preview sai limpo, com cores corretas. JEF/EXP/DST
 * costumam render com cores genéricas (cinza/preto), gerando previews feios.
 */
export const FORMAT_PRIORITY_FOR_PREVIEW = [
  "PES",
  "JEF",
  "EXP",
  "DST",
  "XXX",
  "HUS",
  "VP3",
  "EMB",
] as const;

/** Retorna o índice de prioridade (menor = melhor). 999 para formato desconhecido. */
export function previewPriority(format: string | null | undefined): number {
  if (!format) return 999;
  const i = FORMAT_PRIORITY_FOR_PREVIEW.indexOf(
    format.toUpperCase() as (typeof FORMAT_PRIORITY_FOR_PREVIEW)[number],
  );
  return i === -1 ? 999 : i;
}

/**
 * Escolhe o melhor arquivo para gerar preview visual de uma lista de
 * arquivos do design. Não muta a lista original (usa .toSorted-equivalente).
 *
 * @example
 *   const best = pickBestPreviewFile(designFiles, f => f.format);
 *   // → arquivo PES se houver, senão JEF, senão EXP, etc.
 */
export function pickBestPreviewFile<T>(
  files: T[],
  getFormat: (f: T) => string | null | undefined,
): T | undefined {
  if (files.length === 0) return undefined;
  return [...files].sort(
    (a, b) => previewPriority(getFormat(a)) - previewPriority(getFormat(b)),
  )[0];
}
