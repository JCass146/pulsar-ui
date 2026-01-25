import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite injects import.meta.env.VITE_* at build time.
// For local dev you can use a .env file, or set env vars when running.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true
  }
});
