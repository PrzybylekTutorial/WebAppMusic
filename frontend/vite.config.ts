import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ui": path.resolve(__dirname, "./src/components/ui"),
      "@game": path.resolve(__dirname, "./src/game"),
      "@auth": path.resolve(__dirname, "./src/auth"),
      "@music": path.resolve(__dirname, "./src/music"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build", // Keep 'build' to match CRA behavior mostly, or standard 'dist'
  },
});

