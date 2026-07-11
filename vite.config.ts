import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { claudeProxy } from "./vite-plugin-claude";

export default defineConfig({
  plugins: [react(), claudeProxy()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // Respeta PORT (preview/CI) y cae a 5173 en dev manual.
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
});
