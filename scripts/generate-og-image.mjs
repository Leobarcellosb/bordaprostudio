#!/usr/bin/env node
/**
 * Gera public/og-image.png (1200x630) com a identidade visual do Borda Pro.
 * Usa sharp para rasterizar um SVG inline.
 *
 * Rodar com: node scripts/generate-og-image.mjs   (ou npm run generate:og)
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "public", "og-image.png");

// SVG do card de compartilhamento — 1200x630, paleta institucional Borda Pro.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="100%" stop-color="#5B21B6"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.6">
      <stop offset="0%" stop-color="#A78BFA" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#5B21B6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="badgeBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.08"/>
    </linearGradient>
  </defs>

  <!-- Fundo -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Logo monograma B (badge arredondado branco translúcido) -->
  <g transform="translate(96, 168)">
    <rect width="120" height="120" rx="28" ry="28" fill="url(#badgeBg)" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2"/>
    <text x="60" y="89" text-anchor="middle"
          font-family="Inter, system-ui, -apple-system, sans-serif"
          font-size="76" font-weight="800" fill="#ffffff"
          letter-spacing="-0.04em">B</text>
  </g>

  <!-- Título -->
  <text x="96" y="370"
        font-family="Inter, system-ui, -apple-system, sans-serif"
        font-size="96" font-weight="800" fill="#ffffff"
        letter-spacing="-0.04em">Borda Pro</text>

  <!-- Subtítulo -->
  <text x="96" y="440"
        font-family="Inter, system-ui, -apple-system, sans-serif"
        font-size="36" font-weight="500" fill="#ffffff" fill-opacity="0.92"
        letter-spacing="-0.01em">Biblioteca de Matrizes de Bordado</text>

  <!-- Linha + tagline -->
  <line x1="96" y1="490" x2="180" y2="490" stroke="#ffffff" stroke-opacity="0.6" stroke-width="3" stroke-linecap="round"/>
  <text x="96" y="538"
        font-family="Inter, system-ui, -apple-system, sans-serif"
        font-size="22" font-weight="500" fill="#ffffff" fill-opacity="0.75">
    Designs profissionais · Mockup · Ferramentas de venda
  </text>

  <!-- Domínio canto inferior direito -->
  <text x="1104" y="588" text-anchor="end"
        font-family="Inter, system-ui, -apple-system, sans-serif"
        font-size="20" font-weight="600" fill="#ffffff" fill-opacity="0.55"
        letter-spacing="0.02em">bordapro.com.br</text>
</svg>`;

try {
  const buffer = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(outPath, buffer);
  console.log(`✓ Gerado: ${outPath} (${buffer.length} bytes)`);
} catch (err) {
  console.error("Falha ao gerar og-image.png:", err);
  process.exit(1);
}
