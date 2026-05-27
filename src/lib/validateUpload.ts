// Constantes só são usadas pelas funções abaixo — não exportadas.
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const ALLOWED_MATRIX_EXTENSIONS = [
  "pes",
  "jef",
  "xxx",
  "dst",
  "exp",
  "hus",
  "vp3",
  "emb",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_MATRIX_SIZE = 5 * 1024 * 1024; // 5MB (matriz individual)

/** Returns an error message string, or null if upload is valid. */
export function validateImageUpload(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Formato inválido. Use JPG, PNG, WebP ou GIF.";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "Imagem muito grande. Máximo 5MB.";
  }
  return null;
}

export function validateZipUpload(file: File): string | null {
  if (file.size > MAX_ZIP_SIZE) {
    return "Arquivo muito grande. Máximo 100MB.";
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".zip")) {
    return "Apenas arquivos .zip são aceitos.";
  }
  return null;
}

function getExtension(filename: string): string {
  const m = filename.toLowerCase().match(/\.([^.]+)$/);
  return m ? m[1] : "";
}

export function validateMatrixUpload(file: File): string | null {
  const ext = getExtension(file.name);
  if (!ALLOWED_MATRIX_EXTENSIONS.includes(ext)) {
    return `Formato não suportado (.${ext}). Aceitos: ${ALLOWED_MATRIX_EXTENSIONS.map((e) => "." + e).join(", ")}.`;
  }
  if (file.size > MAX_MATRIX_SIZE) {
    return "Arquivo muito grande. Máximo 5MB por matriz.";
  }
  return null;
}
