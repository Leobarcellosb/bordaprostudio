import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Cap o aviso de chunk grande em 600KB pra não poluir o output do build
    // depois da divisão. Se algum chunk passar, é sinal real pra investigar.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Function form de manualChunks — permite agrupar tanto por
        // pacote (vendor) quanto por path no src (admin).
        manualChunks(id: string) {
          // ── Vendor splits ───────────────────────────────────────
          // Libs grandes/estáveis em chunks dedicados → cache estável
          // entre deploys (vendor não muda, page chunks sim).
          if (id.includes("node_modules")) {
            // React + Router (~170KB) — base de quase tudo
            if (
              /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
            ) {
              return "vendor-react";
            }
            // Supabase client (~150KB) — bem pesado, só usado por
            // hooks que tocam o backend
            if (id.includes("node_modules/@supabase/")) {
              return "vendor-supabase";
            }
            // Radix UI primitives — vários pacotes, mas pequenos
            // individualmente; agrupados aliviam HTTP overhead
            if (id.includes("node_modules/@radix-ui/")) {
              return "vendor-radix";
            }
            // Libs pesadas em chunks separados por uso — evita que
            // SmartDownloadPanel (jszip) puxe jspdf+recharts junto.
            if (id.includes("node_modules/jspdf")) {
              return "vendor-jspdf";     // gerar PDF (catálogo)
            }
            if (id.includes("node_modules/html2canvas")) {
              return "vendor-html2canvas"; // capturar DOM como imagem
            }
            if (id.includes("node_modules/jszip")) {
              return "vendor-zip";       // bundling de downloads
            }
            if (id.includes("node_modules/recharts")) {
              return "vendor-charts";    // gráficos do admin analytics
            }
            // tanstack query — leve mas distinto
            if (id.includes("node_modules/@tanstack/")) {
              return "vendor-query";
            }
            // Lucide icons — todos vão pra um chunk só (tree-shaking
            // mantém só os imports usados)
            if (id.includes("node_modules/lucide-react/")) {
              return "vendor-icons";
            }
          }

          // ── App splits ─────────────────────────────────────────
          // Admin inteiro num chunk só (não carrega pra user comum)
          if (id.includes("/src/pages/admin/")) {
            return "admin";
          }
          // resto: Rollup decide automaticamente (cada page lazy
          // vira seu próprio chunk)
        },
      },
    },
  },
}));
