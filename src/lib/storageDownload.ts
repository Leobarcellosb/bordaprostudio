import { db } from "@/lib/db";

/**
 * Baixa um arquivo do Supabase Storage via endpoint AUTENTICADO (com a sessão
 * do usuário), a partir da file_url/zip_url pública armazenada no banco.
 *
 * POR QUÊ: as URLs gravadas são formato `/object/public/<bucket>/<path>`
 * (getPublicUrl), mas os buckets de produto (kit-files, design-files, kit-zips,
 * premium-kit-files) são PRIVADOS em prod → o endpoint público dá HTTP 400.
 * `db.storage.from(bucket).download(path)` usa o endpoint autenticado, onde a
 * RLS de storage decide (assinante baixa, free é barrado). Sem tornar nada público.
 */
export async function downloadFromStorage(publicUrl: string): Promise<Blob> {
  const marker = "/object/public/";
  const i = publicUrl.indexOf(marker);
  if (i === -1) throw new Error("URL de storage inesperada: " + publicUrl);
  const rest = publicUrl.slice(i + marker.length); // "<bucket>/<path>"
  const slash = rest.indexOf("/");
  const bucket = rest.slice(0, slash);
  const path = decodeURIComponent(rest.slice(slash + 1));
  const { data, error } = await db.storage.from(bucket).download(path);
  if (error || !data) throw error ?? new Error("Falha no download");
  return data;
}

/** Dispara o download de um Blob no browser (cria <a download>, clica, revoga). */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Deriva um nome de arquivo a partir da URL de storage (fallback de download). */
export function filenameFromStorageUrl(publicUrl: string): string {
  try {
    const last = publicUrl.split("?")[0].split("/").pop() || "download";
    return decodeURIComponent(last);
  } catch {
    return "download";
  }
}
