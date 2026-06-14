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
    port: 5173,
    host: true,
  },
});
