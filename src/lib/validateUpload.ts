// Constantes só são usadas pelas funções abaixo — não exportadas.
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB

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
