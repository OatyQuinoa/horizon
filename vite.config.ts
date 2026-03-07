import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { secProxyPlugin } from "./vite-sec-proxy";

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "development" ? "/" : process.env.VITE_BASE_PATH || "/",
  optimizeDeps: {
    entries: ["src/main.tsx", "src/tempobook/**/*"],
  },
  plugins: [
    react(),
    secProxyPlugin(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Listen on all interfaces so the app (and /api/ipos) work when opened from another device (e.g. laptop on same network).
    // @ts-ignore
    allowedHosts: process.env.TEMPO === "true" ? true : undefined,
    host: '0.0.0.0',
  }
});
