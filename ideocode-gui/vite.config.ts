import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("scheduler")
            ) {
              return "react-vendor";
            }
            if (id.includes("/monaco-editor/") || id.includes("/@monaco-editor/")) {
              return "monaco";
            }
            if (
              id.includes("/react-markdown/") ||
              id.includes("/remark-gfm/") ||
              id.includes("/rehype-highlight/")
            ) {
              return "markdown";
            }
            if (id.includes("/framer-motion/")) {
              return "motion";
            }
            if (id.includes("/mermaid/")) {
              return "mermaid";
            }
            if (id.includes("/katex/")) {
              return "katex";
            }
            if (id.includes("cytoscape")) {
              return "cytoscape";
            }
            if (id.includes("/xterm/")) {
              return "terminal";
            }
          }
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
}));
