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
    // Sem manualChunks — deixa o Vite/Rollup decidir automaticamente.
    // Tentativas anteriores de chunking manual causaram race conditions
    // (radix executando antes de React.forwardRef estar disponível).
    // O auto-chunking respeita a árvore de dependências e garante ordem
    // de execução correta.
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
}));
