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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Order-aware manualChunks: react + radix no MESMO chunk pra
        // garantir que radix nunca seja executado antes de React.forwardRef
        // existir. Era a causa do blank screen em produção.
        manualChunks: (id: string) => {
          // React core — sempre primeiro
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          // Radix UI no MESMO chunk que React — garante ordem de
          // execução (radix usa forwardRef no top-level)
          if (id.includes("@radix-ui/")) {
            return "vendor-react";
          }
          // Supabase
          if (id.includes("@supabase/")) {
            return "vendor-supabase";
          }
          // Libs pesadas on-demand — cada uma em chunk próprio
          if (id.includes("jspdf")) return "vendor-jspdf";
          if (id.includes("html2canvas")) return "vendor-html2canvas";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("jszip") || id.includes("JSZip")) return "vendor-zip";
          // Admin pages
          if (id.includes("src/pages/admin/")) return "admin";
          // Resto: Rollup decide (lucide, tanstack, etc → fica com
          // index ou shared chunk auto-gerado conforme uso)
        },
      },
    },
  },
}));
