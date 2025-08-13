import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@billing-app/shared": resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ["electron"],
  },
});
