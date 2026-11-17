import { defineConfig } from "vite";
const backend = process.env.CAMPUS_API_URL ?? "http://127.0.0.1:8080";
export default defineConfig({
  server: {
    proxy: {
      "/api": backend,
      "/ws": { target: backend, ws: true, changeOrigin: new URL(backend).protocol === "https:" },
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("/node_modules/three/") ? "three" : undefined,
      },
    },
  },
});
